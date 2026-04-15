const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function request(path, options = {}) {
  const token = localStorage.getItem('recallth_token')
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json
}

export const api = {
  auth: {
    register: (email, password) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },
  cabinet: {
    list: () => request('/cabinet'),
    create: (data) => request('/cabinet', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/cabinet/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/cabinet/${id}`, { method: 'DELETE' }),
    schedule: () => request('/cabinet/schedule'),
    interactions: () => request('/cabinet/interactions'),
    evidenceScores: () => request('/cabinet/evidence-scores'),
  },
  chat: {
    history: () => request('/chat/history'),
  },
  doctorPrep: {
    generate: (prompt) =>
      request('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: prompt }),
      }),
  },
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  goals: {
    checkIns: () => request('/goals/check-ins'),
    checkIn: (data) => request('/goals/check-in', { method: 'POST', body: JSON.stringify(data) }),
  },
  history: {
    list: () => request('/history'),
  },
  journal: {
    list: () => request('/journal/logs'),
    create: (data) => request('/journal/logs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/journal/logs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/journal/logs/${id}`, { method: 'DELETE' }),
  },
  profile: {
    get: () => request('/profile'),
    update: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },
  sideEffects: {
    list: () => request('/side-effects'),
    create: (data) => request('/side-effects', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id) => request(`/side-effects/${id}`, { method: 'DELETE' }),
  },
  bodyStats: {
    list: () => request('/body-stats'),
    create: (data) => request('/body-stats', { method: 'POST', body: JSON.stringify(data) }),
  },
  nutrition: {
    list: (date) => request(`/nutrition${date ? `?date=${date}` : ''}`),
    get: (id) => request(`/nutrition/${id}`),
    create: (data) => request('/nutrition', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/nutrition/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/nutrition/${id}`, { method: 'DELETE' }),
    aiParse: (text, category) => request('/nutrition/parse', { method: 'POST', body: JSON.stringify({ text, category }) }),
    summary: (date) => request(`/nutrition/summary${date ? `?date=${date}` : ''}`),
    getCategory: () => request('/nutrition/category'),
    setCategory: (category) => request('/nutrition/category', { method: 'PUT', body: JSON.stringify({ category }) }),
  },
}
