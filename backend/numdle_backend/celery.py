import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'numdle_backend.settings')

app = Celery('numdle_backend')

# Read config keys prefixed with CELERY_ from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks.py in installed apps
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):  # pragma: no cover (utility)
    print(f'Request: {self.request!r}')
