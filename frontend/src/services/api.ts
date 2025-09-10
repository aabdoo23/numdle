import axios from 'axios';
import type { GameRoom, User, RoomState, StatsSummary } from '../types/game';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bc_access_token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const gameApi = {
  // Authentication
  register: async (username: string, password: string): Promise<User> => {
    const response = await api.post('/auth/register/', { username, password });
    return { id: response.data.user_id, username } as User;
  },

  guest: async (username: string): Promise<{ user: User; access: string; refresh: string }> => {
    const res = await api.post('/auth/guest/', { username });
    const access = res.data.access as string;
    const refresh = res.data.refresh as string;
    localStorage.setItem('bc_access_token', access);
    localStorage.setItem('bc_refresh_token', refresh);
    const user = { id: res.data.user_id, username: res.data.username } as User;
    return { user, access, refresh };
  },

  login: async (username: string, password: string): Promise<{ user: User; access: string; refresh: string }> => {
    const res = await api.post('/auth/token/', { username, password });
    const access = res.data.access as string;
    const refresh = res.data.refresh as string;
    localStorage.setItem('bc_access_token', access);
    localStorage.setItem('bc_refresh_token', refresh);
    // fetch user profile using token
    const me = await api.get('/auth/me/');
    const user = { id: me.data.user_id, username: me.data.username } as User;
    return { user, access, refresh };
  },

  me: async (): Promise<User> => {
    const response = await api.get('/auth/me/');
    return { id: response.data.user_id, username: response.data.username } as User;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('bc_access_token');
    localStorage.removeItem('bc_refresh_token');
  },

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

  joinRoom: async (roomId: string, password?: string, username?: string): Promise<{ message: string; room_status: string }> => {
    const payload: any = {};
    if (password) payload.password = password;
    if (username) payload.username = username;
    const response = await api.post(`/rooms/${roomId}/join/`, payload);
    return response.data;
  },

  rematchRoom: async (roomId: string, username?: string): Promise<{ room_id: string; room_name: string; room_status: string }> => {
    const payload: any = {};
    if (username) payload.username = username;
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

  stats: async (): Promise<StatsSummary> => {
    const response = await api.get('/stats/');
    return response.data as StatsSummary;
  },
};

export default api;
