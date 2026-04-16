import { useState, useEffect, useCallback } from 'react'
import { useAiUsage } from '../context/AiUsageContext'

const isDebugMode = () =>
  import.meta.env.DEV ||
  new URLSearchParams(window.location.search).get('debug') === '1'

const fmt     = (n)   => n?.toLocaleString() ?? '0'
const fmtCost = (usd) => (!usd || usd < 0.000001) ? '< $0.000001' : `$${usd.toFixed(6)}`
const fmtTime = (ts)  => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

// 4 corner positions
const POSITIONS = [
  { id: 'br', label: '↘', style: { bottom: 80, right: 16 } },
  { id: 'bl', label: '↙', style: { bottom: 80, left:  16 } },
  { id: 'tr', label: '↗', style: { top:    16, right: 16 } },
  { id: 'tl', label: '↖', style: { top:    16, left:  16 } },
]

const POS_KEY     = 'recallth_ai_badge_pos'
const HIDDEN_KEY  = 'recallth_ai_badge_hidden'

function loadPos()    { return localStorage.getItem(POS_KEY)    ?? 'br' }
function loadHidden() { return localStorage.getItem(HIDDEN_KEY) === '1' }

const border      = '1px solid rgba(255,255,255,0.1)'
const borderLight = '1px solid rgba(255,255,255,0.07)'

function Row({ label, value, color, bold }) {
  return (
    <div style={{ lineHeight: 1.7 }}>
      <span style={{ color: '#6b7280' }}>{label} </span>
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
          background: 'rgba(255,255,255,0.06)', borderRadius: 6,
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
    <div style={{ padding: '5px 10px', borderBottom: isLast ? 'none' : borderLight }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#f97316', fontWeight: 600 }}>{entry.feature}</span>
        <span style={{ color: '#6b7280' }}>{fmtTime(entry.ts)}</span>
      </div>
      <div style={{ color: '#9ca3af' }}>
        {fmt(entry.inputTokens)}↑ {fmt(entry.outputTokens)}↓ ·{' '}
        <span style={{ color: '#fbbf24' }}>{fmtCost(entry.estimatedCostUSD)}</span>
      </div>
      <IoBlock label="input"  text={entry.input}  />
      <IoBlock label="output" text={entry.output} />
    </div>
  )
}

export default function AiUsageBadge() {
  const { usage, log, clearUsage, clearLog } = useAiUsage()

  const [hidden,      setHidden]      = useState(loadHidden)
  const [posId,       setPosId]       = useState(loadPos)
  const [showHistory, setShowHistory] = useState(false)

  // Ctrl+Shift+D to toggle
  const toggle = useCallback(() => {
    setHidden(v => {
      const next = !v
      localStorage.setItem(HIDDEN_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); toggle() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  if (!isDebugMode()) return null
  if (!usage && log.length === 0) return null

  const pos         = POSITIONS.find(p => p.id === posId) ?? POSITIONS[0]
  const nextPosId   = () => {
    const idx  = POSITIONS.findIndex(p => p.id === posId)
    const next = POSITIONS[(idx + 1) % POSITIONS.length].id
    localStorage.setItem(POS_KEY, next)
    setPosId(next)
  }

  const totalTokens = log.reduce((s, e) => s + (e.totalTokens ?? 0), 0)
  const totalCost   = log.reduce((s, e) => s + (e.estimatedCostUSD ?? 0), 0)

  // ── Hidden state: just a small orange dot ──
  if (hidden) {
    return (
      <button
        onClick={toggle}
        title="Show AI Usage (Ctrl+Shift+D)"
        style={{
          position: 'fixed', ...pos.style, zIndex: 9999,
          width: 12, height: 12, borderRadius: '50%',
          background: '#f97316', border: 'none', cursor: 'pointer',
          boxShadow: '0 0 6px rgba(249,115,22,0.7)',
          padding: 0,
        }}
      />
    )
  }

  return (
    <div style={{
      position: 'fixed', ...pos.style, zIndex: 9999,
      width: 300,
      background: 'rgba(18,18,18,0.92)',
      color: '#e0e0e0',
      borderRadius: 12, border,
      boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(10px)',
      fontFamily: 'monospace', fontSize: 11,
      overflow: 'hidden',
    }}>

      {/* ── Current call ── */}
      {usage && (
        <div style={{ padding: '8px 10px', borderBottom: border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#f97316', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                AI Usage
              </span>
              {/* position switcher */}
              <button
                onClick={nextPosId}
                title="Move panel"
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 11, padding: '0 2px', lineHeight: 1 }}
              >
                {pos.label}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={toggle}
                title="Hide (Ctrl+Shift+D)"
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 11, padding: '0 3px' }}
              >
                ▾
              </button>
              <button
                onClick={clearUsage}
                title="Close"
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}
              >
                ✕
              </button>
            </div>
          </div>
          <Row label="model" value={usage.model}                     color="#fff" />
          <Row label="in"    value={fmt(usage.inputTokens)}          color="#34d399" />
          <Row label="out"   value={fmt(usage.outputTokens)}         color="#60a5fa" />
          <Row label="total" value={fmt(usage.totalTokens)}          color="#e5e7eb" />
          <Row label="cost"  value={fmtCost(usage.estimatedCostUSD)} color="#fbbf24" bold />
        </div>
      )}

      {/* ── Session totals + history toggle ── */}
      <div style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ color: '#6b7280' }}>session </span>
          <span style={{ color: '#e5e7eb' }}>{fmt(totalTokens)} tok</span>
          <span style={{ color: '#6b7280' }}> · </span>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{fmtCost(totalCost)}</span>
        </div>
        <button
          onClick={() => setShowHistory(v => !v)}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}
        >
          {showHistory ? 'hide' : `log (${log.length})`}
        </button>
      </div>

      {/* ── History panel — semi-transparent ── */}
      {showHistory && (
        <div style={{ borderTop: border }}>
          <div style={{
            maxHeight: 320, overflowY: 'auto',
            background: 'rgba(12,12,12,0.6)',
            backdropFilter: 'blur(14px)',
          }}>
            {log.length === 0
              ? <div style={{ padding: '8px 10px', color: '#6b7280' }}>No calls yet</div>
              : [...log].reverse().map((entry, i) => (
                  <LogEntry key={i} entry={entry} isLast={i === log.length - 1} />
                ))
            }
          </div>
          <div style={{
            padding: '5px 10px', borderTop: border,
            display: 'flex', justifyContent: 'flex-end',
            background: 'rgba(12,12,12,0.5)',
          }}>
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
