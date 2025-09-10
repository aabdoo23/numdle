from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import GameRoom, Player, Guess
import json
import uuid
import random
import string


@csrf_exempt
def health(request):
    """Simple public health check endpoint."""
    return JsonResponse({"status": "ok"})


@csrf_exempt
def register(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username already exists'}, status=400)
        
        user = User.objects.create_user(username=username, password=password)
        return JsonResponse({'message': 'User created successfully', 'user_id': user.id})
    
    return JsonResponse({'error': 'Invalid method'}, status=405)


@csrf_exempt
def guest_access(request):
    """Create or reuse a temporary guest user and return JWT tokens.

    Body: {"username": "desired_name"}
    Response: {"user_id": int, "username": str, "access": str, "refresh": str}
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)

    try:
        data = json.loads(request.body or '{}')
    except Exception:
        data = {}

    desired = (data.get('username') or '').strip()
    if not desired:
        return JsonResponse({'error': 'Username is required'}, status=400)

    # Normalize allowed chars
    base = ''.join(ch for ch in desired if ch.isalnum() or ch in ('_', '-'))[:30] or 'guest'
    username = base
    if User.objects.filter(username=username).exists():
        # try a few numeric suffixes
        for _ in range(5):
            suffix = '-' + ''.join(random.choices(string.digits, k=4))
            candidate = (base[:30 - len(suffix)] + suffix)
            if not User.objects.filter(username=candidate).exists():
                username = candidate
                break
        else:
            username = base + '-' + uuid.uuid4().hex[:6]

    user, created = User.objects.get_or_create(username=username)
    if created:
        user.set_unusable_password()
        user.save()

    refresh = RefreshToken.for_user(user)
    return JsonResponse({
        'user_id': user.id,
        'username': user.username,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'user_id': request.user.id, 'username': request.user.username})


@method_decorator(csrf_exempt, name='dispatch')
class GameRoomView(APIView):
    def get_permissions(self):
        # Allow unauthenticated users to list and create rooms
        return [AllowAny()]

    def get(self, request):
        """List all available game rooms"""
        rooms = GameRoom.objects.filter(status__in=[GameRoom.WAITING, GameRoom.SETTING_NUMBERS])
        rooms_data = []
        
        for room in rooms:
            rooms_data.append({
                'id': str(room.id),
                'name': room.name,
                'status': room.status,
                'player_count': room.players.count(),
                'max_players': room.max_players,
                'turn_time_limit': room.turn_time_limit,
                'created_at': room.created_at.isoformat(),
                'creator_username': room.creator.username if room.creator else None,
                'is_private': room.is_private,
            })
        
        return JsonResponse({'rooms': rooms_data})
    def post(self, request):
        """Create a new game room"""
        data = request.data if hasattr(request, 'data') else json.loads(request.body)
        room_name = data.get('name', f'Room {uuid.uuid4().hex[:8]}')
        max_players = data.get('max_players', 2)
        turn_time_limit = data.get('turn_time_limit', 60)
        is_private = bool(data.get('is_private', False))
        password = data.get('password', '') or ''

        room = GameRoom.objects.create(
            name=room_name,
            max_players=max_players,
            turn_time_limit=turn_time_limit,
            creator=request.user if request.user.is_authenticated else None,
            is_private=is_private,
            password=password if is_private else ''
        )

        # Add creator as first player
        if request.user.is_authenticated:
            # Creator becomes first player on Team A
            Player.objects.create(user=request.user, room=room, team='A')

        return JsonResponse({
            'room_id': str(room.id),
            'name': room.name,
            'message': 'Room created successfully'
        })


@method_decorator(csrf_exempt, name='dispatch')
class JoinRoomView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, room_id):
        """Join an existing game room"""
        
        try:
            room = GameRoom.objects.get(id=room_id)
            # Determine acting user: authenticated user or guest username provided in payload
            data = request.data if hasattr(request, 'data') else json.loads(request.body or '{}')
            acting_user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
            if not acting_user:
                guest_name = (data.get('username') or '').strip()
                if guest_name:
                    acting_user, _ = User.objects.get_or_create(username=guest_name)
            # If the user is already a player in the room, allow rejoin regardless of capacity or status
            try:
                if not acting_user:
                    raise Player.DoesNotExist
                player = Player.objects.get(user=acting_user, room=room)
                # Ensure player has a team assigned (might be older records)
                if not player.team:
                    a_count = room.players.filter(team='A').count()
                    b_count = room.players.filter(team='B').count()
                    player.team = 'A' if a_count <= b_count else 'B'
                    player.save()
                return JsonResponse({
                    'message': 'Rejoined room successfully',
                    'room_id': str(room.id),
                    'room_status': room.status
                })
            except Player.DoesNotExist:
                pass

            # Enforce private room password if applicable
            if room.is_private:
                provided = data.get('password', '')
                if not provided or provided != (room.password or ''):
                    return JsonResponse({'error': 'Invalid or missing room password'}, status=403)

            # New join: enforce capacity and status rules
            if room.is_full:
                return JsonResponse({'error': 'Room is full'}, status=400)

            if room.status not in [GameRoom.WAITING, GameRoom.SETTING_NUMBERS]:
                return JsonResponse({'error': 'Game already in progress'}, status=400)

            if not acting_user:
                return JsonResponse({'error': 'Username required to join as guest'}, status=400)

            player, created = Player.objects.get_or_create(user=acting_user, room=room)
            if created:
                # Assign team to balance sizes
                a_count = room.players.filter(team='A').count()
                b_count = room.players.filter(team='B').count()
                player.team = 'A' if a_count <= b_count else 'B'
                player.save()
            
            # If room is now full, move to setting numbers phase
            if room.is_full and room.status == GameRoom.WAITING:
                room.status = GameRoom.SETTING_NUMBERS
                room.save()
            
            return JsonResponse({
                'message': 'Joined room successfully',
                'room_id': str(room.id),
                'room_status': room.status
            })
            
        except GameRoom.DoesNotExist:
            return JsonResponse({'error': 'Room not found'}, status=404)


@csrf_exempt
def room_detail(request, room_id):
    """Get or delete a specific room; GET requires being a player, DELETE requires being the creator"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    try:
        room = GameRoom.objects.get(id=room_id)
        if request.method == 'DELETE':
            # Only creator can delete
            if room.creator != request.user:
                return JsonResponse({'error': 'Only the creator can delete this room'}, status=403)
            room.delete()
            return JsonResponse({'message': 'Room deleted'})

        # GET below
        # Check if user is a player in this room
        try:
            Player.objects.get(user=request.user, room=room)
        except Player.DoesNotExist:
            return JsonResponse({'error': 'You are not a player in this room'}, status=403)

        players = []
        for p in room.players.all():
            players.append({
                'id': p.id,
                'username': p.user.username,
                'has_secret_number': bool(p.secret_number),
                'is_winner': p.is_winner,
                'joined_at': p.joined_at.isoformat()
            })

        recent_guesses = []
        for guess in Guess.objects.filter(room=room).order_by('-timestamp')[:10]:
            recent_guesses.append({
                'player': guess.player.user.username,
                'target_player': guess.target_player.user.username,
                'guess': guess.guess_number,
                'strikes': guess.strikes,
                'balls': guess.balls,
                'is_correct': guess.is_correct,
                'timestamp': guess.timestamp.isoformat()
            })

        return JsonResponse({
            'room': {
                'id': str(room.id),
                'name': room.name,
                'status': room.status,
                'max_players': room.max_players,
                'turn_time_limit': room.turn_time_limit,
                'current_turn_player': room.current_turn_player.username if room.current_turn_player else None,
                'turn_start_time': room.turn_start_time.isoformat() if room.turn_start_time else None,
                'created_at': room.created_at.isoformat(),
                'creator_username': room.creator.username if room.creator else None,
                'is_private': room.is_private,
            },
            'players': players,
            'recent_guesses': recent_guesses
        })

    except GameRoom.DoesNotExist:
        return JsonResponse({'error': 'Room not found'}, status=404)


class StatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Basic stats computed from models
        players = Player.objects.filter(user=request.user)
        games_played = players.count()
        games_won = players.filter(is_winner=True).count()
        total_guesses = Guess.objects.filter(player__user=request.user).count()

        # Average guesses to win (simple approach): count guesses by the user in rooms they won
        wins = players.filter(is_winner=True)
        guesses_to_win = []
        for p in wins:
            # guesses by this player in this room up to and including correct guess
            qs = Guess.objects.filter(player=p, room=p.room).order_by('timestamp')
            count = 0
            for g in qs:
                count += 1
                if g.is_correct:
                    break
            if count > 0:
                guesses_to_win.append(count)
        avg_guesses = sum(guesses_to_win) / len(guesses_to_win) if guesses_to_win else 0.0

        return JsonResponse({
            'games_played': games_played,
            'games_won': games_won,
            'total_guesses': total_guesses,
            'average_guesses_to_win': round(avg_guesses, 2),
        })


@method_decorator(csrf_exempt, name='dispatch')
class RematchView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, room_id):
        """Create a rematch room with the same players and settings"""
        try:
            # Get the original room
            original_room = GameRoom.objects.get(id=room_id)
            
            # Only allow rematch if the game is finished
            if original_room.status != GameRoom.FINISHED:
                return JsonResponse({'error': 'Can only rematch finished games'}, status=400)
            
            # Determine acting user: authenticated user or guest username provided in payload
            data = request.data if hasattr(request, 'data') else json.loads(request.body or '{}')
            acting_user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
            if not acting_user:
                guest_name = (data.get('username') or '').strip()
                if guest_name:
                    acting_user, _ = User.objects.get_or_create(username=guest_name)
            
            if not acting_user:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            # Check if the user was a player in the original room
            try:
                Player.objects.get(user=acting_user, room=original_room)
            except Player.DoesNotExist:
                return JsonResponse({'error': 'Only players from the original game can create a rematch'}, status=403)
            
            # Create new room with same settings but new name
            room_name = f"Rematch: {original_room.name}"
            new_room = GameRoom.objects.create(
                name=room_name,
                max_players=original_room.max_players,
                turn_time_limit=original_room.turn_time_limit,
                creator=acting_user,
                is_private=original_room.is_private,
                password=original_room.password
            )
            
            # Add all players from the original room to the new room
            original_players = original_room.players.all().order_by('joined_at')
            for original_player in original_players:
                # Determine team assignment - keep the same team structure
                Player.objects.create(
                    user=original_player.user,
                    room=new_room,
                    team=original_player.team
                )
            
            # If room is now full, move to setting numbers phase
            if new_room.is_full:
                new_room.status = GameRoom.SETTING_NUMBERS
                new_room.save()
            
            return JsonResponse({
                'message': 'Rematch room created successfully',
                'room_id': str(new_room.id),
                'room_name': new_room.name,
                'room_status': new_room.status
            })
            
        except GameRoom.DoesNotExist:
            return JsonResponse({'error': 'Original room not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': 'Failed to create rematch room'}, status=500)
