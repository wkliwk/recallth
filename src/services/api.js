const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function request(path, options = {}) {
  const token = localStorage.getItem('recallth_token')
  const { headers: customHeaders, ...restOptions } = options
  const res = await fetch(`${BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...customHeaders,
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json
}

export const api = {
  auth: {
    register: (name, email, password) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    googleSignIn: (idToken) =>
      request('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      }),
    me: () => request('/auth/me'),
    setPassword: (password) =>
      request('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    linkGoogle: (googleToken) =>
      request('/auth/link-google', {
        method: 'POST',
        body: JSON.stringify({ googleToken }),
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
    aiLookup: (query) => request('/cabinet/ai-lookup', { method: 'POST', body: JSON.stringify({ query }) }),
  },
  chat: {
    history: () => request('/chat/history'),
    delete: (id) => request(`/chat/${id}`, { method: 'DELETE' }),
  },
  doctorPrep: {
    generate: (prompt) =>
      request('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: prompt, sessionTitle: 'Doctor Prep' }),
      }),
  },
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  goals: {
    checkIns: () => request('/goals/check-ins'),
    checkIn: (data) => request('/goals/check-in', { method: 'POST', body: JSON.stringify(data) }),
    interpret: (text) => request('/goals/interpret', { method: 'POST', body: JSON.stringify({ text }) }),
  },
  history: {
    list: () => request('/chat/history'),
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
  intake: {
    streak: () => request('/intake/streak'),
    log: () => request('/intake/log', { method: 'POST' }),
  },
  bloodwork: {
    list: () => request('/bloodwork'),
    create: (data) => request('/bloodwork', { method: 'POST', body: JSON.stringify(data) }),
    interpret: () => request('/bloodwork/interpret', { method: 'POST' }),
  },
  nutrition: {
    list: (date) => request(`/nutrition${date ? `?date=${date}` : ''}`),
    get: (id) => request(`/nutrition/${id}`),
    create: (data) => request('/nutrition', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/nutrition/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/nutrition/${id}`, { method: 'DELETE' }),
    removeBatch: (ids) => Promise.all(ids.map((id) => request(`/nutrition/${id}`, { method: 'DELETE' }))),
    aiParse: (text, category) => request('/nutrition/parse', { method: 'POST', body: JSON.stringify({ text, category }) }),
    search: (q) => request(`/nutrition/search?q=${encodeURIComponent(q)}`),
    ocr: (image, mimeType) => request('/nutrition/ocr', { method: 'POST', body: JSON.stringify({ image, mimeType }) }),
    summary: (date) => request(`/nutrition/summary${date ? `?date=${date}` : ''}`),
    getCategory: () => request('/nutrition/category'),
    setCategory: (category) => request('/nutrition/category', { method: 'PUT', body: JSON.stringify({ category }) }),
    getCustomConfig: () => request('/nutrition/custom-config'),
    setCustomConfig: (config) => request('/nutrition/custom-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
    days: (year, month) => request(`/nutrition/days?year=${year}&month=${month}`),
    aiGoals: (goals, conditions, language, mode, messages) => request('/nutrition/ai-goals', { method: 'POST', body: JSON.stringify({ goals, conditions, language, ...(mode ? { mode, messages } : {}) }) }),
    library: {
      list: () => request('/nutrition/library'),
      search: (q) => request(`/nutrition/library/search?q=${encodeURIComponent(q)}`),
      save: (data) => request('/nutrition/library', { method: 'POST', body: JSON.stringify(data) }),
      remove: (id) => request(`/nutrition/library/${id}`, { method: 'DELETE' }),
    },
  },
}
