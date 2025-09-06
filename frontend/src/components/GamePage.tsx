import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Clock, Send, Target, Trophy, Eye, EyeOff, Shield, Swords, Brain, Circle } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

export const GamePage: React.FC = () => {
  const [secretNumber, setSecretNumber] = useState('');
  const [guessDigits, setGuessDigits] = useState(['', '', '', '']);
  // Target is implicit: opponent team; no manual selection needed
  const [showSecret, setShowSecret] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [availableDigits, setAvailableDigits] = useState<boolean[]>(Array(10).fill(true));
  const [slotDigits, setSlotDigits] = useState<Set<string>[]>([new Set(), new Set(), new Set(), new Set()]);
  // Removed unused impossible slot state
  const [draftGuessDigits, setDraftGuessDigits] = useState<string[]>(['', '', '', '']);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No room found</h2>
          <button
            onClick={leaveRoom}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
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

  const toggleSlotDigit = (slotIndex: number, digit: string) => {
    const newSlotDigits = [...slotDigits];
    const currentSet = new Set(newSlotDigits[slotIndex]);

    if (currentSet.has(digit)) {
      currentSet.delete(digit);
    } else {
      currentSet.add(digit);
    }

    newSlotDigits[slotIndex] = currentSet;
    setSlotDigits(newSlotDigits);
  };

  // (was: toggleImpossibleSlotDigit) — removed as feature is not used in UI

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={leaveRoom}
                className="text-gray-600 hover:text-gray-900 flex items-center space-x-2 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Leave Room</span>
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                  <h1 className="text-3xl font-black text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Room {currentRoom.name}
                  </h1>
                </div>
                <p className="text-gray-600 font-medium">
                  Status: <span className="font-bold">{currentRoom.status.replace('_', ' ').toUpperCase()}</span> •
                  Team <span className="font-bold text-indigo-600">{currentRoom.current_turn_team || (isMyTurn ? currentPlayer?.team : '')}</span>
                </p>
              </div>
            </div>

            {/* Enhanced Turn indicator */}
            {currentRoom.status === 'playing' && (
              <div className="text-right">
                <div className={`text-3xl font-black flex items-center justify-end space-x-2 ${isMyTurn ? 'text-emerald-600' : 'text-orange-600'}`}>
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
                  <div className="mt-2 inline-flex items-center space-x-2 text-lg text-gray-700 bg-gray-100 px-4 py-2 rounded-full">
                    <Clock className="w-5 h-5" />
                    <span className="font-bold">{timeLeft}s remaining</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Game status messages */}
          {gameFinished && winner && (
            <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <span className="text-green-800 font-bold text-lg">
                  {winner.username === user?.username ? 'You won! Congratulations!' : `${winner.username} won the game!`}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Secret Number Setting */}
            {canSetSecret && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-indigo-200">
                <h2 className="text-2xl font-bold text-indigo-900 mb-4 flex items-center">
                  <Target className="w-6 h-6 mr-2" />
                  Set Your Secret Number
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-indigo-700 mb-3">
                      4-digit number (all unique digits)
                    </label>
                    <div className="flex space-x-3">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={secretNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setSecretNumber(value);
                        }}
                        className="flex-1 px-6 py-4 border-2 border-indigo-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-center text-2xl font-mono font-bold"
                        placeholder="1234"
                        maxLength={4}
                      />
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="px-4 py-4 border-2 border-indigo-300 rounded-xl hover:bg-indigo-50 transition-colors"
                      >
                        {showSecret ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                      </button>
                    </div>
                    {secretNumber && !validateNumber(secretNumber) && (
                      <p className="text-red-600 text-sm mt-2 font-medium">All digits must be unique</p>
                    )}
                  </div>
                  <button
                    onClick={handleSetSecret}
                    disabled={secretNumber.length !== 4 || !validateNumber(secretNumber)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-6 py-3 rounded-xl flex items-center space-x-2 font-bold text-lg transition-all"
                  >
                    <Target className="w-5 h-5" />
                    <span>Set Secret Number</span>
                  </button>
                </div>
              </div>
            )}

            {/* Enhanced Make Guess */}
            {currentRoom.status === 'playing' && isMyTurn && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-lg p-6 border-2 border-emerald-200">
                <h2 className="text-2xl font-bold text-emerald-900 mb-4 flex items-center">
                  <Send className="w-6 h-6 mr-2" />
                  Make Your Guess
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-emerald-700 mb-3">
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
                          className="w-16 h-16 border-2 border-emerald-300 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500 text-center text-2xl font-mono font-bold"
                          placeholder="0"
                          maxLength={1}
                        />
                      ))}
                    </div>
                    {guessDigits.join('').length === 4 && new Set(guessDigits.join('')).size !== 4 && (
                      <p className="text-red-600 text-sm mt-2 font-medium text-center">All digits must be unique</p>
                    )}
                  </div>
                  <button
                    onClick={handleMakeGuess}
                    disabled={guessDigits.join('').length !== 4 || new Set(guessDigits.join('')).size !== 4}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-8 py-4 rounded-xl flex items-center justify-center space-x-3 font-bold text-lg transition-all w-full"
                  >
                    <Send className="w-6 h-6" />
                    <span>Submit Guess</span>
                    <span className="text-sm opacity-75">(Enter)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Our Team Guesses - Full Height */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-xl border-2 border-emerald-300 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-emerald-800 flex items-center">
                  <Shield className="w-7 h-7 mr-3 text-emerald-600" />
                  Our Guesses - Team {myTeam}
                </h2>
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
                  {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team === myTeam).length} attempts
                </div>
              </div>
              <div className="space-y-4 overflow-y-auto">
                {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team === myTeam).slice().reverse().map((g, i) => (
                  <div key={i} className="relative p-4 bg-white rounded-xl border-2 border-emerald-200 shadow-md hover:shadow-lg transition-all duration-300">
                    {g.is_correct && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 p-1 rounded-full shadow-lg">
                        <Trophy className="w-4 h-4" />
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="font-bold text-emerald-700">{g.player}</span>
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
            {/* Enhanced Players Panel */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Users className="w-6 h-6 text-indigo-600" />
                <span>Players</span>
              </h2>
              <div className="space-y-3">
                {currentRoom.players.map(player => (
                  <div
                    key={player.id}
                    className={`p-4 rounded-xl border-2 transition-all ${player.username === user?.username
                        ? 'border-indigo-300 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-md'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900 flex items-center space-x-2">
                          <span>{player.username}</span>
                          <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold ${player.team === 'A' ? 'bg-blue-200 text-blue-800' : 'bg-purple-200 text-purple-800'
                            }`}>
                            Team {player.team || '?'}
                          </span>
                          {player.username === user?.username && (
                            <span className="text-indigo-600 text-sm font-bold">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Secret: {player.has_secret_number ? '✅ Set' : '❌ Not Set'}
                        </div>
                      </div>
                      {player.is_winner && (
                        <Trophy className="w-6 h-6 text-yellow-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Enhanced Notes & Strategy */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200">
              <h2 className="text-xl font-bold text-purple-900 mb-4 flex items-center">
                <Brain className="w-6 h-6 mr-2 text-purple-600" />
                Strategy & Notes
              </h2>

              {/* Position Analysis - Columns by Slot */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-purple-700 mb-3">Position Analysis</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map(slotIndex => (
                    <div key={slotIndex} className="bg-white rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-purple-800">Pos {slotIndex + 1}</span>
                      </div>
                      <div className="flex flex-col space-y-1">
                        {Array.from({ length: 10 }).map((_, digit) => {
                          const digitStr = digit.toString();
                          const isPossible = slotDigits[slotIndex].has(digitStr);
                          return (
                            <button
                              key={digit}
                              onClick={() => toggleSlotDigit(slotIndex, digitStr)}
                              className={`h-7 w-full rounded text-xs font-bold transition-all ${isPossible
                                  ? 'bg-green-500 text-white'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                            >
                              {digit}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-purple-600 flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-500"></span>Possible</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-300"></span>Eliminated</span>
                </div>
              </div>

              {/* Enhanced Digit Tracker */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-purple-700 mb-2">Overall Digit Availability</h3>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, d) => (
                    <button
                      key={d}
                      onClick={() => toggleDigit(d)}
                      className={`h-12 rounded-xl text-lg font-bold transition-all ${availableDigits[d]
                          ? 'bg-green-100 text-green-800 border-2 border-green-300 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 border-2 border-red-300 hover:bg-red-200'
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-purple-600 mt-2">
                  <span className="flex items-center"><span className="w-3 h-3 bg-green-100 rounded mr-1"></span>Available</span>
                  <span className="flex items-center"><span className="w-3 h-3 bg-red-100 rounded mr-1"></span>Eliminated</span>
                </div>
              </div>

              {/* Draft Guess */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-purple-700 mb-2">Draft Guess</h3>
                <div className="flex items-center gap-2 justify-center">
                  {draftGuessDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`draft-${index}`}
                      type="text"
                      value={digit}
                      onChange={(e) => handleDraftDigitChange(index, e.target.value)}
                      className="w-12 h-12 border-2 border-purple-300 rounded-lg focus:ring-4 focus:ring-purple-100 focus:border-purple-500 text-center text-lg font-mono font-bold"
                      placeholder="0"
                      maxLength={1}
                    />
                  ))}
                </div>
                {draftGuessDigits.join('').length === 4 && new Set(draftGuessDigits.join('')).size !== 4 && (
                  <p className="text-red-600 text-xs mt-2 text-center">Digits must be unique</p>
                )}
                <div className="mt-3 flex items-center gap-2 justify-center">
                  <button
                    onClick={() => {
                      setGuessDigits(draftGuessDigits);
                      const first = document.getElementById('guess-0');
                      first?.focus();
                    }}
                    disabled={draftGuessDigits.join('').length !== 4 || new Set(draftGuessDigits.join('')).size !== 4}
                    className="px-4 py-2 rounded-lg font-semibold text-white bg-indigo-600 disabled:bg-gray-400 hover:bg-indigo-700 transition-colors"
                  >
                    Copy to Guess
                  </button>
                  <button
                    onClick={() => setDraftGuessDigits(['', '', '', ''])}
                    className="px-4 py-2 rounded-lg font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Enhanced Notes */}
              <div>
                <h3 className="text-sm font-bold text-purple-700 mb-2">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Track patterns, combinations, deductions..."
                  className="w-full min-h-32 p-4 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400 text-sm resize-none"
                />
              </div>
            </div>

            {/* Opponents' Guesses - Moved to Right */}
            <div className="bg-gray-50 rounded-2xl shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-600 flex items-center">
                  <Swords className="w-6 h-6 mr-3 text-gray-400" />
                  Opponent Guesses
                </h2>
                <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm font-bold">
                  {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team !== myTeam).length} attempts
                </div>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team !== myTeam).slice().reverse().map((g, i) => (
                  <div key={i} className="relative p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                    {g.is_correct && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 p-1 rounded-full shadow-lg">
                        <Trophy className="w-3 h-3" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="font-bold text-gray-600">{g.player}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-semibold text-gray-600">{g.target_player}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="flex items-center bg-red-500 text-white px-1 py-0.5 rounded-full text-xs font-bold">
                            <Target className="w-2 h-2 mr-0.5" />
                            <span>{g.strikes}</span>
                          </div>
                          <div className="flex items-center bg-amber-500 text-white px-1 py-0.5 rounded-full text-xs font-bold">
                            <Circle className="w-2 h-2 mr-0.5" />
                            <span>{g.balls}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center space-x-1">
                        {g.guess.split('').map((digit, idx) => (
                          <div key={idx} className="w-8 h-8 bg-gray-100 rounded text-center leading-8 text-sm font-mono text-gray-700 border border-gray-200">
                            {digit}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team !== myTeam).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Swords className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No opponent guesses yet</p>
                  </div>
                )}
              </div>
            </div>


            {/* Enhanced Game Rules */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Target className="w-6 h-6 mr-2 text-blue-600" />
                How to Play
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                  <Target className="w-6 h-6 text-red-600" />
                  <div>
                    <div className="font-bold text-red-800">Strikes</div>
                    <div className="text-red-600">Correct digit in correct position</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                  <Circle className="w-6 h-6 text-amber-600" />
                  <div>
                    <div className="font-bold text-amber-800">Balls</div>
                    <div className="text-amber-600">Correct digit in wrong position</div>
                  </div>
                </div>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
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
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }
      `}</style>
    </div>
  );
};
