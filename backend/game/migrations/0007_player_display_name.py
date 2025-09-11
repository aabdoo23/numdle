from django.db import migrations, models


def backfill_display_names(apps, schema_editor):
    Player = apps.get_model('game', 'Player')
    for p in Player.objects.all():
        if not p.display_name:
            p.display_name = p.user.username[:30]
            p.save(update_fields=['display_name'])

class Migration(migrations.Migration):
    dependencies = [
        ('game', '0006_alter_team_secret_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='display_name',
            field=models.CharField(blank=True, help_text='Player chosen nickname; internal user.username may be g:<uuid>', max_length=30),
        ),
        migrations.RunPython(backfill_display_names, migrations.RunPython.noop),
    ]
