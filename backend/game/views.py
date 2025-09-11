from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.utils.decorators import method_decorator
from django.views import View
from .models import GameRoom, Player, Guess, UserMessage
import json
import uuid
from django.utils import timezone


@csrf_exempt
def health(request):
    """Simple public health check endpoint."""
    return JsonResponse({"status": "ok"})


## All authentication endpoints removed for guest-only mode.

# --- Admin Basic Auth Helpers ---
import os, base64

ADMIN_USER = os.getenv('ADMIN_USERNAME')
ADMIN_PASS = os.getenv('ADMIN_PASSWORD')

def _admin_authenticated(request):
    if not ADMIN_USER or not ADMIN_PASS:
        return False
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth.startswith('Basic '):
        return False
    try:
        decoded = base64.b64decode(auth.split(' ',1)[1]).decode()
        user, pwd = decoded.split(':',1)
    except Exception:
        return False
    return user == ADMIN_USER and pwd == ADMIN_PASS

def admin_analytics(request):
    if request.method != 'GET':
        return JsonResponse({'error':'Method not allowed'}, status=405)
    if not _admin_authenticated(request):
        return JsonResponse({'error':'Unauthorized'}, status=401)
    rooms = GameRoom.objects.all()
    total_rooms = rooms.count()
    by_status = {}
    total_players = 0
    finished = 0
    for r in rooms:
        by_status[r.status] = by_status.get(r.status,0)+1
        total_players += r.players.count()
        if r.status == GameRoom.FINISHED:
            finished += 1
    avg_players = total_players / total_rooms if total_rooms else 0
    return JsonResponse({
        'total_rooms': total_rooms,
        'status_breakdown': by_status,
        'total_players': total_players,
        'average_players_per_room': round(avg_players,2),
        'finished_rooms': finished,
    })

def admin_list_rooms(request):
    if request.method != 'GET':
        return JsonResponse({'error':'Method not allowed'}, status=405)
    if not _admin_authenticated(request):
        return JsonResponse({'error':'Unauthorized'}, status=401)
    rooms = GameRoom.objects.all().order_by('-created_at')
    data = []
    for r in rooms:
        data.append({
            'id': str(r.id),
            'name': r.name,
            'status': r.status,
            'player_count': r.players.count(),
            'max_players': r.max_players,
            'turn_time_limit': r.turn_time_limit,
            'created_at': r.created_at.isoformat(),
            'is_private': r.is_private,
        })
    return JsonResponse({'rooms': data})

@csrf_exempt
def admin_force_delete_room(request, room_id):
    if request.method != 'DELETE':
        return JsonResponse({'error':'Method not allowed'}, status=405)
    if not _admin_authenticated(request):
        return JsonResponse({'error':'Unauthorized'}, status=401)
    try:
        room = GameRoom.objects.get(id=room_id)
    except GameRoom.DoesNotExist:
        return JsonResponse({'error':'Room not found'}, status=404)
    room.delete()
    return JsonResponse({'message':'Room deleted'})


