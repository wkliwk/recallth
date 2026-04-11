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

export const chatService = {
  send: (message, conversationId) => {
    const language = localStorage.getItem('recallth_language') || 'en'
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language, ...(conversationId ? { conversationId } : {}) }),
    })
  },
  history: () => request('/chat/history'),
  getConversation: (id) => request(`/chat/${id}`),
}
