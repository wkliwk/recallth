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
    urlLookup: (url) => request('/cabinet/url-lookup', { method: 'POST', body: JSON.stringify({ url }) }),
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
    insights: (data) => request('/goals/insights', { method: 'POST', body: JSON.stringify(data) }),
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
  schedule: {
    doseLogs: (from, to) => request(`/schedule/dose-logs?from=${from}&to=${to}`),
    logDose: (data) => request('/schedule/log-dose', { method: 'POST', body: JSON.stringify(data) }),
    unlogDose: (id) => request(`/schedule/log-dose/${id}`, { method: 'DELETE' }),
  },
  bloodwork: {
    list: () => request('/bloodwork'),
    create: (data) => request('/bloodwork', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/bloodwork/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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
    foodDb: {
      search: (params) => {
        const p = new URLSearchParams()
        if (params.q) p.set('q', params.q)
        else p.set('q', ' ')
        if (params.category) p.set('category', params.category)
        if (params.flags?.length) p.set('flags', params.flags.join(','))
        if (params.limit) p.set('limit', String(params.limit))
        return request(`/nutrition/food-db/search?${p.toString()}`)
      },
    },
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
    recommendations: (date) => request(`/nutrition/recommendations${date ? `?date=${date}` : ''}`),
    aiGoals: (goals, conditions, language, mode, messages) => request('/nutrition/ai-goals', { method: 'POST', body: JSON.stringify({ goals, conditions, language, ...(mode ? { mode, messages } : {}) }) }),
    library: {
      list: () => request('/nutrition/library'),
      search: (q) => request(`/nutrition/library/search?q=${encodeURIComponent(q)}`),
      save: (data) => request('/nutrition/library', { method: 'POST', body: JSON.stringify(data) }),
      remove: (id) => request(`/nutrition/library/${id}`, { method: 'DELETE' }),
    },
  },
  exercise: {
    list: () => request('/exercise'),
    create: (data) => request('/exercise', { method: 'POST', body: JSON.stringify(data) }),
    get: (id) => request(`/exercise/${id}`),
    update: (id, data) => request(`/exercise/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id) => request(`/exercise/${id}`, { method: 'DELETE' }),
    parse: (text) => request('/exercise/parse', { method: 'POST', body: JSON.stringify({ text }) }),
    aiPlan: () => request('/exercise/ai-plan', { method: 'POST' }),
    bulk: (sessions) => request('/exercise/bulk', { method: 'POST', body: JSON.stringify({ sessions }) }),
    analyze: (id) => request(`/exercise/${id}/analyze`, { method: 'POST' }),
    suggest: (id) => request(`/exercise/${id}/suggest`, { method: 'POST' }),
    progress: (id) => request(`/exercise/${id}/progress`, { method: 'POST' }),
  },
  admin: {
    foodDb: {
      list: (params = {}) => {
        const p = new URLSearchParams()
        if (params.q) p.set('q', params.q)
        if (params.category) p.set('category', params.category)
        if (params.status) p.set('status', params.status)
        if (params.page) p.set('page', String(params.page))
        if (params.limit) p.set('limit', String(params.limit))
        return request(`/admin/food-db?${p.toString()}`)
      },
      get: (id) => request(`/admin/food-db/${id}`),
      create: (data) => request('/admin/food-db', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/admin/food-db/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      remove: (id) => request(`/admin/food-db/${id}`, { method: 'DELETE' }),
      grabImage: (id) => request(`/admin/food-db/${id}/grab-image`, { method: 'POST' }),
      hardDelete: (id) => request(`/admin/food-db/${id}/hard`, { method: 'DELETE' }),
      urlLookup: (url) => request('/admin/food-db/url-lookup', { method: 'POST', body: JSON.stringify({ url }) }),
    },
  },
}
