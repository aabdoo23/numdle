# Numdle Web Game Backend

A real-time multiplayer implementation of the Numdle (also known as Cows and Bulls) number guessing game using Django, Django Channels, and WebSockets.

## Game Rules

- Players choose a 4-digit number with unique digits
- Players take turns guessing each other's numbers
- For each guess, the response indicates:
  - **Strikes**: Correct digits in correct positions
  - **Balls**: Correct digits in wrong positions
- First player to guess correctly wins
- Each turn has a time limit

## Features

- **Real-time gameplay** using WebSockets
- **Turn-based system** with configurable time limits
- **Multiple game rooms** support
- **User authentication** and session management
- **Game statistics** tracking
- **Admin interface** for game management
- **REST API** for game management
- **Automatic turn timeout** handling

## Technology Stack

- **Django 5.2** - Web framework
- **Django Channels** - WebSocket support
- **Redis** - Channel layer backend
- **SQLite** - Database (development)
- **Django CORS Headers** - Frontend integration

## Installation

1. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

5. **Install and start Redis:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   
   # macOS
   brew install redis
   brew services start redis
   ```

6. **Start development server:**
   ```bash
   python manage.py runserver
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login user

### Game Management
- `GET /api/rooms/` - List available rooms
- `POST /api/rooms/` - Create new room
- `GET /api/rooms/<room_id>/` - Get room details
- `POST /api/rooms/<room_id>/join/` - Join room

### WebSocket
- `ws://localhost:8000/ws/game/<room_id>/` - Game room WebSocket

## WebSocket Messages

### Client to Server

**Set Secret Number:**
```json
{
    "type": "set_secret_number",
    "number": "1234"
}
```

**Make Guess:**
```json
{
    "type": "make_guess",
    "guess": "5678",
    "target_player_id": 1
}
```

**Get Room State:**
```json
{
    "type": "get_room_state"
}
```

### Server to Client

**Room State Update:**
```json
{
    "type": "room_state_update",
    "data": {
        "room_id": "uuid",
        "name": "Room Name",
        "status": "playing",
        "players": [...],
        "current_turn_player": "username",
        "guesses": [...]
    }
}
```

**Game Message:**
```json
{
    "type": "game_message",
    "message": "Game started!"
}
```

**Turn Timeout:**
```json
{
    "type": "turn_timeout",
    "message": "Turn time expired!"
}
```

## Game Flow

1. **Room Creation**: Player creates a room with specific settings
2. **Player Joining**: Other players join the room
3. **Secret Number Setting**: All players set their 4-digit secret numbers
4. **Game Start**: Game begins with first player's turn
5. **Turn-based Guessing**: Players take turns guessing others' numbers
6. **Feedback**: Each guess receives strikes and balls feedback
7. **Win Condition**: First player to guess correctly wins
8. **Turn Timeout**: Automatic turn switching after time limit

## Testing

### Backend API Testing
```bash
python test_backend.py
```

### WebSocket Testing
1. Open `test_client.html` in a browser
2. Enter a room ID and connect
3. Test setting secret numbers and making guesses

### Example Usage
```bash
# Start the server
python manage.py runserver

# In another terminal, test the API
python test_backend.py

# Open test_client.html in browser for WebSocket testing
```

## Project Structure

```
backend/
├── bullscows_backend/          # Django project settings
│   ├── settings.py             # Main settings
│   ├── urls.py                 # URL routing
│   └── asgi.py                 # ASGI configuration
├── game/                       # Game application
│   ├── models.py               # Database models
│   ├── views.py                # REST API views
│   ├── consumers.py            # WebSocket consumers
│   ├── routing.py              # WebSocket routing
│   ├── admin.py                # Admin interface
│   └── urls.py                 # App URL patterns
├── requirements.txt            # Python dependencies
├── test_backend.py            # API test script
├── test_client.html           # WebSocket test client
└── README.md                  # This file
```

## Configuration

### Settings
- `TURN_TIME_LIMIT`: Default turn time in seconds (60)
- `MAX_PLAYERS`: Maximum players per room (2-4)
- `CHANNEL_LAYERS`: Redis configuration for WebSocket

### Environment Variables
- `DEBUG`: Development mode (True/False)
- `SECRET_KEY`: Django secret key
- `REDIS_URL`: Redis connection URL

## Production Deployment

1. **Set environment variables:**
   ```bash
   export DEBUG=False
   export SECRET_KEY="your-secret-key"
   export REDIS_URL="redis://localhost:6379"
   ```

2. **Configure database** (PostgreSQL recommended)

3. **Use proper ASGI server:**
   ```bash
   pip install uvicorn
   uvicorn bullscows_backend.asgi:application --host 0.0.0.0 --port 8000
   ```

4. **Configure reverse proxy** (Nginx/Apache)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.
