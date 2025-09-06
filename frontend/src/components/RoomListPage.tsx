import React, { useState, useEffect } from 'react';
import { Plus, Users, Clock, Play, LogOut, Lock, Unlock, Trash2, BarChart2 } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { gameApi } from '../services/api';
import type { GameRoom } from '../types/game';

export const RoomListPage: React.FC = () => {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [turnTimeLimit, setTurnTimeLimit] = useState(60);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const { user, logout, joinRoom, createRoom, isLoading, error } = useGame();
  const [stats, setStats] = useState<null | { games_played: number; games_won: number; total_guesses: number; average_guesses_to_win: number }>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRooms = async () => {
    try {
      const roomList = await gameApi.getRooms();
      setRooms(roomList);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const roomId = await createRoom(newRoomName, maxPlayers, turnTimeLimit, { isPrivate, password: isPrivate ? password : undefined });
    if (roomId) {
      setShowCreateForm(false);
      setNewRoomName('');
      setIsPrivate(false);
      setPassword('');
    }
  };

  const handleJoinRoom = async (roomId: string, isPrivate?: boolean) => {
    let password: string | undefined = undefined;
    if (isPrivate) {
      password = window.prompt('This room is private. Enter password:') || undefined;
      if (!password) return;
    }
    // We can't pass password to context joinRoom signature, so use API directly then connect
    try {
      await gameApi.joinRoom(roomId, password);
      await joinRoom(roomId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Delete this room? This cannot be undone.')) return;
    try {
      await gameApi.deleteRoom(roomId);
      await loadRooms();
    } catch (e) {
      console.error('Failed to delete room', e);
    }
  };

  const handleShowStats = async () => {
    try {
      const s = await gameApi.stats();
      setStats(s);
      setShowStats(true);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
              <h1 className="text-2xl font-bold text-gray-900">Game Rooms</h1>
              <p className="text-gray-600">Welcome back, {user?.username}!</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Room</span>
              </button>
              <button
                onClick={handleShowStats}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <BarChart2 className="w-4 h-4" />
                <span>My Stats</span>
              </button>
              <button
                onClick={logout}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Create room form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter room name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Players
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value={2}>2 Players</option>
                    <option value={3}>3 Players</option>
                    <option value={4}>4 Players</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Turn Time (seconds)
                  </label>
                  <select
                    value={turnTimeLimit}
                    onChange={(e) => setTurnTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={90}>90 seconds</option>
                    <option value={120}>2 minutes</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input id="private" type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  <label htmlFor="private" className="text-sm text-gray-700">Private (password)</label>
                </div>
                {isPrivate && (
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Set a room password"
                  />
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {isLoading ? 'Creating...' : 'Create Room'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rooms list */}
        <div className="space-y-4">
          {rooms.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms available</h3>
              <p className="text-gray-600 mb-4">Be the first to create a game room!</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Room</span>
              </button>
            </div>
          ) : (
            rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        room.status === 'waiting' ? 'bg-green-100 text-green-800' :
                        room.status === 'setting_numbers' ? 'bg-yellow-100 text-yellow-800' :
                        room.status === 'playing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {room.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {room.is_private ? (
                        <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <Lock className="w-3 h-3 mr-1" /> Private
                        </span>
                      ) : (
                        <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Unlock className="w-3 h-3 mr-1" /> Public
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{room.player_count ?? 0} / {room.max_players} players</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{room.turn_time_limit}s per turn</span>
                      </div>
                      {room.creator_username && (
                        <div className="flex items-center space-x-1">
                          <span>Creator:</span>
                          <span className="font-medium">{room.creator_username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleJoinRoom(room.id, room.is_private)}
                      disabled={isLoading || room.status === 'playing' || room.status === 'finished'}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>Join</span>
                    </button>
                    {room.creator_username === user?.username && (
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center space-x-1"
                        title="Delete room"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats modal */}
      {showStats && stats && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">My Stats</h3>
            <div className="space-y-2 text-gray-800">
              <div className="flex justify-between"><span>Games played</span><span className="font-medium">{stats.games_played}</span></div>
              <div className="flex justify-between"><span>Games won</span><span className="font-medium">{stats.games_won}</span></div>
              <div className="flex justify-between"><span>Total guesses</span><span className="font-medium">{stats.total_guesses}</span></div>
              <div className="flex justify-between"><span>Avg guesses to win</span><span className="font-medium">{stats.average_guesses_to_win}</span></div>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setShowStats(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
