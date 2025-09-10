import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.utils import timezone
from .models import GameRoom, Player, Guess
import asyncio


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'game_{self.room_id}'
        self.user = self.scope['user']
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Ensure the user is already a player (joining happens via REST). If not, close.
        player, room = await self.add_player_to_room()
        if player is None:
            await self.close()
            return
        # Backfill team if missing
        if not player.team:
            await self.ensure_player_team(player.id)
        # Ensure all players have a team (legacy rooms)
        await self.ensure_room_teams()
        
        # Send room state
        await self.send_room_state()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data['type']
        
        if message_type == 'set_secret_number':
            success, _ = await self.set_secret_number(data['number'])
            # Broadcast updated state so clients reflect changes immediately
            if success:
                await self.send_room_state()
        elif message_type == 'make_guess':
            target_id = data.get('target_player_id')
            success, err_or_payload = await self.make_guess(data['guess'], target_id)
            # Broadcast updated state so clients reflect changes immediately
            if success:
                await self.send_room_state()
            else:
                # Notify client of error
                await self.send(text_data=json.dumps({
                    'type': 'game_message',
                    'message': err_or_payload if isinstance(err_or_payload, str) else 'Failed to make guess'
                }))
        elif message_type == 'get_room_state':
            await self.send_room_state()

    @database_sync_to_async
    def add_player_to_room(self):
        try:
            room = GameRoom.objects.get(id=self.room_id)
            try:
                player = Player.objects.get(user=self.user, room=room)
            except Player.DoesNotExist:
                # Do not auto-create here; require REST join first
                return None, room
            return player, room
        except GameRoom.DoesNotExist:
            return None, None

    @database_sync_to_async
    def ensure_player_team(self, player_id):
        try:
            player = Player.objects.get(id=player_id)
            if not player.team:
                room = player.room
                a_count = room.players.filter(team='A').count()
                b_count = room.players.filter(team='B').count()
                player.team = 'A' if a_count <= b_count else 'B'
                player.save()
            return True
        except Player.DoesNotExist:
            return False

    @database_sync_to_async
    def ensure_room_teams(self):
        try:
            room = GameRoom.objects.get(id=self.room_id)
            players = list(room.players.order_by('joined_at'))
            a_count = room.players.filter(team='A').count()
            b_count = room.players.filter(team='B').count()
            for p in players:
                if not p.team:
                    # Assign to the smaller team using updated counts
                    if a_count <= b_count:
                        p.team = 'A'
                        a_count += 1
                    else:
                        p.team = 'B'
                        b_count += 1
                    p.save()
            return True
        except GameRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def set_secret_number(self, number):
        try:
            player = Player.objects.get(user=self.user, room_id=self.room_id)
            if player.validate_secret_number(number):
                player.secret_number = number
                player.save()
                
                # Check if all players have set their numbers
                room = player.room
                if room.status == GameRoom.SETTING_NUMBERS and room.all_numbers_set:
                    room.status = GameRoom.PLAYING
                    # Set first turn to Team A's earliest joined player
                    first_a = room.players.filter(team='A').order_by('joined_at').first()
                    if first_a:
                        room.current_turn_player = first_a.user
                        room.current_turn_team = 'A'
                        room.turn_start_time = timezone.now()
                        room.save()
                
                return True, "Secret number set successfully"
            else:
                return False, "Invalid secret number. Must be 4 unique digits."
        except Player.DoesNotExist:
            return False, "Player not found"

    @database_sync_to_async
    def make_guess(self, guess_number, target_player_id=None):
        try:
            player = Player.objects.get(user=self.user, room_id=self.room_id)
            room = player.room
            # Ensure teams are properly assigned
            if not player.team:
                a_count = room.players.filter(team='A').count()
                b_count = room.players.filter(team='B').count()
                player.team = 'A' if a_count <= b_count else 'B'
                player.save()

            # Backfill missing team assignments for any players
            a_count = room.players.filter(team='A').count()
            b_count = room.players.filter(team='B').count()
            for p in room.players.filter(team=''):
                p.team = 'A' if a_count <= b_count else 'B'
                p.save()
                if p.team == 'A':
                    a_count += 1
                else:
                    b_count += 1
            
            # Validate it's the player's turn
            if room.current_turn_player != self.user:
                return False, "Not your turn"
            
            # Validate guess format
            if len(guess_number) != 4 or not guess_number.isdigit():
                return False, "Invalid guess format"
            
            # Pick an opponent target automatically if not supplied: choose first opponent team player
            if not target_player_id:
                target_team = 'B' if player.team == 'A' else 'A'
                target_player = room.players.filter(team=target_team).order_by('joined_at').first()
            else:
                target_player = Player.objects.get(id=target_player_id, room=player.room)

            if not target_player:
                return False, "No opponent available to target"

            # Calculate feedback
            strikes, balls = Guess.calculate_feedback(target_player.secret_number, guess_number)
            is_correct = strikes == 4
            
            # Create guess record
            guess = Guess.objects.create(
                player=player,
                target_player=target_player,
                room=room,
                guess_number=guess_number,
                strikes=strikes,
                balls=balls,
                is_correct=is_correct
            )
            
            # Check for win condition
            if is_correct:
                player.is_winner = True
                player.save()
                room.status = GameRoom.FINISHED
                room.save()
            else:
                # Switch turns to next player from the opposite team
                players = list(room.players.order_by('joined_at'))
                try:
                    current_index = next(i for i, p in enumerate(players) if p.user == room.current_turn_player)
                except StopIteration:
                    # Fallback: if current_turn_player not found, start from current player
                    current_index = next((i for i, p in enumerate(players) if p.id == player.id), 0)
                current_team = players[current_index].team
                # find next player with different team; wrap around
                n = len(players)
                for step in range(1, n+1):
                    idx = (current_index + step) % n
                    if players[idx].team != current_team:
                        room.current_turn_player = players[idx].user
                        room.current_turn_team = players[idx].team
                        break
                room.turn_start_time = timezone.now()
                room.save()
            
            return True, {
                'guess': guess_number,
                'strikes': strikes,
                'balls': balls,
                'is_correct': is_correct,
                'target_player': target_player.user.username
            }
        except (Player.DoesNotExist, ValueError):
            return False, "Invalid guess"

    @database_sync_to_async
    def get_room_state(self, current_user_id=None, personalized=False):
        """Build a room state snapshot.

        If personalized=True and current_user_id is provided, include only THAT user's
        secret number (unless game finished). If personalized=False, never include
        any secret numbers unless the game has finished (then reveal all).
        This prevents leaking another player's secret via broadcasts triggered by them.
        """
        try:
            room = GameRoom.objects.get(id=self.room_id)
            players = []
            finished = room.status == GameRoom.FINISHED
            for player in room.players.all():
                reveal_secret = False
                if finished:
                    reveal_secret = True  # end of game: reveal all
                elif personalized and current_user_id and player.user_id == current_user_id:
                    reveal_secret = True  # only reveal requesting player's own secret mid‑game
                players.append({
                    'id': player.id,
                    'username': player.user.username,
                    'has_secret_number': bool(player.secret_number),
                    'is_winner': player.is_winner,
                    'team': player.team,
                    **({'secret_number': player.secret_number} if reveal_secret else {})
                })

            guesses = []
            for guess in Guess.objects.filter(room=room).order_by('timestamp'):
                guesses.append({
                    'player': guess.player.user.username,
                    'target_player': guess.target_player.user.username,
                    'guess': guess.guess_number,
                    'strikes': guess.strikes,
                    'balls': guess.balls,
                    'is_correct': guess.is_correct,
                    'timestamp': guess.timestamp.isoformat()
                })

            winner = room.players.filter(is_winner=True).order_by('joined_at').first()
            return {
                'room_id': str(room.id),
                'name': room.name,
                'status': room.status,
                'players': players,
                'current_turn_player': room.current_turn_player.username if room.current_turn_player else None,
                'current_turn_team': room.current_turn_team,
                'turn_start_time': room.turn_start_time.isoformat() if room.turn_start_time else None,
                'turn_time_limit': room.turn_time_limit,
                'guesses': guesses,
                'winner_username': winner.user.username if winner else None
            }
        except GameRoom.DoesNotExist:
            return None

    async def send_room_state(self):
        """Broadcast a generic state + send personalized state to this socket.

        Generic: no mid‑game secrets.
        Personalized: includes only this user's secret (or all if finished).
        """
        current_user_id = getattr(self.user, 'id', None)

        # Generic state for everyone
        generic_state = await self.get_room_state(None, personalized=False)
        if generic_state:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'room_state_update',
                    'room_state': generic_state
                }
            )

        # Personalized state just for this connection (if authenticated user exists)
        if current_user_id:
            personal_state = await self.get_room_state(current_user_id, personalized=True)
            if personal_state:
                await self.send(text_data=json.dumps({
                    'type': 'room_state_update',
                    'data': personal_state
                }))

    async def room_state_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'room_state_update',
            'data': event['room_state']
        }))

    async def game_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_message',
            'message': event['message']
        }))

    async def turn_timeout(self, event):
        await self.send(text_data=json.dumps({
            'type': 'turn_timeout',
            'message': 'Turn time expired!'
        }))
