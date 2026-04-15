import { request } from './api'

export const chatService = {
  send: (message, conversationId, { image, imageMimeType } = {}) => {
    const language = localStorage.getItem('recallth_language') || 'en'
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        language,
        ...(conversationId ? { conversationId } : {}),
        ...(image ? { image, imageMimeType } : {}),
      }),
    })
  },
  history: () => request('/chat/history'),
  getConversation: (id) => request(`/chat/${id}`),
  applyAction: (type, data, { conversationId, messageIndex, actionIndex } = {}) =>
    request('/chat/apply-action', {
      method: 'POST',
      body: JSON.stringify({ type, data, conversationId, messageIndex, actionIndex }),
    }),
}
