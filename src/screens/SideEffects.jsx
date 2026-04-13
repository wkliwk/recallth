import { useState, useEffect } from 'react'
import { api } from '../services/api'

// ── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0]
}

function relativeDate(dateStr) {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffDay === 0) return 'Today'
  if (diffDay === 1) return 'Yesterday'
  return `${diffDay} days ago`
}

const SEVERITY_CONFIG = {
  mild: {
    label: 'Mild',
    badgeClass: 'bg-green-50 text-green-700 border border-green-200',
    borderColor: '#16a34a',
    buttonClass: 'bg-green-500 text-white border-green-500',
    idleClass: 'bg-white text-green-700 border-green-200',
  },
  moderate: {
    label: 'Moderate',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    borderColor: '#d97706',
    buttonClass: 'bg-amber-500 text-white border-amber-500',
    idleClass: 'bg-white text-amber-700 border-amber-200',
  },
  severe: {
    label: 'Severe',
    badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    borderColor: '#dc2626',
    buttonClass: 'bg-red-500 text-white border-red-500',
    idleClass: 'bg-white text-red-700 border-red-200',
  },
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-gray-100 ${className}`}
      aria-hidden="true"
    />
  )
}

// ── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.mild
  return (
    <span className={`inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-medium capitalize ${cfg.badgeClass}`}>
      {cfg.label}
    </span>
  )
}

// ── Timeline card ─────────────────────────────────────────────────────────────

function EntryCard({ entry, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const cfg = SEVERITY_CONFIG[entry.severity] ?? SEVERITY_CONFIG.mild

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(entry._id ?? entry.id)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div
      className="rounded-[14px] border border-border bg-white overflow-hidden flex"
      role="listitem"
    >
      {/* Severity left bar */}
      <div className="w-1 shrink-0" style={{ background: cfg.borderColor }} />

      <div className="flex-1 min-w-0 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[12px] text-ink3">{relativeDate(entry.date)}</span>
              <SeverityBadge severity={entry.severity} />
            </div>
            <p className="text-[14px] font-semibold text-ink1 truncate">{entry.supplementName}</p>
            <p className="text-[13px] text-ink2 mt-[2px]">{entry.effect}</p>
          </div>

          {/* Delete control */}
          <div className="shrink-0">
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-ink2">Are you sure?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[12px] font-medium text-red-600 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? '…' : 'Yes'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-[12px] font-medium text-ink3 hover:underline cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-ink4 hover:text-red-500 transition-colors cursor-pointer"
                aria-label="Delete entry"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SideEffects() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([])
  const [cabinet, setCabinet] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Form fields
  const [supplementId, setSupplementId] = useState('')
  const [supplementName, setSupplementName] = useState('')
  const [effect, setEffect] = useState('')
  const [severity, setSeverity] = useState('mild')
  const [date, setDate] = useState(today())

  // ── Fetch on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      try {
        const [effectsRes, cabinetRes] = await Promise.allSettled([
          api.sideEffects.list(),
          api.cabinet.list(),
        ])

        if (cancelled) return

        if (effectsRes.status === 'fulfilled') {
          const items = effectsRes.value?.data ?? effectsRes.value ?? []
          setEntries(Array.isArray(items) ? items : [])
        }

        if (cabinetRes.status === 'fulfilled') {
          const items = cabinetRes.value?.data ?? cabinetRes.value ?? []
          setCabinet(Array.isArray(items) ? items : [])
        }
      } catch {
        // degraded gracefully
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [])

  // ── Submit new entry ───────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const name = cabinet.length > 0 ? (cabinet.find((c) => c._id === supplementId || c.id === supplementId)?.name ?? supplementId) : supplementName
    if (!name || !effect) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await api.sideEffects.create({
        supplementId: supplementId || null,
        supplementName: name,
        effect,
        severity,
        date,
      })
      const newEntry = res?.data ?? res
      setEntries((prev) => [newEntry, ...prev])

      // Reset form
      setSupplementId('')
      setSupplementName('')
      setEffect('')
      setSeverity('mild')
      setDate(today())
    } catch (err) {
      setError(err.message ?? 'Failed to log — try again')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete entry ───────────────────────────────────────────────────────────
  async function handleDelete(id) {
    await api.sideEffects.remove(id)
    setEntries((prev) => prev.filter((e) => (e._id ?? e.id) !== id))
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[760px]">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] text-ink1 leading-none mb-1">Side Effects</h1>
        <p className="text-[14px] text-ink2">Track how supplements affect you over time</p>
      </div>

      {/* ── Log form card ── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-[14px] border border-border bg-white px-5 py-5 mb-7"
      >
        <p className="text-[14px] font-semibold text-ink1 mb-4">Log a side effect</p>

        <div className="flex flex-col gap-4">

          {/* Supplement selector or text input */}
          {cabinet.length > 0 ? (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-ink2" htmlFor="se-supplement">
                Supplement
              </label>
              <select
                id="se-supplement"
                value={supplementId}
                onChange={(e) => setSupplementId(e.target.value)}
                required
                className="w-full rounded-[10px] border border-border bg-white px-3 py-[9px] text-[13px] text-ink1 outline-none focus:border-orange transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled>Select supplement…</option>
                {cabinet.map((item) => (
                  <option key={item._id ?? item.id} value={item._id ?? item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-ink2" htmlFor="se-supplement-name">
                Supplement
              </label>
              <input
                id="se-supplement-name"
                type="text"
                value={supplementName}
                onChange={(e) => setSupplementName(e.target.value)}
                placeholder="Supplement name"
                required
                className="w-full rounded-[10px] border border-border bg-white px-3 py-[9px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors"
              />
            </div>
          )}

          {/* Effect description */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-ink2" htmlFor="se-effect">
              What did you notice?
            </label>
            <input
              id="se-effect"
              type="text"
              value={effect}
              onChange={(e) => setEffect(e.target.value)}
              placeholder="What did you notice?"
              required
              className="w-full rounded-[10px] border border-border bg-white px-3 py-[9px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors"
            />
          </div>

          {/* Severity picker */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium text-ink2">Severity</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Severity">
              {(['mild', 'moderate', 'severe']).map((s) => {
                const cfg = SEVERITY_CONFIG[s]
                const selected = severity === s
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSeverity(s)}
                    className={`flex-1 py-[8px] rounded-[10px] border text-[13px] font-medium transition-colors cursor-pointer ${
                      selected ? cfg.buttonClass : cfg.idleClass + ' border'
                    }`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-ink2" htmlFor="se-date">
              Date
            </label>
            <input
              id="se-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today()}
              required
              className="w-full rounded-[10px] border border-border bg-white px-3 py-[9px] text-[13px] text-ink1 outline-none focus:border-orange transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[13px] text-red-600" role="alert">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-[10px] rounded-[10px] bg-orange text-white text-[14px] font-semibold transition-opacity disabled:opacity-60 cursor-pointer hover:opacity-90"
          >
            {submitting ? 'Logging…' : 'Log Effect'}
          </button>
        </div>
      </form>

      {/* ── Timeline ── */}
      <div>
        <h2 className="text-[15px] font-semibold text-ink1 mb-4">History</h2>

        {loading ? (
          <div className="flex flex-col gap-3" aria-label="Loading">
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-[14px] border border-border bg-white px-6 py-10 text-center">
            <p className="text-[13px] text-ink2">
              No side effects logged — track how supplements affect you
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3" role="list">
            {entries.map((entry) => (
              <EntryCard
                key={entry._id ?? entry.id}
                entry={entry}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}