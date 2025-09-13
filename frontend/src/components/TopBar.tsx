import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Clock, HelpCircle, MessageSquare, LogOut, Edit3 } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { MessageSubmission } from './MessageSubmission';

interface TopBarProps {
  page: 'login' | 'rooms' | 'game' | 'how-to-play';
  onBack?: () => void;
  onHowToPlay?: () => void;
  title?: string;
  subtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ page, onBack, onHowToPlay, title, subtitle }) => {
  const { user, currentRoom, changeUsername, logout } = useGame();
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) return;
    setIsChangingUsername(true);
    try {
      const success = await changeUsername(newUsername.trim());
      if (success) {
        setIsEditingUsername(false);
        setShowUserMenu(false);
        setNewUsername('');
      }
    } catch (error) {
      console.error('Failed to change username:', error);
    } finally {
      setIsChangingUsername(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const startEditingUsername = () => {
    setNewUsername(user?.username || '');
    setIsEditingUsername(true);
    setShowUserMenu(false);
  };

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
      case 'how-to-play':
        return {
          title: 'How to Play Numdle',
          subtitle: 'Learn the rules and strategies',
          showBack: !!onBack
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
              <img src="/logo.png" alt="Logo" className="w-28 object-contain" />
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
            {/* How to Play button */}
            {page !== 'how-to-play' && onHowToPlay && (
              <button
                onClick={onHowToPlay}
                className="text-secondary-600 hover:text-primary-900 flex items-center space-x-2 transition-colors p-2 rounded-lg hover:bg-neutral-100"
                title="How to Play"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="hidden sm:inline">How to Play</span>
              </button>
            )}

            {/* Contact Support button - only show if user has a username */}
            {user && (
              <button
                onClick={() => setShowMessageForm(true)}
                className="text-secondary-600 hover:text-primary-900 flex items-center space-x-2 transition-colors p-2 rounded-lg hover:bg-neutral-100"
                title="Contact Support"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="hidden sm:inline">Support</span>
              </button>
            )}

            {/* Game-specific status */}
            {page === 'game' && currentRoom && (
              <div className="hidden md:flex items-center space-x-3">
                {currentRoom.status === 'playing' && (
                  <div className="flex items-center space-x-2 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
                    <Clock className="w-4 h-4 text-secondary-600" />
                    <span className="text-sm font-medium text-secondary-700">
                      Team {currentRoom.current_turn_team}'s Turn
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
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-neutral-50 to-neutral-100 px-4 py-2 rounded-full border border-neutral-200 hover:bg-gradient-to-r hover:from-neutral-100 hover:to-neutral-200 transition-colors"
                >
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
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="font-medium text-secondary-800">{user.username}</p>
                      <p className="text-xs text-secondary-600">Signed in as guest</p>
                    </div>
                    
                    <button
                      onClick={startEditingUsername}
                      className="w-full px-4 py-2 text-left hover:bg-neutral-50 flex items-center space-x-2 text-secondary-700"
                      disabled={!!currentRoom}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Change Username</span>
                      {currentRoom && <span className="text-xs text-secondary-500 ml-auto">(Leave room first)</span>}
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left hover:bg-neutral-50 flex items-center space-x-2 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
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
      
      {/* Username Edit Modal */}
      {isEditingUsername && user && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setIsEditingUsername(false);
            setNewUsername('');
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-secondary-800 mb-4">Change Username</h3>
            
            <div className="mb-4">
              <label htmlFor="newUsername" className="block text-sm font-medium text-secondary-700 mb-2">
                New Username
              </label>
              <input
                id="newUsername"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newUsername.trim()) {
                    handleUsernameChange();
                  } else if (e.key === 'Escape') {
                    setIsEditingUsername(false);
                    setNewUsername('');
                  }
                }}
                autoFocus
              />
            </div>

            {currentRoom && (
              <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-md">
                <p className="text-sm text-warning-800">
                  <strong>Note:</strong> You need to leave your current room before changing your username.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditingUsername(false);
                  setNewUsername('');
                }}
                className="px-4 py-2 text-secondary-600 hover:text-secondary-800 font-medium transition-colors"
                disabled={isChangingUsername}
              >
                Cancel
              </button>
              <button
                onClick={handleUsernameChange}
                disabled={!newUsername.trim() || isChangingUsername || !!currentRoom}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
              >
                {isChangingUsername ? 'Changing...' : 'Change Username'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Message Submission Modal */}
      {showMessageForm && user && (
        <MessageSubmission
          username={user.username}
          onClose={() => setShowMessageForm(false)}
          onSuccess={() => {
            console.log('Message submitted successfully');
          }}
        />
      )}
    </div>
  );
};
