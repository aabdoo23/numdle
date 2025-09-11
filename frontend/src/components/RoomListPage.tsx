import React, { useState, useEffect } from 'react';
import { Plus, Users, Clock, Play, Lock, Unlock, Trash2, Search, RefreshCw } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { gameApi } from '../services/api';
import type { GameRoom } from '../types/game';
import { TopBar } from './TopBar';

interface RoomListPageProps {
  onHowToPlay?: () => void;
}

export const RoomListPage: React.FC<RoomListPageProps> = ({ onHowToPlay }) => {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<GameRoom[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [turnTimeLimit, setTurnTimeLimit] = useState(60);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const { user, joinRoom, createRoom, isLoading, error } = useGame();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    // Filter rooms based on search term
    const filtered = rooms.filter(room => {
      const searchLower = searchTerm.toLowerCase();
      return (
        room.name.toLowerCase().includes(searchLower) ||
        (room.creator_username && room.creator_username.toLowerCase().includes(searchLower))
      );
    });
    setFilteredRooms(filtered);
  }, [rooms, searchTerm]);

  const loadRooms = async () => {
    try {
      const roomList = await gameApi.getRooms();
      setRooms(roomList);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadRooms();
    } finally {
      setIsRefreshing(false);
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
      await gameApi.joinRoom(roomId, password, user?.username);
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

  // Stats removed in guest-only mode (endpoint requires auth)

  return (
    <div className="min-h-screen bg-neutral-50">
      <TopBar page="rooms" onHowToPlay={onHowToPlay} />
      <div className="max-w-4xl mx-auto p-4">
        {/* Action buttons */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-primary-900 hover:bg-primary-800 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-brand"
            >
              <Plus className="w-4 h-4" />
              <span>Create Room</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-brand"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            {/* Stats & logout removed for guest-only mode */}
          </div>
        </div>

        {/* Search bar */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search rooms by name or creator..."
              className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-secondary-600 mt-2">
              Showing {filteredRooms.length} of {rooms.length} rooms
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6">
            <p className="text-warning-800">{error}</p>
          </div>
        )}

        {/* Create room form */}
        {showCreateForm && (
          <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
            <h2 className="text-xl font-bold text-secondary-900 mb-4">Create New Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-secondary-700 font-medium mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                  placeholder="Enter room name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-secondary-700 font-medium mb-2">
                    Max Players
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                  >
                    <option value={2}>2 players</option>
                    <option value={4}>4 players</option>
                    <option value={6}>6 players</option>
                    <option value={8}>8 players</option>
                  </select>
                </div>
                <div>
                  <label className="block text-secondary-700 font-medium mb-2">
                    Turn Time Limit
                  </label>
                  <select
                    value={turnTimeLimit}
                    onChange={(e) => setTurnTimeLimit(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
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
                  <input
                    id="private"
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 text-primary-500 bg-neutral-100 border-neutral-300 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <label htmlFor="private" className="text-secondary-700 font-medium">Private (password)</label>
                </div>
                {isPrivate && (
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                    placeholder="Set a room password"
                  />
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary-900 hover:bg-primary-800 disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg transition-colors shadow-brand"
                >
                  {isLoading ? 'Creating...' : 'Create Room'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-neutral-300 hover:bg-neutral-400 text-secondary-700 px-6 py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )
        }

        {/* Rooms list */}
        <div className="space-y-4">
          {filteredRooms.length === 0 ? (
            searchTerm ? (
              <div className="bg-white rounded-2xl shadow-brand p-8 text-center border border-neutral-200">
                <Search className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-secondary-900 mb-2">No rooms found</h3>
                <p className="text-secondary-600 mb-4">No rooms match your search "{searchTerm}". Try a different search term.</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="bg-primary-900 hover:bg-primary-800 text-white px-6 py-3 rounded-lg transition-colors shadow-brand"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-brand p-8 text-center border border-neutral-200">
                <Users className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-secondary-900 mb-2">No rooms available</h3>
                <p className="text-secondary-600 mb-4">Be the first to create a game room!</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-primary-900 hover:bg-primary-800 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 shadow-brand transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Room</span>
                </button>
              </div>
            )
          ) : (
            filteredRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-2xl shadow-brand p-6 border border-neutral-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-secondary-900">{room.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${room.status === 'waiting' ? 'bg-success-100 text-success-800' :
                        room.status === 'setting_numbers' ? 'bg-warning-100 text-warning-800' :
                          room.status === 'playing' ? 'bg-primary-100 text-primary-800' :
                            'bg-neutral-100 text-neutral-800'
                        }`}>
                        {room.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {room.is_private ? (
                        <span className="flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary-100 text-secondary-800">
                          <Lock className="w-3 h-3 mr-1" /> Private
                        </span>
                      ) : (
                        <span className="flex items-center px-3 py-1 rounded-full text-xs font-bold bg-success-100 text-success-800">
                          <Unlock className="w-3 h-3 mr-1" /> Public
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-secondary-600">
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
                          <span className="font-bold">{room.creator_username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleJoinRoom(room.id, room.is_private)}
                      disabled={isLoading || room.status === 'playing' || room.status === 'finished'}
                      className="bg-primary-900 hover:bg-primary-800 disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-brand"
                    >
                      <Play className="w-4 h-4" />
                      <span>Join</span>
                    </button>
                    {room.creator_username === user?.username && (
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="bg-warning-100 hover:bg-warning-200 text-warning-800 px-4 py-3 rounded-lg flex items-center space-x-1 transition-colors"
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
      </div >

  {/* Stats modal removed */}
    </div >
  );
};
