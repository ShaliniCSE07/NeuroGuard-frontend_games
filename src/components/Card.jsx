/**
 * Card.jsx
 * --------
 * Single card tile for the Memory Match game.
 * Handles 3D flip animation, image with emoji fallback,
 * keyboard accessibility, and matched/disabled states.
 */

import React, { useState } from 'react';

/**
 * @param {object}   props
 * @param {object}   props.card          — card data { instanceId, id, name, image, emoji }
 * @param {boolean}  props.isFlipped     — true when face-up (flipped or matched)
 * @param {boolean}  props.isMatched     — true when this pair has been matched
 * @param {boolean}  props.isFadingOut   — true when the matched card should play its exit animation
 * @param {function} props.onFlip        — callback(card) when user flips this card
 */
function Card({ card, isFlipped, isMatched, isFadingOut, onFlip }) {
  // Track whether the image loaded successfully
  const [imageError, setImageError] = useState(false);

  // Cards that are matched, fading out, or already flipped (but not yet matched = comparing state)
  // should not be interactive
  const isDisabled = isMatched || isFadingOut;

  const handleActivate = () => {
    if (!isDisabled && !isFlipped) {
      onFlip(card);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  };

  // Compose class names
  const classNames = [
    'card',
    isFlipped    ? 'card--flipped'     : '',
    isMatched    ? 'card--matched'     : '',
    isFadingOut  ? 'card--fading-out'  : '',
  ].filter(Boolean).join(' ');

  // Accessible label describes state to screen readers
  const ariaLabel = isMatched
    ? `${card.name}, matched`
    : isFlipped
      ? `${card.name}, face up`
      : 'Face-down card — click to flip';

  return (
    <button
      className={classNames}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-pressed={isFlipped}
      tabIndex={isDisabled ? -1 : 0}
    >
      <div className="card__inner" aria-hidden="true">
        {/* Back face — decorative pattern */}
        <div className="card__face card__back">
          <span className="card__back-icon">🌿</span>
        </div>

        {/* Front face — image or emoji fallback */}
        <div className="card__face card__front">
          {!imageError ? (
            <img
              className="card__image"
              src={card.image}
              alt={card.name}
              onError={() => setImageError(true)}
              draggable={false}
            />
          ) : (
            <span className="card__emoji-fallback" role="img" aria-label={card.name}>
              {card.emoji}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default Card;
