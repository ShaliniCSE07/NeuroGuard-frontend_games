import { useEffect, useRef, useState } from 'react'
import { api, photoUrl } from '../api.js'

const RELATIONSHIPS = ['Daughter', 'Son', 'Wife', 'Husband', 'Grandson', 'Granddaughter', 'Grandchild',
  'Mother', 'Father', 'Sister', 'Brother', 'Niece', 'Nephew', 'Aunt', 'Uncle', 'Cousin', 'Friend', 'Neighbour']
const LIMITS = { person_name: 60, relationship: 40, description: 500, place: 80 }
const MAX_MB = 10
const EMPTY = { person_name: '', relationship: '', description: '', place: '', memory_year: '' }

function validate(form, photo, editing) {
  if (!editing && !photo) return 'Please choose a photograph.'
  if (photo) {
    if (/\.(heic|heif)$/i.test(photo.name)) return 'iPhone HEIC photos are not supported yet. Please choose a JPG or PNG copy.'
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(photo.type)) return 'Photo must be a JPG, PNG, GIF or WEBP image.'
    if (photo.size > MAX_MB * 1024 * 1024) return `That photo is too large. Please choose one under ${MAX_MB} MB.`
  }
  if (!form.person_name.trim()) return "Please enter the person's name."
  if (!form.relationship.trim()) return 'Please enter the relationship (for example Daughter).'
  if (!form.description.trim()) return 'Please write a sentence about this memory.'
  const y = form.memory_year.trim()
  if (y && (!/^\d{4}$/.test(y) || +y < 1900 || +y > new Date().getFullYear()))
    return `Year must be a 4-digit year between 1900 and ${new Date().getFullYear()}, or left empty.`
  return null
}

