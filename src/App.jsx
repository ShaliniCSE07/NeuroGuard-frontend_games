/**
 * App.jsx
 * -------
 * Root application component for NeuroGuard.
 * Features a persistent fixed top navigation bar and view routing
 * between the Game Hub (Home), Memory Match (Game 1), and Sequence Recall (Game 2).
 */

import React, { useState } from 'react';
import NavBar from './components/NavBar';
import GameHub from './components/GameHub';
import MemoryGame from './components/MemoryGame';
import SequenceGame from './components/SequenceGame';
import PatternGame from './components/PatternGame';

import './styles/global.css';
import './styles/memoryGame.css';

function App() {
  // Current view: 'hub' | 'memory' | 'sequence' | 'pattern'
  const [currentView, setCurrentView] = useState('hub');
  const [savedMemoryState, setSavedMemoryState] = useState(null);

  const handleNavigate = (view, state = null) => {
    setSavedMemoryState(state);
    setCurrentView(view);
  };

  return (
    <div id="app">
      {/* NEW BACK TO DASHBOARD BUTTON (Fixed to top left) */}
      <a 
        href="http://localhost:5000" 
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 9999, // Ensures it stays above all games
          padding: '10px 20px', 
          backgroundColor: '#E8E3D9', 
          color: '#3B3A39', 
          textDecoration: 'none', 
          borderRadius: '8px',
          fontWeight: 'bold',
          fontFamily: 'sans-serif',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
      >
        ← Back to Dashboard
      </a>

      {/* Persistent Top Navigation Bar */}
      <NavBar
        currentView={currentView}
        onNavigate={(view) => handleNavigate(view, null)}
      />

      {/* Main View Router */}
      {currentView === 'hub' && (
        <GameHub onNavigate={handleNavigate} />
      )}

      {currentView === 'memory' && (
        <MemoryGame
          initialState={savedMemoryState}
          onClearActiveState={() => setSavedMemoryState(null)}
          onExitToHub={() => handleNavigate('hub', null)}
        />
      )}

      {currentView === 'sequence' && (
        <SequenceGame onBackToHub={() => handleNavigate('hub', null)} />
      )}

      {currentView === 'pattern' && (
        <PatternGame onBackToHub={() => handleNavigate('hub', null)} />
      )}
    </div>
  );
}

export default App;