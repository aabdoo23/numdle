from django.contrib import admin
from .models import GameRoom, Player, Guess, GameStats


@admin.register(GameRoom)
class GameRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'max_players', 'player_count', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name']
    readonly_fields = ['id', 'created_at']
    
    def player_count(self, obj):
        return obj.players.count()
    player_count.short_description = 'Players'


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ['user', 'display_name', 'room', 'has_secret_number', 'is_winner', 'joined_at']
    list_filter = ['is_winner', 'joined_at']
    search_fields = ['user__username', 'room__name']
    readonly_fields = ['joined_at']
    
    def has_secret_number(self, obj):
        return bool(obj.secret_number)
    has_secret_number.boolean = True
    has_secret_number.short_description = 'Has Secret Number'


@admin.register(Guess)
class GuessAdmin(admin.ModelAdmin):
    list_display = ['player', 'target_player', 'guess_number', 'strikes', 'balls', 'is_correct', 'timestamp']
    list_filter = ['is_correct', 'strikes', 'balls', 'timestamp']
    search_fields = ['player__user__username', 'target_player__user__username', 'guess_number']
    readonly_fields = ['timestamp']


@admin.register(GameStats)
class GameStatsAdmin(admin.ModelAdmin):
    list_display = ['player', 'games_played', 'games_won', 'win_rate', 'average_guesses_to_win']
    search_fields = ['player__user__username']
    
    def win_rate(self, obj):
        if obj.games_played > 0:
            return f"{(obj.games_won / obj.games_played) * 100:.1f}%"
        return "0.0%"
    win_rate.short_description = 'Win Rate'
