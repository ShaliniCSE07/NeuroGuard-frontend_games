/**
 * PatternGame.jsx
 * ---------------
 * Game 3: Attention & Pattern Recognition.
 *
 * Players are presented with a grid of soft circular shapes.
 * All shapes share a calm base color (soft sage green) except for
 * 1-4 high-contrast target shapes (warm terracotta).
 * Players must spot and tap only the target shapes.
 *
 * Exactly 5 progressive levels:
 *   Level 1: 12 shapes, 1 target
 *   Level 2: 16 shapes, 2 targets
 *   Level 3: 20 shapes, 3 targets
 *   Level 4: 24 shapes, 3 targets
 *   Level 5: 24 shapes, 4 targets
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logPatternResult } from '../utils/resultLogger';
import { fisherYatesShuffle } from '../utils/cardData';
import ExitConfirmModal from './ExitConfirmModal';
import '../styles/patternGame.css';

const LEVEL_CONFIGS = [
  { level: 1, totalShapes: 12, targetCount: 1 },
  { level: 2, totalShapes: 16, targetCount: 2 },
  { level: 3, totalShapes: 20, targetCount: 3 },
  { level: 4, totalShapes: 24, targetCount: 3 },
  { level: 5, totalShapes: 24, targetCount: 4 },
];

/**
 * Generates grid shapes for the current level with exact targetCount
 * targets and distractor shapes, completely randomized across grid positions
 * using the crypto-backed Fisher-Yates shuffle.
 *
 * @param {number} totalShapes - Total shapes in the grid for this level
 * @param {number} targetCount - Exact number of target shapes required
 * @returns {Array<{ id: string, isTarget: boolean, state: string }>}
 */
function createLevelShapes(totalShapes, targetCount) {
  // Construct array with exact target and distractor booleans
  const items = [];
  for (let i = 0; i < targetCount; i++) {
    items.push(true);
  }
  for (let i = 0; i < totalShapes - targetCount; i++) {
    items.push(false);
  }

  // Shuffle the entire grid array using the high-quality Fisher-Yates algorithm
  const shuffledGrid = fisherYatesShuffle(items);

  // Unique session token ensures complete React component remount & fresh animations
  const roundSeed = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

  return shuffledGrid.map((isTarget, idx) => ({
    id: `shape-${roundSeed}-${idx}`,
    isTarget,
    state: 'normal', // 'normal' | 'collected' | 'wobble'
  }));
}

