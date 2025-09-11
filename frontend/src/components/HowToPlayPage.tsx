import React from 'react';
import { ArrowLeft, Target, Users, Clock, Trophy, Eye, EyeOff } from 'lucide-react';
import { TopBar } from './TopBar';

interface HowToPlayPageProps {
  onBack?: () => void;
}

export const HowToPlayPage: React.FC<HowToPlayPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-neutral-50">
      <TopBar page="how-to-play" />
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-secondary-900">How to Play Numdle</h1>
            {onBack && (
              <button
                onClick={onBack}
                className="bg-neutral-200 hover:bg-neutral-300 text-secondary-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>
          <p className="text-secondary-600 text-lg">
            Numdle is a multiplayer number guessing game where teams compete to guess each other's secret 4-digit numbers!
          </p>
        </div>

        {/* Game Overview */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center space-x-2">
            <Target className="w-6 h-6 text-primary-600" />
            <span>Game Overview</span>
          </h2>
          <div className="space-y-4 text-secondary-700">
            <p>
              Numdle is inspired by the classic "Bulls and Cows" game but with a modern multiplayer twist. 
              Each team sets a secret 4-digit number, and teams take turns trying to guess each other's numbers 
              using logical deduction based on feedback from previous guesses.
            </p>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <h3 className="font-bold text-primary-900 mb-2">🎯 Objective</h3>
              <p className="text-primary-800">
                Be the first team to correctly guess another team's secret 4-digit number to win the game!
              </p>
            </div>
          </div>
        </div>

        {/* Game Setup */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center space-x-2">
            <Users className="w-6 h-6 text-success-600" />
            <span>Game Setup</span>
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-secondary-900 mb-3">1. Join or Create a Room</h3>
              <ul className="space-y-2 text-secondary-700 mb-4">
                <li>• Create a new game room or join an existing one</li>
                <li>• Rooms can have 2-8 players</li>
                <li>• Set turn time limits (30s - 2 minutes)</li>
                <li>• Choose between public or private (password-protected) rooms</li>
              </ul>
              {/* Room creation screenshot */}
              <div className="rounded-lg overflow-hidden border border-neutral-200 shadow-sm">
                <img 
                  src="/room-creation.png" 
                  alt="Room creation interface showing options to create or join a game room"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-900 mb-3">2. Team Formation</h3>
              <ul className="space-y-2 text-secondary-700 mb-4">
                <li>• Players are automatically assigned to teams</li>
                <li>• Teams are balanced for fair gameplay</li>
                <li>• Each team collaborates to set their secret number</li>
                <li>• Teams take turns making guesses</li>
              </ul>
              {/* Team formation screenshot */}
              <div className="rounded-lg overflow-hidden border border-neutral-200 shadow-sm">
                <img 
                  src="/teams.png" 
                  alt="Team formation interface showing player assignment to balanced teams"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Setting Secret Numbers */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center space-x-2">
            <EyeOff className="w-6 h-6 text-warning-600" />
            <span>Setting Secret Numbers</span>
          </h2>
          <div className="space-y-4">
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <h3 className="font-bold text-warning-900 mb-2">🔢 Number Requirements</h3>
              <ul className="space-y-1 text-warning-800">
                <li>• Must be exactly 4 digits (e.g., 1234, 5678, 9012)</li>
                <li>• All digits must be unique (no repeating digits)</li>
                <li>• Leading zeros are allowed (e.g., 0123 is valid)</li>
              </ul>
            </div>
            <p className="text-secondary-700">
              At the start of each game, every team must secretly choose their 4-digit number. 
              Team members can discuss and collaborate to choose the best number strategy, 
              but keep it hidden from other teams!
            </p>
            {/* Secret number setting screenshot */}
            <div className="bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
              <img 
                src="/secret-number.png" 
                alt="Secret number input interface for teams to set their 4-digit number"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Gameplay */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center space-x-2">
            <Clock className="w-6 h-6 text-primary-600" />
            <span>Gameplay</span>
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900 mb-3">Making Guesses</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <ul className="space-y-2 text-secondary-700">
                    <li>• Teams take turns in order</li>
                    <li>• On your turn, choose which team's number to guess</li>
                    <li>• Enter a 4-digit guess following the same rules</li>
                    <li>• Submit before the timer runs out</li>
                  </ul>
                </div>
                <div>
                  {/* Guess interface screenshot */}
                  <div className="bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
                    <img 
                      src="/make-guess.png" 
                      alt="Guess interface showing team selection and number input"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-secondary-900 mb-3">Understanding Feedback</h3>
              <p className="text-secondary-700 mb-4">
                After each guess, you'll receive feedback to help you make better guesses:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                  <h4 className="font-bold text-success-900 mb-2">🟢 Strikes (Correct Position)</h4>
                  <p className="text-success-800">
                    The number of digits that are correct and in the right position.
                  </p>
                </div>
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                  <h4 className="font-bold text-warning-900 mb-2">🟡 Balls (Wrong Position)</h4>
                  <p className="text-warning-800">
                    The number of digits that are correct but in the wrong position.
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h4 className="font-bold text-primary-900 mb-2">📝 Example</h4>
                <div className="text-primary-800">
                  <p>Secret number: <span className="font-mono font-bold">1234</span></p>
                  <p>Your guess: <span className="font-mono font-bold">1357</span></p>
                  <p>Feedback: <span className="font-bold">1 Strike, 1 Ball</span></p>
                  <p className="text-sm mt-1">
                    (The "1" is in the correct position, and "3" is correct but in the wrong position)
                  </p>
                </div>
              </div>
              {/* Feedback display screenshot */}
              <div className="mt-4 bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
                <img 
                  src="/guess-feedback.png" 
                  alt="Guess feedback display showing strikes and balls for previous guesses"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Tips */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center space-x-2">
            <Eye className="w-6 h-6 text-success-600" />
            <span>Strategy Tips</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900 mb-3">🧠 Guessing Strategy</h3>
              <ul className="space-y-2 text-secondary-700">
                <li>• Start with numbers that have diverse digits</li>
                <li>• Use process of elimination based on feedback</li>
                <li>• Keep track of previous guesses and results</li>
                <li>• Focus on one team's number at a time</li>
                <li>• Communicate with your teammates!</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-900 mb-3">🛡️ Defense Strategy</h3>
              <ul className="space-y-2 text-secondary-700">
                <li>• Choose numbers that are hard to guess</li>
                <li>• Avoid common patterns (1234, 0000, etc.)</li>
                <li>• Mix high and low digits</li>
                <li>• Consider using less common digit combinations</li>
                <li>• Don't make your strategy too obvious</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Strategy Notes Section */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center space-x-2">
            <Eye className="w-6 h-6 text-primary-600" />
            <span>Strategy Notes & Tracking</span>
          </h2>
          <div className="space-y-4">
            <p className="text-secondary-700">
              Numdle includes a built-in strategy notes section to help you keep track of your deductions 
              and collaborate effectively with your team. This powerful tool is essential for organizing 
              your thoughts and making logical progress toward solving other teams' numbers.
            </p>
            
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <h3 className="font-bold text-primary-900 mb-2">📝 Features</h3>
              <ul className="space-y-1 text-primary-800">
                <li>• Real-time collaborative note-taking with your teammates</li>
                <li>• Organized tracking of guess results and patterns</li>
                <li>• Quick reference for eliminated digits and positions</li>
                <li>• Markdown-style formatting for clear organization</li>
                <li>• Automatic saving so you never lose your progress</li>
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold text-secondary-900 mb-3">🔍 How to Use</h3>
                <ul className="space-y-2 text-secondary-700">
                  <li>• Track which digits are confirmed or eliminated</li>
                  <li>• Note position constraints from strikes and balls</li>
                  <li>• Record patterns you've discovered</li>
                  <li>• Plan your next guessing strategy</li>
                  <li>• Share insights with teammates in real-time</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-secondary-900 mb-3">💡 Pro Tips</h3>
                <ul className="space-y-2 text-secondary-700">
                  <li>• Create a section for each opposing team</li>
                  <li>• Use consistent notation (e.g., ✓ confirmed, ✗ eliminated)</li>
                  <li>• Update notes immediately after each guess</li>
                  <li>• Review notes before making your next guess</li>
                  <li>• Assign note-taking roles to team members</li>
                </ul>
              </div>
            </div>

            {/* Strategy notes section screenshot */}
            <div className="bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
              <img 
                src="/strategy-notes-section.png" 
                alt="Strategy notes section showing collaborative note-taking interface with real-time updates"
                className="w-full h-auto"
              />
            </div>

            <div className="bg-success-50 border border-success-200 rounded-lg p-4">
              <h3 className="font-bold text-success-900 mb-2">🎯 Example Strategy Analysis</h3>
              <div className="text-success-800 space-y-2 text-sm">
                <p><strong>Position Analysis Tool:</strong></p>
                <p>• <span className="bg-green-200 px-1 rounded">Green digits</span> = Confirmed in position (e.g., "3" confirmed in Slot 2)</p>
                <p>• <span className="bg-yellow-200 px-1 rounded">Yellow digits</span> = Possible in position (e.g., "5", "6", "7", "8" possible in various slots)</p>
                <p>• <span className="bg-red-200 px-1 rounded">Red digits</span> = Cannot be in position (e.g., "0", "1", "9" eliminated globally)</p>
                <p>• <span className="bg-gray-200 px-1 rounded">Gray digits</span> = Unknown status</p>
                <div className="mt-3 pt-2 border-t border-success-300">
                  <p><strong>Draft Guess Builder:</strong> 5327 (ready to copy to guess input)</p>
                  <p><strong>Notes Section:</strong> "Track patterns, combinations, deductions..."</p>
                </div>
                <p className="text-xs italic mt-2">Click digits to cycle through states • Use draft guess to test combinations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Winning */}
        <div className="bg-white rounded-2xl shadow-brand p-6 mb-6 border border-neutral-200">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-warning-600" />
            <span>Winning the Game</span>
          </h2>
          <div className="space-y-4">
            <div className="bg-success-50 border border-success-200 rounded-lg p-4">
              <h3 className="font-bold text-success-900 mb-2">🏆 Victory Condition</h3>
              <p className="text-success-800">
                The first team to correctly guess another team's secret number wins the game!
                When you guess correctly, you'll get 4 Strikes and 0 Balls.
              </p>
            </div>
            <p className="text-secondary-700">
              Once a team wins, the game ends and all secret numbers are revealed. 
              You can then view detailed statistics about the game, including guess history and patterns.
            </p>
            {/* Victory screen screenshot */}
            <div className="bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
              <img 
                src="/win-modal.png" 
                alt="Victory screen celebration showing winning team and game statistics"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Tips for New Players */}
        <div className="bg-white rounded-2xl shadow-brand p-6 border border-neutral-200">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4">💡 Tips for New Players</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                <p className="text-primary-800"><strong>Start Simple:</strong> Begin with easy-to-remember numbers while you learn the game mechanics.</p>
              </div>
              <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                <p className="text-success-800"><strong>Watch Others:</strong> Observe other teams' guessing patterns to learn strategies.</p>
              </div>
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                <p className="text-warning-800"><strong>Take Notes:</strong> Keep track of guesses and feedback to avoid repeating the same mistakes.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-3">
                <p className="text-secondary-800"><strong>Team Communication:</strong> Use the time limit wisely to discuss with teammates.</p>
              </div>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                <p className="text-primary-800"><strong>Practice:</strong> Play multiple games to develop your logical deduction skills.</p>
              </div>
              <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                <p className="text-success-800"><strong>Have Fun:</strong> Remember, it's a game! Enjoy the challenge and social interaction.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Credit */}
        <div className="bg-gradient-to-r mt-6 from-primary-50 to-secondary-50 rounded-2xl shadow-brand p-6 border border-primary-200">
          <div className="text-center">
            <h2 className="text-xl font-bold text-secondary-900 mb-3">🎮 About the Developer</h2>
            <p className="text-secondary-700 mb-2">
              Numdle was created with passion by <span className="font-bold text-primary-900">aabdoo23</span>
            </p>
            <p className="text-sm text-secondary-600">
              A modern take on the classic Bulls and Cows game, built for multiplayer fun and strategic thinking.
            </p>
            <div className="mt-4 inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full border border-primary-300 shadow-sm">
              <span className="text-xs font-medium text-primary-700">Made with ❤️ for puzzle game enthusiasts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
