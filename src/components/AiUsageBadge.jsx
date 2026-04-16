import { useState } from 'react'
import { useAiUsage } from '../context/AiUsageContext'

const isDebugMode = () =>
  import.meta.env.DEV ||
  new URLSearchParams(window.location.search).get('debug') === '1'

const fmt    = (n)   => n?.toLocaleString() ?? '0'
const fmtCost = (usd) => (!usd || usd < 0.000001) ? '< $0.000001' : `$${usd.toFixed(6)}`
const fmtTime = (ts)  => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const S = {
  wrap: {
    position: 'fixed', bottom: 80, right: 16, zIndex: 9999,
    background: 'rgba(18,18,18,0.96)', color: '#e0e0e0',
    borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 6px 24px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    fontFamily: 'monospace', fontSize: 11, overflow: 'hidden',
    width: 300,
  },
  section: { padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  row:     { lineHeight: 1.7 },
  label:   { color: '#6b7280' },
  footer:  { padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
}

function Row({ label, value, color, bold }) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label} </span>
      <span style={{ color, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  )
}

function IoBlock({ label, text }) {
  const [open, setOpen] = useState(false)
  if (!text) return null
  return (
    <div style={{ marginTop: 3 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 10, padding: 0, textDecoration: 'underline' }}
      >
        {open ? `▾ hide ${label}` : `▸ ${label}`}
      </button>
      {open && (
        <div style={{
          marginTop: 3, padding: '4px 6px',
          background: 'rgba(255,255,255,0.05)', borderRadius: 6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          color: '#d1d5db', maxHeight: 160, overflowY: 'auto', lineHeight: 1.5,
        }}>
          {text}
        </div>
      )}
    </div>
  )
}

function LogEntry({ entry, isLast }) {
  return (
    <div style={{ padding: '5px 10px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#f97316', fontWeight: 600 }}>{entry.feature}</span>
        <span style={{ color: '#6b7280' }}>{fmtTime(entry.ts)}</span>
      </div>
      <div style={{ color: '#9ca3af' }}>
        {fmt(entry.inputTokens)}↑ {fmt(entry.outputTokens)}↓ · <span style={{ color: '#fbbf24' }}>{fmtCost(entry.estimatedCostUSD)}</span>
      </div>
      <IoBlock label="input"  text={entry.input}  />
      <IoBlock label="output" text={entry.output} />
    </div>
  )
}

export default function AiUsageBadge() {
  const { usage, log, clearUsage, clearLog } = useAiUsage()
  const [showHistory, setShowHistory] = useState(false)

  if (!isDebugMode()) return null
  if (!usage && log.length === 0) return null

  const totalTokens = log.reduce((s, e) => s + (e.totalTokens ?? 0), 0)
  const totalCost   = log.reduce((s, e) => s + (e.estimatedCostUSD ?? 0), 0)

  return (
    <div style={S.wrap}>

      {/* ── Current call ── */}
      {usage && (
        <div style={S.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ color: '#f97316', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
              AI Usage
            </span>
            <button onClick={clearUsage} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}>✕</button>
          </div>
          <Row label="model"  value={usage.model}                        color="#fff" />
          <Row label="in"     value={fmt(usage.inputTokens)}             color="#34d399" />
          <Row label="out"    value={fmt(usage.outputTokens)}            color="#60a5fa" />
          <Row label="total"  value={fmt(usage.totalTokens)}             color="#e5e7eb" />
          <Row label="cost"   value={fmtCost(usage.estimatedCostUSD)}    color="#fbbf24" bold />
        </div>
      )}

      {/* ── Session totals + history toggle ── */}
      <div style={S.footer}>
        <div>
          <span style={S.label}>session </span>
          <span style={{ color: '#e5e7eb' }}>{fmt(totalTokens)} tok</span>
          <span style={S.label}> · </span>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{fmtCost(totalCost)}</span>
        </div>
        <button
          onClick={() => setShowHistory(v => !v)}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}
        >
          {showHistory ? 'hide' : `log (${log.length})`}
        </button>
      </div>

      {/* ── History panel ── */}
      {showHistory && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {log.length === 0
              ? <div style={{ padding: '8px 10px', color: '#6b7280' }}>No calls yet</div>
              : [...log].reverse().map((entry, i) => (
                  <LogEntry key={i} entry={entry} isLast={i === log.length - 1} />
                ))
            }
          </div>
          <div style={{ padding: '5px 10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={clearLog} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 10 }}>
              clear log
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
