from celery import shared_task
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import GameRoom, Player

"""Turn timeout handling with delayed skip.

Flow:
1. At turn start external code should schedule check_turn_timeout(countdown=turn_time_limit).
2. When check_turn_timeout fires and detects expiry, it DOES NOT immediately switch turn.
    It broadcasts a 'turn_timeout' event and schedules skip_turn in 5 seconds, passing the
    original turn_start_time (epoch seconds) for idempotence.
3. If the player makes a guess during the 5 second grace period (turn_start_time resets),
    skip_turn aborts because the epoch no longer matches.
4. skip_turn performs team-aware turn advancement, broadcasts a game_message and asks
    all consumers to refresh room state, then schedules the next check_turn_timeout.
"""

@shared_task
def check_turn_timeout(room_id):
    """Detect turn expiry and announce upcoming skip (without switching immediately)."""
    try:
        room = GameRoom.objects.get(id=room_id)
    except GameRoom.DoesNotExist:
        return
    if room.status != GameRoom.PLAYING or not room.turn_start_time:
        return
    elapsed = timezone.now() - room.turn_start_time
    if elapsed.total_seconds() < room.turn_time_limit:
        # Not yet expired; optionally reschedule a safety check (not strictly needed)
        remaining = room.turn_time_limit - int(elapsed.total_seconds())
        check_turn_timeout.apply_async(args=[str(room_id)], countdown=remaining)
        return

    # Already expired; announce and schedule skip after 5s if not already scheduled.
    original_epoch = int(room.turn_start_time.timestamp())
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'game_{room_id}',
        {
            'type': 'turn_timeout',
            'message': 'Turn time expired! Skipping to next team in 5 seconds.'
        }
    )
    # Schedule skip
    skip_turn.apply_async(args=[str(room_id), original_epoch], countdown=5)


@shared_task
def skip_turn(room_id, original_turn_start_epoch):
    """Skip the current turn if still the same expired turn and advance to next team's player."""
    try:
        room = GameRoom.objects.get(id=room_id)
    except GameRoom.DoesNotExist:
        return
    if room.status != GameRoom.PLAYING or not room.turn_start_time:
        return
    # Abort if turn already advanced (turn_start_time changed)
    current_epoch = int(room.turn_start_time.timestamp())
    if current_epoch != original_turn_start_epoch:
        return

    players = list(room.players.order_by('joined_at'))
    if not players:
        return
    # Find current index
    try:
        current_index = next(i for i,p in enumerate(players) if p.user == room.current_turn_player)
    except StopIteration:
        current_index = 0
    current_team = players[current_index].team
    n = len(players)
    # Find next player from opposite team if possible
    next_player = None
    for step in range(1, n+1):
        cand = players[(current_index + step) % n]
        if cand.team != current_team:
            next_player = cand
            break
    if not next_player:
        # Fallback sequential
        next_player = players[(current_index + 1) % n]
    room.current_turn_player = next_player.user
    room.current_turn_team = next_player.team
    room.turn_start_time = timezone.now()
    room.save()

    # Use display name for the message
    display_name = next_player.display_name or next_player.user.username

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'game_{room_id}',
        {
            'type': 'game_message',
            'message': f"Turn skipped. Team {room.current_turn_team}'s player {display_name}'s turn now."
        }
    )
    async_to_sync(channel_layer.group_send)(
        f'game_{room_id}',
        {
            'type': 'refresh_room_state'
        }
    )

    # Schedule next timeout check for new turn
    check_turn_timeout.apply_async(args=[str(room_id)], countdown=room.turn_time_limit)
