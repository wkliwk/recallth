import { useEffect, useState } from 'react'

/**
 * Debug badge showing AI token usage + estimated cost.
 * Only renders in dev mode (import.meta.env.DEV) or when ?debug=1 is in the URL.
 */
export default function AiUsageBadge({ usage, onDismiss }) {
  const [visible, setVisible] = useState(true)

  const isDebugMode =
    import.meta.env.DEV ||
    new URLSearchParams(window.location.search).get('debug') === '1'

  useEffect(() => {
    if (!usage || !visible) return
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 6000)
    return () => clearTimeout(timer)
  }, [usage, visible, onDismiss])

  useEffect(() => {
    setVisible(true)
  }, [usage])

  if (!isDebugMode || !usage || !visible) return null

  const { model, inputTokens, outputTokens, totalTokens, estimatedCostUSD } = usage
  const costStr =
    estimatedCostUSD < 0.000001
      ? '< $0.000001'
      : `$${estimatedCostUSD.toFixed(6)}`

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 9999,
        background: 'rgba(20, 20, 20, 0.92)',
        color: '#e0e0e0',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 11,
        fontFamily: 'monospace',
        lineHeight: 1.6,
        maxWidth: 240,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: '#f97316', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          AI Usage
        </span>
        <button
          onClick={() => { setVisible(false); onDismiss?.() }}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: 1,
            padding: '0 2px',
          }}
        >
          ✕
        </button>
      </div>
      <div>
        <span style={{ color: '#9ca3af' }}>model</span>{' '}
        <span style={{ color: '#fff' }}>{model}</span>
      </div>
      <div>
        <span style={{ color: '#9ca3af' }}>in</span>{' '}
        <span style={{ color: '#34d399' }}>{inputTokens.toLocaleString()}</span>
        {'  '}
        <span style={{ color: '#9ca3af' }}>out</span>{' '}
        <span style={{ color: '#60a5fa' }}>{outputTokens.toLocaleString()}</span>
        {'  '}
        <span style={{ color: '#9ca3af' }}>total</span>{' '}
        <span style={{ color: '#e5e7eb' }}>{totalTokens.toLocaleString()}</span>
      </div>
      <div>
        <span style={{ color: '#9ca3af' }}>cost</span>{' '}
        <span style={{ color: '#fbbf24', fontWeight: 600 }}>{costStr}</span>
      </div>
    </div>
  )
}
