/**
 * resultLogger.js
 * ---------------
 * Builds and persists game result data to localStorage.
 * Supports all NeuroGuard games via game-type-specific builders.
 *
 * FUTURE INTEGRATION NOTE:
 * Replace the `saveResultToLocalStorage` call inside `logGameResult` /
 * `logSequenceResult` with a fetch() / axios.post() to your backend API.
 * The result object shapes are documented below and must remain stable.
 *
 * Memory Matching result schema:
 * {
 *   user_id, game_type: 'memory_matching', difficulty, score, accuracy,
 *   time_taken, difficulty_level, attempts, mistakes, timestamp
 * }
 *
 * Sequence Recall result schema:
 * {
 *   user_id, game_type: 'sequence_recall', difficulty: 'adaptive', score,
 *   accuracy, time_taken, difficulty_level, attempts, mistakes, timestamp
 * }
 */

const STORAGE_KEY = 'neuroguard_game_results';
const USER_ID     = 'U001';   // Replace with real auth when available
const BACKEND_URL = 'http://127.0.0.1:5000/api/results';

/**
 * saveResultToBackend(result) — sends the result object to the Python Flask backend.
 * Gracefully falls back to local storage if the server is offline.
 *
 * @param {object} result
 */
async function saveResultToBackend(result) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    });

    if (!response.ok) {
      console.warn('Backend responded with error status:', response.status);
    }
  } catch (err) {
    console.log('Backend not running, saved to local storage only');
  }
}

/**
 * buildResult(params) → Memory Matching result object
 *
 * @param {object} params
 * @param {'easy'|'medium'|'hard'} params.difficulty
 * @param {'animals'|'personal'} [params.mode] — 'animals' | 'personal'
 * @param {number} params.difficultyLevel  — 1 | 2 | 3
 * @param {number} params.pairsMatched     — how many pairs were found
 * @param {number} params.attempts         — total flip-pair attempts
 * @param {number} params.timeTaken        — seconds (integer)
 * @returns {object} result
 */
function buildResult({ difficulty, mode = 'animals', difficultyLevel, pairsMatched, attempts, timeTaken }) {
  const accuracy = attempts > 0
    ? Math.round((pairsMatched / attempts) * 1000) / 10   // 1 decimal place
    : 0;

  return {
    user_id:          USER_ID,
    game_type:        'memory_matching',
    difficulty,
    mode,
    score:            pairsMatched,
    accuracy,
    time_taken:       Math.round(timeTaken),
    difficulty_level: difficultyLevel,
    attempts,
    mistakes:         Math.max(0, attempts - pairsMatched),
    timestamp:        new Date().toISOString(),
  };
}

/**
 * buildSequenceResult(params) → Sequence Recall result object
 *
 * @param {object} params
 * @param {number} params.score           — highest sequence length successfully recalled
 * @param {number} params.difficultyLevel — highest level reached
 * @param {number} params.attempts        — total taps made
 * @param {number} params.mistakes        — total wrong taps
 * @param {number} params.timeTaken       — seconds (integer)
 * @returns {object} result
 */
function buildSequenceResult({ score, difficultyLevel, attempts, mistakes, timeTaken }) {
  const correctTaps = attempts - mistakes;
  const accuracy    = attempts > 0
    ? Math.round((correctTaps / attempts) * 1000) / 10
    : 0;

  return {
    user_id:          USER_ID,
    game_type:        'sequence_recall',
    difficulty:       'adaptive',
    score,
    accuracy,
    time_taken:       Math.round(timeTaken),
    difficulty_level: difficultyLevel,
    attempts,
    mistakes,
    timestamp:        new Date().toISOString(),
  };
}

/**
 * buildPatternResult(params) → Pattern Recognition result object
 *
 * @param {object} params
 * @param {number} params.score           — total correct targets tapped across all levels
 * @param {number} params.difficultyLevel — highest level reached (usually 5)
 * @param {number} params.attempts        — total taps made (correct + wrong)
 * @param {number} params.mistakes        — total wrong shapes tapped
 * @param {number} params.timeTaken       — seconds (integer)
 * @returns {object} result
 */
function buildPatternResult({ score, difficultyLevel, attempts, mistakes, timeTaken }) {
  const accuracy = attempts > 0
    ? Math.round((score / attempts) * 1000) / 10
    : 0;

  return {
    user_id:          USER_ID,
    game_type:        'pattern_recognition',
    difficulty:       'progressive',
    score,
    accuracy,
    time_taken:       Math.round(timeTaken),
    difficulty_level: difficultyLevel,
    attempts,
    mistakes,
    timestamp:        new Date().toISOString(),
  };
}

/**
 * saveResultToLocalStorage(result) — appends result to the stored array.
 * @param {object} result
 */
function saveResultToLocalStorage(result) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(existing)) throw new Error('Corrupt data');
    existing.push(result);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    // If storage is corrupted, start fresh
    localStorage.setItem(STORAGE_KEY, JSON.stringify([result]));
  }
}

/**
 * logGameResult(params) — builds, saves, and logs the Memory Matching result.
 * This is the single entry point called at game completion for Game 1.
 *
 * @param {object} params  — same as buildResult params
 * @returns {object}       — the result object (for further use if needed)
 */
export function logGameResult(params) {
  const result = buildResult(params);

  // Persist to localStorage (fallback)
  saveResultToLocalStorage(result);

  // Send to local Python backend
  saveResultToBackend(result);

  // Developer verification log
  console.log('NeuroGuard Game Result Recorded:', result);

  return result;
}

/**
 * logSequenceResult(params) — builds, saves, and logs the Sequence Recall result.
 * Entry point called at game completion for Game 2.
 *
 * @param {object} params  — same as buildSequenceResult params
 * @returns {object}       — the result object
 */
export function logSequenceResult(params) {
  const result = buildSequenceResult(params);
  saveResultToLocalStorage(result);
  saveResultToBackend(result);
  console.log('NeuroGuard Game Result Recorded:', result);
  return result;
}

/**
 * logPatternResult(params) — builds, saves, and logs the Pattern Recognition result.
 * Entry point called at game completion for Game 3.
 *
 * @param {object} params  — same as buildPatternResult params
 * @returns {object}       — the result object
 */
export function logPatternResult(params) {
  const result = buildPatternResult(params);
  saveResultToLocalStorage(result);
  saveResultToBackend(result);
  console.log('NeuroGuard Game Result Recorded:', result);
  return result;
}
