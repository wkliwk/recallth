import { createContext, useContext, useState, useCallback } from 'react'

const ChatPageContext = createContext(null)

export function ChatPageProvider({ children }) {
  const [pageContext, setPageContext] = useState(null)
  // chatRequest triggers FloatingChat to open + auto-send a message
  const [chatRequest, setChatRequest] = useState(null)

  const setChatContext = useCallback((ctx) => {
    setPageContext(ctx)
  }, [])

  const clearChatContext = useCallback(() => {
    setPageContext(null)
  }, [])

  // openChat(message) — open FloatingChat and auto-send a message
  const openChat = useCallback((message) => {
    setChatRequest({ message, _id: Date.now() })
  }, [])

  const clearChatRequest = useCallback(() => {
    setChatRequest(null)
  }, [])

  return (
    <ChatPageContext.Provider value={{ pageContext, setChatContext, clearChatContext, chatRequest, openChat, clearChatRequest }}>
      {children}
    </ChatPageContext.Provider>
  )
}

export function useChatPage() {
  return useContext(ChatPageContext)
}
