from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health, name='health'),
    path('admin/analytics/', views.admin_analytics, name='admin_analytics'),
    path('admin/rooms/', views.admin_list_rooms, name='admin_list_rooms'),
    path('admin/rooms/<uuid:room_id>/delete/', views.admin_force_delete_room, name='admin_force_delete_room'),
    path('admin/messages/', views.admin_list_messages, name='admin_list_messages'),
    path('admin/messages/<uuid:message_id>/', views.admin_update_message, name='admin_update_message'),
    path('messages/submit/', views.submit_message, name='submit_message'),
    path('rooms/', views.game_rooms, name='game_rooms'),
    path('rooms/<uuid:room_id>/', views.room_detail, name='room_detail'),
    path('rooms/<uuid:room_id>/join/', views.join_room, name='join_room'),
    path('rooms/<uuid:room_id>/rematch/', views.rematch, name='rematch'),
]
