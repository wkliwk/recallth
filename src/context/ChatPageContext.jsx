import { createContext, useContext, useState, useCallback } from 'react'

/**
 * ChatPageContext — lets any page register context data that FloatingChat
 * will inject as a hidden system block on the first message of each session.
 *
 * Usage in a page:
 *   const { setChatContext, clearChatContext } = useChatPage()
 *   useEffect(() => {
 *     setChatContext({ title: 'Bench Press session', placeholder: '問關於呢個健身紀錄嘅嘢...', data: session })
 *     return () => clearChatContext()
 *   }, [session])
 */

const ChatPageContext = createContext(null)

export function ChatPageProvider({ children }) {
  const [pageContext, setPageContext] = useState(null)

  const setChatContext = useCallback((ctx) => {
    setPageContext(ctx)
  }, [])

  const clearChatContext = useCallback(() => {
    setPageContext(null)
  }, [])

  return (
    <ChatPageContext.Provider value={{ pageContext, setChatContext, clearChatContext }}>
      {children}
    </ChatPageContext.Provider>
  )
}

export function useChatPage() {
  return useContext(ChatPageContext)
}
