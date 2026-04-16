import { createContext, useContext, useState, useCallback } from 'react'

const LOG_KEY = 'recallth_ai_usage_log'
const MAX_LOG = 200
const MAX_IO = 800 // chars per input/output stored

function trunc(str) {
  if (!str) return undefined
  const s = typeof str === 'string' ? str : JSON.stringify(str)
  return s.length > MAX_IO ? s.slice(0, MAX_IO) + '…' : s
}

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

  // showUsage(aiUsage, feature, { input?, output? })
  const showUsage = useCallback((aiUsage, feature = 'unknown', io = {}) => {
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
      ...(io.input  != null ? { input:  trunc(io.input)  } : {}),
      ...(io.output != null ? { output: trunc(io.output) } : {}),
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
