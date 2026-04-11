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
}
