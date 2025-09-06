from celery import Celery
from django.utils import timezone
from datetime import timedelta
from .models import GameRoom

app = Celery('bullscows_backend')

@app.task
def check_turn_timeout(room_id):
    """Check if the current turn has timed out"""
    try:
        room = GameRoom.objects.get(id=room_id)
        if room.status == GameRoom.PLAYING and room.turn_start_time:
            elapsed = timezone.now() - room.turn_start_time
            if elapsed.total_seconds() >= room.turn_time_limit:
                # Switch to next player
                players = list(room.players.all())
                current_index = next(i for i, p in enumerate(players) if p.user == room.current_turn_player)
                next_index = (current_index + 1) % len(players)
                room.current_turn_player = players[next_index].user
                room.turn_start_time = timezone.now()
                room.save()
                
                # Notify clients about turn timeout
                from channels.layers import get_channel_layer
                channel_layer = get_channel_layer()
                
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                loop.run_until_complete(
                    channel_layer.group_send(
                        f'game_{room_id}',
                        {
                            'type': 'turn_timeout',
                            'message': f'Turn timeout! Now it\'s {room.current_turn_player.username}\'s turn.'
                        }
                    )
                )
                
                # Schedule next timeout check
                check_turn_timeout.apply_async(args=[str(room_id)], countdown=room.turn_time_limit)
                
    except GameRoom.DoesNotExist:
        pass