function QuestionPreview({ memory }) {
  const [level, setLevel] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    setData(null)
    api.previewQuestions(memory.id, level).then(setData).catch(e => setError(e.message))
  }, [memory.id, level])
  return (
    <div className="preview">
      <div className="preview-levels" role="group" aria-label="Preview level">
        {[1, 2, 3].map(l => (
          <button key={l} className={`chip ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}
            aria-pressed={level === l}>Level {l}</button>
        ))}
      </div>
      {error && <p className="status error">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && (
        <ol>
          {data.questions.map(q => (
            <li key={q.question_id}>
              <strong>{q.prompt}</strong>
              {q.kind === 'mcq' && <span className="muted"> — {q.options.join(' / ')}</span>}
              {q.kind === 'typed' && <span className="muted"> — typed answer</span>}
              {q.kind === 'open' && <span className="muted"> — open sharing, always accepted</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function CaregiverPanel({ userId }) {
  const [form, setForm] = useState(EMPTY)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [editing, setEditing] = useState(null) // memory being edited, or null
  const [memories, setMemories] = useState(null)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [openPreview, setOpenPreview] = useState(null)
  const fileRef = useRef()
  const formRef = useRef()

  const load = () => api.listMemories(userId).then(setMemories).catch(e => {
    setMemories([]); setStatus({ type: 'error', text: e.message })
  })
  useEffect(() => { setMemories(null); load() }, [userId])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const set = k => e => setForm({ ...form, [k]: e.target.value })

  const choosePhoto = e => {
    const f = e.target.files[0] || null
    setPhoto(f)
    setPreview(f ? URL.createObjectURL(f) : null)
    if (f) {
      const problem = validate({ ...EMPTY, person_name: 'x', relationship: 'x', description: 'x' }, f, true)
      setStatus(problem ? { type: 'error', text: problem } : null)
    }
  }

  const resetForm = () => {
    setForm(EMPTY); setPhoto(null); setPreview(null); setEditing(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async e => {
    e.preventDefault()
    const problem = validate(form, photo, !!editing)
    if (problem) return setStatus({ type: 'error', text: problem })
    const fd = new FormData()
    fd.append('user_id', userId)
    Object.entries(form).forEach(([k, v]) => fd.append(k, v.trim()))
    if (photo) fd.append('photo', photo)
    setBusy(true); setStatus(null)
    try {
      const m = editing ? await api.updateMemory(editing.id, fd) : await api.addMemory(fd)
      setStatus({ type: 'ok', text: editing
        ? `Changes to ${m.person_name}'s memory saved.`
        : `Memory of ${m.person_name} saved. Questions are ready in "Memory Moments".` })
      resetForm()
      load()
    } catch (err) {
      setStatus({ type: 'error', text: err.message })
    } finally { setBusy(false) }
  }

  const startEdit = m => {
    setEditing(m)
    setForm({ person_name: m.person_name, relationship: m.relationship, description: m.description,
      place: m.place || '', memory_year: m.memory_year || '' })
    setPhoto(null); setPreview(photoUrl(m.photo_url)); setStatus(null)
    if (fileRef.current) fileRef.current.value = ''
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const remove = async m => {
    if (!window.confirm(`Remove the memory of ${m.person_name}? This also deletes its photo.`)) return
    try {
      await api.deleteMemory(m.id, userId)
      if (editing?.id === m.id) resetForm()
      setStatus({ type: 'ok', text: `Memory of ${m.person_name} removed.` })
      load()
    } catch (e) { setStatus({ type: 'error', text: e.message }) }
  }

  const seed = async () => {
    setBusy(true)
    try {
      const r = await api.seed(userId)
      setStatus({ type: 'ok', text: `Demo data ready: ${r.memories_added} memories added, ${r.memories_updated} refreshed` +
        (r.results_added ? `, ${r.results_added} sample game results added.` : '.') })
      load()
    } catch (e) { setStatus({ type: 'error', text: e.message }) } finally { setBusy(false) }
  }

  return (
    <section>
      <div className="card" ref={formRef}>
        <h2>{editing ? `Edit memory of ${editing.person_name}` : 'Add a family memory'}</h2>
        <p className="muted">Upload a photo and a few details. NEUROGUARD turns it into gentle recall questions.</p>
        <form className="memory-form" onSubmit={submit} noValidate>
          <div className="photo-drop">
            {preview ? <img src={preview} alt="Chosen photo preview" /> : <span>📷 No photo chosen</span>}
            <label className="btn secondary">
              {editing ? 'Replace photo' : preview ? 'Choose another photo' : 'Choose photo'}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={choosePhoto}
                className="file-input" aria-label="Choose photo" />
            </label>
            <small className="muted">JPG, PNG, GIF or WEBP · up to {MAX_MB} MB</small>
          </div>
          <div className="fields">
            <label>Person's name *
              <input value={form.person_name} onChange={set('person_name')} maxLength={LIMITS.person_name}
                placeholder="e.g. Priya" autoComplete="off" />
            </label>
            <label>Relationship *
              <input list="rels" value={form.relationship} onChange={set('relationship')} maxLength={LIMITS.relationship}
                placeholder="e.g. Daughter" autoComplete="off" />
              <datalist id="rels">{RELATIONSHIPS.map(r => <option key={r} value={r} />)}</datalist>
            </label>
            <label>About this memory *
              <textarea rows={3} value={form.description} onChange={set('description')} maxLength={LIMITS.description}
                placeholder="e.g. Priya's 10th birthday. We baked a chocolate cake together." />
              <small className="muted counter">{form.description.length}/{LIMITS.description} · shown as a gentle hint and after each answer</small>
            </label>
            <div className="row">
              <label>Place (optional)
                <input value={form.place} onChange={set('place')} maxLength={LIMITS.place} placeholder="e.g. The beach" />
              </label>
              <label>Year (optional)
                <input value={form.memory_year} onChange={set('memory_year')} placeholder="e.g. 1998"
                  inputMode="numeric" maxLength={4} />
              </label>
            </div>
            <div className="button-row left">
              <button className="btn primary big" disabled={busy}>
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Save memory'}
              </button>
              {editing && <button type="button" className="btn secondary big" onClick={resetForm}>Cancel</button>}
            </div>
          </div>
        </form>
        {status && <p className={`status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.text}</p>}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Saved memories {memories && `(${memories.length})`}</h2>
          <button className="btn secondary" onClick={seed} disabled={busy}>Load demo memories</button>
        </div>
        {memories === null && <p className="muted">Loading memories…</p>}
        {memories?.length === 0 && <p className="muted">No memories yet. Add a photo above, or load the demo memories.</p>}
        <div className="memory-grid">
          {memories?.map(m => (
            <figure key={m.id} className="memory-tile">
              <img src={photoUrl(m.photo_url)} alt={`${m.person_name}, ${m.relationship}`} loading="lazy" />
              <figcaption>
                <strong>{m.person_name}</strong> · {m.relationship}
                {m.place && <> · {m.place}</>}{m.memory_year && <> · {m.memory_year}</>}
                <p>{m.description}</p>
                {m.photo_credit && <p className="credit">{m.photo_credit.split(' - ')[0]}</p>}
                <div className="tile-actions">
                  <button className="link-btn" onClick={() => setOpenPreview(openPreview === m.id ? null : m.id)}
                    aria-expanded={openPreview === m.id}>
                    {openPreview === m.id ? 'Hide questions' : 'Preview questions'}
                  </button>
                  <button className="link-btn" onClick={() => startEdit(m)}>Edit</button>
                  <button className="link-btn danger" onClick={() => remove(m)}>Remove</button>
                </div>
                {openPreview === m.id && <QuestionPreview memory={m} />}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
