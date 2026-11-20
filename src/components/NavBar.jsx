/**
 * NavBar.jsx
 * ----------
 * Fixed top navigation bar for NeuroGuard.
 * Shows the brand logo/title and links to all three views:
 *   Hub, Memory Match, Sequence Recall.
 *
 * @param {object}   props
 * @param {string}   props.currentView  — 'hub' | 'memory' | 'sequence'
 * @param {function} props.onNavigate   — callback(viewName: string)
 */

import React from 'react';
import '../styles/navBar.css';

const NAV_LINKS = [
  { id: 'hub',      label: 'Home' },
  { id: 'memory',   label: 'Memory Match' },
  { id: 'sequence', label: 'Sequence Recall' },
  { id: 'pattern',  label: 'Pattern Game' },
];

function NavBar({ currentView, onNavigate }) {
  return (
    <header className="navbar" role="banner">
      {/* Brand */}
      <button
        className="navbar__brand"
        onClick={() => onNavigate('hub')}
        aria-label="NeuroGuard — go to home"
      >
        <span className="navbar__brand-icon" aria-hidden="true">🧠</span>
        <span className="navbar__brand-name">NeuroGuard</span>
      </button>

      {/* Navigation links */}
      <nav aria-label="Main navigation">
        <ul className="navbar__links" role="list">
          {NAV_LINKS.map(({ id, label }) => (
            <li key={id}>
              <button
                className={[
                  'navbar__link',
                  currentView === id ? 'navbar__link--active' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onNavigate(id)}
                aria-current={currentView === id ? 'page' : undefined}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export default NavBar;
