import axios from 'axios';
import type { GameRoom, RoomState } from '../types/game';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Guest-only mode: no auth tokens. Username provided ad-hoc in payloads.

export const gameApi = {
  // Room management
  getRooms: async (): Promise<GameRoom[]> => {
    const response = await api.get('/rooms/');
  return response.data.rooms;
  },

  createRoom: async (name: string, maxPlayers = 2, turnTimeLimit = 60, options?: { isPrivate?: boolean; password?: string }): Promise<{ room_id: string; name: string }> => {
    const response = await api.post('/rooms/', {
      name,
      max_players: maxPlayers,
      turn_time_limit: turnTimeLimit,
      is_private: options?.isPrivate ?? false,
      password: options?.password ?? '',
    });
    return response.data;
  },

  joinRoom: async (roomId: string, password?: string, username?: string, deviceId?: string): Promise<{ message: string; room_status: string }> => {
    const payload: any = {};
    if (password) payload.password = password;
    if (username) payload.username = username;
    if (deviceId) payload.device_id = deviceId;
    const response = await api.post(`/rooms/${roomId}/join/`, payload);
    return response.data;
  },

  rematchRoom: async (roomId: string, username?: string, deviceId?: string): Promise<{ room_id: string; room_name: string; room_status: string }> => {
    const payload: any = {};
    if (username) payload.username = username;
    if (deviceId) payload.device_id = deviceId;
    const response = await api.post(`/rooms/${roomId}/rematch/`, payload);
    return response.data;
  },

  getRoomDetail: async (roomId: string): Promise<RoomState> => {
    const response = await api.get(`/rooms/${roomId}/`);
    return response.data;
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    await api.delete(`/rooms/${roomId}/`);
  },

  // Message submission system
  submitMessage: async (username: string, subject: string, message: string, messageType: 'bug_report' | 'feedback' | 'other' = 'other'): Promise<{ message: string; message_id: string }> => {
    const response = await api.post('/messages/submit/', {
      username,
      subject,
      message,
      message_type: messageType,
    });
    return response.data;
  },

  // stats endpoint removed in guest-only mode
};

export default api;
