import React, { useState } from 'react';
import { UserCircle, HelpCircle, Play, Edit3 } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { TopBar } from './TopBar';

interface LoginPageProps { onHowToPlay?: () => void; onPlayClick?: () => void; }

// Guest-only login page: pick a temporary username stored locally.
export const LoginPage: React.FC<LoginPageProps> = ({ onHowToPlay, onPlayClick }) => {
  const { user, setGuestUsername, isLoading, error, clearError } = useGame();
  const [tempName, setTempName] = useState('');
  const [editing, setEditing] = useState(false);

  const commitUsername = async () => {
    const name = (tempName || '').trim();
    if (!name) return;
    const ok = await setGuestUsername(name);
    if (ok) {
      setEditing(false);
      setTempName('');
      onPlayClick?.();
    }
  };

  const handlePlayClick = () => {
    if (user) {
      onPlayClick?.();
    } else if (tempName.trim()) {
      commitUsername();
    } else {
      setEditing(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <TopBar page="login" onHowToPlay={onHowToPlay} />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        <div className="bg-white rounded-2xl shadow-brand-lg p-8 w-full max-w-md border border-neutral-200">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="Site logo"
              className="mx-auto w-48 object-contain mb-4"
              loading="eager"
            />
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Welcome to Numdle</h1>
            <p className="text-secondary-600">Guess the secret 4-digit number!</p>
          </div>

          {user && !editing && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6 text-center flex flex-col gap-2">
              <p className="text-success-800">
                Playing as <span className="font-bold">{user.username}</span>
              </p>
              <button
                onClick={() => { setEditing(true); clearError(); }}
                className="inline-flex items-center gap-1 text-success-700 hover:text-success-900 text-sm font-medium"
              >
                <Edit3 className="w-4 h-4" /> Change name
              </button>
            </div>
          )}

          {/* Main Play Button */}
          <button
            onClick={handlePlayClick}
            disabled={isLoading}
            className="w-full bg-primary-900 hover:bg-primary-800 disabled:bg-secondary-400 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3 shadow-brand text-lg mb-6"
          >
            <Play className="w-6 h-6" />
            <span>{isLoading ? 'Please wait...' : (user ? 'Enter Rooms' : 'Play Now')}</span>
          </button>

          {/* Username Selection / Editing */}
          {(!user || editing) && (
            <div className="mb-6">
              <div className="text-center mb-3 text-secondary-600 text-sm">Choose a nickname (device-local)</div>
              <form
                onSubmit={(e) => { e.preventDefault(); commitUsername(); }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
                  placeholder="e.g. CodeCracker"
                  autoFocus
                />
                <button
                  onClick={commitUsername}
                  disabled={isLoading || !tempName.trim()}
                  className="bg-success-500 hover:bg-success-600 disabled:bg-secondary-400 text-white font-medium px-4 rounded-lg flex items-center gap-2 transition-colors shadow-brand"
                  type="submit"
                >
                  <UserCircle className="w-4 h-4" />
                </button>
              </form>
              {error && (
                <div className="mt-3 bg-primary-50 border border-primary-200 rounded-lg p-3">
                  <p className="text-primary-700 text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* How to Play */}
          {onHowToPlay && (
            <div className="space-y-3">
              <button
                onClick={onHowToPlay}
                className="w-full bg-primary-100 hover:bg-primary-200 text-primary-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span>How to Play</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
