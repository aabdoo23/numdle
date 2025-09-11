from django.db import models
from django.contrib.auth.models import User
import uuid
import json


class GameRoom(models.Model):
    WAITING = 'waiting'
    SETTING_NUMBERS = 'setting_numbers'
    PLAYING = 'playing'
    FINISHED = 'finished'
    
    STATUS_CHOICES = [
        (WAITING, 'Waiting for players'),
        (SETTING_NUMBERS, 'Setting secret numbers'),
        (PLAYING, 'Game in progress'),
        (FINISHED, 'Game finished'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=WAITING)
    max_players = models.IntegerField(default=2)
    turn_time_limit = models.IntegerField(default=60)  # seconds
    created_at = models.DateTimeField(auto_now_add=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rooms', null=True, blank=True)
    is_private = models.BooleanField(default=False)
    password = models.CharField(max_length=64, blank=True)
    current_turn_player = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='current_turn_rooms')
    turn_start_time = models.DateTimeField(null=True, blank=True)
    current_turn_team = models.CharField(max_length=1, choices=[('A', 'Team A'), ('B', 'Team B')], null=True, blank=True)
    # Team-level secret numbers (single secret per team). We still mirror into Player.secret_number
    # for backwards compatibility with existing guess logic and client expectations.
    team_a_secret = models.CharField(max_length=4, blank=True, null=True, default='')
    team_b_secret = models.CharField(max_length=4, blank=True, null=True, default='')
    team_a_set_by = models.ForeignKey('Player', null=True, blank=True, on_delete=models.SET_NULL, related_name='team_a_secret_set')
    team_b_set_by = models.ForeignKey('Player', null=True, blank=True, on_delete=models.SET_NULL, related_name='team_b_secret_set')
    
    def __str__(self):
        return f"Room {self.name} ({self.status})"
    
    @property
    def is_full(self):
        return self.players.count() >= self.max_players
    
    @property
    def all_numbers_set(self):
        # Both teams' secrets must be set; mirrored player secrets ensure legacy checks pass
        # Retain player-level fall-back: if someone manually still per-player sets.
        if self.team_a_secret and self.team_b_secret:
            return True
        return all(player.secret_number for player in self.players.all())


class Player(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name='players')
    secret_number = models.CharField(max_length=4, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_winner = models.BooleanField(default=False)
    team = models.CharField(max_length=1, choices=[('A', 'Team A'), ('B', 'Team B')], blank=True)
    
    class Meta:
        unique_together = ['user', 'room']
    
    def __str__(self):
        return f"{self.user.username} in {self.room.name}"
    
    def validate_secret_number(self, number):
        """Validate that the secret number has 4 unique digits"""
        if len(number) != 4:
            return False
        if not number.isdigit():
            return False
        if len(set(number)) != 4:
            return False
        return True


class Guess(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='guesses')
    target_player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='received_guesses')
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE)
    guess_number = models.CharField(max_length=4)
    strikes = models.IntegerField()
    balls = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_correct = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.player.user.username} guessed {self.guess_number} -> {self.strikes}S {self.balls}B"
    
    @staticmethod
    def calculate_feedback(secret, guess):
        """Calculate strikes and balls for a guess"""
        if len(secret) != 4 or len(guess) != 4:
            return 0, 0
        
        strikes = sum(1 for i in range(4) if secret[i] == guess[i])
        common_digits = len(set(secret) & set(guess))
        balls = common_digits - strikes
        
        return strikes, balls


class GameStats(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    total_guesses = models.IntegerField(default=0)
    average_guesses_to_win = models.FloatField(default=0.0)
    games_won = models.IntegerField(default=0)
    games_played = models.IntegerField(default=0)
    
    def __str__(self):
        return f"Stats for {self.player.user.username}"


class TeamStrategy(models.Model):
    """Collaborative team strategy state (shared notes, slot matrix, draft guess).

    Stored separately to avoid bloating GameRoom and allow selective updates.
    slot_digits: 4 x 10 matrix of ints (-1 unknown, 0 possible, 1 confirmed, 2 cannot)
    draft_guess: list of 4 strings (single digits or empty)
    version: optimistic concurrency control counter
    """
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name='team_strategies')
    team = models.CharField(max_length=1, choices=[('A', 'Team A'), ('B', 'Team B')])
    notes = models.TextField(blank=True, default='')
    slot_digits = models.JSONField(default=list)  # Expect list[list[int]] length 4 x 10
    draft_guess = models.JSONField(default=list)  # Expect list[str] length 4
    version = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)
    last_editor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        unique_together = ('room', 'team')

    def ensure_defaults(self, save=False):
        changed = False
        if not isinstance(self.slot_digits, list) or len(self.slot_digits) != 4:
            self.slot_digits = [ [-1]*10 for _ in range(4) ]
            changed = True
        else:
            # Normalize rows length
            normalized = []
            for row in self.slot_digits:
                if not isinstance(row, list) or len(row) != 10:
                    normalized.append([-1]*10)
                    changed = True
                else:
                    normalized.append(row)
            self.slot_digits = normalized
        if not isinstance(self.draft_guess, list) or len(self.draft_guess) != 4:
            self.draft_guess = ['','','','']
            changed = True
        if changed and save:
            self.save(update_fields=['slot_digits','draft_guess'])
        return changed

    def __str__(self):
        return f"Strategy Room={self.room_id} Team={self.team} v{self.version}"
