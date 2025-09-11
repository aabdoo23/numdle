import React, { useState, useEffect } from 'react';
import { Users, Clock, Send, Target, Trophy, Eye, EyeOff, Shield, Swords, Brain, Circle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { TopBar } from './TopBar';

interface GamePageProps {
  onHowToPlay?: () => void;
}

export const GamePage: React.FC<GamePageProps> = ({ onHowToPlay }) => {
  const [secretNumber, setSecretNumber] = useState('');
  const [guessDigits, setGuessDigits] = useState(['', '', '', '']);
  // Target is implicit: opponent team; no manual selection needed
  const [showSecret, setShowSecret] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const [slotDigits, setSlotDigits] = useState<number[][]>([
    Array(10).fill(-1), Array(10).fill(-1), Array(10).fill(-1), Array(10).fill(-1)
  ]);
  const [draftGuessDigits, setDraftGuessDigits] = useState<string[]>(['', '', '', '']);
  const [activeStrategyTab, setActiveStrategyTab] = useState<'team' | 'personal'>('team');
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);
  const [isRematchLoading, setIsRematchLoading] = useState(false);

  const {
    currentRoom,
    user,
    leaveRoom,
    setSecretNumber: submitSecretNumber,
    makeGuess,
    rematch,
    error,
    teamStrategy,
    updateTeamStrategy,
    changeTeam,
    timeoutGraceEndsAt
  } = useGame();
  const [graceRemaining, setGraceRemaining] = useState(0);

  const currentPlayer = currentRoom?.players.find(p => p.username === user?.username);
  const myTeam = currentPlayer?.team;
  const myTeamSize = myTeam ? currentRoom?.players.filter(p => p.team === myTeam).length : 0;
  const teamStrategyEnabled = (myTeamSize ?? 0) > 1;

  useEffect(() => {
    if (!teamStrategyEnabled && activeStrategyTab === 'team') {
      setActiveStrategyTab('personal');
    }
  }, [teamStrategyEnabled, activeStrategyTab]);
  useEffect(() => {
    if (!timeoutGraceEndsAt) { setGraceRemaining(0); return; }
    const id = setInterval(() => {
      const ms = timeoutGraceEndsAt - Date.now();
      setGraceRemaining(ms > 0 ? Math.ceil(ms / 1000) : 0);
      if (ms <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [timeoutGraceEndsAt]);

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

  const isMyTurn = currentRoom.current_turn_player === user?.username;
  const teamSecretSet = currentPlayer?.team === 'A' ? currentRoom.team_a_secret_set : currentPlayer?.team === 'B' ? currentRoom.team_b_secret_set : false;
  const canSetSecret = (currentRoom.status === 'setting_numbers' || currentRoom.status === 'waiting') && currentPlayer && !teamSecretSet;
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

  const handleRematch = async () => {
    setIsRematchLoading(true);
    try {
      const success = await rematch();
      if (success) {
        setShowWinModal(false);
      }
    } catch (error) {
      console.error('Rematch failed:', error);
    } finally {
      setIsRematchLoading(false);
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

  // (global availability toggler removed – summary grid now interactive)

  // Collaborative vs personal strategy handling
  const usingTeam = activeStrategyTab === 'team' && teamStrategyEnabled;
  const effectiveSlotDigits: number[][] = usingTeam && teamStrategy ? teamStrategy.slot_digits : slotDigits;
  const effectiveDraftGuess: string[] = usingTeam && teamStrategy ? teamStrategy.draft_guess : draftGuessDigits;
  const effectiveNotes: string = usingTeam && teamStrategy ? teamStrategy.notes : notes;

  const safeCloneSlots = (src: number[][]) => src.map(r => [...r]);
  const applySlotDigits = (next: number[][]) => {
    if (usingTeam) {
      if (teamStrategy) updateTeamStrategy({ slot_digits: next });
    } else {
      setSlotDigits(next);
    }
  };

  const toggleSlotDigit = (slotIndex: number, digit: number) => {
    applySlotDigits((() => {
      const copy = safeCloneSlots(effectiveSlotDigits);
      const current = copy[slotIndex][digit];
      let next: number;
      switch (current) {
        case -1: next = 0; break;
        case 0: next = 1; break;
        case 1: next = 2; break;
        default: next = -1; break;
      }
      if (next === 1) {
        for (let s = 0; s < copy.length; s++) {
          if (s !== slotIndex && copy[s][digit] === 1) copy[s][digit] = 0;
        }
      }
      copy[slotIndex][digit] = next;
      return copy;
    })());
  };

  // Bulk helpers
  const clearSlot = (slotIndex: number) => {
    applySlotDigits(effectiveSlotDigits.map((row, i) => i === slotIndex ? Array(10).fill(-1) : [...row]));
  };
  const markAllPossible = (slotIndex: number) => {
    applySlotDigits(effectiveSlotDigits.map((row, i) => i === slotIndex ? row.map(v => v === -1 ? 0 : v) : [...row]));
  };
  const markAllCannot = (slotIndex: number) => {
    applySlotDigits(effectiveSlotDigits.map((row, i) => i === slotIndex ? Array(10).fill(2) : [...row]));
  };
  const clearAllSlots = () => {
    applySlotDigits([
      Array(10).fill(-1), Array(10).fill(-1), Array(10).fill(-1), Array(10).fill(-1)
    ]);
  };

  // Aggregated view per digit across all slots
  const aggregateDigitState = (digit: number): number => {
    // Return 1 if confirmed in any slot, 0 if possible somewhere (and not confirmed),
    // 2 if cannot everywhere, -1 if all unknown
    let anyUnknown = false, anyPossible = false, anyConfirmed = false;
    for (const slot of effectiveSlotDigits) {
      const st = slot[digit];
      if (st === 1) anyConfirmed = true;
      else if (st === 0) anyPossible = true;
      else if (st === -1) anyUnknown = true;
    }
    if (anyConfirmed) return 1;
    if (anyPossible) return 0;
    if (anyUnknown) return -1;
    return 2; // all cannot
  };

  // (was: toggleImpossibleSlotDigit) — removed as feature is not used in UI

  return (
    <div className="min-h-screen bg-neutral-50">
      <TopBar
        page="game"
        onBack={leaveRoom}
        onHowToPlay={onHowToPlay}
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
                  <span>Opponent's Turn</span>
                )}
              </div>
              {timeLeft !== null && (
                <div className="mt-2 inline-flex items-center space-x-2 text-lg text-secondary-700 bg-neutral-100 px-4 py-2 rounded-full">
                  <Clock className="w-5 h-5" />
                  <span className="font-bold">{timeLeft}s remaining</span>
                </div>
              )}
              {graceRemaining > 0 && (
                <div className="mt-2 text-sm font-semibold text-warning-700 animate-pulse">
                  Turn expired — skipping in {graceRemaining}s
                </div>
              )}
            </div>
          )}

          {/* Players Panel in Header - Compact */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              {(['A', 'B'] as const).map(teamKey => {
                const teamPlayers = currentRoom.players.filter(p => p.team === teamKey);
                const teamSecretSetFlag = teamKey === 'A' ? currentRoom.team_a_secret_set : currentRoom.team_b_secret_set;
                const setter = teamKey === 'A' ? currentRoom.team_a_set_by_username : currentRoom.team_b_set_by_username;
                return (
                  <div key={teamKey} className={`rounded-xl border-2 p-4 ${teamKey === 'A' ? 'border-primary-200 bg-primary-50' : 'border-secondary-200 bg-secondary-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${teamKey === 'A' ? 'bg-primary-500 text-white' : 'bg-secondary-500 text-white'}`}>Team {teamKey}</span>
                        {teamSecretSetFlag ? (
                          <span className="text-xs text-success-600 font-semibold flex items-center gap-1">✅ Secret set{setter ? ` by ${setter}` : ''}</span>
                        ) : (
                          <span className="text-xs text-warning-600 font-semibold">Waiting secret</span>
                        )}
                      </div>
                      {(currentRoom.status === 'waiting' || currentRoom.status === 'setting_numbers') && (
                        <span className="text-[11px] text-neutral-600">{teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {teamPlayers.map(player => {
                        const me = player.username === user?.username;
                        return (
                          <div key={player.id} className={`px-3 py-2 rounded-lg border text-xs flex flex-col gap-1 ${me ? 'bg-white border-black/20 shadow-sm' : 'bg-white border-neutral-300'}`}>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">{player.username}</span>
                              {me && <span className="text-primary-600">(You)</span>}
                              {player.is_winner && <Trophy className="w-3 h-3 text-warning-500" />}
                            </div>
                            <div className="text-[10px] text-neutral-600 flex items-center gap-2">
                              {teamSecretSetFlag ? 'Ready' : 'Setting...'}
                              {me && !teamSecretSetFlag && (currentRoom.status === 'waiting' || currentRoom.status === 'setting_numbers') && (
                                <span className="flex gap-1">
                                  <button onClick={() => changeTeam('A')} disabled={player.team === 'A'} className={`px-1 py-0.5 rounded border ${player.team === 'A' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-primary-600 hover:bg-primary-100 border-primary-300'}`}>A</button>
                                  <button onClick={() => changeTeam('B')} disabled={player.team === 'B'} className={`px-1 py-0.5 rounded border ${player.team === 'B' ? 'bg-secondary-600 text-white border-secondary-600' : 'bg-white text-secondary-600 hover:bg-secondary-100 border-secondary-300'}`}>B</button>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {teamPlayers.length === 0 && (
                        <div className="text-[11px] italic text-neutral-500">No players yet</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(currentRoom.status === 'waiting' || currentRoom.status === 'setting_numbers') && (
                <div className="text-[11px] text-secondary-600 italic">Players can switch teams until their team secret is set.</div>
              )}
            </div>
            <div className="space-y-4">
              <h2 className="text-md font-bold text-secondary-900 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-secondary-600" />
                <span>Team Secrets</span>
              </h2>
              {(['A', 'B'] as const).map(teamKey => {
                const secretSet = teamKey === 'A' ? currentRoom.team_a_secret_set : currentRoom.team_b_secret_set;
                const setter = teamKey === 'A' ? currentRoom.team_a_set_by_username : currentRoom.team_b_set_by_username;
                const isMyTeam = myTeam === teamKey;
                const showValue = (secretSet && currentRoom.status === 'finished') || (isMyTeam && (showSecret || currentRoom.status === 'finished'));
                let secretDisplay = '••••';
                if (showValue) {
                  const teammate = currentRoom.players.find(p => p.team === teamKey && p.secret_number);
                  secretDisplay = teammate?.secret_number || '----';
                }
                return (
                  <div key={teamKey} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 text-sm">
                    <div className="flex flex-col">
                      <span className="font-semibold">Team {teamKey} Secret</span>
                      <span className="text-[11px] text-neutral-500">{secretSet ? `Set${setter ? ' by ' + setter : ''}` : 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded font-mono ${secretSet ? 'bg-neutral-100' : 'bg-neutral-50 text-neutral-400'}`}>{secretDisplay}</span>
                      {isMyTeam && secretSet && currentRoom.status !== 'finished' && (
                        <button onClick={() => setShowSecret(!showSecret)} className="text-primary-600 hover:text-primary-800 text-xs px-1">
                          {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
                  Set Team {myTeam} Secret Number
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSetSecret();
                          }
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
                    <span className="text-sm opacity-75">(Enter)</span>
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
                          disabled={graceRemaining > 0}
                        />
                      ))}
                    </div>
                    {guessDigits.join('').length === 4 && new Set(guessDigits.join('')).size !== 4 && (
                      <p className="text-warning-800 text-sm mt-2 font-medium text-center">All digits must be unique</p>
                    )}
                    {graceRemaining > 0 && (
                      <p className="text-warning-700 text-xs mt-2 font-medium text-center">Turn timeout grace period; guessing disabled.</p>
                    )}
                  </div>
                  <button
                    onClick={handleMakeGuess}
                    disabled={guessDigits.join('').length !== 4 || new Set(guessDigits.join('')).size !== 4 || graceRemaining > 0}
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
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm">
                          {g.is_correct && (
                            <div className="bg-warning-100 text-warning-600 p-1.5 rounded-full shadow-sm animate-pulse">
                              <Trophy className="w-4 h-4" />
                            </div>
                          )}
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
                <h2 className="text-xl font-bold text-secondary-700 flex items-center gap-2">
                  <Swords className="w-6 h-6 text-secondary-500" />
                  Team {myTeam === 'A' ? 'B' : 'A'} Guesses
                </h2>
                <div className="bg-neutral-200 text-secondary-700 px-3 py-1 rounded-full text-sm font-bold">
                  {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team !== myTeam).length} attempts
                </div>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {currentRoom.guesses.filter(g => currentRoom.players.find(p => p.username === g.player)?.team !== myTeam).slice().reverse().map((g, i) => (
                  <div key={i} className="relative p-3 bg-white rounded-lg border border-neutral-300 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm">
                          {g.is_correct && (
                            <div className="bg-warning-100 text-warning-600 p-1 rounded-full shadow-sm animate-pulse">
                              <Trophy className="w-3 h-3" />
                            </div>
                          )}
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
            {/* Enhanced Notes & Strategy with Team/Personal Tabs */}
            <div className="bg-gradient-to-br from-secondary-50 to-neutral-50 rounded-2xl shadow-brand p-6 border-2 border-secondary-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary-900 flex items-center">
                  <Brain className="w-6 h-6 mr-2 text-secondary-600" />
                  Strategy & Notes
                </h2>
                {teamStrategyEnabled && (
                  <div className="flex rounded-lg overflow-hidden border border-secondary-300">
                    <button
                      onClick={() => setActiveStrategyTab('team')}
                      className={`px-4 py-2 text-sm font-semibold transition-colors ${activeStrategyTab === 'team' ? 'bg-secondary-600 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-100'}`}
                    >Team</button>
                    <button
                      onClick={() => setActiveStrategyTab('personal')}
                      className={`px-4 py-2 text-sm font-semibold transition-colors ${activeStrategyTab === 'personal' ? 'bg-secondary-600 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-100'}`}
                    >Personal</button>
                  </div>
                )}
              </div>
              {usingTeam && (
                <div className="mb-3 text-[11px] text-secondary-600 flex items-center justify-between">
                  <span>Shared with Team {myTeam}</span>
                  {teamStrategy ? (
                    <span className="italic">v{teamStrategy.version} • Last: {teamStrategy.last_editor || '—'} {teamStrategy.updated_at ? 'at ' + new Date(teamStrategy.updated_at).toLocaleTimeString() : ''}</span>
                  ) : (
                    <span className="italic">Loading team strategy...</span>
                  )}
                </div>
              )}

              {/* Position Analysis - Columns by Slot */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-secondary-700 mb-3 flex items-center justify-between">
                  <span>Position Analysis</span>
                  <button onClick={clearAllSlots} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-secondary-700 font-semibold">Reset All</button>
                </h3>

                {/* Aggregated summary */}
                <div className="mt-4 mb-4 p-4 bg-white border border-secondary-200 rounded-xl shadow-sm">
                  <h5 className="text-xs font-bold text-secondary-700 mb-3 flex items-center justify-between">
                    <span>Overall Digit Summary</span>
                    <span className="text-[10px] text-secondary-500">Click a digit to toggle global elimination</span>
                  </h5>
                  <div className="grid grid-cols-10 gap-2">
                    {Array.from({ length: 10 }).map((_, d) => {
                      const agg = aggregateDigitState(d);
                      let cls = '';
                      let label = '';
                      if (agg === -1) { cls = 'bg-neutral-100 text-secondary-600 hover:bg-neutral-200 border border-neutral-500'; label = 'Unknown'; }
                      else if (agg === 0) { cls = 'bg-warning-400 text-white hover:bg-warning-500 border border-warning-500'; label = 'Possible somewhere'; }
                      else if (agg === 1) { cls = 'bg-success-500 text-white hover:bg-success-600 ring-2 ring-success-300 border border-success-500'; label = 'Confirmed in a slot'; }
                      else { cls = 'bg-primary-400 text-white opacity-85 hover:opacity-100 border border-primary-500'; label = 'Eliminated everywhere'; }

                      const onClick = () => {
                        applySlotDigits((() => {
                          const copy = safeCloneSlots(effectiveSlotDigits);
                          if (agg === 2) {
                            for (let s = 0; s < copy.length; s++) {
                              if (copy[s][d] === 2) copy[s][d] = -1;
                            }
                          } else {
                            for (let s = 0; s < copy.length; s++) {
                              if (copy[s][d] !== 1) copy[s][d] = 2;
                            }
                          }
                          return copy;
                        })());
                      };

                      return (
                        <button
                          key={d}
                          onClick={onClick}
                          title={`${d}: ${label}. Click to ${agg === 2 ? 'restore' : 'eliminate globally'}`}
                          className={`h-9 rounded text-xs font-bold transition-all flex items-center justify-center ${cls}`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map(slotIndex => (
                    <div key={slotIndex} className="bg-white rounded-xl p-3 border border-secondary-200 flex flex-col shadow-sm">
                      <div className="text-center mb-2 text-[14px] font-semibold text-secondary-700">
                        <span>Slot {slotIndex + 1}</span>
                      </div>
                      <div className="flex gap-1 justify-center mb-3">
                        <button title="Mark unknown digits as possible" onClick={() => markAllPossible(slotIndex)} className="px-1.5 py-0.5 rounded bg-warning-100 text-warning-700 hover:bg-warning-200 text-[11px] border border-warning-300">?→P</button>
                        <button title="Mark all digits cannot" onClick={() => markAllCannot(slotIndex)} className="px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 hover:bg-primary-200 text-[11px] border border-primary-300">All X</button>
                        <button title="Clear slot" onClick={() => clearSlot(slotIndex)} className="px-1.5 py-0.5 rounded bg-neutral-100 text-secondary-600 hover:bg-neutral-200 text-[11px] border border-neutral-500">Clr</button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {Array.from({ length: 10 }).map((_, digit) => {
                          const st = effectiveSlotDigits[slotIndex][digit];
                          let cls = '';
                          if (st === -1) cls = 'bg-neutral-100 text-secondary-600 hover:bg-neutral-200 border border-neutral-500';
                          else if (st === 0) cls = 'bg-warning-400 text-white hover:bg-warning-500 border border-warning-500';
                          else if (st === 1) cls = 'bg-success-500 text-white hover:bg-success-600 ring-2 ring-success-300 border border-success-600';
                          else cls = 'bg-primary-400 text-white hover:bg-primary-500 opacity-85 border border-primary-500';
                          return (
                            <div key={digit} className="flex items-center gap-1">
                              <button
                                onClick={() => toggleSlotDigit(slotIndex, digit)}
                                title={`Digit ${digit}: ${st === -1 ? 'Unknown' : st === 0 ? 'Possible' : st === 1 ? 'Confirmed here' : 'Eliminated here'}`}
                                className={`flex-1 h-8 rounded text-sm font-bold transition-all ${cls}`}
                              >
                                {digit}
                              </button>
                              <button
                                onClick={() => applySlotDigits((() => {
                                  const copy = safeCloneSlots(effectiveSlotDigits);
                                  copy[slotIndex][digit] = -1;
                                  return copy;
                                })())}
                                title={`Reset digit ${digit} to unknown`}
                                className="w-5 h-5 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-600 hover:text-neutral-800 text-xs flex items-center justify-center transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-[11px] text-secondary-600 flex flex-wrap gap-4">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-neutral-200 border border-neutral-300" />Unknown</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-warning-400" />Possible</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-success-500" />Confirmed</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-primary-400" />Cannot</span>
                  <span className="opacity-70">Click cycles states • Confirmed auto-unsets same digit in other slots.</span>
                </div>
              </div>

              {/* Draft Guess */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-secondary-700 mb-2">Draft Guess</h3>
                <div className="flex items-center gap-2 justify-center">
                  {effectiveDraftGuess.map((digit, index) => (
                    <input
                      key={index}
                      id={`draft-${index}`}
                      type="text"
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 1);
                        if (usingTeam) {
                          if (!teamStrategy) return;
                          if (val.length <= 1) {
                            const arr = [...effectiveDraftGuess];
                            arr[index] = val;
                            updateTeamStrategy({ draft_guess: arr });
                          }
                        } else {
                          handleDraftDigitChange(index, val);
                        }
                      }}
                      className="w-12 h-12 border-2 border-secondary-300 rounded-lg focus:ring-4 focus:ring-secondary-100 focus:border-secondary-500 text-center text-lg font-mono font-bold"
                      placeholder="0"
                      maxLength={1}
                    />
                  ))}
                </div>
                {effectiveDraftGuess.join('').length === 4 && new Set(effectiveDraftGuess.join('')).size !== 4 && (
                  <p className="text-warning-800 text-xs mt-2 text-center">Digits must be unique</p>
                )}
                <div className="mt-3 flex items-center gap-2 justify-center">
                  <button
                    onClick={() => {
                      setGuessDigits(effectiveDraftGuess);
                      const first = document.getElementById('guess-0');
                      first?.focus();
                    }}
                    disabled={effectiveDraftGuess.join('').length !== 4 || new Set(effectiveDraftGuess.join('')).size !== 4}
                    className="px-4 py-2 rounded-lg font-semibold text-white bg-primary-600 disabled:bg-neutral-400 hover:bg-primary-700 transition-colors shadow-brand"
                  >
                    Copy to Guess
                  </button>
                  <button
                    onClick={() => {
                      if (usingTeam) {
                        updateTeamStrategy({ draft_guess: ['', '', '', ''] });
                      } else {
                        setDraftGuessDigits(['', '', '', '']);
                      }
                    }}
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
                  value={effectiveNotes}
                  onChange={(e) => {
                    if (usingTeam) {
                      updateTeamStrategy({ notes: e.target.value });
                    } else {
                      setNotes(e.target.value);
                    }
                  }}
                  placeholder={usingTeam ? 'Shared team notes...' : 'Track patterns, combinations, deductions...'}
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
            <div className="text-center mb-6">
              <div className="relative">
                {/* Celebration background effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-warning-100 via-success-100 to-primary-100 rounded-2xl opacity-50 animate-pulse"></div>

                {/* Main winner announcement */}
                <div className="relative bg-gradient-to-br from-warning-50 to-success-50 rounded-2xl p-8 border-4 border-warning-300 shadow-xl">
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-warning-400 p-4 rounded-full animate-bounce shadow-lg">
                      <Trophy className="w-12 h-12 text-white" />
                    </div>
                  </div>

                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-warning-600 to-success-600 mb-2">
                    🎉 Game Over! 🎉
                  </h2>

                  <div className="text-2xl font-bold text-secondary-800 mb-4">
                    {currentRoom.winner_team ? (
                      <>
                        <span className="text-success-700 font-extrabold text-3xl">Team {currentRoom.winner_team}</span>
                        <div className="mt-3 text-2xl text-secondary-700 font-semibold">
                          {currentRoom.players.filter(p => p.team === currentRoom.winner_team).map(p => p.username).join(', ')}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-success-700 font-extrabold text-3xl">{currentRoom.winner_username || winner?.username || '—'}</span>
                        <div className="text-lg text-secondary-600 mt-1">wins the game!</div>
                      </>
                    )}
                  </div>

                  {/* Close button moved to top right corner */}
                  <button
                    onClick={() => setShowWinModal(false)}
                    className="absolute top-4 right-4 text-secondary-400 hover:text-secondary-600 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
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
            <div className="mt-6 flex justify-between">
              <button
                onClick={handleRematch}
                disabled={isRematchLoading}
                className="px-6 py-3 rounded-lg bg-success-600 text-white hover:bg-success-700 disabled:bg-success-400 disabled:cursor-not-allowed shadow-brand transition-colors flex items-center gap-2"
              >
                {isRematchLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    Rematch
                  </>
                )}
              </button>
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
