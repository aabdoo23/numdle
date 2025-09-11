import React, { useState } from 'react';
import { LogIn, UserPlus, UserCircle, HelpCircle, Play, X } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { TopBar } from './TopBar';

interface LoginPageProps {
  onHowToPlay?: () => void;
  onPlayClick?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onHowToPlay, onPlayClick }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { user, login, register, signInGuest, isLoading, error } = useGame();
  const [guestName, setGuestName] = useState('');

  const handlePlayClick = () => {
    if (user) {
      // User is already authenticated, go to rooms
      onPlayClick?.();
    } else {
      // User is not authenticated, show login options or guest login
      // If guest name is entered, sign in as guest
      if (guestName.trim()) {
        handleGuestLogin();
      } else {
        // Prompt for login or guest name
        setShowLoginModal(true);
      }
    }
  };

  const handleGuestLogin = async () => {
    if (!guestName.trim()) return;
    const ok = await signInGuest(guestName.trim());
    if (ok) {
      setGuestName('');
      onPlayClick?.();
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    const success = isLogin 
      ? await login(username, password)
      : await register(username, password);

    if (success) {
      setUsername('');
      setPassword('');
      setShowLoginModal(false);
      onPlayClick?.();
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

          {/* User Status */}
          {user && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-success-800">
                Welcome back, <span className="font-bold">{user.username}</span>!
              </p>
            </div>
          )}

          {/* Main Play Button */}
          <button
            onClick={handlePlayClick}
            disabled={isLoading}
            className="w-full bg-primary-900 hover:bg-primary-800 disabled:bg-secondary-400 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3 shadow-brand text-lg mb-6"
          >
            <Play className="w-6 h-6" />
            <span>{isLoading ? 'Please wait...' : 'Play Now'}</span>
          </button>

          {/* Guest Login Section (only show if not authenticated) */}
          {!user && (
            <div className="mb-6">
              <div className="text-center mb-3 text-secondary-600 text-sm">Play as guest</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
                  placeholder="Enter a temporary username"
                  onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
                />
                <button
                  onClick={handleGuestLogin}
                  disabled={isLoading || !guestName.trim()}
                  className="bg-success-500 hover:bg-success-600 disabled:bg-secondary-400 text-white font-medium px-4 rounded-lg flex items-center gap-2 transition-colors shadow-brand"
                  type="button"
                >
                  <UserCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Sign In Button (only show if not authenticated) */}
            {!user && (
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full bg-secondary-100 hover:bg-secondary-200 text-secondary-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Sign Up</span>
              </button>
            )}

            {/* How to Play Button */}
            {onHowToPlay && (
              <button
                onClick={onHowToPlay}
                className="w-full bg-primary-100 hover:bg-primary-200 text-primary-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span>How to Play</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-brand-lg p-6 w-full max-w-md border border-neutral-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-secondary-900">
                {isLogin ? 'Sign In' : 'Sign Up'}
              </h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="modal-username" className="block text-sm font-medium text-secondary-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="modal-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label htmlFor="modal-password" className="block text-sm font-medium text-secondary-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="modal-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                  <p className="text-primary-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full bg-primary-900 hover:bg-primary-800 disabled:bg-secondary-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-brand"
              >
                {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}</span>
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary-700 hover:text-primary-900 text-sm font-medium transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
