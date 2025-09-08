import React, { useState } from 'react';
import { LogIn, UserPlus, UserCircle } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { TopBar } from './TopBar';

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, signInGuest, isLoading, error } = useGame();
  const [guestName, setGuestName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    const success = isLogin 
      ? await login(username, password)
      : await register(username, password);

    if (success) {
      setUsername('');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <TopBar page="login" />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        <div className="bg-white rounded-2xl shadow-brand-lg p-8 w-full max-w-md border border-neutral-200">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Site logo"
            className="mx-auto w-48 object-contain mb-4"
            loading="eager"
          />
          <p className="text-secondary-600">Guess the secret 4-digit number!</p>
        </div>

  <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-secondary-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
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

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary-700 hover:text-primary-900 text-sm font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        {/* Guest play */}
        <div className="mt-8 border-t border-neutral-200 pt-6">
          <div className="text-center mb-3 text-secondary-600">Or play as guest</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
              placeholder="Enter a temporary username"
            />
            <button
              onClick={async () => {
                if (!guestName.trim()) return;
                const ok = await signInGuest(guestName.trim());
                if (ok) setGuestName('');
              }}
              disabled={isLoading || !guestName.trim()}
              className="bg-success-500 hover:bg-success-600 disabled:bg-secondary-400 text-white font-medium px-4 rounded-lg flex items-center gap-2 transition-colors shadow-brand"
              type="button"
            >
              <UserCircle className="w-4 h-4" />
              Play as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
