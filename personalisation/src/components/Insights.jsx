import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { api, photoUrl } from '../api.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const TREND = {
  improving: '↗ Improving',
  steady: '→ Steady',
  lower_recently: '↘ A bit lower lately',
  level_changed: '↕ Level recently changed',
  not_enough_data: '… Needs 6 sessions',
}
const CHANGE = { up: '▲ step up', down: '▼ ease back', same: '● stay', start: '● start' }
const KIND = {
  practice: { icon: '🌱', label: 'Gentle practice' },
  confidence: { icon: '⭐', label: 'Builds confidence' },
  lower_recently: { icon: '🤍', label: 'Take it easy' },
  building: { icon: '📈', label: 'Still learning' },
  variety: { icon: '🎲', label: 'Something new' },
  reminisce: { icon: '🖼️', label: 'Reminiscence' },
}

const sampleResult = userId => JSON.stringify({
  user_id: userId, game_type: 'memory_matching', score: 8, accuracy: 75.0, time_taken: 94,
  difficulty_level: 2, attempts: 12, mistakes: 4, timestamp: new Date().toISOString().slice(0, 19) + 'Z',
}, null, 2)

const when = ts => {
  const d = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z')
  return isNaN(d) ? ts : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Insights({ userId }) {
  const [data, setData] = useState(null)
  const [dash, setDash] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [json, setJson] = useState(() => sampleResult(userId))
  const [status, setStatus] = useState(null)
  const [importing, setImporting] = useState(false)

  const load = () => {
    setLoadError(null)
    Promise.all([api.personalisation(userId), api.dashboard(userId)])
      .then(([p, d]) => { setData(p); setDash(d) })
      .catch(e => setLoadError(e.message))
  }
  useEffect(() => { setData(null); setJson(sampleResult(userId)); load() }, [userId])

  const importJson = async () => {
    let parsed
    try { parsed = JSON.parse(json) } catch {
      return setStatus({ type: 'error', text: 'That is not valid JSON. Please check commas, quotes and brackets.' })
    }
    setImporting(true)
    try {
      const r = await api.postResults(parsed)
      setStatus({ type: 'ok', text: `Stored ${r.stored} result(s)` +
        (r.duplicates_skipped ? `, skipped ${r.duplicates_skipped} duplicate(s)` : '') + '. Recommendations updated.' })
      load()
    } catch (e) { setStatus({ type: 'error', text: e.message }) } finally { setImporting(false) }
  }

  if (loadError) {
    return (
      <section className="card">
        <p className="status error" role="alert">{loadError}</p>
        <button className="btn primary" onClick={load}>Try again</button>
      </section>
    )
  }
  if (!data) return <section className="card"><p className="muted" role="status">Loading insights…</p></section>

  const chart = {
    labels: data.domains.map(d => d.label),
    datasets: [
      { label: 'Average accuracy %', data: data.domains.map(d => d.average_accuracy), backgroundColor: '#9db8d9' },
      { label: 'Recent accuracy % (last 3)', data: data.domains.map(d => d.recent_accuracy), backgroundColor: '#3f6e9e' },
    ],
  }
  const ms = dash?.memory_activity_sessions

  return (
    <section>
      <div className="card">
        <div className="card-head">
          <h2>Suggested activities</h2>
          <button className="btn secondary" onClick={load}>Refresh</button>
        </div>
        {data.total_sessions === 0 && (
          <p className="muted">No activity results yet. Suggestions become personal once a few games have been played.</p>
        )}
        <div className="rec-grid">
          {data.recommendations.map(r => (
            <div key={r.activity} className="rec">
              <p className="rec-kind"><span aria-hidden>{KIND[r.kind]?.icon}</span> {KIND[r.kind]?.label}</p>
              <h3>{r.title}</h3>
              <p className="pill">Suggested level {r.suggested_level}</p>
              <p><strong>Why:</strong> {r.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {ms && (
        <div className="card stat-row">
          <div className="stat"><span className="stat-num">{dash.memory_count}</span><span>family photos</span></div>
          <div className="stat"><span className="stat-num">{ms.completed}</span><span>photo sessions completed</span></div>
          <div className="stat"><span className="stat-num">{ms.stopped_early}</span><span>stopped early (not scored)</span></div>
          <div className="stat"><span className="stat-num">{data.total_sessions}</span><span>game results in total</span></div>
        </div>
      )}

      {data.domains.length > 0 && (
        <div className="card">
          <h2>Activity overview</h2>
          <div className="chart-wrap">
            <Bar data={chart} options={{ responsive: true, maintainAspectRatio: false, animation: false,
              scales: { y: { min: 0, max: 100, title: { display: true, text: 'Accuracy %' } } },
              plugins: { legend: { labels: { font: { size: 15 } } } } }}
              aria-label="Bar chart of average and recent accuracy for each activity area" role="img" />
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Area</th><th>Sessions</th><th>Recent accuracy</th><th>Avg time (s)</th><th>Trend</th></tr></thead>
              <tbody>
                {data.domains.map(d => (
                  <tr key={d.domain}><td>{d.label}</td><td>{d.sessions}</td><td>{d.recent_accuracy}%</td>
                    <td>{d.recent_time_taken}</td><td>{TREND[d.trend] || d.trend}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.keys(data.difficulty).length > 0 && (
        <div className="card">
          <h2>Next difficulty (explainable rules)</h2>
          <p className="muted">Step up after 3 sessions in a row at a level averaging ≥80% · ease back after 2 sessions averaging
            &lt;50% · otherwise stay. Never more than one step at a time.</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Game</th><th>Now</th><th>Next level</th><th>Change</th><th>Why</th></tr></thead>
              <tbody>
                {Object.entries(data.difficulty).map(([g, d]) => (
                  <tr key={g}><td>{g}</td><td>{d.evidence?.current_level ?? '–'}</td><td>{d.level}</td>
                    <td>{CHANGE[d.change]}</td><td>{d.reason}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dash?.memory_recognition?.length > 0 && (
        <div className="card">
          <h2>Family photo recognition</h2>
          <p className="muted">From completed photo sessions only.</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Person</th><th>Relationship</th><th>Answers</th><th>Correct</th><th>Hints</th></tr></thead>
              <tbody>
                {dash.memory_recognition.map(p => (
                  <tr key={p.memory_id}><td>{p.person_name}</td><td>{p.relationship}</td><td>{p.answers}</td>
                    <td>{p.recognition_rate}%</td><td>{p.hints_used}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dash?.recent_reflections?.length > 0 && (
        <div className="card">
          <h2>What they shared</h2>
          <p className="muted">Answers to "What do you remember about this moment?" — worth talking about together.</p>
          <ul className="reflections">
            {dash.recent_reflections.map((r, i) => (
              <li key={i}>
                {r.photo_url && <img src={photoUrl(r.photo_url)} alt="" />}
                <div>
                  <p className="quote">“{r.text}”</p>
                  <p className="muted small">{r.person_name ? `About ${r.person_name} · ` : ''}{when(r.timestamp)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>Import game results (Member 1 format)</h2>
        <p className="muted">Paste one result or an array of results. Exact copies of results already stored are skipped.</p>
        <label className="sr-only" htmlFor="json-box">Game result JSON</label>
        <textarea id="json-box" className="code" rows={10} value={json} onChange={e => setJson(e.target.value)} spellCheck={false} />
        <div className="button-row left">
          <button className="btn primary" onClick={importJson} disabled={importing}>{importing ? 'Importing…' : 'Import results'}</button>
          <button className="btn secondary" onClick={() => setJson(sampleResult(userId))}>Reset example</button>
        </div>
        {status && <p className={`status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.text}</p>}
      </div>

      <p className="disclaimer">{data.disclaimer}</p>
    </section>
  )
}
