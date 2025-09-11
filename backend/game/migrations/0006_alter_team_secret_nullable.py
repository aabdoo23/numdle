from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('game', '0005_merge_20240911_teams'),
    ]

    operations = [
        migrations.AlterField(
            model_name='gameroom',
            name='team_a_secret',
            field=models.CharField(max_length=4, blank=True, null=True, default=''),
        ),
        migrations.AlterField(
            model_name='gameroom',
            name='team_b_secret',
            field=models.CharField(max_length=4, blank=True, null=True, default=''),
        ),
    ]
