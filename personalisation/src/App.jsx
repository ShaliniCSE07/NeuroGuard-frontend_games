import { useState } from 'react'
import CaregiverPanel from './components/CaregiverPanel.jsx'
import MemoryActivity from './components/MemoryActivity.jsx'
import Insights from './components/Insights.jsx'

const TABS = [
  { id: 'play', label: 'Memory Moments', icon: '🖼️' },
  { id: 'caregiver', label: 'Add Memories', icon: '➕' },
  { id: 'insights', label: 'Insights', icon: '📊' },
]

const ID_RE = /^[A-Za-z0-9_.-]{1,64}$/

export default function App() {
  const [tab, setTab] = useState('play')
  const [userId, setUserId] = useState('U001')
  const [draftId, setDraftId] = useState('U001')
  const idValid = ID_RE.test(draftId.trim())

  // Profile changes only apply on Enter / leaving the field (not on every keystroke).
  const commitId = () => {
    const id = draftId.trim()
    if (ID_RE.test(id)) setUserId(id)
    else setDraftId(userId)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🧠</span>
          <div>
            <h1>NEUROGUARD</h1>
            <p className="tagline">Memory Moments &amp; Personalised Activities</p>
          </div>
        </div>
        <label className="user-select" title="Each person has their own memories and results">
          Profile ID
          <input value={draftId} onChange={e => setDraftId(e.target.value)} onBlur={commitId}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            aria-invalid={!idValid} maxLength={64} />
        </label>
      </header>

      <nav className="tabs" aria-label="Main" style={{ display: 'flex', alignItems: 'center' }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}>
            <span aria-hidden>{t.icon}</span> {t.label}
          </button>
        ))}
        
        {/* NEW BACK TO DASHBOARD BUTTON */}
        <a 
          href="http://localhost:5000" 
          style={{
            marginLeft: 'auto', /* Pushes it to the far right */
            padding: '8px 16px', 
            backgroundColor: '#E8E3D9', 
            color: '#3B3A39', 
            textDecoration: 'none', 
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}
        >
          ← Back to Dashboard
        </a>

      </nav>

      <main key={userId}>
        {tab === 'play' && <MemoryActivity userId={userId} onNeedMemories={() => setTab('caregiver')} />}
        {tab === 'caregiver' && <CaregiverPanel userId={userId} />}
        {tab === 'insights' && <Insights userId={userId} />}
      </main>

      <footer className="footer">
        NEUROGUARD is a cognitive wellness companion. It does not diagnose or treat any condition.
      </footer>
    </div>
  )
}