@csrf_exempt
def game_rooms(request):
    if request.method == 'GET':
        rooms = GameRoom.objects.filter(status__in=[GameRoom.WAITING, GameRoom.SETTING_NUMBERS])
        data = [{
            'id': str(r.id),
            'name': r.name,
            'status': r.status,
            'player_count': r.players.count(),
            'max_players': r.max_players,
            'turn_time_limit': r.turn_time_limit,
            'created_at': r.created_at.isoformat(),
            'creator_username': r.creator.username if r.creator else None,
            'is_private': r.is_private,
        } for r in rooms]
        return JsonResponse({'rooms': data})
    if request.method == 'POST':
        try:
            body = json.loads(request.body or '{}')
        except Exception:
            body = {}
        room_name = body.get('name', f'Room {uuid.uuid4().hex[:8]}')
        max_players = body.get('max_players', 2)
        turn_time_limit = body.get('turn_time_limit', 60)
        is_private = bool(body.get('is_private', False))
        password = body.get('password', '') or ''
        if not isinstance(max_players, int) or max_players < 2 or max_players > 10 or max_players % 2 != 0:
            return JsonResponse({'error': 'Max players must be an even number between 2 and 10'}, status=400)
        room = GameRoom.objects.create(
            name=room_name,
            max_players=max_players,
            turn_time_limit=turn_time_limit,
            creator=None,  # creator concept removed for guest-only simplicity
            is_private=is_private,
            password=password if is_private else ''
        )
        return JsonResponse({'room_id': str(room.id), 'name': room.name, 'message': 'Room created successfully'})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def join_room(request, room_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        room = GameRoom.objects.get(id=room_id)
    except GameRoom.DoesNotExist:
        return JsonResponse({'error': 'Room not found'}, status=404)
    try:
        data = json.loads(request.body or '{}')
    except Exception:
        data = {}
    guest_name = (data.get('username') or '').strip()
    device_id = (data.get('device_id') or '').strip()
    if not guest_name:
        return JsonResponse({'error': 'Username required'}, status=400)
    # device_id required for new identity; fallback to legacy if missing
    if device_id:
        internal_username = f"g:{device_id}"[:150]
    else:
        internal_username = guest_name  # legacy fallback
    user, _ = User.objects.get_or_create(username=internal_username)
    # Rejoin shortcut
    try:
        player = Player.objects.get(user=user, room=room)
        # Update display name if changed
        if guest_name and player.display_name != guest_name[:30]:
            player.display_name = guest_name[:30]
            player.save(update_fields=['display_name'])
        if not player.team:
            a_count = room.players.filter(team='A').count()
            b_count = room.players.filter(team='B').count()
            player.team = 'A' if a_count <= b_count else 'B'
            player.save(update_fields=['team'])
        return JsonResponse({'message': 'Rejoined room successfully', 'room_id': str(room.id), 'room_status': room.status})
    except Player.DoesNotExist:
        pass
    if room.is_private:
        provided = data.get('password', '')
        if not provided or provided != (room.password or ''):
            return JsonResponse({'error': 'Invalid or missing room password'}, status=403)
    if room.is_full:
        return JsonResponse({'error': 'Room is full'}, status=400)
    if room.status not in [GameRoom.WAITING, GameRoom.SETTING_NUMBERS]:
        return JsonResponse({'error': 'Game already in progress'}, status=400)
    player = Player.objects.create(user=user, room=room, display_name=guest_name[:30])
    a_count = room.players.filter(team='A').count()
    b_count = room.players.filter(team='B').count()
    player.team = 'A' if a_count <= b_count else 'B'
    player.save()
    if room.is_full and room.status == GameRoom.WAITING:
        room.status = GameRoom.SETTING_NUMBERS
        room.save()
    return JsonResponse({'message': 'Joined room successfully', 'room_id': str(room.id), 'room_status': room.status})


@csrf_exempt
def room_detail(request, room_id):
    try:
        room = GameRoom.objects.get(id=room_id)
    except GameRoom.DoesNotExist:
        return JsonResponse({'error': 'Room not found'}, status=404)
    if request.method == 'GET':
        players = [{
            'id': p.id,
            'username': (p.display_name or p.user.username),
            'has_secret_number': bool(p.secret_number),
            'is_winner': p.is_winner,
            'joined_at': p.joined_at.isoformat()
        } for p in room.players.all()]
        recent_guesses = [{
            'player': g.player.user.username,
            'target_player': g.target_player.user.username,
            'guess': g.guess_number,
            'strikes': g.strikes,
            'balls': g.balls,
            'is_correct': g.is_correct,
            'timestamp': g.timestamp.isoformat()
        } for g in Guess.objects.filter(room=room).order_by('-timestamp')[:10]]
        return JsonResponse({'room': {
            'id': str(room.id),
            'name': room.name,
            'status': room.status,
            'max_players': room.max_players,
            'turn_time_limit': room.turn_time_limit,
            'current_turn_player': None if not room.current_turn_player else (
                (room.players.filter(user=room.current_turn_player).first().display_name or room.current_turn_player.username)
                if room.players.filter(user=room.current_turn_player).exists() else room.current_turn_player.username
            ),
            'turn_start_time': room.turn_start_time.isoformat() if room.turn_start_time else None,
            'created_at': room.created_at.isoformat(),
            'creator_username': room.creator.username if room.creator else None,
            'is_private': room.is_private,
        }, 'players': players, 'recent_guesses': recent_guesses})
    if request.method == 'DELETE':
        # Anyone can delete for simplicity if no creator
        if room.creator and (not request.user.is_authenticated or request.user != room.creator):
            return JsonResponse({'error': 'Only creator can delete'}, status=403)
        room.delete()
        return JsonResponse({'message': 'Room deleted'})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


## Stats endpoint removed.


@csrf_exempt
def rematch(request, room_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        original_room = GameRoom.objects.get(id=room_id)
    except GameRoom.DoesNotExist:
        return JsonResponse({'error': 'Original room not found'}, status=404)
    if original_room.status != GameRoom.FINISHED:
        return JsonResponse({'error': 'Can only rematch finished games'}, status=400)
    try:
        data = json.loads(request.body or '{}')
    except Exception:
        data = {}
    guest_name = (data.get('username') or '').strip()
    device_id = (data.get('device_id') or '').strip()
    if not guest_name:
        return JsonResponse({'error': 'Username required'}, status=400)
    internal_username = f"g:{device_id}"[:150] if device_id else guest_name
    acting_user, _ = User.objects.get_or_create(username=internal_username)
    # Ensure acting user was part of original
    if not Player.objects.filter(user=acting_user, room=original_room).exists():
        return JsonResponse({'error': 'Only players from the original game can create a rematch'}, status=403)
    new_room = GameRoom.objects.create(
        name=f"{original_room.name}",
        max_players=original_room.max_players,
        turn_time_limit=original_room.turn_time_limit,
        creator=acting_user,
        is_private=original_room.is_private,
        password=original_room.password
    )
    for op in original_room.players.all().order_by('joined_at'):
        Player.objects.create(user=op.user, room=new_room, team=op.team, display_name=op.display_name or op.user.username)
    if new_room.is_full:
        new_room.status = GameRoom.SETTING_NUMBERS
        new_room.save()
    return JsonResponse({'message': 'Rematch room created successfully', 'room_id': str(new_room.id), 'room_name': new_room.name, 'room_status': new_room.status})


# --- Message Submission System ---

@csrf_exempt
def submit_message(request):
    """Allow users to submit messages/bug reports for admin review"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body or '{}')
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    
    username = (data.get('username') or '').strip()
    subject = (data.get('subject') or '').strip()
    message = (data.get('message') or '').strip()
    message_type = data.get('message_type', UserMessage.OTHER)
    
    if not username:
        return JsonResponse({'error': 'Username is required'}, status=400)
    if not subject:
        return JsonResponse({'error': 'Subject is required'}, status=400)
    if not message:
        return JsonResponse({'error': 'Message is required'}, status=400)
    if message_type not in [choice[0] for choice in UserMessage.TYPE_CHOICES]:
        message_type = UserMessage.OTHER
    
    # Create the message
    user_message = UserMessage.objects.create(
        username=username,
        subject=subject,
        message=message,
        message_type=message_type
    )
    
    return JsonResponse({
        'message': 'Your message has been submitted successfully',
        'message_id': str(user_message.id)
    })


def admin_list_messages(request):
    """Admin endpoint to list all user messages"""
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not _admin_authenticated(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    # Get query parameters for filtering
    status_filter = request.GET.get('status')
    message_type_filter = request.GET.get('type')
    
    messages = UserMessage.objects.all()
    
    if status_filter and status_filter in [choice[0] for choice in UserMessage.STATUS_CHOICES]:
        messages = messages.filter(status=status_filter)
    
    if message_type_filter and message_type_filter in [choice[0] for choice in UserMessage.TYPE_CHOICES]:
        messages = messages.filter(message_type=message_type_filter)
    
    messages_data = []
    for msg in messages[:100]:  # Limit to 100 most recent
        messages_data.append({
            'id': str(msg.id),
            'username': msg.username,
            'subject': msg.subject,
            'message': msg.message,
            'message_type': msg.message_type,
            'message_type_display': msg.get_message_type_display(),
            'status': msg.status,
            'status_display': msg.get_status_display(),
            'created_at': msg.created_at.isoformat(),
            'reviewed_at': msg.reviewed_at.isoformat() if msg.reviewed_at else None,
            'admin_notes': msg.admin_notes
        })
    
    return JsonResponse({
        'messages': messages_data,
        'total_count': UserMessage.objects.count(),
        'pending_count': UserMessage.objects.filter(status=UserMessage.PENDING).count(),
        'reviewed_count': UserMessage.objects.filter(status=UserMessage.REVIEWED).count(),
        'resolved_count': UserMessage.objects.filter(status=UserMessage.RESOLVED).count()
    })


@csrf_exempt
def admin_update_message(request, message_id):
    """Admin endpoint to update message status and add notes"""
    if request.method not in ['PUT', 'PATCH']:
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not _admin_authenticated(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        message = UserMessage.objects.get(id=message_id)
    except UserMessage.DoesNotExist:
        return JsonResponse({'error': 'Message not found'}, status=404)
    
    try:
        data = json.loads(request.body or '{}')
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    
    updated_fields = []
    
    # Update status
    new_status = data.get('status')
    if new_status and new_status in [choice[0] for choice in UserMessage.STATUS_CHOICES]:
        old_status = message.status
        message.status = new_status
        updated_fields.append('status')
        
        # Set reviewed_at when status changes from pending
        if old_status == UserMessage.PENDING and new_status != UserMessage.PENDING:
            message.reviewed_at = timezone.now()
            updated_fields.append('reviewed_at')
    
    # Update admin notes
    if 'admin_notes' in data:
        message.admin_notes = data.get('admin_notes', '')
        updated_fields.append('admin_notes')
    
    if updated_fields:
        message.save(update_fields=updated_fields)
    
    return JsonResponse({
        'message': 'Message updated successfully',
        'status': message.status,
        'admin_notes': message.admin_notes
    })
