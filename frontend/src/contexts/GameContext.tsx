import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, RoomState } from '../types/game';
import { gameApi } from '../services/api';
import { gameWebSocket } from '../services/websocket';

interface GameContextType {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Room state
  currentRoom: RoomState | null;
  isConnected: boolean;
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  joinRoom: (roomId: string) => Promise<boolean>;
  createRoom: (name: string, maxPlayers?: number, turnTimeLimit?: number, options?: { isPrivate?: boolean; password?: string }) => Promise<string | null>;
  leaveRoom: () => void;
  setSecretNumber: (number: string) => void;
  makeGuess: (guess: string, targetPlayerId?: number) => void;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: userData } = await gameApi.login(username, password);
      setUser(userData);
      localStorage.setItem('bc_user', JSON.stringify(userData));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await gameApi.register(username, password);
      setUser(userData);
      localStorage.setItem('bc_user', JSON.stringify(userData));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On mount: try to restore session via /auth/me/ (cookie-based) or fallback to cached user
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const me = await gameApi.me();
        if (!cancelled) setUser(me);
      } catch {
        // fallback to localStorage for smoother UX when backend not reachable
        const raw = localStorage.getItem('bc_user');
        if (raw && !cancelled) {
          try { setUser(JSON.parse(raw)); } catch {}
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-rejoin room on refresh if we have a cached room id
  useEffect(() => {
    (async () => {
      if (!user) return;
      const cachedRoomId = localStorage.getItem('bc_current_room');
      if (cachedRoomId && !currentRoom) {
        try {
          // Ensure membership (handles rejoin case on backend)
          await gameApi.joinRoom(cachedRoomId);
        } catch {}
        // Connect websocket and request state
        try {
          await gameWebSocket.connect(cachedRoomId);
          setIsConnected(true);
          gameWebSocket.onMessage('room_state_update', (data: RoomState) => {
            setCurrentRoom(data);
          });
          gameWebSocket.onMessage('game_message', (data: { message: string }) => {
            setError(data.message);
            setTimeout(clearError, 3000);
          });
          gameWebSocket.onMessage('turn_timeout', (data: { message: string }) => {
            setError(data.message);
            setTimeout(clearError, 3000);
          });
          gameWebSocket.requestRoomState();
        } catch (e) {
          console.error('Auto-rejoin failed:', e);
        }
      }
    })();
  }, [user]);

  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!user) return false;
    
    setIsLoading(true);
    setError(null);
    try {
      await gameApi.joinRoom(roomId);
      
      // Connect WebSocket
      await gameWebSocket.connect(roomId);
      setIsConnected(true);
  localStorage.setItem('bc_current_room', roomId);
      
      // Set up WebSocket handlers
      gameWebSocket.onMessage('room_state_update', (data: RoomState) => {
        setCurrentRoom(data);
      });
      
      gameWebSocket.onMessage('game_message', (data: { message: string }) => {
        setError(data.message);
        setTimeout(clearError, 3000);
      });
      
      gameWebSocket.onMessage('turn_timeout', (data: { message: string }) => {
        setError(data.message);
        setTimeout(clearError, 3000);
      });
      
      // Request initial room state
      gameWebSocket.requestRoomState();
      
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join room');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, clearError]);

  const createRoom = useCallback(async (name: string, maxPlayers = 2, turnTimeLimit = 60, options?: { isPrivate?: boolean; password?: string }): Promise<string | null> => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    try {
      const roomData = await gameApi.createRoom(name, maxPlayers, turnTimeLimit, options);
      
      // Automatically join the created room
      const joined = await joinRoom(roomData.room_id);
      return joined ? roomData.room_id : null;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create room');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, joinRoom]);

  const setSecretNumber = useCallback((number: string) => {
    if (isConnected) {
      gameWebSocket.setSecretNumber(number);
    }
  }, [isConnected]);

  const leaveRoom = useCallback(() => {
    gameWebSocket.disconnect();
    setCurrentRoom(null);
    setIsConnected(false);
  localStorage.removeItem('bc_current_room');
  }, []);

  const logout = useCallback(async () => {
    await gameApi.logout();
    setUser(null);
    localStorage.removeItem('bc_user');
  localStorage.removeItem('bc_current_room');
    leaveRoom();
  }, [leaveRoom]);

  const makeGuess = useCallback((guess: string, targetPlayerId?: number) => {
    if (isConnected) {
      if (typeof targetPlayerId === 'number') {
        gameWebSocket.makeGuess(guess, targetPlayerId);
      } else {
        gameWebSocket.makeGuess(guess);
      }
    }
  }, [isConnected]);

  const value: GameContextType = {
    user,
    isAuthenticated: !!user,
    currentRoom,
    isConnected,
    login,
    register,
    logout,
    joinRoom,
    createRoom,
    leaveRoom,
    setSecretNumber,
    makeGuess,
    isLoading,
    error,
    clearError,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
