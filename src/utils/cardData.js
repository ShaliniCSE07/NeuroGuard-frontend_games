/**
 * cardData.js
 * -----------
 * Defines all card assets and difficulty configurations for the
 * Memory Match game. Each card has an image path (uploaded by the user
 * into /public/images/cards/) and an emoji fallback for graceful degradation.
 *
 * To add new games or card sets, extend CARD_POOL and DIFFICULTY_CONFIG.
 */

/** Full pool of 10 available animal cards */
export const CARD_POOL = [
  { id: 'elephant',   name: 'Elephant',   image: '/images/cards/elephant.png',   emoji: '🐘' },
  { id: 'cow',        name: 'Cow',        image: '/images/cards/cow.png',        emoji: '🐄' },
  { id: 'dog',        name: 'Dog',        image: '/images/cards/dog.png',        emoji: '🐕' },
  { id: 'parrot',     name: 'Parrot',     image: '/images/cards/parrot.png',     emoji: '🦜' },
  { id: 'peacock',    name: 'Peacock',    image: '/images/cards/peacock.png',    emoji: '🦚' },
  { id: 'fish',       name: 'Fish',       image: '/images/cards/fish.png',       emoji: '🐟' },
  { id: 'butterfly',  name: 'Butterfly',  image: '/images/cards/butterfly.png',  emoji: '🦋' },
  { id: 'guinea-pig', name: 'Guinea Pig', image: '/images/cards/guinea-pig.png', emoji: '🐹' },
  { id: 'cat',        name: 'Cat',        image: '/images/cards/cat.png',        emoji: '🐱' },
  { id: 'swan',       name: 'Swan',       image: '/images/cards/swan.png',       emoji: '🦢' },
];

/** Full pool of 10 Personal Photos for Memory-to-Game mode */
export const personalPhotoSet = [
  { id: 'grandfather', name: 'Grandfather', image: '/images/memory/grandfather.png', emoji: '👴' },
  { id: 'grandmother', name: 'Grandmother', image: '/images/memory/grandmother.png', emoji: '👵' },
  { id: 'grandchild',  name: 'Grandchild',  image: '/images/memory/grandchild.png',  emoji: '👶' },
  { id: 'photo-dog',   name: 'Dog',         image: '/images/memory/dog.png',         emoji: '🐕' },
  { id: 'photo-cat',   name: 'Cat',         image: '/images/memory/cat.png',         emoji: '🐈' },
  { id: 'house',       name: 'House',       image: '/images/memory/house.png',       emoji: '🏡' },
  { id: 'chai',        name: 'Chai',        image: '/images/memory/chai.png',        emoji: '☕' },
  { id: 'garden',      name: 'Garden',      image: '/images/memory/garden.png',      emoji: '🌳' },
  { id: 'festival',    name: 'Festival',    image: '/images/memory/festival.png',    emoji: '🪔' },
  { id: 'wedding',     name: 'Wedding',     image: '/images/memory/wedding.png',     emoji: '🖼️' },
];

/**
 * Difficulty configuration.
 * cardIds lists which cards (from CARD_POOL) to use, in the order they appear.
 * columns controls the CSS grid column count.
 * difficultyLevel is the integer used in result logging (1=easy, 2=medium, 3=hard).
 */
export const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy',
    pairs: 3,
    cardIds: ['elephant', 'cow', 'parrot'],
    columns: 3,
    difficultyLevel: 1,
  },
  medium: {
    label: 'Medium',
    pairs: 8,
    cardIds: ['elephant', 'cow', 'dog', 'parrot', 'peacock', 'fish', 'butterfly', 'guinea-pig'],
    columns: 4,
    difficultyLevel: 2,
  },
  hard: {
    label: 'Hard',
    pairs: 10,
    cardIds: ['elephant', 'cow', 'dog', 'parrot', 'peacock', 'fish', 'butterfly', 'guinea-pig', 'cat', 'swan'],
    columns: 5,
    difficultyLevel: 3,
  },
};

/**
 * fisherYatesShuffle(array)
 * -------------------------
 * Returns a NEW array that is a randomly shuffled copy of the input.
 * Uses crypto.getRandomValues for high-quality randomness so the
 * result is genuinely different on every call, even in quick succession.
 * Falls back to Math.random() in environments without the Web Crypto API.
 *
 * The original array is never mutated.
 *
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function fisherYatesShuffle(array) {
  const arr = [...array]; // work on a copy, never mutate the source

  const hasCrypto =
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function';

  for (let i = arr.length - 1; i > 0; i--) {
    let j;
    if (hasCrypto) {
      // Draw a random 32-bit unsigned integer and reduce it into [0, i+1)
      // using rejection sampling to avoid modulo bias.
      const range   = i + 1;
      const maxSafe = Math.floor(0x1_0000_0000 / range) * range;
      let rand;
      do {
        const buf = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buf);
        rand = buf[0];
      } while (rand >= maxSafe);
      j = rand % range;
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

/**
 * buildDeck(difficulty, mode)
 * ---------------------------
 * Returns a freshly shuffled array of card objects for the given difficulty and mode.
 * Each card object has a unique `instanceId` (cardId + '_0' or '_1')
 * so that two copies of the same card can be tracked independently.
 *
 * Mode handling:
 *   - 'animals': selects from CARD_POOL.
 *   - 'personal': randomly slices the required count (3 for easy, 8 for medium, 10 for hard)
 *     from personalPhotoSet.
 *
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {'animals'|'personal'} [mode='animals']
 * @returns {Array<{ instanceId: string, id: string, name: string, image: string, emoji: string }>}
 */
export function buildDeck(difficulty, mode = 'animals') {
  const config = DIFFICULTY_CONFIG[difficulty];
  let cards;

  if (mode === 'personal') {
    // Randomly slice the exact pair count from personalPhotoSet
    const shuffledPool = fisherYatesShuffle(personalPhotoSet);
    cards = shuffledPool.slice(0, config.pairs);
  } else {
    cards = config.cardIds
      .map((cardId) => CARD_POOL.find((c) => c.id === cardId))
      .filter(Boolean);
  }

  // Duplicate each card to form pairs; assign unique instanceIds
  const pairs = [];
  cards.forEach((card) => {
    pairs.push({ ...card, instanceId: `${card.id}_0` });
    pairs.push({ ...card, instanceId: `${card.id}_1` });
  });

  // Shuffle using the crypto-backed Fisher-Yates — always a fresh order
  return fisherYatesShuffle(pairs);
}
