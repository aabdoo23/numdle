import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, RoomState, TeamStrategy } from '../types/game';
import { gameApi } from '../services/api';
import { gameWebSocket } from '../services/websocket';

interface GameContextType {
  user: User | null;
  isAuthenticated: boolean; // alias for !!user
  setGuestUsername: (username: string) => Promise<boolean>;
  changeUsername: (newUsername: string) => Promise<boolean>;
  logout: () => void;
  currentRoom: RoomState | null;
  teamStrategy: TeamStrategy | null;
  isConnected: boolean;
  joinRoom: (roomId: string, password?: string) => Promise<boolean>;
  createRoom: (name: string, maxPlayers?: number, turnTimeLimit?: number, options?: { isPrivate?: boolean; password?: string }) => Promise<string | null>;
  leaveRoom: () => void;
  setSecretNumber: (number: string) => void;
  makeGuess: (guess: string, targetPlayerId?: number) => void;
  rematch: () => Promise<boolean>;
  updateTeamStrategy: (partial: Partial<Omit<TeamStrategy, 'team' | 'version'>> & { optimistic?: boolean }) => void;
  changeTeam: (team: 'A' | 'B') => void;
  startGame: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  timeoutGraceEndsAt?: number | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [teamStrategy, setTeamStrategy] = useState<TeamStrategy | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeoutGraceEndsAt, setTimeoutGraceEndsAt] = useState<number | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // In guest-only mode we just locally persist a pseudo-user; no server auth or tokens.
  const setGuestUsername = useCallback(async (username: string): Promise<boolean> => {
    const clean = (username || '').trim();
    if (!clean) return false;
    setIsLoading(true);
    setError(null);
    try {
      // Create deterministic local id (hash) for stability across sessions on same device
      const id = Math.abs(Array.from(clean).reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0)) % 1000000000;
      const userData: User = { id, username: clean };
      setUser(userData);
      localStorage.setItem('bc_user', JSON.stringify(userData));
      return true;
    } catch (e) {
      setError('Failed to set username');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeUsername = useCallback(async (newUsername: string): Promise<boolean> => {
    const clean = (newUsername || '').trim();
    if (!clean) return false;
    
    // If user is in a room, they need to leave first
    if (currentRoom) {
      setError('Please leave the current room before changing your username');
      return false;
    }
    
    return await setGuestUsername(clean);
  }, [currentRoom, setGuestUsername]);

  const logout = useCallback(() => {
    // Disconnect websocket and clear room state
    if (isConnected) {
      gameWebSocket.disconnect();
      setIsConnected(false);
    }
    
    // Clear user data
    setUser(null);
    localStorage.removeItem('bc_user');
    localStorage.removeItem('bc_current_room');
    
    // Clear states
    setCurrentRoom(null);
    setTeamStrategy(null);
    setError(null);
    setTimeoutGraceEndsAt(null);
  }, [isConnected]);

  // On mount: restore guest username from localStorage
  useEffect(() => {
    // Ensure stable device id
    if (!localStorage.getItem('bc_device_id')) {
      const newId = crypto.randomUUID();
      localStorage.setItem('bc_device_id', newId);
    }
    const raw = localStorage.getItem('bc_user');
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
  }, []);

  // Auto-rejoin room on refresh if we have a cached room id
  useEffect(() => {
    (async () => {
      if (!user) return;
      const cachedRoomId = localStorage.getItem('bc_current_room');
      if (cachedRoomId && !currentRoom) {
        try {
          // Ensure membership (handles rejoin case on backend)
          const deviceId = localStorage.getItem('bc_device_id') || '';
          await gameApi.joinRoom(cachedRoomId, undefined, user.username, deviceId);
        } catch {}
        // Connect websocket and request state
        try {
          await gameWebSocket.connect(cachedRoomId);
          setIsConnected(true);
          const applyRoomState = (incoming: any) => {
            // Normalize payload shape (may be {room_state: {...}} or direct RoomState)
            const raw: any = (incoming && (incoming.room_state || incoming)) as RoomState;
            if (!raw) return;
            setCurrentRoom(prev => {
              if (!prev) return raw as RoomState;
              // Merge secret_number fields so generic broadcasts don't erase personalized data
              if (prev.players && raw.players) {
                const userTeam = prev.players.find(p => p.username === user?.username)?.team;
                const mergedPlayers = raw.players.map((np: any) => {
                  const prevMatch: any = prev.players.find(pp => pp.id === np.id);
                  if (!np.secret_number && prevMatch?.secret_number && userTeam && prevMatch.team === userTeam) {
                    return { ...np, secret_number: prevMatch.secret_number };
                  }
                  return np;
                });
                return { ...raw, players: mergedPlayers } as RoomState;
              }
              return raw as RoomState;
            });
          };
          gameWebSocket.onMessage('room_state_update', applyRoomState);
          gameWebSocket.onMessage('team_strategy_init', (data: TeamStrategy) => {
            setTeamStrategy(data);
          });
          gameWebSocket.onMessage('team_strategy_update', (data: TeamStrategy) => {
            setTeamStrategy(prev => {
              if (!prev || data.team === prev.team) return data;
              return prev;
            });
          });
          gameWebSocket.onMessage('team_strategy_conflict', (data: TeamStrategy) => {
            setTeamStrategy(data);
          });
          gameWebSocket.onMessage('game_message', (data: { message: string }) => {
            setError(data.message);
            setTimeout(clearError, 3000);
          });
          gameWebSocket.onMessage('turn_timeout', (data: { message: string }) => {
            setError(data.message);
            setTimeout(clearError, 4000);
            // Start 3s grace countdown display
            setTimeoutGraceEndsAt(Date.now() + 3000);
          });
          gameWebSocket.requestRoomState();
          gameWebSocket.requestTeamStrategy();
        } catch (e) {
          console.error('Auto-rejoin failed:', e);
        }
      }
    })();
  }, [user]);

  const joinRoom = useCallback(async (roomId: string, password?: string): Promise<boolean> => {
    if (!user) return false;
    
    setIsLoading(true);
    setError(null);
    try {
  // For guests, include username so backend can create membership if tokenless
  const deviceId = localStorage.getItem('bc_device_id') || '';
  await gameApi.joinRoom(roomId, password, user.username, deviceId);
      
      // Connect WebSocket
      await gameWebSocket.connect(roomId);
      setIsConnected(true);
  localStorage.setItem('bc_current_room', roomId);
      
      // Set up WebSocket handlers
      const applyRoomState = (incoming: any) => {
        const raw: any = (incoming && (incoming.room_state || incoming)) as RoomState;
        if (!raw) return;
        setCurrentRoom(prev => {
          if (!prev) return raw as RoomState;
          const userTeam = prev.players.find(p => p.username === user?.username)?.team;
          if (prev.players && raw.players) {
            const mergedPlayers = raw.players.map((np: any) => {
              const prevMatch: any = prev.players.find(pp => pp.id === np.id);
              if (!np.secret_number && prevMatch?.secret_number && userTeam && prevMatch.team === userTeam) {
                return { ...np, secret_number: prevMatch.secret_number };
              }
              return np;
            });
            return { ...raw, players: mergedPlayers } as RoomState;
          }
          return raw as RoomState;
        });
      };
      gameWebSocket.onMessage('room_state_update', applyRoomState);
      gameWebSocket.onMessage('team_strategy_init', (data: TeamStrategy) => setTeamStrategy(data));
      gameWebSocket.onMessage('team_strategy_update', (data: TeamStrategy) => {
        setTeamStrategy(prev => (!prev || data.team === prev.team) ? data : prev);
      });
      gameWebSocket.onMessage('team_strategy_conflict', (data: TeamStrategy) => setTeamStrategy(data));
      
      gameWebSocket.onMessage('game_message', (data: { message: string }) => {
        setError(data.message);
        setTimeout(clearError, 3000);
      });
      
      gameWebSocket.onMessage('turn_timeout', (data: { message: string }) => {
        setError(data.message);
        setTimeout(clearError, 4000);
        setTimeoutGraceEndsAt(Date.now() + 3000);
      });
      
      // Request initial room state
      gameWebSocket.requestRoomState();
  gameWebSocket.requestTeamStrategy();
      
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
      const joined = await joinRoom(roomData.room_id, options?.isPrivate ? options?.password : undefined);
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
  setTeamStrategy(null);
    setIsConnected(false);
  localStorage.removeItem('bc_current_room');
  }, []);


  const makeGuess = useCallback((guess: string, targetPlayerId?: number) => {
    if (isConnected) {
      if (typeof targetPlayerId === 'number') {
        gameWebSocket.makeGuess(guess, targetPlayerId);
      } else {
        gameWebSocket.makeGuess(guess);
      }
    }
  }, [isConnected]);

  const rematch = useCallback(async (): Promise<boolean> => {
    if (!user || !currentRoom) return false;
    setIsLoading(true);
    setError(null);
    try {
  const deviceId = localStorage.getItem('bc_device_id') || '';
  const rematchData = await gameApi.rematchRoom(currentRoom.room_id, user.username, deviceId);
      leaveRoom();
      const joined = await joinRoom(rematchData.room_id);
      return joined;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create rematch');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentRoom, leaveRoom, joinRoom]);

  // Debounced send mechanism (simple implementation using timeout ref)
  const strategySendRef = React.useRef<number | null>(null);
  const pendingStrategyRef = React.useRef<TeamStrategy | null>(null);

  const flushStrategy = useCallback(() => {
    if (pendingStrategyRef.current) {
      const s = pendingStrategyRef.current;
      gameWebSocket.updateTeamStrategy({
        version: s.version,
        notes: s.notes,
        slot_digits: s.slot_digits,
        draft_guess: s.draft_guess,
      });
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (strategySendRef.current) window.clearTimeout(strategySendRef.current);
    strategySendRef.current = window.setTimeout(() => {
      flushStrategy();
    }, 350); // 350ms debounce
  }, [flushStrategy]);

  const updateTeamStrategy = useCallback((partial: Partial<Omit<TeamStrategy, 'team' | 'version'>> & { optimistic?: boolean }) => {
    setTeamStrategy(prev => {
      if (!prev) return prev; // not loaded yet
      const next: TeamStrategy = {
        ...prev,
        ...partial,
        version: prev.version, // version only advances on server ack
      };
      pendingStrategyRef.current = next;
      if (partial.optimistic !== false) scheduleFlush();
      return next;
    });
  }, [scheduleFlush]);

  const value: GameContextType = {
    user,
    isAuthenticated: !!user,
    setGuestUsername,
    changeUsername,
    logout,
    currentRoom,
    teamStrategy,
    isConnected,
    joinRoom,
    createRoom,
    leaveRoom,
    setSecretNumber,
    makeGuess,
    rematch,
    updateTeamStrategy,
    changeTeam: (team: 'A' | 'B') => { if (isConnected) gameWebSocket.changeTeam(team); },
  startGame: () => { if (isConnected) gameWebSocket.startGame(); },
    isLoading,
    error,
    clearError,
    timeoutGraceEndsAt,
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
