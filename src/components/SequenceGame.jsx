/**
 * SequenceGame.jsx
 * ----------------
 * Game 2: Sequence Recall.
 * Users watch a sequence of numbers presented one by one,
 * then tap them back in the exact same order on a large, dementia-friendly number pad.
 *
 * Starts with sequence length 3. Succeeded rounds increase length by 1.
 * 3 mistakes end the game.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logSequenceResult } from '../utils/resultLogger';
import ExitConfirmModal from './ExitConfirmModal';
import '../styles/sequenceGame.css';

const START_LENGTH = 3;
const MAX_MISTAKES = 3;

/**
 * Generates a random sequence of single digits (0-9).
 * Avoids direct consecutive duplicates for clarity (e.g. avoids 4, 4).
 */
function generateSequence(length) {
  const seq = [];
  for (let i = 0; i < length; i++) {
    let digit;
    do {
      digit = Math.floor(Math.random() * 10);
    } while (i > 0 && digit === seq[i - 1]);
    seq.push(digit);
  }
  return seq;
}

function SequenceGame({ onBackToHub }) {
  // ── Stage ──────────────────────────────────────────────────────────────────
  // 'start' | 'ready' (countdown) | 'showing' | 'input' | 'feedback' | 'gameover'
  const [stage, setStage] = useState('start');

  // ── Round & Sequence ───────────────────────────────────────────────────────
  const [level, setLevel]                     = useState(1);
  const [sequenceLength, setSequenceLength]   = useState(START_LENGTH);
  const [sequence, setSequence]               = useState([]);
  const [displayedNumber, setDisplayedNumber] = useState(null); // number or null (blank gap)
  const [countdown, setCountdown]             = useState(3);

  // ── User Input & Performance ───────────────────────────────────────────────
  const [userInputs, setUserInputs]     = useState([]);
  const [tappedFeedback, setTappedFeedback] = useState(null); // { digit, status: 'correct'|'wrong' }
  const [feedbackMsg, setFeedbackMsg]   = useState(null);    // { text, type: 'success'|'error' }

  // ── Stats Tracking ─────────────────────────────────────────────────────────
  const [mistakes, setMistakes]         = useState(0);
  const [attempts, setAttempts]         = useState(0);        // total taps made
  const [highestScore, setHighestScore] = useState(0);        // max sequence length completed
  const [highestLevel, setHighestLevel] = useState(1);
  const [elapsed, setElapsed]           = useState(0);
  const [finalStats, setFinalStats]     = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // ── Refs for timers & cleanup ──────────────────────────────────────────────
  const timerIntervalRef = useRef(null);
  const sequenceTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const startTimeRef     = useRef(null);
  const isInputLockedRef = useRef(false);

  // Stop elapsed timer
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Cleanup all pending timeouts/intervals
  const clearAllTimers = useCallback(() => {
    stopTimer();
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
  }, [stopTimer]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // ── Play sequence animation (1s visible, 0.5s gap) ─────────────────────────
  const playSequence = useCallback((seq) => {
    setStage('showing');
    setUserInputs([]);
    setDisplayedNumber(null);

    let stepIndex = 0;

    const runStep = () => {
      if (stepIndex >= seq.length) {
        // All numbers shown; brief gap before input begins
        setDisplayedNumber(null);
        sequenceTimerRef.current = setTimeout(() => {
          setStage('input');
          isInputLockedRef.current = false;
        }, 500);
        return;
      }

      // Show digit
      const currentDigit = seq[stepIndex];
      setDisplayedNumber(currentDigit);

      // Keep visible for 1000ms
      sequenceTimerRef.current = setTimeout(() => {
        // Gap of 500ms with blank card
        setDisplayedNumber(null);
        stepIndex++;

        sequenceTimerRef.current = setTimeout(() => {
          runStep();
        }, 500);
      }, 1000);
    };

    // Small delay before first digit appears
    sequenceTimerRef.current = setTimeout(() => {
      runStep();
    }, 400);
  }, []);

  // ── Start countdown (3, 2, 1) then play sequence ───────────────────────────
  const startRoundWithCountdown = useCallback((targetSeq) => {
    setStage('ready');
    setCountdown(3);
    setDisplayedNumber(null);
    setUserInputs([]);
    setFeedbackMsg(null);

    let count = 3;
    const tick = () => {
      count--;
      if (count > 0) {
        setCountdown(count);
        countdownTimerRef.current = setTimeout(tick, 1000);
      } else {
        // Countdown done; show sequence
        playSequence(targetSeq);
      }
    };

    countdownTimerRef.current = setTimeout(tick, 1000);
  }, [playSequence]);

  // ── Start a completely new game ────────────────────────────────────────────
  const startNewGame = useCallback(() => {
    clearAllTimers();
    setLevel(1);
    setSequenceLength(START_LENGTH);
    setMistakes(0);
    setAttempts(0);
    setHighestScore(0);
    setHighestLevel(1);
    setElapsed(0);
    setFinalStats(null);
    setFeedbackMsg(null);
    setTappedFeedback(null);
    isInputLockedRef.current = false;

    // Start elapsed timer
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);

    const firstSeq = generateSequence(START_LENGTH);
    setSequence(firstSeq);
    startRoundWithCountdown(firstSeq);
  }, [clearAllTimers, startRoundWithCountdown]);

  // ── Handle Game Over ───────────────────────────────────────────────────────
  const handleGameOver = useCallback((finalMistakes, finalAttempts, currentHighestScore, currentHighestLevel) => {
    clearAllTimers();
    const totalTime = Math.max(1, Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000));

    // Save and log result
    const result = logSequenceResult({
      score: currentHighestScore,
      difficultyLevel: currentHighestLevel,
      attempts: finalAttempts,
      mistakes: finalMistakes,
      timeTaken: totalTime,
    });

    setFinalStats(result);
    setStage('gameover');
  }, [clearAllTimers]);

  // ── Keypad Tap Handler ─────────────────────────────────────────────────────
  const handleKeyTap = (digit) => {
    if (stage !== 'input' || isInputLockedRef.current) return;

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    const currentIndex = userInputs.length;
    const expectedDigit = sequence[currentIndex];

    if (digit === expectedDigit) {
      // ✅ Correct tap
      setTappedFeedback({ digit, status: 'correct' });
      const nextInputs = [...userInputs, digit];
      setUserInputs(nextInputs);

      // Check if sequence is complete
      if (nextInputs.length === sequence.length) {
        // Sequence completed successfully!
        isInputLockedRef.current = true;
        const newScore = Math.max(highestScore, sequence.length);
        setHighestScore(newScore);

        setFeedbackMsg({ text: 'Well done! Sequence matched.', type: 'success' });

        setTimeout(() => {
          setTappedFeedback(null);
          setFeedbackMsg(null);

          // Advance to next round
          const nextLevel = level + 1;
          const nextLength = sequenceLength + 1;
          setLevel(nextLevel);
          setHighestLevel((prev) => Math.max(prev, nextLevel));
          setSequenceLength(nextLength);

          const nextSeq = generateSequence(nextLength);
          setSequence(nextSeq);
          startRoundWithCountdown(nextSeq);
        }, 1100);
      } else {
        // Clear tap pulse after brief moment
        setTimeout(() => setTappedFeedback(null), 300);
      }
    } else {
      // ❌ Mistake
      isInputLockedRef.current = true;
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setTappedFeedback({ digit, status: 'wrong' });

      if (nextMistakes >= MAX_MISTAKES) {
        // 3 mistakes reached -> Game Over
        setFeedbackMsg({ text: 'Round ended.', type: 'error' });
        setTimeout(() => {
          setTappedFeedback(null);
          handleGameOver(nextMistakes, nextAttempts, highestScore, highestLevel);
        }, 1000);
      } else {
        // Retry with a fresh sequence of same length
        setFeedbackMsg({
          text: `Gentle notice: Mistake ${nextMistakes} of ${MAX_MISTAKES}. Let's try another one.`,
          type: 'error',
        });

        setTimeout(() => {
          setTappedFeedback(null);
          setFeedbackMsg(null);
          const retrySeq = generateSequence(sequenceLength);
          setSequence(retrySeq);
          startRoundWithCountdown(retrySeq);
        }, 1600);
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="sequence-game">
      {/* Game Header Bar (active when playing) */}
      {stage !== 'start' && stage !== 'gameover' && (
        <header className="sequence-header" aria-label="Game information">
          <div className="sequence-header__stats">
            <div className="sequence-stat">
              <span className="sequence-stat__value">{level}</span>
              <span className="sequence-stat__label">Level</span>
            </div>
            <div className="sequence-stat">
              <span className="sequence-stat__value">{sequenceLength}</span>
              <span className="sequence-stat__label">Length</span>
            </div>
            <div className="sequence-stat">
              <span className="sequence-stat__value">{highestScore}</span>
              <span className="sequence-stat__label">Best</span>
            </div>
            <div className="sequence-stat">
              <span className="sequence-stat__value">{elapsed}s</span>
              <span className="sequence-stat__label">Time</span>
            </div>
          </div>

          {/* Mistake trackers (3 dots) & Exit Game */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div className="sequence-mistakes" aria-label={`Mistakes: ${mistakes} of ${MAX_MISTAKES}`}>
              <span className="sequence-stat__label" style={{ marginRight: 6 }}>Tries Left:</span>
              {[0, 1, 2].map((idx) => (
                <span
                  key={idx}
                  className={`mistake-dot ${idx < mistakes ? 'mistake-dot--used' : ''}`}
                  aria-hidden="true"
                />
              ))}
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
        title="Exit Sequence Game"
        message="Do you want to stop playing and go back to the menu?"
        onConfirm={() => {
          clearAllTimers();
          setShowExitModal(false);
          onBackToHub();
        }}
        onCancel={() => setShowExitModal(false)}
      />

      {/* ── STAGE: START SCREEN ── */}
      {stage === 'start' && (
        <div className="sequence-start">
          <div className="sequence-start__icon" aria-hidden="true">🔢</div>
          <h1 className="sequence-start__title">Sequence Recall</h1>
          <p className="sequence-start__instruction">
            Watch the numbers appear one by one, then tap them on the pad in the exact same order.
          </p>
          <p className="sequence-start__tip">
            Take your time. The game gently adapts as you succeed.
          </p>
          <button
            className="btn-primary"
            onClick={startNewGame}
            aria-label="Start Sequence Recall Game"
          >
            Start Game
          </button>
        </div>
      )}

      {/* ── STAGE: ACTIVE PLAY ARENA (READY / SHOWING / INPUT) ── */}
      {(stage === 'ready' || stage === 'showing' || stage === 'input') && (
        <div className="sequence-arena" aria-live="polite">
          {/* Countdown State */}
          {stage === 'ready' && (
            <div className="sequence-countdown">
              <span className="sequence-countdown__prompt">Get ready...</span>
              <span className="sequence-countdown__num">{countdown}</span>
            </div>
          )}

          {/* Showing Numbers State */}
          {stage === 'showing' && (
            <div className="sequence-display">
              <span className="sequence-display__label">Watch carefully:</span>
              <div className="sequence-display__card">
                {displayedNumber !== null ? (
                  <span className="sequence-display__number">{displayedNumber}</span>
                ) : (
                  <span className="sequence-display__blank" aria-hidden="true" />
                )}
              </div>
            </div>
          )}

          {/* User Input State */}
          {stage === 'input' && (
            <div className="sequence-input-section">
              <span className="sequence-input__prompt">Your turn: tap the sequence</span>

              {/* Progress circles for the sequence */}
              <div className="sequence-slots" aria-label={`Entered ${userInputs.length} of ${sequence.length} numbers`}>
                {sequence.map((_, idx) => (
                  <div
                    key={idx}
                    className={`sequence-slot ${idx < userInputs.length ? 'sequence-slot--filled' : ''}`}
                  >
                    {idx < userInputs.length ? userInputs[idx] : ''}
                  </div>
                ))}
              </div>

              {/* Number Pad (1-9, 0) */}
              <div className="keypad" role="group" aria-label="Number keypad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
                  let btnClass = 'keypad__btn';
                  if (tappedFeedback && tappedFeedback.digit === digit) {
                    btnClass += tappedFeedback.status === 'correct'
                      ? ' keypad__btn--correct'
                      : ' keypad__btn--wrong';
                  }
                  return (
                    <button
                      key={digit}
                      className={btnClass}
                      onClick={() => handleKeyTap(digit)}
                      aria-label={`Digit ${digit}`}
                    >
                      {digit}
                    </button>
                  );
                })}
                {/* 0 in row 4, center */}
                <button
                  className={[
                    'keypad__btn',
                    'keypad__btn--zero',
                    tappedFeedback && tappedFeedback.digit === 0
                      ? tappedFeedback.status === 'correct'
                        ? 'keypad__btn--correct'
                        : 'keypad__btn--wrong'
                      : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleKeyTap(0)}
                  aria-label="Digit 0"
                >
                  0
                </button>
              </div>

              {/* Feedback Message */}
              {feedbackMsg && (
                <div
                  className={`sequence-feedback sequence-feedback--${feedbackMsg.type}`}
                  role="status"
                >
                  {feedbackMsg.text}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STAGE: GAME OVER SCREEN ── */}
      {stage === 'gameover' && finalStats && (
        <div
          className="sequence-gameover"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-title"
        >
          <div className="sequence-gameover__card">
            <div className="sequence-gameover__emblem" aria-hidden="true">🌸</div>
            <h2 className="sequence-gameover__title" id="gameover-title">Exercise Complete</h2>
            <p className="sequence-gameover__desc">
              Wonderful effort! Regularly exercising short-term recall supports cognitive vitality.
            </p>

            <div className="sequence-gameover__stats" aria-label="Your performance stats">
              <div className="win-stat">
                <span className="win-stat__value">{finalStats.score}</span>
                <span className="win-stat__label">Highest Length</span>
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
                <span className="win-stat__value">{finalStats.attempts}</span>
                <span className="win-stat__label">Total Taps</span>
              </div>
            </div>

            <div className="win-card__actions">
              <button
                className="btn-primary"
                onClick={startNewGame}
                aria-label="Play Sequence Recall Again"
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

export default SequenceGame;