function PatternGame({ onBackToHub }) {
  // ── Game Stage ─────────────────────────────────────────────────────────────
  // 'start' | 'playing' | 'transition' | 'won'
  const [stage, setStage] = useState('start');

  // ── Level & Grid ───────────────────────────────────────────────────────────
  const [levelIndex, setLevelIndex] = useState(0); // 0 to 4
  const [shapes, setShapes]         = useState([]);
  const [targetsLeft, setTargetsLeft] = useState(0);

  // ── Metrics & Performance ──────────────────────────────────────────────────
  const [attempts, setAttempts]     = useState(0); // total taps (correct + wrong)
  const [mistakes, setMistakes]     = useState(0); // total wrong taps
  const [score, setScore]           = useState(0); // total correct targets tapped
  const [elapsed, setElapsed]       = useState(0);
  const [finalStats, setFinalStats] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // ── Timers & Refs ──────────────────────────────────────────────────────────
  const timerRef     = useRef(null);
  const startTimeRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // ── Initialize a specific level ────────────────────────────────────────────
  const loadLevel = useCallback((lvlIdx) => {
    const config = LEVEL_CONFIGS[lvlIdx];
    const newShapes = createLevelShapes(config.totalShapes, config.targetCount);
    setShapes(newShapes);
    setTargetsLeft(config.targetCount);
  }, []);

  // ── Start a brand new game ─────────────────────────────────────────────────
  const startNewGame = useCallback(() => {
    stopTimer();
    setLevelIndex(0);
    setAttempts(0);
    setMistakes(0);
    setScore(0);
    setElapsed(0);
    setFinalStats(null);

    loadLevel(0);
    setStage('playing');

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }, [stopTimer, loadLevel]);

  // ── Shape Tap Handler ──────────────────────────────────────────────────────
  const handleShapeClick = (shape, index) => {
    if (stage !== 'playing' || shape.state === 'collected' || shape.state === 'wobble') {
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (shape.isTarget) {
      // ✅ Correct target tapped
      const nextScore = score + 1;
      const nextTargetsLeft = targetsLeft - 1;
      setScore(nextScore);
      setTargetsLeft(nextTargetsLeft);

      // Animate collected shape
      setShapes((prev) =>
        prev.map((s, idx) => (idx === index ? { ...s, state: 'collected' } : s))
      );

      // Check if all targets in current level are found
      if (nextTargetsLeft === 0) {
        if (levelIndex < LEVEL_CONFIGS.length - 1) {
          // Advance to next level after a calm pause
          setStage('transition');
          setTimeout(() => {
            const nextLevelIdx = levelIndex + 1;
            setLevelIndex(nextLevelIdx);
            loadLevel(nextLevelIdx);
            setStage('playing');
          }, 900);
        } else {
          // 🎉 Final level cleared — Win!
          stopTimer();
          const totalTime = Math.max(1, Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000));

          const result = logPatternResult({
            score: nextScore,
            difficultyLevel: 5,
            attempts: nextAttempts,
            mistakes,
            timeTaken: totalTime,
          });

          setFinalStats(result);
          setStage('won');
        }
      }
    } else {
      // ❌ Distractor shape tapped: gentle wobble, dims, non-punitive
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);

      setShapes((prev) =>
        prev.map((s, idx) => (idx === index ? { ...s, state: 'wobble' } : s))
      );
    }
  };

  const currentConfig = LEVEL_CONFIGS[levelIndex] || LEVEL_CONFIGS[0];

  return (
    <div className="pattern-game">
      {/* ── Active Header (Levels & Targets) ── */}
      {(stage === 'playing' || stage === 'transition') && (
        <header className="pattern-header" aria-label="Game information">
          <div className="pattern-header__stats">
            <div className="pattern-stat">
              <span className="pattern-stat__value">{levelIndex + 1} / 5</span>
              <span className="pattern-stat__label">Level</span>
            </div>
            <div className="pattern-stat">
              <span className="pattern-stat__value">{targetsLeft}</span>
              <span className="pattern-stat__label">Targets Left</span>
            </div>
            <div className="pattern-stat">
              <span className="pattern-stat__value">{elapsed}s</span>
              <span className="pattern-stat__label">Time</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="pattern-instruction-pill">
              <span className="pattern-target-indicator" aria-hidden="true" />
              <span>Tap Terracotta Shapes</span>
            </div>

            <button
              className="header-btn"
              onClick={() => setShowExitModal(true)}
              aria-label="Exit game and return to main menu"
            >
              🚪 Exit Game
            </button>
          </div>
        </header>
      )}

      {/* Exit Game Confirmation Modal */}
      <ExitConfirmModal
        isOpen={showExitModal}
        title="Exit Pattern Game"
        message="Do you want to stop playing and go back to the menu?"
        onConfirm={() => {
          stopTimer();
          setShowExitModal(false);
          onBackToHub();
        }}
        onCancel={() => setShowExitModal(false)}
      />

      {/* ── STAGE: START SCREEN ── */}
      {stage === 'start' && (
        <div className="pattern-start">
          <div className="pattern-start__icon" aria-hidden="true">🎨</div>
          <h1 className="pattern-start__title">Pattern Recognition</h1>
          <p className="pattern-start__instruction">
            Spot and tap the <strong>Terracotta</strong> shapes. Ignore the sage green shapes.
          </p>

          <div className="pattern-start__legend" aria-label="Visual guide">
            <div className="pattern-legend-item">
              <div className="pattern-legend-swatch pattern-legend-swatch--target" aria-hidden="true" />
              <span>Target (Tap this)</span>
            </div>
            <div className="pattern-legend-item">
              <div className="pattern-legend-swatch pattern-legend-swatch--distractor" aria-hidden="true" />
              <span>Ignore</span>
            </div>
          </div>

          <p className="pattern-start__tip">
            There are 5 relaxing rounds. Take all the time you need.
          </p>

          <button
            className="btn-primary"
            onClick={startNewGame}
            aria-label="Start Pattern Recognition Game"
          >
            Start Game
          </button>
        </div>
      )}

      {/* ── STAGE: PLAYING / TRANSITION ARENA ── */}
      {(stage === 'playing' || stage === 'transition') && (
        <div className="pattern-arena">
          <main
            className={`pattern-grid pattern-grid--${currentConfig.totalShapes}`}
            role="grid"
            aria-label={`Shape grid — level ${levelIndex + 1}`}
          >
            {shapes.map((shape, idx) => {
              let classNames = 'pattern-shape';
              if (shape.isTarget) {
                classNames += ' pattern-shape--target';
              } else {
                classNames += ' pattern-shape--distractor';
              }

              if (shape.state === 'collected') {
                classNames += ' pattern-shape--collected';
              } else if (shape.state === 'wobble') {
                classNames += ' pattern-shape--wobble';
              }

              return (
                <button
                  key={shape.id}
                  className={classNames}
                  onClick={() => handleShapeClick(shape, idx)}
                  disabled={shape.state === 'collected' || shape.state === 'wobble'}
                  aria-label={
                    shape.state === 'collected'
                      ? 'Target found'
                      : shape.isTarget
                        ? 'Target shape'
                        : 'Background shape'
                  }
                />
              );
            })}
          </main>

          {/* Gentle level transition overlay */}
          {stage === 'transition' && (
            <div className="pattern-transition-banner" role="status" aria-live="polite">
              <h3>Level {levelIndex + 1} Cleared!</h3>
              <p>Preparing next round...</p>
            </div>
          )}
        </div>
      )}

      {/* ── STAGE: WIN SCREEN ── */}
      {stage === 'won' && finalStats && (
        <div
          className="pattern-win-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pattern-win-title"
        >
          <div className="pattern-win-card">
            <div className="pattern-win-card__emblem" aria-hidden="true">🌸</div>
            <h2 className="pattern-win-card__title" id="pattern-win-title">Well Done!</h2>
            <p className="pattern-win-card__desc">
              You completed all 5 levels of visual pattern recognition. Your focus and attention were wonderful.
            </p>

            <div className="pattern-win-card__stats" aria-label="Game results">
              <div className="win-stat">
                <span className="win-stat__value">{finalStats.score}</span>
                <span className="win-stat__label">Targets Found</span>
              </div>
              <div className="win-stat">
                <span className="win-stat__value">{finalStats.accuracy}%</span>
                <span className="win-stat__label">Accuracy</span>
              </div>
              <div className="win-stat">
                <span className="win-stat__value">{finalStats.time_taken}s</span>
                <span className="win-stat__label">Time Taken</span>
              </div>
              <div className="win-stat">
                <span className="win-stat__value">{finalStats.mistakes}</span>
                <span className="win-stat__label">Mistakes</span>
              </div>
            </div>

            <div className="win-card__actions">
              <button
                className="btn-primary"
                onClick={startNewGame}
                aria-label="Play Pattern Recognition Again"
              >
                Play Again
              </button>
              <button
                className="btn-secondary"
                onClick={onBackToHub}
                aria-label="Return to Main Game Hub"
              >
                Back to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatternGame;
