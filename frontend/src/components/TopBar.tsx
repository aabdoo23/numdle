import React from 'react';
import { ArrowLeft, Users, Clock } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

interface TopBarProps {
  page: 'login' | 'rooms' | 'game';
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ page, onBack, title, subtitle }) => {
  const { user, currentRoom } = useGame();

  const getPageContent = () => {
    switch (page) {
      case 'login':
        return {
          title: 'Welcome to Numdle',
          subtitle: 'Enter your username to start playing',
          showBack: false
        };
      case 'rooms':
        return {
          title: 'Game Rooms',
          subtitle: 'Choose a room to join or create a new one',
          showBack: false
        };
      case 'game':
        return {
          title: title || `Room ${currentRoom?.name}`,
          subtitle: subtitle || currentRoom?.status?.replace('_', ' ').toUpperCase(),
          showBack: true
        };
      default:
        return {
          title: 'Numdle',
          subtitle: '',
          showBack: false
        };
    }
  };

  const pageContent = getPageContent();

  return (
    <div className="bg-white shadow-brand border-b border-primary-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Back button and Title */}
          <div className="flex items-center space-x-4">
            {pageContent.showBack && onBack && (
              <button
                onClick={onBack}
                className="text-secondary-600 hover:text-primary-900 flex items-center space-x-2 transition-colors p-2 rounded-lg hover:bg-neutral-100"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
            
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Logo" className="w-20 object-contain" />
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-primary-900 to-primary-700 bg-clip-text text-transparent">
                  {pageContent.title}
                </h1>
                {pageContent.subtitle && (
                  <p className="text-sm text-secondary-600 font-medium">
                    {pageContent.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right side - User info and game status */}
          <div className="flex items-center space-x-4">
            {/* Game-specific status */}
            {page === 'game' && currentRoom && (
              <div className="hidden md:flex items-center space-x-3">
                {currentRoom.status === 'playing' && (
                  <div className="flex items-center space-x-2 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
                    <Clock className="w-4 h-4 text-secondary-600" />
                    <span className="text-sm font-medium text-secondary-700">
                      {currentRoom.current_turn_player === user?.username ? 'Your Turn' : `${currentRoom.current_turn_player}'s Turn`}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 bg-success-100 px-3 py-1 rounded-full border border-success-200">
                  <Users className="w-4 h-4 text-success-700" />
                  <span className="text-sm font-medium text-success-800">
                    {currentRoom.players.length} player{currentRoom.players.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}

            {/* User info */}
            {user && (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-neutral-50 to-neutral-100 px-4 py-2 rounded-full border border-neutral-200">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-900 to-primary-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium text-secondary-800 hidden sm:inline">
                  {user.username}
                </span>
                {page === 'game' && currentRoom && (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-warning-100 text-warning-800 border border-warning-200">
                    Team {currentRoom.players.find(p => p.username === user.username)?.team || '?'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Game-specific additional info for mobile */}
        {page === 'game' && currentRoom && (
          <div className="mt-3 md:hidden flex flex-wrap gap-2">
            {currentRoom.status === 'playing' && (
              <div className="flex items-center space-x-2 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
                <Clock className="w-4 h-4 text-secondary-600" />
                <span className="text-sm font-medium text-secondary-700">
                  {currentRoom.current_turn_player === user?.username ? 'Your Turn' : `${currentRoom.current_turn_player}'s Turn`}
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 bg-success-100 px-3 py-1 rounded-full border border-success-200">
              <Users className="w-4 h-4 text-success-700" />
              <span className="text-sm font-medium text-success-800">
                {currentRoom.players.length} player{currentRoom.players.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
