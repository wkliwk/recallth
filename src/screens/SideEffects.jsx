import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

// ── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0]
}

const SEVERITY_CONFIG = {
  mild: {
    labelKey: 'sideEffectsMild',
    badgeClass: 'bg-[#E8F0E8] text-[#3D6B3D] border border-[#C5D8C5]',
    borderColor: '#3D6B3D',
    buttonClass: 'bg-[#3D6B3D] text-white border-[#3D6B3D]',
    idleClass: 'bg-white text-[#3D6B3D] border-[#C5D8C5]',
  },
  moderate: {
    labelKey: 'sideEffectsModerate',
    badgeClass: 'bg-[#FDE8DE] text-[#C05A28] border border-[#E8C4B0]',
    borderColor: '#C05A28',
    buttonClass: 'bg-[#E07B4A] text-white border-[#E07B4A]',
    idleClass: 'bg-white text-[#C05A28] border-[#E8C4B0]',
  },
  severe: {
    labelKey: 'sideEffectsSevere',
    badgeClass: 'bg-[#FDE8DE] text-[#C05A28] border border-[#E8C4B0]',
    borderColor: '#C05A28',
    buttonClass: 'bg-[#C05A28] text-white border-[#C05A28]',
    idleClass: 'bg-white text-[#C05A28] border-[#E8C4B0]',
  },
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-sand ${className}`}
      aria-hidden="true"
    />
  )
}

// ── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity, t }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.mild
  const label = t(cfg.labelKey)
  return (
    <span className={`inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-medium capitalize ${cfg.badgeClass}`}>
      {label}
    </span>
  )
}

// ── Timeline card ─────────────────────────────────────────────────────────────

function EntryCard({ entry, onDelete, t, relativeDate }) {
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
              <SeverityBadge severity={entry.severity} t={t} />
            </div>
            <p className="text-[14px] font-semibold text-ink1 truncate">{entry.supplementName}</p>
            <p className="text-[13px] text-ink2 mt-[2px]">{entry.effect}</p>
          </div>

          {/* Delete control */}
          <div className="shrink-0">
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-ink2">{t('sideEffectsDeleteConfirm')}</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[12px] font-medium text-[#C05A28] hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? '…' : t('sideEffectsYes')}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-[12px] font-medium text-ink3 hover:underline cursor-pointer"
                >
                  {t('sideEffectsNo')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-ink4 hover:text-[#C05A28] transition-colors cursor-pointer"
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
  const { t } = useLanguage()

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

  // ── Localised relative date ────────────────────────────────────────────────
  function relativeDate(dateStr) {
    if (!dateStr) return ''
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diffMs = now - then
    const diffDay = Math.floor(diffMs / 86400000)
    if (diffDay === 0) return t('sideEffectsToday')
    if (diffDay === 1) return t('timeYesterday')
    return t('timeDaysAgo', diffDay)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[760px]">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] text-ink1 leading-none mb-1">{t('sideEffectsTitle')}</h1>
        <p className="text-[14px] text-ink2">{t('sideEffectsSub')}</p>
      </div>

      {/* ── Log form card ── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-[14px] border border-border bg-white px-5 py-5 mb-7"
      >
        <p className="text-[14px] font-semibold text-ink1 mb-4">{t('sideEffectsLog')}</p>

        <div className="flex flex-col gap-4">

          {/* Supplement selector or text input */}
          {cabinet.length > 0 ? (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-ink2" htmlFor="se-supplement">
                {t('sideEffectsSupplement')}
              </label>
              <select
                id="se-supplement"
                value={supplementId}
                onChange={(e) => setSupplementId(e.target.value)}
                required
                className="w-full rounded-[10px] border border-border bg-white px-3 py-[9px] text-[13px] text-ink1 outline-none focus:border-orange transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled>{t('sideEffectsSelectSupp')}</option>
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
                {t('sideEffectsSupplement')}
              </label>
              <input
                id="se-supplement-name"
                type="text"
                value={supplementName}
                onChange={(e) => setSupplementName(e.target.value)}
                placeholder={t('sideEffectsSuppPlaceholder')}
                required
                className="w-full rounded-[10px] border border-border bg-white px-3 py-[9px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors"
              />
            </div>
          )}

          {/* Effect description */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-ink2" htmlFor="se-effect">
              {t('sideEffectsWhat')}
            </label>
            <input
              id="se-effect"
              type="text"
              value={effect}
              onChange={(e) => setEffect(e.target.value)}
              placeholder={t('sideEffectsWhatPlaceholder')}
              required
              className="w-full rounded-[10px] border border-border bg-white px-3 py-[9px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors"
            />
          </div>

          {/* Severity picker */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium text-ink2">{t('sideEffectsSeverity')}</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Severity">
              {(['mild', 'moderate', 'severe']).map((s) => {
                const cfg = SEVERITY_CONFIG[s]
                const selected = severity === s
                const severityLabel = t(cfg.labelKey)
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
                    {severityLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-ink2" htmlFor="se-date">
              {t('sideEffectsDate')}
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
            <p className="text-[13px] text-[#C05A28]" role="alert">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-[10px] rounded-[10px] bg-orange text-white text-[14px] font-semibold transition-opacity disabled:opacity-60 cursor-pointer hover:opacity-90"
          >
            {submitting ? t('sideEffectsLogging') : t('sideEffectsSubmit')}
          </button>
        </div>
      </form>

      {/* ── Timeline ── */}
      <div>
        <h2 className="text-[15px] font-semibold text-ink1 mb-4">{t('sideEffectsHistory')}</h2>

        {loading ? (
          <div className="flex flex-col gap-3" aria-label="Loading">
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-[14px] border border-border bg-white px-6 py-12 flex flex-col items-center text-center">
            <div className="w-[52px] h-[52px] rounded-full bg-[#E8F0E8] flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D6B3D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-ink1 mb-1">{t('sideEffectsEmptyTitle')}</p>
            <p className="text-[13px] text-ink3">{t('sideEffectsEmpty')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3" role="list">
            {entries.map((entry) => (
              <EntryCard
                key={entry._id ?? entry.id}
                entry={entry}
                onDelete={handleDelete}
                t={t}
                relativeDate={relativeDate}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
