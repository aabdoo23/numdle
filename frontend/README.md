# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Bulls & Cows - Frontend

A modern React + TypeScript frontend for the real-time Bulls and Cows multiplayer game.

## 🎯 Features

- **Clean & Intuitive UI**: Modern design with Tailwind CSS
- **Real-time Multiplayer**: WebSocket-based live gameplay
- **Responsive Design**: Works on desktop and mobile devices
- **Turn-based System**: Visual turn indicators and timers
- **Live Updates**: Real-time game state synchronization
- **User Authentication**: Login and registration system

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Backend server running on `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🎮 How to Play

1. **Register/Login**: Create an account or sign in
2. **Join or Create Room**: Browse available rooms or create your own
3. **Set Secret Number**: Choose a 4-digit number with unique digits
4. **Take Turns Guessing**: Try to guess other players' numbers
5. **Win the Game**: First to guess correctly wins!

## 🏗️ Architecture

### Components
- `LoginPage`: User authentication interface
- `RoomListPage`: Browse and create game rooms
- `GamePage`: Main gameplay interface

### Services
- `api.ts`: REST API communication
- `websocket.ts`: Real-time WebSocket management

### Context
- `GameContext`: Global game state management

## 🎨 UI Features

- **Visual Feedback**: Color-coded strikes and balls
- **Turn Indicators**: Clear visualization of whose turn it is
- **Real-time Timer**: Countdown for turn time limits
- **Game History**: View all previous guesses and results
- **Player Status**: See who has set their secret numbers
- **Responsive Layout**: Adapts to different screen sizes

## 🔧 Technologies

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast development and building
- **Lucide React**: Beautiful icons
- **Axios**: HTTP client for API calls
- **WebSocket**: Real-time communication

## 📱 Game Flow

1. **Authentication Flow**
   - Login/Register screen
   - Form validation and error handling
   - Persistent login state

2. **Room Management**
   - List available rooms
   - Create new rooms with custom settings
   - Join existing rooms
   - Real-time room updates

3. **Gameplay**
   - Set secret number phase
   - Turn-based guessing
   - Real-time feedback
   - Win condition detection
   - Game history tracking

## 🎯 Game Rules

- **Objective**: Guess other players' 4-digit secret numbers
- **Strikes**: Correct digit in correct position
- **Balls**: Correct digit in wrong position
- **Numbers**: Must use 4 unique digits (0-9)
- **Turns**: Time-limited turns with automatic switching
- **Victory**: First player to guess correctly wins

## 🔗 API Integration

The frontend communicates with the Django backend via:
- **REST API**: User auth, room management
- **WebSocket**: Real-time game updates, live gameplay

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
