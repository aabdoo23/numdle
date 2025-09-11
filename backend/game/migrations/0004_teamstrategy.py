from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


def init_team_strategy(apps, schema_editor):
    GameRoom = apps.get_model('game', 'GameRoom')
    TeamStrategy = apps.get_model('game', 'TeamStrategy')
    for room in GameRoom.objects.all():
        for team in ['A','B']:
            TeamStrategy.objects.get_or_create(room=room, team=team, defaults={
                'slot_digits': [[-1]*10 for _ in range(4)],
                'draft_guess': ['','','',''],
            })

class Migration(migrations.Migration):

    dependencies = [
        ('game', '0003_gameroom_current_turn_team_player_team'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TeamStrategy',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('team', models.CharField(choices=[('A', 'Team A'), ('B', 'Team B')], max_length=1)),
                ('notes', models.TextField(blank=True, default='')),
                ('slot_digits', models.JSONField(default=list)),
                ('draft_guess', models.JSONField(default=list)),
                ('version', models.PositiveIntegerField(default=1)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('room', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='team_strategies', to='game.gameroom')),
                ('last_editor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('room', 'team')}},
        ),
        migrations.RunPython(init_team_strategy, reverse_code=migrations.RunPython.noop),
    ]
