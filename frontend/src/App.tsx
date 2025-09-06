import React from 'react';
import { GameProvider, useGame } from './contexts/GameContext';
import { LoginPage } from './components/LoginPage';
import { RoomListPage } from './components/RoomListPage';
import { GamePage } from './components/GamePage';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, currentRoom } = useGame();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (currentRoom) {
    return <GamePage />;
  }

  return <RoomListPage />;
};

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
