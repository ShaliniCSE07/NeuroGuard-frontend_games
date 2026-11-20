/**
 * MemoryGame.jsx
 * --------------
 * Main game container. Manages all game state:
 *   - Stage: 'start' | 'playing' | 'won'
 *   - Card deck, flipped cards, matched pairs
 *   - Moves counter and elapsed timer
 *   - Win detection and result logging
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import StartScreen from './StartScreen';
import GameHeader  from './GameHeader';
import Card        from './Card';
import WinScreen   from './WinScreen';
import ExitConfirmModal from './ExitConfirmModal';
import { buildDeck, DIFFICULTY_CONFIG } from '../utils/cardData';
import { logGameResult }                from '../utils/resultLogger';

/** Delay (ms) before mismatched cards flip back */
const MISMATCH_DELAY = 900;

/** Delay (ms) after a match before the card begins its exit animation.
 *  This lets the warm matchedPulse glow register with the player first. */
const MATCH_GLOW_DELAY = 600;

const ACTIVE_GAME_KEY = 'neuroguard_active_game';

function MemoryGame({ initialState = null, onClearActiveState, onExitToHub }) {
  // If an initial state is passed via prop or found in localStorage, restore it
  const resolvedInitial = initialState || (() => {
    try {
      const raw = localStorage.getItem(ACTIVE_GAME_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.deck && parsed.deck.length > 0 && parsed.difficulty) {
          return parsed;
        }
      }
    } catch {
      // ignore JSON parse error
    }
    return null;
  })();

  // ── Game stage ──────────────────────────────────────────────────────────────
  const [stage,         setStage]         = useState(() => (resolvedInitial ? 'playing' : 'start'));
  const [difficulty,    setDifficulty]    = useState(() => (resolvedInitial ? resolvedInitial.difficulty : null));
  const [gameMode,      setGameMode]      = useState(() => (resolvedInitial ? resolvedInitial.gameMode : 'animals'));
  const [showExitModal, setShowExitModal] = useState(false);

  // ── Card state ───────────────────────────────────────────────────────────────
  const [deck,       setDeck]       = useState(() => (resolvedInitial ? resolvedInitial.deck : []));
  const [flipped,    setFlipped]    = useState(() => (resolvedInitial ? resolvedInitial.flipped : []));
  const [matched,    setMatched]    = useState(() => (resolvedInitial ? new Set(resolvedInitial.matched) : new Set()));
  const [fadingOut,  setFadingOut]  = useState(() => (resolvedInitial ? new Set(resolvedInitial.fadingOut || resolvedInitial.matched) : new Set()));

  // ── Stats ────────────────────────────────────────────────────────────────────
  const [moves,      setMoves]      = useState(() => (resolvedInitial ? resolvedInitial.moves : 0));
  const [elapsed,    setElapsed]    = useState(() => (resolvedInitial ? resolvedInitial.elapsed : 0));

  // ── Lock flag: prevents extra clicks during mismatch delay or already won ───
  const [isLocked,   setIsLocked]   = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const timerRef     = useRef(null);
  const startTimeRef = useRef(null);  // Date.now() snapshot when game started

  // ── Derived values ───────────────────────────────────────────────────────────
  const config      = difficulty ? DIFFICULTY_CONFIG[difficulty] : null;
  const totalPairs  = config ? config.pairs : 0;
  const pairsFound  = matched.size;

  // ── Timer management ─────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now() - elapsed * 1000; // respect any existing elapsed
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }, [elapsed]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => stopTimer(), [stopTimer]);

  // Handle restoring when initialState prop updates
  useEffect(() => {
    if (initialState) {
      stopTimer();
      setDifficulty(initialState.difficulty);
      setGameMode(initialState.gameMode || 'animals');
      setDeck(initialState.deck || []);
      setFlipped(initialState.flipped || []);
      setMatched(new Set(initialState.matched || []));
      setFadingOut(new Set(initialState.fadingOut || initialState.matched || []));
      setMoves(initialState.moves || 0);
      setElapsed(initialState.elapsed || 0);
      setStage('playing');
      setIsLocked(false);
      startTimeRef.current = Date.now() - (initialState.elapsed || 0) * 1000;
      startTimer();
    }
  }, [initialState, startTimer, stopTimer]);

  // If restored on initial mount, start timer
  useEffect(() => {
    if (resolvedInitial && stage === 'playing') {
      startTimeRef.current = Date.now() - (resolvedInitial.elapsed || 0) * 1000;
      startTimer();
    }
  }, []);

  // ── Auto-Save active game to localStorage ────────────────────────────────────
  useEffect(() => {
    if (stage === 'playing' && difficulty && deck && deck.length > 0) {
      try {
        const activeState = {
          gameMode,
          difficulty,
          deck,
          flipped,
          matched: Array.from(matched),
          fadingOut: Array.from(fadingOut),
          moves,
          pairsFound: matched.size,
          elapsed,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(activeState));
      } catch (err) {
        console.warn('Unable to auto-save game state to localStorage', err);
      }
    }
  }, [stage, gameMode, difficulty, deck, flipped, matched, fadingOut, moves, elapsed]);

  // ── Start / restart game ─────────────────────────────────────────────────────
  const startGame = useCallback((diff, mode = gameMode) => {
    stopTimer();
    const effectiveMode = mode || gameMode || 'animals';
    setDifficulty(diff);
    setGameMode(effectiveMode);
    setDeck(buildDeck(diff, effectiveMode));
    setFlipped([]);
    setMatched(new Set());
    setFadingOut(new Set());
    setMoves(0);
    setElapsed(0);
    setIsLocked(false);
    setStage('playing');
    // Timer starts on first card flip (see handleFlip)
  }, [stopTimer, gameMode]);

  // ── Restart with same difficulty and mode ─────────────────────────────────────
  // Calls startGame directly with the current difficulty & mode so a brand-new
  // buildDeck() is always invoked — the deck is re-shuffled, not reused.
  const restartGame = useCallback(() => {
    if (difficulty) startGame(difficulty, gameMode);
  }, [difficulty, gameMode, startGame]);

  // ── Go back to start screen (explicit quit / change level) ────────────────────
  const goToStart = useCallback(() => {
    stopTimer();
    try {
      localStorage.removeItem(ACTIVE_GAME_KEY);
    } catch {
      // ignore
    }
    if (onClearActiveState) onClearActiveState();

    setStage('start');
    setDifficulty(null);
    setDeck([]);
    setFlipped([]);
    setMatched(new Set());
    setFadingOut(new Set());
    setMoves(0);
    setElapsed(0);
    setIsLocked(false);
  }, [stopTimer, onClearActiveState]);

  // ── Exit to menu handlers (preserves active auto-save in localStorage) ───────
  const handleConfirmExit = useCallback(() => {
    stopTimer();
    setShowExitModal(false);
    // Crucial: do NOT clear localStorage(ACTIVE_GAME_KEY) here so game can be resumed later!
    if (onExitToHub) onExitToHub();
  }, [stopTimer, onExitToHub]);

  const handleCancelExit = useCallback(() => {
    setShowExitModal(false);
  }, []);

  // ── Card flip handler ────────────────────────────────────────────────────────
  const handleFlip = useCallback((card) => {
    // Block if locked, already 2 cards flipped, or card already matched/flipped
    if (isLocked) return;
    if (flipped.includes(card.instanceId)) return;
    if (matched.has(card.id)) return;
    if (flipped.length >= 2) return;

    // Start timer on very first flip
    if (moves === 0 && flipped.length === 0) {
      startTimeRef.current = Date.now();
      startTimer();
    }

    const newFlipped = [...flipped, card.instanceId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      // Two cards are now face-up — evaluate
      const newMoves = moves + 1;
      setMoves(newMoves);
      setIsLocked(true);

      // Find both card objects by instanceId
      const [firstId, secondId] = newFlipped;
      const firstCard  = deck.find((c) => c.instanceId === firstId);
      const secondCard = deck.find((c) => c.instanceId === secondId);

      if (firstCard.id === secondCard.id) {
        // ✅ Match! Add to matched set
        const newMatched = new Set(matched);
        newMatched.add(firstCard.id);
        setMatched(newMatched);
        setFlipped([]);
        setIsLocked(false);

        // After the warm glow registers, trigger the graceful exit animation
        setTimeout(() => {
          setFadingOut((prev) => {
            const next = new Set(prev);
            next.add(firstCard.id);
            return next;
          });
        }, MATCH_GLOW_DELAY);

        // Check win condition
        if (newMatched.size === DIFFICULTY_CONFIG[difficulty].pairs) {
          stopTimer();
          setStage('won');

          // Clear active game from localStorage upon win
          try {
            localStorage.removeItem(ACTIVE_GAME_KEY);
          } catch {
            // ignore
          }
          if (onClearActiveState) onClearActiveState();

          // Log the result
          logGameResult({
            difficulty,
            mode: gameMode,
            difficultyLevel: DIFFICULTY_CONFIG[difficulty].difficultyLevel,
            pairsMatched:    newMatched.size,
            attempts:        newMoves,
            timeTaken:       Math.floor((Date.now() - startTimeRef.current) / 1000),
          });
        }
      } else {
        // ❌ No match — flip back after delay
        setTimeout(() => {
          setFlipped([]);
          setIsLocked(false);
        }, MISMATCH_DELAY);
      }
    }
  }, [isLocked, flipped, matched, moves, deck, difficulty, gameMode, startTimer, stopTimer]);

  // ── Render ───────────────────────────────────────────────────────────────────
  if (stage === 'start') {
    return <StartScreen onSelect={(diff, mode) => startGame(diff, mode)} />;
  }

  const boardClass = `game-board game-board--${difficulty}`;

  // Compute accuracy for WinScreen
  const accuracy = moves > 0
    ? Math.round((pairsFound / moves) * 1000) / 10
    : 0;

  return (
    <div className="app-shell">
      <GameHeader
        moves={moves}
        pairsFound={pairsFound}
        totalPairs={totalPairs}
        elapsedSecs={elapsed}
        onRestart={restartGame}
        onExit={() => setShowExitModal(true)}
      />

      {/* Exit Game Confirmation Modal */}
      <ExitConfirmModal
        isOpen={showExitModal}
        title="Exit Game"
        message="Do you want to stop playing and go back to the menu?"
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />

      {/* Card grid */}
      <main
        className={boardClass}
        role="main"
        aria-label={`Memory Match board — ${difficulty} difficulty`}
      >
        {deck.map((card) => (
          <Card
            key={card.instanceId}
            card={card}
            isFlipped={flipped.includes(card.instanceId) || matched.has(card.id)}
            isMatched={matched.has(card.id)}
            isFadingOut={fadingOut.has(card.id)}
            onFlip={handleFlip}
          />
        ))}
      </main>

      {/* Win overlay */}
      {stage === 'won' && (
        <WinScreen
          moves={moves}
          timeTaken={elapsed}
          accuracy={accuracy}
          difficulty={difficulty}
          onPlayAgain={restartGame}
          onChangeDiff={goToStart}
        />
      )}
    </div>
  );
}

export default MemoryGame;
