const BASE_URL = import.meta.env.VITE_API_URL || 'https://recallth-backend.railway.app'

async function request(path, options = {}) {
  const token = localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  cabinet: {
    list: () => request('/cabinet'),
    create: (data) => request('/cabinet', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/cabinet/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/cabinet/${id}`, { method: 'DELETE' }),
    interactions: () => request('/cabinet/interactions'),
    evidenceScores: () => request('/cabinet/evidence-scores'),
  },
}
