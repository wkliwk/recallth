import { createContext, useContext, useState, useCallback } from 'react'

const LOG_KEY = 'recallth_ai_usage_log'
const MAX_LOG = 200

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
  } catch {
    return []
  }
}

function saveLog(entries) {
  localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_LOG)))
}

const AiUsageContext = createContext(null)

export function AiUsageProvider({ children }) {
  const [usage, setUsage] = useState(null)
  const [log, setLog] = useState(loadLog)

  const showUsage = useCallback((aiUsage, feature = 'unknown') => {
    if (!aiUsage) return
    setUsage(aiUsage)

    const entry = {
      ts: new Date().toISOString(),
      feature,
      model: aiUsage.model,
      inputTokens: aiUsage.inputTokens,
      outputTokens: aiUsage.outputTokens,
      totalTokens: aiUsage.totalTokens,
      estimatedCostUSD: aiUsage.estimatedCostUSD,
    }

    setLog((prev) => {
      const next = [...prev, entry].slice(-MAX_LOG)
      saveLog(next)
      return next
    })
  }, [])

  const clearUsage = useCallback(() => setUsage(null), [])

  const clearLog = useCallback(() => {
    setLog([])
    localStorage.removeItem(LOG_KEY)
  }, [])

  return (
    <AiUsageContext.Provider value={{ usage, log, showUsage, clearUsage, clearLog }}>
      {children}
    </AiUsageContext.Provider>
  )
}

export function useAiUsage() {
  return useContext(AiUsageContext)
}
