from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views

urlpatterns = [
    # Public health check
    path('health/', views.health, name='health'),
    # JWT auth endpoints
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Simple helper endpoints
    path('auth/register/', views.register, name='register'),
    path('auth/me/', views.MeView.as_view(), name='me'),
    path('stats/', views.StatsView.as_view(), name='stats'),
    path('rooms/', views.GameRoomView.as_view(), name='game_rooms'),
    path('rooms/<uuid:room_id>/', views.room_detail, name='room_detail'),
    path('rooms/<uuid:room_id>/join/', views.JoinRoomView.as_view(), name='join_room'),
]
