import { createContext, useContext, useState, useCallback } from 'react'

const AiUsageContext = createContext(null)

export function AiUsageProvider({ children }) {
  const [usage, setUsage] = useState(null)

  const showUsage = useCallback((aiUsage) => {
    if (aiUsage) setUsage(aiUsage)
  }, [])

  const clearUsage = useCallback(() => setUsage(null), [])

  return (
    <AiUsageContext.Provider value={{ usage, showUsage, clearUsage }}>
      {children}
    </AiUsageContext.Provider>
  )
}

export function useAiUsage() {
  return useContext(AiUsageContext)
}
