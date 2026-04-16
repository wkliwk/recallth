import { useState } from 'react'
import { useAiUsage } from '../context/AiUsageContext'

const isDebugMode = () =>
  import.meta.env.DEV ||
  new URLSearchParams(window.location.search).get('debug') === '1'

function fmt(n) {
  return n?.toLocaleString() ?? '0'
}

function fmtCost(usd) {
  if (!usd || usd < 0.000001) return '< $0.000001'
  return `$${usd.toFixed(6)}`
}

function fmtTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const dark = 'rgba(18,18,18,0.95)'
const border = '1px solid rgba(255,255,255,0.1)'

export default function AiUsageBadge() {
  const { usage, log, clearUsage, clearLog } = useAiUsage()
  const [showHistory, setShowHistory] = useState(false)

  if (!isDebugMode()) return null
  if (!usage && log.length === 0) return null

  const totalTokens = log.reduce((s, e) => s + (e.totalTokens ?? 0), 0)
  const totalCost = log.reduce((s, e) => s + (e.estimatedCostUSD ?? 0), 0)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 9999,
        width: showHistory ? 300 : 220,
        background: dark,
        color: '#e0e0e0',
        borderRadius: 12,
        border,
        boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        fontFamily: 'monospace',
        fontSize: 11,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}
    >
      {/* ── Current call header ── */}
      {usage && (
        <div style={{ padding: '8px 10px', borderBottom: border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ color: '#f97316', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
              AI Usage
            </span>
            <button
              onClick={clearUsage}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px' }}
              title="Close"
            >✕</button>
          </div>
          <div style={{ lineHeight: 1.7 }}>
            <Row label="model" value={usage.model} color="#fff" />
            <Row label="in" value={fmt(usage.inputTokens)} color="#34d399" />
            <Row label="out" value={fmt(usage.outputTokens)} color="#60a5fa" />
            <Row label="total" value={fmt(usage.totalTokens)} color="#e5e7eb" />
            <Row label="cost" value={fmtCost(usage.estimatedCostUSD)} color="#fbbf24" bold />
          </div>
        </div>
      )}

      {/* ── Footer: totals + history toggle ── */}
      <div style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ lineHeight: 1.5 }}>
          <span style={{ color: '#6b7280' }}>session </span>
          <span style={{ color: '#e5e7eb' }}>{fmt(totalTokens)} tok</span>
          <span style={{ color: '#6b7280' }}> · </span>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{fmtCost(totalCost)}</span>
        </div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}
        >
          {showHistory ? 'hide' : `log (${log.length})`}
        </button>
      </div>

      {/* ── History panel ── */}
      {showHistory && (
        <div style={{ borderTop: border }}>
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
            {log.length === 0 ? (
              <div style={{ padding: '8px 10px', color: '#6b7280' }}>No calls yet</div>
            ) : (
              [...log].reverse().map((entry, i) => (
                <div key={i} style={{ padding: '4px 10px', borderBottom: i < log.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#f97316' }}>{entry.feature}</span>
                    <span style={{ color: '#6b7280' }}>{fmtTime(entry.ts)}</span>
                  </div>
                  <div style={{ color: '#9ca3af' }}>
                    {fmt(entry.totalTokens)} tok · <span style={{ color: '#fbbf24' }}>{fmtCost(entry.estimatedCostUSD)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ padding: '5px 10px', borderTop: border, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={clearLog}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 10 }}
            >
              clear log
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, color, bold }) {
  return (
    <div>
      <span style={{ color: '#6b7280' }}>{label} </span>
      <span style={{ color, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  )
}
