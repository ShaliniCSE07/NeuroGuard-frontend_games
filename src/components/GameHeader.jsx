/**
 * GameHeader.jsx
 * --------------
 * Top status bar showing moves, pairs found, and elapsed time.
 * Also exposes Restart and Change Level actions.
 */

import React from 'react';

/**
 * Formats elapsed seconds into mm:ss display string.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

/**
 * @param {object}   props
 * @param {number}   props.moves         — total pair-flip attempts
 * @param {number}   props.pairsFound    — matched pairs so far
 * @param {number}   props.totalPairs    — total pairs to match
 * @param {number}   props.elapsedSecs   — timer in seconds
 * @param {function} props.onRestart     — restart same difficulty
 * @param {function} props.onExit        — open exit confirmation modal
 */
function GameHeader({ moves, pairsFound, totalPairs, elapsedSecs, onRestart, onExit }) {
  return (
    <header className="game-header" role="banner">
      {/* Stats */}
      <div className="game-header__stats" aria-live="polite" aria-atomic="false">
        <div className="stat-item">
          <span className="stat-item__value" aria-label={`${moves} moves`}>{moves}</span>
          <span className="stat-item__label">Moves</span>
        </div>

        <div className="stat-item">
          <span
            className="stat-item__value"
            aria-label={`${pairsFound} of ${totalPairs} pairs found`}
          >
            {pairsFound}<span style={{ opacity: 0.45, fontSize: '1rem' }}>/{totalPairs}</span>
          </span>
          <span className="stat-item__label">Pairs</span>
        </div>

        <div className="stat-item">
          <span className="stat-item__value" aria-label={`Time: ${formatTime(elapsedSecs)}`}>
            {formatTime(elapsedSecs)}
          </span>
          <span className="stat-item__label">Time</span>
        </div>
      </div>

      {/* Actions */}
      <div className="game-header__actions">
        <button
          className="header-btn"
          onClick={onRestart}
          aria-label="Restart game with same difficulty"
        >
          ↺ Restart
        </button>
        <button
          className="header-btn"
          onClick={onExit}
          aria-label="Exit game and return to main menu"
        >
          🚪 Exit Game
        </button>
      </div>
    </header>
  );
}

export default GameHeader;
