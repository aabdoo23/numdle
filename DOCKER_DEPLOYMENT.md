# Numdle Backend Docker Deployment

This guide explains how to deploy the Numdle backend using Docker Compose on your custom server, replicating the functionality from Render.

## Prerequisites

- Docker and Docker Compose installed on your server
- At least 2GB RAM and 20GB disk space
- Port 8000 available for the backend service
- (Optional) Domain name and SSL certificate for production

## Quick Start

1. **Clone the repository and navigate to the project directory:**
   ```bash
   git clone <your-repo-url>
   cd numdle
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your configuration
   ```

3. **Generate a secure Django secret key:**
   ```bash
   python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```
   Copy this key to your `.env` file as `DJANGO_SECRET_KEY`.

4. **Start the services:**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations:**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

6. **Create a superuser (optional):**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

Your backend should now be running at `http://localhost:8000` (or your configured port).

## Configuration

### Environment Variables

Edit the `.env` file to configure your deployment:

#### Required Variables
- `DJANGO_SECRET_KEY`: Secure secret key for Django (generate a new one!)
- `DB_PASSWORD`: Secure password for PostgreSQL database
- `ADMIN_PASSWORD`: Password for the admin user

#### Optional Variables
- `DEBUG`: Set to `False` for production (default: False)
- `BACKEND_PORT`: Port for the backend service (default: 8000)
- `ALLOWED_HOSTS`: Comma-separated list of allowed hostnames
- `FRONTEND_ORIGIN`: URL of your frontend application
- `CSRF_TRUSTED_ORIGINS`: Comma-separated list of trusted origins for CSRF

### Services Included

The Docker Compose setup includes:

1. **Backend (Django + Daphne)**: Main application server
2. **PostgreSQL**: Database server
3. **Redis**: Cache and message broker for WebSocket connections
4. **Volumes**: Persistent storage for database and static files

### Optional Celery Services

If you need background task processing, uncomment the Celery services in `docker-compose.yml`:
- `celery-worker`: For processing background tasks
- `celery-beat`: For scheduled/periodic tasks

## Production Deployment

### Security Considerations

1. **Change default passwords**: Update all passwords in `.env`
2. **Use strong secret key**: Generate a new `DJANGO_SECRET_KEY`
3. **Set DEBUG=False**: Never run with debug mode in production
4. **Configure ALLOWED_HOSTS**: Restrict to your domain names
5. **Use HTTPS**: Configure SSL/TLS certificates

### Reverse Proxy Setup (Nginx)

For production, use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### SSL/HTTPS Setup

1. **Using Let's Encrypt with Certbot:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

2. **Update ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS** in `.env`:
   ```
   ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
   CSRF_TRUSTED_ORIGINS=https://your-domain.com
   ```

## Management Commands

### View logs
```bash
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f redis
```

### Restart services
```bash
docker-compose restart backend
docker-compose restart
```

### Update the application
```bash
git pull
docker-compose build backend
docker-compose up -d backend
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py collectstatic --noinput
```

### Backup database
```bash
docker-compose exec db pg_dump -U postgres numdle > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore database
```bash
docker-compose exec -T db psql -U postgres numdle < backup_file.sql
```

### Access Django shell
```bash
docker-compose exec backend python manage.py shell
```

### Run custom management commands
```bash
docker-compose exec backend python manage.py <command>
```

## Monitoring and Maintenance

### Health Checks

The backend service includes health checks. Monitor service status:
```bash
docker-compose ps
```

### Resource Usage

Monitor resource usage:
```bash
docker stats
```

### Log Rotation

Configure log rotation to prevent disk space issues:
```bash
# Add to /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Change BACKEND_PORT in .env or stop conflicting service
   sudo lsof -i :8000
   ```

2. **Database connection failed:**
   ```bash
   # Check if database is running
   docker-compose logs db
   # Restart database service
   docker-compose restart db
   ```

3. **Static files not loading:**
   ```bash
   # Recollect static files
   docker-compose exec backend python manage.py collectstatic --noinput
   ```

4. **WebSocket connection issues:**
   - Ensure Redis is running: `docker-compose logs redis`
   - Check firewall settings for WebSocket connections
   - Verify proxy configuration for WebSocket upgrades

### Performance Optimization

1. **Increase worker processes** in `docker-compose.yml`:
   ```yaml
   command: daphne -b 0.0.0.0 -p 8000 --workers 4 numdle_backend.asgi:application
   ```

2. **Configure PostgreSQL** for better performance:
   ```yaml
   environment:
     POSTGRES_SHARED_PRELOAD_LIBRARIES: pg_stat_statements
     POSTGRES_MAX_CONNECTIONS: 200
   ```

3. **Redis memory optimization**:
   ```yaml
   command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
   ```

## Differences from Render

This Docker setup provides the same functionality as your Render deployment with these key differences:

1. **Database**: Uses PostgreSQL container instead of managed database
2. **Redis**: Uses Redis container instead of managed Redis service
3. **SSL**: Requires manual SSL setup (vs automatic on Render)
4. **Scaling**: Manual scaling (vs automatic on Render)
5. **Monitoring**: Basic health checks (vs comprehensive monitoring on Render)

## Support

For issues specific to the application logic, refer to the main project documentation. For Docker-specific issues, check the troubleshooting section above or consult Docker documentation.