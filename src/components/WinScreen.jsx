/**
 * WinScreen.jsx
 * -------------
 * Calm congratulatory overlay shown when all pairs are matched.
 * Displays final stats and offers replay/change-level options.
 */

import React from 'react';

/**
 * Formats seconds into a human-friendly string, e.g. "2m 14s" or "45s".
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTimeFriendly(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

/**
 * @param {object}   props
 * @param {number}   props.moves        — total moves made
 * @param {number}   props.timeTaken    — seconds elapsed
 * @param {number}   props.accuracy     — 0–100 percentage
 * @param {string}   props.difficulty   — 'easy' | 'medium' | 'hard'
 * @param {function} props.onPlayAgain  — restart same difficulty
 * @param {function} props.onChangeDiff — back to start screen
 */
function WinScreen({ moves, timeTaken, accuracy, difficulty, onPlayAgain, onChangeDiff }) {
  return (
    <div
      className="win-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="win-title"
      aria-describedby="win-message"
    >
      <div className="win-card">
        {/* Emblem */}
        <div className="win-card__emblem" aria-hidden="true">🌸</div>

        {/* Title & message */}
        <h2 className="win-card__title" id="win-title">Well done!</h2>
        <p className="win-card__message" id="win-message">
          You matched all the pairs. Take a moment to celebrate — you did beautifully.
        </p>

        {/* Stats */}
        <div className="win-card__stats" aria-label="Your results">
          <div className="win-stat">
            <span className="win-stat__value">{moves}</span>
            <span className="win-stat__label">Moves</span>
          </div>
          <div className="win-stat">
            <span className="win-stat__value">{formatTimeFriendly(timeTaken)}</span>
            <span className="win-stat__label">Time taken</span>
          </div>
          <div className="win-stat">
            <span className="win-stat__value">{accuracy}%</span>
            <span className="win-stat__label">Accuracy</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="win-card__actions">
          <button
            className="btn-primary"
            onClick={onPlayAgain}
            aria-label={`Play again at ${difficulty} difficulty`}
          >
            Play Again
          </button>
          <button
            className="btn-secondary"
            onClick={onChangeDiff}
            aria-label="Choose a different difficulty level"
          >
            Change Level
          </button>
        </div>
      </div>
    </div>
  );
}

export default WinScreen;
