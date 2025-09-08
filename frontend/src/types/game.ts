export interface User {
  id: number;
  username: string;
}

export interface Player {
  id: number;
  username: string;
  has_secret_number: boolean;
  is_winner: boolean;
  joined_at?: string;
  team?: 'A' | 'B';
  secret_number?: string; // present for self always, and for everyone at game end
}

export interface GameRoom {
  id: string;
  name: string;
  status: 'waiting' | 'setting_numbers' | 'playing' | 'finished';
  max_players: number;
  turn_time_limit: number;
  current_turn_player: string | null;
  turn_start_time: string | null;
  created_at: string;
  creator_username?: string | null;
  is_private?: boolean;
  player_count?: number;
}

export interface Guess {
  player: string;
  target_player: string;
  guess: string;
  strikes: number;
  balls: number;
  is_correct: boolean;
  timestamp: string;
}

export interface RoomState {
  room_id: string;
  name: string;
  status: string;
  players: Player[];
  current_turn_player: string | null;
  current_turn_team?: 'A' | 'B' | null;
  turn_start_time: string | null;
  turn_time_limit: number;
  guesses: Guess[];
  creator_username?: string | null;
  is_private?: boolean;
  winner_username?: string | null;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface StatsSummary {
  games_played: number;
  games_won: number;
  total_guesses: number;
  average_guesses_to_win: number;
}
