// Thin client for the Member 3 API. Member 4 can reuse these functions directly.
const BASE = import.meta.env.VITE_API_BASE || ''

async function req(path, opts = {}) {
  let res
  try {
    res = await fetch(BASE + path, opts)
  } catch {
    throw new Error('Cannot reach the NEUROGUARD server. Please check that the backend is running and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data.errors ? data.errors.slice(0, 3).map(e => `#${e.index + 1}: ${e.error}`).join(' ') : ''
    throw new Error([data.error || `Request failed (${res.status}).`, detail].filter(Boolean).join(' '))
  }
  return data
}
const json = (method, body, keepalive = false) => ({
  method, keepalive, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
const q = encodeURIComponent

export const photoUrl = p => BASE + p

export const api = {
  listMemories: userId => req(`/api/memories?user_id=${q(userId)}`),
  addMemory: formData => req('/api/memories', { method: 'POST', body: formData }),
  updateMemory: (id, formData) => req(`/api/memories/${id}`, { method: 'PUT', body: formData }),
  deleteMemory: (id, userId) => req(`/api/memories/${id}?user_id=${q(userId)}`, { method: 'DELETE' }),
  previewQuestions: (id, difficulty) => req(`/api/memories/${id}/questions?difficulty=${difficulty}`),
  newSession: (userId, difficulty) =>
    req(`/api/activities/${q(userId)}/session${difficulty ? `?difficulty=${difficulty}` : ''}`),
  answer: body => req('/api/activities/answer', json('POST', body)),
  complete: body => req('/api/activities/complete', json('POST', body)),
  // keepalive lets the request finish even while the page is closing
  stop: (body, keepalive = false) => req('/api/activities/stop', json('POST', body, keepalive)),
  postResults: results => req('/api/game-results', json('POST', results)),
  personalisation: userId => req(`/api/personalisation/${q(userId)}`),
  dashboard: userId => req(`/api/dashboard/${q(userId)}`),
  seed: (userId, reset = false) => req('/api/seed', json('POST', { user_id: userId, reset })),
}
