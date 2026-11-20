/**
 * GameHub.jsx
 * -----------
 * The home / landing screen for NeuroGuard.
 * Displays a warm welcome message and three game-selection cards.
 *
 * @param {object}   props
 * @param {function} props.onNavigate  — callback(viewName: string)
 */

import React, { useState, useEffect } from 'react';
import '../styles/gameHub.css';

const ACTIVE_GAME_KEY = 'neuroguard_active_game';

const GAMES = [
  {
    id:          'memory',
    icon:        '🧩',
    title:       'Memory Match',
    description: 'Flip cards and find matching pairs. Trains visual memory and concentration.',
    available:   true,
  },
  {
    id:          'sequence',
    icon:        '🔢',
    title:       'Sequence Recall',
    description: 'Watch a number sequence, then repeat it back. Challenges short-term memory.',
    available:   true,
  },
  {
    id:          'pattern',
    icon:        '🎨',
    title:       'Pattern Recognition',
    description: 'Spot and tap the distinct target shapes. Trains visual attention and focus.',
    available:   true,
  },
];

function GameHub({ onNavigate }) {
  const [activeGame, setActiveGame] = useState(null);

  // Check for unfinished saved game in localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_GAME_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.deck && parsed.deck.length > 0 && parsed.difficulty) {
          setActiveGame(parsed);
        } else {
          localStorage.removeItem(ACTIVE_GAME_KEY);
        }
      }
    } catch (err) {
      console.warn('Failed to parse active game state', err);
    }
  }, []);

  // Continue unfinished game
  const handleContinue = () => {
    if (activeGame) {
      onNavigate('memory', activeGame);
    }
  };

  // Start fresh: wipe old game data completely from localStorage
  const handleStartFresh = () => {
    try {
      localStorage.removeItem(ACTIVE_GAME_KEY);
    } catch (err) {
      console.warn('Failed to clear active game', err);
    }
    setActiveGame(null);
  };

  return (
    <main className="hub" aria-labelledby="hub-heading">
      {/* Resume Unfinished Game Modal */}
      {activeGame && (
        <div
          className="resume-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-title"
          aria-describedby="resume-desc"
        >
          <div className="resume-card">
            <div className="resume-card__emblem" aria-hidden="true">
              {activeGame.gameMode === 'personal' ? '🖼️' : '🧩'}
            </div>

            <h2 className="resume-card__title" id="resume-title">
              Welcome back!
            </h2>

            <p className="resume-card__message" id="resume-desc">
              You have an unfinished game of Memory Match. Would you like to continue where you left off?
            </p>

            {/* Quick summary of the saved game */}
            <div className="resume-card__summary" aria-label="Game progress summary">
              <div className="resume-summary-item">
                <span className="resume-summary-item__val" style={{ textTransform: 'capitalize' }}>
                  {activeGame.difficulty}
                </span>
                <span className="resume-summary-item__lbl">Difficulty</span>
              </div>
              <div className="resume-summary-item">
                <span className="resume-summary-item__val">
                  {activeGame.gameMode === 'personal' ? 'Personal' : 'Animals'}
                </span>
                <span className="resume-summary-item__lbl">Theme</span>
              </div>
              <div className="resume-summary-item">
                <span className="resume-summary-item__val">
                  {activeGame.pairsFound ?? (activeGame.matched ? activeGame.matched.length : 0)}
                </span>
                <span className="resume-summary-item__lbl">Pairs Found</span>
              </div>
              <div className="resume-summary-item">
                <span className="resume-summary-item__val">
                  {activeGame.elapsed || 0}s
                </span>
                <span className="resume-summary-item__lbl">Time</span>
              </div>
            </div>

            <div className="resume-card__actions">
              <button
                className="btn-primary"
                onClick={handleContinue}
                aria-label="Yes, continue playing your saved game"
              >
                Yes, Continue Playing
              </button>
              <button
                className="btn-secondary"
                onClick={handleStartFresh}
                aria-label="Start fresh and clear old game data"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome section */}
      <section className="hub__welcome">
        <div className="hub__welcome-emblem" aria-hidden="true">🧠</div>
        <h1 className="hub__title" id="hub-heading">Welcome to NeuroGuard</h1>
        <p className="hub__subtitle">
          Gentle brain exercises designed to support memory and mental clarity.
          <br />
          Choose a game to begin.
        </p>
      </section>

      {/* Game cards */}
      <section
        className="hub__games"
        aria-label="Available games"
      >
        {GAMES.map((game) => (
          <article
            key={game.id}
            className={[
              'hub__game-card',
              !game.available ? 'hub__game-card--disabled' : '',
            ].filter(Boolean).join(' ')}
            aria-label={
              game.available
                ? `${game.title} — click to play`
                : `${game.title} — coming soon`
            }
          >
            <div className="hub__game-icon" aria-hidden="true">{game.icon}</div>
            <h2 className="hub__game-title">{game.title}</h2>
            <p className="hub__game-desc">{game.description}</p>

            {game.available ? (
              <button
                className="hub__game-btn"
                onClick={() => onNavigate(game.id)}
                aria-label={`Play ${game.title}`}
              >
                Play Now
              </button>
            ) : (
              <span className="hub__coming-soon" aria-label="Coming soon">
                Coming Soon
              </span>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

export default GameHub;
