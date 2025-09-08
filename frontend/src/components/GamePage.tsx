import React, { useState, useEffect } from 'react';
import { Users, Clock, Send, Target, Trophy, Eye, EyeOff, Shield, Swords, Brain, Circle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { TopBar } from './TopBar';

export const GamePage: React.FC = () => {
  const [secretNumber, setSecretNumber] = useState('');
  const [guessDigits, setGuessDigits] = useState(['', '', '', '']);
  // Target is implicit: opponent team; no manual selection needed
  const [showSecret, setShowSecret] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [availableDigits, setAvailableDigits] = useState<boolean[]>(Array(10).fill(true));
  // 0: orange (possible), 1: green (only works here), 2: red (can't work here)
  const [slotDigits, setSlotDigits] = useState<number[][]>([
    Array(10).fill(0), Array(10).fill(0), Array(10).fill(0), Array(10).fill(0)
  ]);
  const [draftGuessDigits, setDraftGuessDigits] = useState<string[]>(['', '', '', '']);
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);

  const {
    currentRoom,
    user,
    leaveRoom,
    setSecretNumber: submitSecretNumber,
    makeGuess,
    error
  } = useGame();

  // Timer for turn countdown
  useEffect(() => {
    if (currentRoom?.turn_start_time && currentRoom.turn_time_limit) {
      const interval = setInterval(() => {
        const turnStart = new Date(currentRoom.turn_start_time!).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - turnStart) / 1000);
        const remaining = currentRoom.turn_time_limit - elapsed;
        setTimeLeft(Math.max(0, remaining));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentRoom?.turn_start_time, currentRoom?.turn_time_limit]);

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-brand p-8 border border-neutral-200">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4">No room found</h2>
          <button
            onClick={leaveRoom}
            className="bg-primary-900 hover:bg-primary-800 text-white px-6 py-3 rounded-lg shadow-brand transition-colors"
          >
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = currentRoom.players.find(p => p.username === user?.username);
  const myTeam = currentPlayer?.team;
  const isMyTurn = currentRoom.current_turn_player === user?.username;
  const canSetSecret = currentRoom.status === 'setting_numbers' && currentPlayer && !currentPlayer.has_secret_number;
  const gameFinished = currentRoom.status === 'finished';
  const winner = currentRoom.players.find(p => p.is_winner);

  // Open win modal when game finishes
  useEffect(() => {
    if (currentRoom?.status === 'finished') {
      setShowWinModal(true);
    } else {
      setShowWinModal(false);
    }
  }, [currentRoom?.status]);

  const handleSetSecret = () => {
    if (secretNumber.length === 4 && new Set(secretNumber).size === 4) {
      submitSecretNumber(secretNumber);
      setSecretNumber('');
    }
  };

  const handleMakeGuess = () => {
    const guess = guessDigits.join('');
    if (guess.length === 4 && isMyTurn && new Set(guess).size === 4) {
      // Target is chosen by backend (first opponent)
      makeGuess(guess);
      setGuessDigits(['', '', '', '']);
    }
  };

  const handleGuessDigitChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newDigits = [...guessDigits];
      newDigits[index] = value;
      setGuessDigits(newDigits);

      // Auto-focus next input
      if (value && index < 3) {
        const nextInput = document.getElementById(`guess-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleGuessKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !guessDigits[index] && index > 0) {
      const prevInput = document.getElementById(`guess-${index - 1}`);
      prevInput?.focus();
    } else if (e.key === 'Enter') {
      handleMakeGuess();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      const prevInput = document.getElementById(`guess-${index - 1}`);
      prevInput?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      const nextInput = document.getElementById(`guess-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleDraftDigitChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newDigits = [...draftGuessDigits];
      newDigits[index] = value;
      setDraftGuessDigits(newDigits);
      if (value && index < 3) {
        const nextInput = document.getElementById(`draft-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const validateNumber = (num: string) => {
    return /^\d+$/.test(num) && new Set(num).size === num.length;
  };

  const toggleDigit = (digit: number) => {
    const next = [...availableDigits];
    next[digit] = !next[digit];
    setAvailableDigits(next);
  };

  const toggleSlotDigit = (slotIndex: number, digit: number) => {
    const newSlotDigits = [...slotDigits];
    const currentState = newSlotDigits[slotIndex][digit];

    // Cycle through states: 0 (orange/possible) -> 1 (green/only here) -> 2 (red/can't work) -> 0
    newSlotDigits[slotIndex][digit] = (currentState + 1) % 3;
    setSlotDigits(newSlotDigits);
  };

  // (was: toggleImpossibleSlotDigit) — removed as feature is not used in UI

  return (
    <div className="min-h-screen bg-neutral-50">
      <TopBar
        page="game"
        onBack={leaveRoom}
        title={`Room ${currentRoom.name}`}
        subtitle={`${currentRoom.status.replace('_', ' ').toUpperCase()} • Team ${currentRoom.current_turn_team || (isMyTurn ? currentPlayer?.team : '')}`}
      />

      <div className="max-w-7xl mx-auto p-4">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          {/* Enhanced Turn indicator */}
          {currentRoom.status === 'playing' && (
            <div className="text-center mb-4">
              <div className={`text-3xl font-black flex items-center justify-center space-x-2 ${isMyTurn ? 'text-success-600' : 'text-warning-600'}`}>
                {isMyTurn ? (
                  <>
                    <Target className="w-8 h-8" />
                    <span>Your Turn!</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-8 h-8" />
                    <span>{currentRoom.current_turn_player}'s Turn</span>
                  </>
                )}
              </div>
              {timeLeft !== null && (
                <div className="mt-2 inline-flex items-center space-x-2 text-lg text-secondary-700 bg-neutral-100 px-4 py-2 rounded-full">
                  <Clock className="w-5 h-5" />
                  <span className="font-bold">{timeLeft}s remaining</span>
                </div>
              )}
            </div>
          )}

          {/* Players Panel in Header - Compact */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Players List - Compact */}
            <div>
              <h2 className="text-md font-bold text-secondary-900 mb-2 flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary-600" />
                <span>Players</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {currentRoom.players.map(player => (
                  <div
                    key={player.id}
                    className={`px-3 py-2 rounded-lg border transition-all text-sm ${player.username === user?.username
                      ? 'border-primary-300 bg-primary-50 text-primary-900'
                      : 'border-neutral-200 bg-neutral-50 text-secondary-800'
                      }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{player.username}</span>
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-bold ${player.team === 'A' ? 'bg-primary-200 text-primary-800' : 'bg-secondary-200 text-secondary-800'
                        }`}>
                        {player.team || '?'}
                      </span>
                      {player.username === user?.username && (
                        <span className="text-primary-600 text-xs">(You)</span>
                      )}
                      {player.is_winner && (
                        <Trophy className="w-3 h-3 text-warning-500" />
                      )}
                    </div>
                    <div className="text-xs text-secondary-600 mt-0.5">
                      {player.has_secret_number ? '✅ Ready' : '❌ Setting...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Secret Numbers Section */}
            <div>
              <h2 className="text-md font-bold text-secondary-900 mb-2 flex items-center space-x-2">
                <Target className="w-4 h-4 text-secondary-600" />
                <span>Secret Numbers</span>
              </h2>
              <div className="space-y-2">
                {currentRoom.players.map(player => (
                  <div key={player.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-secondary-700">{player.username}</span>
                    {player.username === user?.username ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-primary-100 font-mono text-sm">
                          {showSecret || currentRoom.status === 'finished' ? (player.secret_number || '----') : '••••'}
                        </span>
                        <button
                          onClick={() => setShowSecret(!showSecret)}
                          className="text-primary-600 hover:text-primary-800 text-xs px-1"
                        >
                          {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    ) : currentRoom.status === 'finished' && player.secret_number ? (
                      <span className="px-2 py-1 rounded bg-neutral-100 font-mono text-sm">
                        {player.secret_number}
                      </span>
                    ) : (
                      <span className="text-neutral-500 text-xs">
                        {player.has_secret_number ? 'Hidden' : 'Not set'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Game status messages */}
          {gameFinished && winner && (
            <div className="mt-4 bg-gradient-to-r from-success-50 to-success-100 border-2 border-success-200 rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-warning-500" />
                <span className="text-success-800 font-bold text-lg">
                  {winner.username === user?.username ? 'You won! Congratulations!' : `${winner.username} won the game!`}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-warning-50 border-2 border-warning-200 rounded-xl p-4">
              <p className="text-warning-800 font-semibold">{error}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Secret Number Setting */}
            {canSetSecret && (
              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl shadow-brand p-6 border-2 border-primary-200">
                <h2 className="text-2xl font-bold text-primary-900 mb-4 flex items-center">
                  <Target className="w-6 h-6 mr-2" />
                  Set Your Secret Number
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-primary-700 mb-3">
                      4-digit number (all unique digits)
                    </label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={secretNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setSecretNumber(value);
                        }}
                        className="flex-1 px-6 py-4 border-2 border-primary-300 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-500 text-center text-2xl font-mono font-bold"
                        placeholder="1234"
                        maxLength={4}
                      />
                    </div>
                    {secretNumber && !validateNumber(secretNumber) && (
                      <p className="text-warning-800 text-sm mt-2 font-medium">All digits must be unique</p>
                    )}
                  </div>
                  <button
                    onClick={handleSetSecret}
                    disabled={secretNumber.length !== 4 || !validateNumber(secretNumber)}
                    className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 disabled:from-neutral-400 disabled:to-neutral-400 text-white px-6 py-3 rounded-xl flex items-center space-x-2 font-bold text-lg transition-all shadow-brand"
                  >
                    <Target className="w-5 h-5" />
                    <span>Set Secret Number</span>
                  </button>
                </div>
              </div>
            )}

            {/* Enhanced Make Guess */}
            {currentRoom.status === 'playing' && isMyTurn && (
              <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-2xl shadow-brand p-6 border-2 border-success-200">
                <h2 className="text-2xl font-bold text-success-900 mb-4 flex items-center">
                  <Send className="w-6 h-6 mr-2" />
                  Make Your Guess
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-success-700 mb-3">
                      Your Guess
                    </label>
                    <div className="flex justify-center space-x-3">
                      {guessDigits.map((digit, index) => (
                        <input
                          key={index}
                          id={`guess-${index}`}
                          type="text"
                          value={digit}
                          onChange={(e) => handleGuessDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleGuessKeyDown(e, index)}
                          className="w-16 h-16 border-2 border-success-300 rounded-xl focus:ring-4 focus:ring-success-200 focus:border-success-500 text-center text-2xl font-mono font-bold"
                          placeholder="0"
                          maxLength={1}
                        />
                      ))}
                    </div>
                    {guessDigits.join('').length === 4 && new Set(guessDigits.join('')).size !== 4 && (
                      <p className="text-warning-800 text-sm mt-2 font-medium text-center">All digits must be unique</p>
                    )}
                  </div>
                  <button
                    onClick={handleMakeGuess}
                    disabled={guessDigits.join('').length !== 4 || new Set(guessDigits.join('')).size !== 4}
                    className="bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 disabled:from-neutral-400 disabled:to-neutral-400 text-white px-8 py-4 rounded-xl flex items-center justify-center space-x-3 font-bold text-lg transition-all w-full shadow-brand"
                  >
                    <Send className="w-6 h-6" />
                    <span>Submit Guess</span>
                    <span className="text-sm opacity-75">(Enter)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Our Team Guesses - Full Height */}
            <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-2xl shadow-brand border-2 border-success-300 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-success-800 flex items-center">
                  <Shield className="w-7 h-7 mr-3 text-success-600" />
                  Our Guesses - Team {myTeam}
                </h2>
                <div className="bg-success-200 text-success-800 px-3 py-1 rounded-full text-sm font-bold">
                  {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team === myTeam).length} attempts
                </div>
              </div>
              <div className="space-y-4 overflow-y-auto">
                {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team === myTeam).slice().reverse().map((g, i) => (
                  <div key={i} className="relative p-4 bg-white rounded-xl border-2 border-success-200 shadow-md hover:shadow-lg transition-all duration-300">
                    {g.is_correct && (
                      <div className="absolute -top-2 -right-2 bg-warning-400 text-warning-900 p-1 rounded-full shadow-lg">
                        <Trophy className="w-4 h-4" />
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="font-bold text-success-700">{g.player}</span>
                          <span className="text-emerald-500">→</span>
                          <span className="font-semibold text-gray-700">{g.target_player}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                            <Target className="w-3 h-3 mr-1" />
                            <span>{g.strikes}</span>
                          </div>
                          <div className="flex items-center bg-amber-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                            <Circle className="w-3 h-3 mr-1" />
                            <span>{g.balls}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center space-x-1">
                        {g.guess.split('').map((digit, idx) => (
                          <div key={idx} className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg text-center leading-12 text-xl font-black text-gray-800 shadow-sm border border-gray-300">
                            {digit}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team === myTeam).length === 0 && (
                  <div className="text-center py-12 text-emerald-600">
                    <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="font-bold text-lg">No team guesses yet</p>
                    <p className="text-sm opacity-75">Your team's attempts will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Game Rules */}
            <div className="bg-white rounded-2xl shadow-brand p-6 border border-neutral-200">
              <button
                onClick={() => setIsRulesExpanded(!isRulesExpanded)}
                className="w-full flex items-center justify-between text-xl font-bold text-secondary-900 mb-4 hover:text-primary-600 transition-colors"
              >
                <div className="flex items-center">
                  <Target className="w-6 h-6 mr-2 text-primary-600" />
                  <span>How to Play</span>
                </div>
                {isRulesExpanded ? (
                  <ChevronUp className="w-5 h-5 text-primary-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-primary-600" />
                )}
              </button>

              {isRulesExpanded && (
                <div className="space-y-3 text-sm animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center space-x-3 p-3 bg-primary-50 rounded-lg">
                    <Target className="w-6 h-6 text-primary-600" />
                    <div>
                      <div className="font-bold text-primary-800">Strikes</div>
                      <div className="text-primary-700">Correct digit in correct position</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-warning-50 rounded-lg">
                    <Circle className="w-6 h-6 text-warning-600" />
                    <div>
                      <div className="font-bold text-warning-800">Balls</div>
                      <div className="text-warning-700">Correct digit in wrong position</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-secondary-700">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                      <span>Use 4 unique digits (0-9)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Make your guess before time runs out</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4" />
                      <span>First to guess correctly wins!</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Work with your team to strategize</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Opponents' Guesses */}
            <div className="bg-neutral-50 rounded-2xl shadow-brand p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-secondary-700 flex items-center">
                  <Swords className="w-6 h-6 mr-3 text-secondary-500" />
                  Opponent Guesses
                </h2>
                <div className="bg-neutral-200 text-secondary-700 px-3 py-1 rounded-full text-sm font-bold">
                  {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team !== myTeam).length} attempts
                </div>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team !== myTeam).slice().reverse().map((g, i) => (
                  <div key={i} className="relative p-3 bg-white rounded-lg border border-neutral-300 shadow-sm hover:shadow-md transition-all duration-300">
                    {g.is_correct && (
                      <div className="absolute -top-1 -right-1 bg-warning-400 text-warning-900 p-1 rounded-full shadow-lg">
                        <Trophy className="w-3 h-3" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="font-bold text-secondary-700">{g.player}</span>
                        </div>
                        <div className="text-xs text-secondary-500">
                          {new Date(g.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-1">
                          {g.guess.split('').map((digit, idx) => (
                            <span key={idx} className="w-8 h-8 bg-neutral-100 rounded border text-center font-mono font-bold text-sm flex items-center justify-center">
                              {digit}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="flex items-center space-x-1">
                            <Target className="w-4 h-4 text-primary-500" />
                            <span className="font-bold text-primary-700">{g.strikes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Circle className="w-4 h-4 text-warning-500" />
                            <span className="font-bold text-warning-700">{g.balls}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team !== myTeam).length === 0 && (
                  <div className="text-center py-8 text-secondary-400">
                    <Swords className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No opponent guesses yet</p>
                  </div>
                )}
              </div>
            </div>
            {/* Enhanced Notes & Strategy */}
            <div className="bg-gradient-to-br from-secondary-50 to-neutral-50 rounded-2xl shadow-brand p-6 border-2 border-secondary-200">
              <h2 className="text-xl font-bold text-secondary-900 mb-4 flex items-center">
                <Brain className="w-6 h-6 mr-2 text-secondary-600" />
                Strategy & Notes
              </h2>

              {/* Enhanced Digit Tracker */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-secondary-700 mb-2">Overall Digit Availability</h3>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, d) => (
                    <button
                      key={d}
                      onClick={() => toggleDigit(d)}
                      className={`h-12 rounded-xl text-lg font-bold transition-all ${availableDigits[d]
                        ? 'bg-success-100 text-success-800 border-2 border-success-300 hover:bg-success-200'
                        : 'bg-warning-100 text-warning-800 border-2 border-warning-300 hover:bg-warning-200'
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-secondary-600 mt-2">
                  <span className="flex items-center"><span className="w-3 h-3 bg-success-100 rounded mr-1"></span>Available</span>
                  <span className="flex items-center"><span className="w-3 h-3 bg-warning-100 rounded mr-1"></span>Eliminated</span>
                </div>
              </div>

              {/* Position Analysis - Columns by Slot */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-secondary-700 mb-3">Position Analysis</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map(slotIndex => (
                    <div key={slotIndex} className="bg-white rounded-lg p-3 border border-secondary-200">
                      <h4 className="text-xs font-bold text-secondary-700 text-center mb-2">Slot {slotIndex + 1}</h4>
                      <div className="flex flex-col space-y-1">
                        {Array.from({ length: 10 }).map((_, digit) => {
                          const digitState = slotDigits[slotIndex][digit];
                          let buttonClass = '';

                          if (digitState === 0) {
                            // Orange - possible
                            buttonClass = 'bg-warning-400 text-white hover:bg-warning-500';
                          } else if (digitState === 1) {
                            // Green - only works here
                            buttonClass = 'bg-success-500 text-white hover:bg-success-600';
                          } else {
                            // Red - can't work here
                            buttonClass = 'bg-primary-400 text-white hover:bg-primary-500';
                          }

                          return (
                            <button
                              key={digit}
                              onClick={() => toggleSlotDigit(slotIndex, digit)}
                              className={`h-7 w-full rounded text-xs font-bold transition-all ${buttonClass}`}
                            >
                              {digit}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-secondary-600 flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-warning-400"></span>Possible</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-success-500"></span>Only Here</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-primary-400"></span>Can't Work</span>
                </div>
              </div>

              {/* Draft Guess */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-secondary-700 mb-2">Draft Guess</h3>
                <div className="flex items-center gap-2 justify-center">
                  {draftGuessDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`draft-${index}`}
                      type="text"
                      value={digit}
                      onChange={(e) => handleDraftDigitChange(index, e.target.value)}
                      className="w-12 h-12 border-2 border-secondary-300 rounded-lg focus:ring-4 focus:ring-secondary-100 focus:border-secondary-500 text-center text-lg font-mono font-bold"
                      placeholder="0"
                      maxLength={1}
                    />
                  ))}
                </div>
                {draftGuessDigits.join('').length === 4 && new Set(draftGuessDigits.join('')).size !== 4 && (
                  <p className="text-warning-800 text-xs mt-2 text-center">Digits must be unique</p>
                )}
                <div className="mt-3 flex items-center gap-2 justify-center">
                  <button
                    onClick={() => {
                      setGuessDigits(draftGuessDigits);
                      const first = document.getElementById('guess-0');
                      first?.focus();
                    }}
                    disabled={draftGuessDigits.join('').length !== 4 || new Set(draftGuessDigits.join('')).size !== 4}
                    className="px-4 py-2 rounded-lg font-semibold text-white bg-primary-600 disabled:bg-neutral-400 hover:bg-primary-700 transition-colors shadow-brand"
                  >
                    Copy to Guess
                  </button>
                  <button
                    onClick={() => setDraftGuessDigits(['', '', '', ''])}
                    className="px-4 py-2 rounded-lg font-semibold text-primary-700 bg-primary-100 hover:bg-primary-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Enhanced Notes */}
              <div>
                <h3 className="text-sm font-bold text-secondary-700 mb-2">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Track patterns, combinations, deductions..."
                  className="w-full min-h-32 p-4 border-2 border-secondary-200 rounded-xl focus:ring-4 focus:ring-secondary-100 focus:border-secondary-400 text-sm resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F2F4F3;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #57A773;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #15803d;
        }
      `}</style>

      {/* Game Over Modal */}
      {showWinModal && currentRoom.status === 'finished' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-brand-lg w-full max-w-lg p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-warning-500" /> Game Over
              </h3>
              <button
                onClick={() => setShowWinModal(false)}
                className="text-secondary-500 hover:text-secondary-800"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4">
              <div className="text-secondary-700">
                Winner: <span className="font-extrabold text-success-700">{currentRoom.winner_username || winner?.username || '—'}</span>
              </div>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 gap-0 text-sm bg-neutral-50 font-semibold text-secondary-600">
                <div className="px-4 py-2">Player</div>
                <div className="px-4 py-2">Secret Number</div>
              </div>
              <div>
                {currentRoom.players.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-2 items-center border-t">
                    <div className="px-4 py-2 font-medium">{p.username}</div>
                    <div className="px-4 py-2 font-mono text-lg">
                      {p.secret_number || '----'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setShowWinModal(false)}
                className="px-6 py-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-brand transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
