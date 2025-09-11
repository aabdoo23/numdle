from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('game', '0003_gameroom_current_turn_team_player_team'),
    ]

    operations = [
        migrations.AddField(
            model_name='gameroom',
            name='team_a_secret',
            field=models.CharField(blank=True, default='', max_length=4),
        ),
        migrations.AddField(
            model_name='gameroom',
            name='team_b_secret',
            field=models.CharField(blank=True, default='', max_length=4),
        ),
        migrations.AddField(
            model_name='gameroom',
            name='team_a_set_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='team_a_secret_set', to='game.player'),
        ),
        migrations.AddField(
            model_name='gameroom',
            name='team_b_set_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='team_b_secret_set', to='game.player'),
        ),
    ]
