import { useEffect, useRef, useState } from 'react'
import { api, photoUrl } from '../api.js'

const LEVELS = [
  { v: null, label: 'Choose for me', note: 'Based on previous activities' },
  { v: 1, label: 'Gentle', note: '2 choices' },
  { v: 2, label: 'Moderate', note: '3 choices + year' },
  { v: 3, label: 'Challenge', note: '4 choices + typing names' },
]
const LEVEL_NAME = { 1: 'Gentle', 2: 'Moderate', 3: 'Challenge' }
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

function speak(text) {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.85
  window.speechSynthesis.speak(u)
}

function spokenQuestion(q) {
  if (q.kind !== 'mcq') return q.prompt
  const opts = q.options.slice(0, -1).join(', ') + ', or ' + q.options[q.options.length - 1]
  return `${q.prompt} Is it ${opts}?`
}

export default function MemoryActivity({ userId, onNeedMemories }) {
  const [session, setSession] = useState(null)
  const [idx, setIdx] = useState(0)
  const [hints, setHints] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [done, setDone] = useState(false)
  const [typed, setTyped] = useState('')
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const [wrongPicks, setWrongPicks] = useState([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const busy = useRef(false) // blocks double clicks / double submits while a request is in flight
  const active = useRef(null) // { userId, sessionId } of the session in progress

  // Leaving the tab (or closing the page) mid-activity closes the session without a score.
  useEffect(() => {
    const leave = () => {
      if (active.current) {
        api.stop({ user_id: active.current.userId, session_id: active.current.sessionId }, true).catch(() => {})
        active.current = null
      }
      if (canSpeak) window.speechSynthesis.cancel()
    }
    window.addEventListener('pagehide', leave)
    return () => { window.removeEventListener('pagehide', leave); leave() }
  }, [])

  const resetQ = () => {
    setError(null); setHints(0); setFeedback(null); setDone(false); setTyped(''); setWrongPicks([])
    if (canSpeak) window.speechSynthesis.cancel()
  }

  const guarded = fn => async (...args) => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    try { await fn(...args) } catch (e) { setError(e.message) } finally { busy.current = false; setPending(false) }
  }

  const start = async level => {
    if (loading) return
    setError(null); setLoading(true)
    try {
      const s = await api.newSession(userId, level)
      active.current = { userId, sessionId: s.session_id }
      setSession(s); setIdx(0); setSummary(null); resetQ()
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const q = session?.questions[idx]
  const isLast = session && idx + 1 >= session.questions.length

  const submit = guarded(async answer => {
    if (done) return
    setError(null)
    const fb = await api.answer({
      user_id: userId, session_id: session.session_id, question_id: q.question_id,
      answer, hints_used: hints,
    })
    setFeedback(fb)
    if (fb.correct || fb.reveal) setDone(true)
    else {
      setWrongPicks(w => [...w, answer])
      setHints(h => Math.max(h, 1)) // show the first hint automatically after a miss
    }
  })

  const finish = async () => {
    try {
      const r = await api.complete({ user_id: userId, session_id: session.session_id })
      setSummary(r)
    } catch (e) {
      // Nothing was answered (everything skipped): close gently, no score is created.
      await api.stop({ user_id: userId, session_id: session.session_id }).catch(() => {})
      setSummary({ message: 'Thank you for looking at the photos together.', result: null })
    }
    active.current = null
    setSession(null)
  }

  const next = guarded(async () => {
    if (!isLast) { setIdx(idx + 1); resetQ(); return }
    await finish()
  })

  // Skipping records nothing for this question - it is simply left out of the score.
  const skip = guarded(async () => {
    if (!isLast) { setIdx(idx + 1); resetQ(); return }
    await finish()
  })

  // "Stop for now": tells the server to close the session WITHOUT creating a score.
  const stopForNow = guarded(async () => {
    try { await api.stop({ user_id: userId, session_id: session.session_id }) }
    finally { active.current = null; setSession(null); setError(null); if (canSpeak) window.speechSynthesis.cancel() }
  })

  if (summary) {
    const r = summary.result
    return (
      <section className="card center" aria-live="polite">
        <div className="big-emoji" aria-hidden>🌻</div>
        <h2>{summary.message}</h2>
        {r && (
          <>
            <p className="lead">
              You remembered <strong>{summary.first_try_correct}</strong> of{' '}
              <strong>{summary.questions_answered}</strong> on the first try.
            </p>
            {summary.memories_shared > 0 && (
              <p className="lead">Thank you for sharing {summary.memories_shared} lovely {summary.memories_shared === 1 ? 'memory' : 'memories'}.</p>
            )}
            <p className="muted">Time together: {Math.max(1, Math.round(r.time_taken / 60))} min · Hints used: {summary.hints_used}</p>
          </>
        )}
        <div className="button-row">
          <button className="btn primary big" onClick={() => { setSummary(null); start(null) }}>Look at more photos</button>
          <button className="btn secondary big" onClick={() => setSummary(null)}>Back to start</button>
        </div>
      </section>
    )
  }

  if (!session) {
    const noMemories = error && /no memories/i.test(error)
    return (
      <section className="card center">
        <h2>Let's look at some photos together</h2>
        <p className="lead">Take your time. There are no wrong answers here.</p>
        <div className="level-grid">
          {LEVELS.map(l => (
            <button key={l.label} className="btn level" onClick={() => start(l.v)} disabled={loading}>
              <span className="level-label">{l.label}</span>
              <span className="level-note">{l.note}</span>
            </button>
          ))}
        </div>
        {loading && <p className="status info" role="status">Getting your photos ready…</p>}
        {error && (
          <div className="status error" role="alert">
            {error}{' '}
            {noMemories && <button className="link-btn" onClick={onNeedMemories}>Add memories</button>}
          </div>
        )}
      </section>
    )
  }

  const progress = ((idx + (done ? 1 : 0)) / session.questions.length) * 100
  const photoIds = [...new Set(session.questions.map(x => x.memory_id))]
  const photoNo = photoIds.indexOf(q.memory_id) + 1

  return (
    <section className="card activity">
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}
        aria-label={`Question ${idx + 1} of ${session.questions.length}`}>
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="muted session-meta">
        Photo {photoNo} of {photoIds.length} · Question {idx + 1} of {session.questions.length} · {LEVEL_NAME[session.difficulty_level]} level
      </p>

      <div className="activity-body">
        <img className="activity-photo" src={photoUrl(q.photo_url)} alt="A family photo to talk about" />
        <div className="activity-q">
          <h2 className="question">
            {q.prompt}
            {canSpeak && (
              <button className="icon-btn" onClick={() => speak(spokenQuestion(q))} aria-label="Read the question aloud"
                title="Read aloud">🔊</button>
            )}
          </h2>

          {q.kind === 'mcq' && (
            <div className="options">
              {q.options.map(o => {
                const isAnswer = done && feedback?.reveal === o
                const wasWrong = wrongPicks.includes(o)
                return (
                  <button key={o} className={`btn option ${isAnswer ? 'right' : ''} ${wasWrong ? 'dim' : ''}`}
                    disabled={done || wasWrong || pending} onClick={() => submit(o)}>
                    {isAnswer && <span aria-hidden>✓ </span>}{o}
                  </button>
                )
              })}
            </div>
          )}

          {q.kind !== 'mcq' && (
            <form className="typed" onSubmit={e => { e.preventDefault(); if (q.kind === 'open' || typed.trim()) submit(typed) }}>
              <label className="sr-only" htmlFor="answer-box">{q.kind === 'open' ? 'Your memory' : 'Name'}</label>
              {q.kind === 'open'
                ? <textarea id="answer-box" rows={3} value={typed} onChange={e => setTyped(e.target.value)} disabled={done}
                    maxLength={1000} placeholder="Share anything you remember (or leave it empty)…" />
                : <input id="answer-box" value={typed} onChange={e => setTyped(e.target.value)} disabled={done}
                    maxLength={60} placeholder="Type the name…" autoFocus autoComplete="off" />}
              {!done && (
                <button className="btn primary big" disabled={pending || (q.kind === 'typed' && !typed.trim())}>
                  {q.kind === 'open' ? (typed.trim() ? 'Share' : 'Continue') : 'Check'}
                </button>
              )}
            </form>
          )}

          {!done && (
            <div className="helper-row">
              {hints < q.hints.length && q.kind !== 'open' && (
                <button className="btn hint" onClick={() => setHints(h => h + 1)}>💡 {hints ? 'Another hint' : 'Hint'}</button>
              )}
              <button className="btn quiet" onClick={skip} disabled={pending}>Skip this one</button>
            </div>
          )}
          {hints > 0 && !done && (
            <ul className="hints" aria-live="polite">{q.hints.slice(0, hints).map(h => <li key={h}>{h}</li>)}</ul>
          )}

          {feedback && (
            <div className={`feedback ${feedback.correct ? 'good' : 'soft'}`} role="status" aria-live="polite">
              <p className="feedback-msg">
                {feedback.message}
                {canSpeak && (
                  <button className="icon-btn small" onClick={() => speak(`${feedback.message} ${feedback.story || ''}`)}
                    aria-label="Read the feedback aloud" title="Read aloud">🔊</button>
                )}
              </p>
              {feedback.story && <p className="story">“{feedback.story}”</p>}
            </div>
          )}

          {done && (
            <button className="btn primary big" onClick={next} autoFocus disabled={pending}>
              {isLast ? 'Finish' : 'Next ➜'}
            </button>
          )}
          {error && (
            <div className="status error" role="alert">
              {error}{' '}
              {/ended|not found/i.test(error) && <button className="link-btn" onClick={() => { active.current = null; setSession(null) }}>Start again</button>}
            </div>
          )}
        </div>
      </div>
      <button className="link-btn stop" onClick={stopForNow}>Stop for now</button>
    </section>
  )
}
