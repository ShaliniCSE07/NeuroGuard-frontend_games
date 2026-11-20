/**
 * ExitConfirmModal.jsx
 * --------------------
 * Gentle confirmation dialog before exiting an active game.
 * Prevents accidental taps, which is crucial for dementia-friendly UX.
 *
 * @param {object}   props
 * @param {boolean}  props.isOpen
 * @param {string}   [props.title]
 * @param {string}   [props.message]
 * @param {function} props.onConfirm  — callback when "Yes, Exit" clicked
 * @param {function} props.onCancel   — callback when "No, Keep Playing" clicked
 */

import React from 'react';

function ExitConfirmModal({
  isOpen,
  title = 'Exit Game',
  message = 'Do you want to stop playing and go back to the menu?',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="exit-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
      aria-describedby="exit-modal-desc"
    >
      <div className="exit-modal-card">
        <div className="exit-modal__emblem" aria-hidden="true">🚪</div>

        <h2 className="exit-modal__title" id="exit-modal-title">
          {title}
        </h2>

        <p className="exit-modal__message" id="exit-modal-desc">
          {message}
        </p>

        <div className="exit-modal__actions">
          {/* Button 1: Yes, Exit (Triggers navigation back to the Game Hub) */}
          <button
            className="btn-secondary"
            onClick={onConfirm}
            aria-label="Yes, stop playing and exit to menu"
          >
            Yes, Exit
          </button>

          {/* Button 2: No, Keep Playing (Closes the modal and resumes the game) */}
          <button
            className="btn-primary"
            onClick={onCancel}
            autoFocus
            aria-label="No, keep playing"
          >
            No, Keep Playing
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExitConfirmModal;
