/**
 * StartScreen.jsx
 * ---------------
 * Mode selection and difficulty selection screen for Memory Match.
 * Warm, welcoming, large touch targets.
 *
 * Step 1: Choose mode ('animals' or 'personal')
 * Step 2: Choose difficulty ('easy', 'medium', 'hard')
 */

import React, { useState } from 'react';
import { DIFFICULTY_CONFIG } from '../utils/cardData';

// Visual config per difficulty
const DIFFICULTY_META = {
  easy:   { icon: '🌱', colorClass: 'difficulty-btn--easy',   hint: 'A gentle start' },
  medium: { icon: '🌻', colorClass: 'difficulty-btn--medium', hint: 'A little more challenge' },
  hard:   { icon: '🌳', colorClass: 'difficulty-btn--hard',   hint: 'For sharper minds' },
};

/**
 * @param {object}   props
 * @param {function} props.onSelect — callback(difficulty: string, mode: string)
 */
function StartScreen({ onSelect }) {
  const [selectedMode, setSelectedMode] = useState(null);

  // ── Step 1: Mode Selection ────────────────────────────────────────────────
  if (!selectedMode) {
    return (
      <main className="start-screen" role="main">
        <div className="start-screen__logo-mark" aria-hidden="true">🧩</div>

        <div>
          <h1 className="start-screen__title">Memory Match</h1>
          <p className="start-screen__subtitle">
            Find and match pairs of cards at your own pace.<br />
            Choose a theme to begin.
          </p>
        </div>

        <p className="start-screen__instruction">
          Select which images you'd like to play with today:
        </p>

        <div className="start-screen__modes" role="group" aria-label="Choose game theme">
          {/* Option A: Animals */}
          <button
            className="mode-card"
            onClick={() => setSelectedMode('animals')}
            aria-label="Play with Animals — Default animal theme"
          >
            <span className="mode-card__icon" aria-hidden="true">🐘</span>
            <span className="mode-card__badge">Default</span>
            <span className="mode-card__title">Play with Animals</span>
            <span className="mode-card__desc">
              Relaxing illustrations of familiar animal companions.
            </span>
          </button>

          {/* Option B: Personal Photos */}
          <button
            className="mode-card"
            onClick={() => setSelectedMode('personal')}
            aria-label="Play with My Photos — Personal memories theme"
          >
            <span className="mode-card__icon" aria-hidden="true">🖼️</span>
            <span className="mode-card__badge mode-card__badge--personal">Personal</span>
            <span className="mode-card__title">Play with My Photos</span>
            <span className="mode-card__desc">
              Cherished family photos, home moments, and memories.
            </span>
          </button>
        </div>
      </main>
    );
  }

  // ── Step 2: Difficulty Selection ──────────────────────────────────────────
  const isPersonal = selectedMode === 'personal';

  return (
    <main className="start-screen" role="main">
      {/* Back button to change mode */}
      <button
        className="start-screen__back-btn"
        onClick={() => setSelectedMode(null)}
        aria-label="Back to theme selection"
      >
        &larr; Back to Theme Selection
      </button>

      <div className="start-screen__logo-mark" aria-hidden="true">
        {isPersonal ? '🖼️' : '🐘'}
      </div>

      <div>
        <h1 className="start-screen__title">
          {isPersonal ? 'My Photos Match' : 'Animals Memory Match'}
        </h1>
        <p className="start-screen__subtitle">
          {isPersonal
            ? 'Find and match pairs of your cherished personal memories.'
            : 'Find and match pairs of gentle animal companions.'}
        </p>
      </div>

      <p className="start-screen__instruction">
        Choose how many pairs you'd like to play with today.
      </p>

      {/* Difficulty buttons */}
      <div
        className="start-screen__difficulties"
        role="group"
        aria-label="Choose a difficulty level"
      >
        {(['easy', 'medium', 'hard']).map((diff) => {
          const config = DIFFICULTY_CONFIG[diff];
          const meta   = DIFFICULTY_META[diff];
          return (
            <button
              key={diff}
              className={`difficulty-btn ${meta.colorClass}`}
              onClick={() => onSelect(diff, selectedMode)}
              aria-label={`${config.label}: ${config.pairs} pairs, ${config.pairs * 2} cards`}
            >
              <span className="difficulty-btn__icon" aria-hidden="true">{meta.icon}</span>
              <span className="difficulty-btn__label">{config.label}</span>
              <span className="difficulty-btn__meta">
                {config.pairs} pairs &bull; {config.pairs * 2} cards
              </span>
              <span className="difficulty-btn__meta" style={{ fontStyle: 'italic', opacity: 0.75 }}>
                {meta.hint}
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

export default StartScreen;
