import React, { useState } from 'react';
import { GameProvider, useGame } from './contexts/GameContext';
import { LoginPage } from './components/LoginPage';
import { RoomListPage } from './components/RoomListPage';
import { GamePage } from './components/GamePage';
import { HowToPlayPage } from './components/HowToPlayPage';
import './App.css';
import { AdminDashboard } from './components/AdminDashboard';

const AppContent: React.FC = () => {
  const { isAuthenticated, currentRoom } = useGame();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [forceShowLogin, setForceShowLogin] = useState(false);

  if (showHowToPlay) {
    return <HowToPlayPage onBack={() => setShowHowToPlay(false)} />;
  }

  // /admin route bypasses game flow
  if (window.location.pathname === '/admin') {
    return <AdminDashboard />;
  }

  // Show login page if not authenticated OR if user wants to see the main page
  if (!isAuthenticated || forceShowLogin) {
    return (
      <LoginPage
        onHowToPlay={() => setShowHowToPlay(true)}
        onPlayClick={() => setForceShowLogin(false)}
      />
    );
  }

  if (currentRoom) {
    return <GamePage onHowToPlay={() => setShowHowToPlay(true)} />;
  }

  return (
    <RoomListPage
      onHowToPlay={() => setShowHowToPlay(true)}
    />
  );
};

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
