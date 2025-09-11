import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.utils import timezone
from .models import GameRoom, Player, Guess, TeamStrategy
from .tasks import check_turn_timeout
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
        elif message_type == 'get_team_strategy':
            await self.send_team_strategy()
        elif message_type == 'update_team_strategy':
            await self.update_team_strategy(data)
        elif message_type == 'change_team':
            await self.change_team(data.get('team'))
            # After team change broadcast updated state so everyone sees new teams
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
            if not player.validate_secret_number(number):
                return False, "Invalid secret number. Must be 4 unique digits."
            room = player.room
            # Determine team
            team = player.team or 'A'
            # If team secret already set, reject (prevent overwriting)
            if team == 'A' and room.team_a_secret:
                return False, "Team A secret already set"
            if team == 'B' and room.team_b_secret:
                return False, f"Team {team} secret already set"

            # Set team secret and assign to all teammates' player.secret_number for compatibility
            if team == 'A':
                room.team_a_secret = number
                room.team_a_set_by = player
            else:
                room.team_b_secret = number
                room.team_b_set_by = player
            room.save(update_fields=['team_a_secret','team_b_secret','team_a_set_by','team_b_set_by'])
            for teammate in room.players.filter(team=team):
                if teammate.secret_number != number:
                    teammate.secret_number = number
                    teammate.save(update_fields=['secret_number'])

            # If both secrets set move to PLAYING and init first turn (Team A first)
            if room.status in (GameRoom.SETTING_NUMBERS, GameRoom.WAITING) and room.team_a_secret and room.team_b_secret:
                room.status = GameRoom.PLAYING
                first_a = room.players.filter(team='A').order_by('joined_at').first()
                if first_a:
                    room.current_turn_player = first_a.user
                    room.current_turn_team = 'A'
                    room.turn_start_time = timezone.now()
                room.save()
                # Schedule first turn timeout
                if room.turn_time_limit:
                    check_turn_timeout.apply_async(args=[str(room.id)], countdown=room.turn_time_limit)
            return True, "Team secret set"
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
                # Schedule next turn timeout
                if room.turn_time_limit:
                    check_turn_timeout.apply_async(args=[str(room.id)], countdown=room.turn_time_limit)
            
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

            # Determine current user's team (for personalized view) so teammates can all see the shared team secret
            current_user_team = None
            if personalized and current_user_id:
                try:
                    current_player_obj = room.players.get(user_id=current_user_id)
                    current_user_team = current_player_obj.team
                except Player.DoesNotExist:
                    current_user_team = None

            for player in room.players.all():
                reveal_secret = False
                team_secret = room.team_a_secret if player.team == 'A' else room.team_b_secret if player.team == 'B' else ''

                if finished:
                    reveal_secret = True  # end of game: reveal all
                elif personalized and current_user_id:
                    # Reveal if this is the requesting player OR if it's a teammate (shared team secret concept)
                    if player.user_id == current_user_id:
                        reveal_secret = True
                    elif current_user_team and player.team == current_user_team and team_secret:
                        reveal_secret = True

                # Mirror team secret into effective_secret so front-end can pick it up uniformly
                effective_secret = team_secret or player.secret_number
                players.append({
                    'id': player.id,
                    'username': player.user.username,
                    'has_secret_number': bool(team_secret),
                    'is_winner': player.is_winner,
                    'team': player.team,
                    **({'secret_number': effective_secret} if (reveal_secret or finished) else {})
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
                'winner_username': winner.user.username if winner else None,
                'winner_team': winner.team if winner else None,
                'team_a_secret_set': bool(room.team_a_secret),
                'team_b_secret_set': bool(room.team_b_secret),
                'team_a_set_by_username': room.team_a_set_by.user.username if room.team_a_set_by else None,
                'team_b_set_by_username': room.team_b_set_by.user.username if room.team_b_set_by else None,
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
            # Also push team strategy init for this user
            await self.send_team_strategy(init=True)

    async def room_state_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'room_state_update',
            'data': event['room_state']
        }))

    async def refresh_room_state(self, event):
        # Task requested a state refresh after turn skip
        await self.send_room_state()

    # --- Team Strategy Section ---
    @database_sync_to_async
    def _get_player_and_strategy(self):
        try:
            player = Player.objects.get(user=self.user, room_id=self.room_id)
            ts, _ = TeamStrategy.objects.get_or_create(
                room_id=self.room_id,
                team=player.team or 'A',
                defaults={
                    'slot_digits': [[-1]*10 for _ in range(4)],
                    'draft_guess': ['', '', '', '']
                }
            )
            ts.ensure_defaults(save=True)
            return player, ts
        except Player.DoesNotExist:
            return None, None

    @database_sync_to_async
    def _apply_team_strategy_update(self, team, version, notes, slot_digits, draft_guess):
        try:
            ts = TeamStrategy.objects.get(room_id=self.room_id, team=team)
            if version != ts.version:
                return False, self._serialize_team_strategy(ts)
            # Validation
            if not isinstance(slot_digits, list) or len(slot_digits) != 4:
                return False, self._serialize_team_strategy(ts)
            for row in slot_digits:
                if not isinstance(row, list) or len(row) != 10:
                    return False, self._serialize_team_strategy(ts)
            if not isinstance(draft_guess, list) or len(draft_guess) != 4:
                return False, self._serialize_team_strategy(ts)
            ts.notes = notes if isinstance(notes, str) else ts.notes
            ts.slot_digits = slot_digits
            ts.draft_guess = draft_guess
            ts.version += 1
            ts.last_editor = self.user if getattr(self.user, 'is_authenticated', False) else None
            ts.save()
            return True, self._serialize_team_strategy(ts)
        except TeamStrategy.DoesNotExist:
            return False, None

    # Synchronous helper (must NOT be decorated) used inside other sync DB functions
    def _serialize_team_strategy(self, ts):
        if not ts:
            return None
        return {
            'team': ts.team,
            'notes': ts.notes,
            'slot_digits': ts.slot_digits,
            'draft_guess': ts.draft_guess,
            'version': ts.version,
            'updated_at': ts.updated_at.isoformat() if ts.updated_at else None,
            'last_editor': ts.last_editor.username if ts.last_editor else None
        }

    @database_sync_to_async
    def _get_serialized_strategy_for_user(self):
        try:
            player = Player.objects.get(user=self.user, room_id=self.room_id)
            ts, _ = TeamStrategy.objects.get_or_create(
                room_id=self.room_id,
                team=player.team or 'A',
                defaults={
                    'slot_digits': [[-1]*10 for _ in range(4)],
                    'draft_guess': ['', '', '', '']
                }
            )
            ts.ensure_defaults(save=True)
            return self._serialize_team_strategy(ts)
        except Player.DoesNotExist:
            return None

    async def send_team_strategy(self, init=False):
        payload = await self._get_serialized_strategy_for_user()
        if not payload:
            return
        await self.send(text_data=json.dumps({
            'type': 'team_strategy_init' if init else 'team_strategy_update',
            'data': payload
        }))

    async def update_team_strategy(self, data):
        player, ts = await self._get_player_and_strategy()
        if not player or not ts:
            return
        ok, payload = await self._apply_team_strategy_update(
            ts.team,
            data.get('version'),
            data.get('notes', ts.notes),
            data.get('slot_digits', ts.slot_digits),
            data.get('draft_guess', ts.draft_guess)
        )
        if payload is None:
            return
        if not ok:
            await self.send(text_data=json.dumps({
                'type': 'team_strategy_conflict',
                'data': payload
            }))
            return
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'team_strategy_group_update',
                'payload': payload
            }
        )

    async def team_strategy_group_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'team_strategy_update',
            'data': event['payload']
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

    # --- Team Switching ---
    @database_sync_to_async
    def _can_change_team(self, desired_team):
        try:
            player = Player.objects.get(user=self.user, room_id=self.room_id)
            room = player.room
            # Can't change once playing started
            if room.status != GameRoom.SETTING_NUMBERS and room.status != GameRoom.WAITING:
                return False, "Cannot change teams after game has started"
            # Can't change if player already set secret number
            if player.secret_number:
                return False, "Cannot change team after setting secret number"
            # Validate desired team
            if desired_team not in ('A','B'):
                return False, "Invalid team"
            if player.team == desired_team:
                return True, "Already on that team"
            # Enforce balance: resulting difference should not exceed 1
            a_count = room.players.filter(team='A').count()
            b_count = room.players.filter(team='B').count()
            # Simulate move
            if player.team == 'A':
                a_count -= 1
            elif player.team == 'B':
                b_count -= 1
            if desired_team == 'A':
                a_count += 1
            else:
                b_count += 1
            if abs(a_count - b_count) > 1:
                return False, "Team change would unbalance teams"
            # Apply change
            player.team = desired_team
            player.save()
            return True, "Team changed"
        except Player.DoesNotExist:
            return False, "Player not found"

    async def change_team(self, desired_team):
        ok, message = await self._can_change_team(desired_team)
        if not ok:
            await self.send(text_data=json.dumps({
                'type': 'game_message',
                'message': message
            }))
        else:
            # Send success message only to requester (state broadcast covers rest)
            await self.send(text_data=json.dumps({
                'type': 'game_message',
                'message': message
            }))
