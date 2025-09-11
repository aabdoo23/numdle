import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { GameRoom, User, RoomState, StatsSummary } from '../types/game';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- Auth Token Attachment & Refresh Handling ---------------------------------

// Helper to set Authorization header if access token exists
const attachAccessToken = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('bc_access_token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(attachAccessToken);

let refreshInFlight: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  if (refreshInFlight) return refreshInFlight; // de-duplicate parallel refreshes
  const refresh = localStorage.getItem('bc_refresh_token');
  if (!refresh) throw new Error('No refresh token');
  refreshInFlight = (async () => {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/token/refresh/`,
      { refresh },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const newAccess = data.access as string;
    if (!newAccess) throw new Error('No access token in refresh response');
    localStorage.setItem('bc_access_token', newAccess);
    return newAccess;
  })();
  try {
    const token = await refreshInFlight;
    return token;
  } finally {
    refreshInFlight = null;
  }
};

// Response interceptor to auto-refresh on 401 (once per request)
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const response = error.response;
    const originalConfig: any = error.config || {};
    if (response?.status === 401 && !originalConfig._retry) {
      // Avoid attempting refresh for auth endpoints themselves
      const url: string = originalConfig.url || '';
      if (/\/auth\/(token|token\/refresh|guest|register)/.test(url)) {
        // Direct auth failure; propagate
        return Promise.reject(error);
      }
      try {
        originalConfig._retry = true;
        const newAccess = await refreshAccessToken();
        // Re-attach updated token and retry original request
        originalConfig.headers = originalConfig.headers || {};
        originalConfig.headers.Authorization = `Bearer ${newAccess}`;
        return api.request(originalConfig);
      } catch (refreshErr) {
        // Hard logout on refresh failure
        localStorage.removeItem('bc_access_token');
        localStorage.removeItem('bc_refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export const gameApi = {
  // Authentication
  register: async (username: string, password: string): Promise<User> => {
    // Perform registration, then immediately login to obtain tokens for seamless UX
    const response = await api.post('/auth/register/', { username, password });
    try {
      // Attempt automatic login to store tokens
      const loginRes = await api.post('/auth/token/', { username, password });
      const access = (loginRes.data as any).access as string | undefined;
      const refresh = (loginRes.data as any).refresh as string | undefined;
      if (access && refresh) {
        localStorage.setItem('bc_access_token', access);
        localStorage.setItem('bc_refresh_token', refresh);
      }
    } catch {
      // Silent; user can manually login if auto-login fails
    }
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
