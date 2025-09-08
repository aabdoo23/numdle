import type { WebSocketMessage } from '../types/game';

export class GameWebSocket {
  private socket: WebSocket | null = null;
  private roomId: string | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.messageHandlers = new Map();
  }

  connect(roomId: string): Promise<void> {
    this.roomId = roomId;
    return new Promise((resolve, reject) => {
      try {
        const token = localStorage.getItem('bc_access_token');
        const guestUser = (() => { try { return JSON.parse(localStorage.getItem('bc_user') || 'null'); } catch { return null; } })();
        const base = (import.meta as any).env?.VITE_WS_BASE_URL || 'ws://localhost:8000';
        let qs = '';
        if (token) {
          qs = `?token=${encodeURIComponent(token)}`;
        } else if (guestUser?.username) {
          qs = `?guest=${encodeURIComponent(guestUser.username)}`;
        }
        const wsUrl = `${base}/ws/game/${roomId}/` + qs;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          // Ask server for the latest state immediately upon connection
          try {
            this.requestRoomState();
          } catch {}
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event);
          this.handleDisconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data || message);
    }
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.roomId) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(this.roomId!);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  offMessage(type: string) {
    this.messageHandlers.delete(type);
  }

  setSecretNumber(number: string) {
    this.send({
      type: 'set_secret_number',
      number,
    });
  }

  makeGuess(guess: string, targetPlayerId?: number) {
    this.send({
      type: 'make_guess',
      guess,
      ...(typeof targetPlayerId === 'number' ? { target_player_id: targetPlayerId } : {}),
    });
  }

  requestRoomState() {
    this.send({
      type: 'get_room_state',
    });
  }

  private send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageHandlers.clear();
    this.roomId = null;
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const gameWebSocket = new GameWebSocket();
