import { useState, useEffect, useCallback, useRef } from 'react'
import { useAiUsage } from '../context/AiUsageContext'

const DEBUG_KEY  = 'recallth_debug_mode'
const POS_KEY    = 'recallth_ai_badge_pos'
const HIDDEN_KEY = 'recallth_ai_badge_hidden'

const isDebugMode = () => {
  if (import.meta.env.DEV) return true
  if (new URLSearchParams(window.location.search).get('debug') === '1') {
    localStorage.setItem(DEBUG_KEY, '1')
    return true
  }
  return localStorage.getItem(DEBUG_KEY) === '1'
}

function loadPos() {
  try {
    const saved = localStorage.getItem(POS_KEY)
    if (saved) {
      const p = JSON.parse(saved)
      if (typeof p.x === 'number' && typeof p.y === 'number') return p
    }
  } catch {}
  return { x: window.innerWidth - 316, y: window.innerHeight - 160 }
}
function loadHidden() { return localStorage.getItem(HIDDEN_KEY) === '1' }
function savePos(p)   { localStorage.setItem(POS_KEY, JSON.stringify(p)) }

const fmt     = (n)   => n?.toLocaleString() ?? '0'
const fmtCost = (usd) => (!usd || usd < 0.000001) ? '< $0.000001' : `$${usd.toFixed(6)}`
const fmtTime = (ts)  => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

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

function useDrag(posRef, setPos) {
  const dragging   = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const didMove    = useRef(false)

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragging.current  = true
    didMove.current   = false
    dragOffset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
    e.preventDefault()
  }, [posRef])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      didMove.current = true
      const x = Math.max(0, Math.min(window.innerWidth  - 300, e.clientX - dragOffset.current.x))
      const y = Math.max(0, Math.min(window.innerHeight -  40, e.clientY - dragOffset.current.y))
      setPos({ x, y })
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      setPos(p => { savePos(p); return p })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [setPos])

  return { onMouseDown, didMove }
}

export default function AiUsageBadge() {
  const { usage, log, clearUsage, clearLog } = useAiUsage()

  const [hidden,      setHidden]      = useState(loadHidden)
  const [pos,         setPos]         = useState(loadPos)
  const [showHistory, setShowHistory] = useState(false)

  const posRef = useRef(pos)
  useEffect(() => { posRef.current = pos }, [pos])

  const { onMouseDown, didMove } = useDrag(posRef, setPos)

  const toggle = useCallback(() => {
    setHidden(v => {
      const next = !v
      localStorage.setItem(HIDDEN_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  // Ctrl+Shift+D to toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); toggle() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  if (!isDebugMode()) return null

  const totalTokens = log.reduce((s, e) => s + (e.totalTokens ?? 0), 0)
  const totalCost   = log.reduce((s, e) => s + (e.estimatedCostUSD ?? 0), 0)

  // ── Hidden state: draggable orange dot ──
  if (hidden) {
    return (
      <div
        onMouseDown={onMouseDown}
        onClick={() => { if (!didMove.current) toggle() }}
        title="Show AI Usage (Ctrl+Shift+D)"
        style={{
          position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
          width: 12, height: 12, borderRadius: '50%',
          background: '#f97316', border: 'none', cursor: 'grab',
          boxShadow: '0 0 6px rgba(249,115,22,0.7)',
        }}
      />
    )
  }

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
      width: 300,
      background: 'rgba(18,18,18,0.92)',
      color: '#e0e0e0',
      borderRadius: 12, border,
      boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(10px)',
      fontFamily: 'monospace', fontSize: 11,
      overflow: 'hidden',
    }}>

      {/* ── Header (drag handle) ── */}
      <div
        onMouseDown={onMouseDown}
        style={{
          padding: '8px 10px',
          borderBottom: usage ? border : 'none',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: usage ? 5 : 0 }}>
          <span style={{ color: '#f97316', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            ⠿ AI Usage
          </span>
          <div style={{ display: 'flex', gap: 4 }} onMouseDown={e => e.stopPropagation()}>
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

        {/* ── Current call ── */}
        {usage && (
          <>
            <Row label="model" value={usage.model}                     color="#fff" />
            <Row label="in"    value={fmt(usage.inputTokens)}          color="#34d399" />
            <Row label="out"   value={fmt(usage.outputTokens)}         color="#60a5fa" />
            <Row label="total" value={fmt(usage.totalTokens)}          color="#e5e7eb" />
            <Row label="cost"  value={fmtCost(usage.estimatedCostUSD)} color="#fbbf24" bold />
          </>
        )}
      </div>

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

      {/* ── History panel ── */}
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
