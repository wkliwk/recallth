import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

// ── Skeleton primitive ───────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-sand ${className}`}
      aria-hidden="true"
    />
  )
}

// ── Today's date as YYYY-MM-DD ───────────────────────────────────────────────
function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ── Format date label for axis ────────────────────────────────────────────────
function fmtDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Inline SVG line chart ─────────────────────────────────────────────────────
function LineChart({ entries, valueKey, label }) {
  const valid = entries.filter((e) => e[valueKey] != null && e[valueKey] !== '')
  if (valid.length < 2) return null

  const last30 = valid.slice(-30)
  const values = last30.map((e) => Number(e[valueKey]))
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const range = rawMax - rawMin || 1
  const padding = range * 0.1
  const yMin = rawMin - padding
  const yMax = rawMax + padding

  const W = 600
  const H = 160
  const PAD_L = 46
  const PAD_R = 10
  const PAD_T = 12
  const PAD_B = 28

  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  function xOf(i) {
    return PAD_L + (i / (last30.length - 1)) * chartW
  }
  function yOf(val) {
    return PAD_T + chartH - ((val - yMin) / (yMax - yMin)) * chartH
  }

  const points = last30.map((e, i) => `${xOf(i)},${yOf(Number(e[valueKey]))}`).join(' ')

  // Y axis ticks: 5 evenly-spaced lines including min and max (3 intermediate)
  const TICK_COUNT = rawMax === rawMin ? 1 : 5
  const yLabels = Array.from({ length: TICK_COUNT }, (_, i) => {
    const val = TICK_COUNT === 1
      ? rawMin
      : parseFloat((rawMin + (rawMax - rawMin) * (i / (TICK_COUNT - 1))).toFixed(1))
    return { val, y: yOf(val) }
  })

  return (
    <div>
      <p className="text-[13px] font-semibold text-ink1 mb-3">{label}</p>
      <div style={{ aspectRatio: '600/160', width: '100%' }}>
        <svg viewBox="0 0 600 160" width="100%" height="100%" aria-label={label}>
          {/* Grid lines */}
          {yLabels.map(({ val, y }) => (
            <g key={val}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 3" />
              <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">
                {val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* X axis date labels: first and last */}
          <text x={xOf(0)} y={H - 4} textAnchor="middle" fontSize="10" fill="#9CA3AF">
            {fmtDate(last30[0].date)}
          </text>
          <text x={xOf(last30.length - 1)} y={H - 4} textAnchor="middle" fontSize="10" fill="#9CA3AF">
            {fmtDate(last30[last30.length - 1].date)}
          </text>

          {/* Polyline */}
          <polyline
            points={points}
            fill="none"
            stroke="#F97316"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Dots */}
          {last30.map((e, i) => (
            <circle
              key={i}
              cx={xOf(i)}
              cy={yOf(Number(e[valueKey]))}
              r="3"
              fill="#F97316"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Progress() {
  const { t } = useLanguage()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(todayISO())

  async function fetchEntries() {
    try {
      const res = await api.bodyStats.list()
      const raw = Array.isArray(res) ? res : (res?.data ?? [])
      // Sort ascending by date for charting
      const sorted = [...raw].sort((a, b) => new Date(a.date) - new Date(b.date))
      setEntries(sorted)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!weight) {
      setFormError(t('progressWeightRequired'))
      return
    }
    setSubmitting(true)
    try {
      await api.bodyStats.create({
        weight: Number(weight),
        bodyFat: bodyFat !== '' ? Number(bodyFat) : undefined,
        notes: notes || undefined,
        date,
      })
      setWeight('')
      setBodyFat('')
      setNotes('')
      setDate(todayISO())
      await fetchEntries()
    } catch (err) {
      setFormError(err.message ?? t('progressFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived stats ───────────────────────────────────────────────────────────
  const latest = entries[entries.length - 1] ?? null
  const previous = entries[entries.length - 2] ?? null

  function weightChange() {
    if (!latest || !previous) return null
    const diff = Number(latest.weight) - Number(previous.weight)
    return diff
  }

  const change = weightChange()

  const hasBodyFat = entries.some((e) => e.bodyFat != null && e.bodyFat !== '')

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[760px]">
      <h1 className="font-display text-[28px] text-ink1 leading-none mb-1">{t('progressTitle')}</h1>
      <p className="text-[14px] text-ink2 mb-7">{t('progressSub')}</p>

      {/* ── Log form ── */}
      <div className="rounded-[14px] border border-border bg-white px-5 py-5 mb-6">
        <p className="text-[14px] font-semibold text-ink1 mb-4">{t('progressLogStats')}</p>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Weight */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-ink2 font-medium" htmlFor="prog-weight">
                {t('progressWeight')}
              </label>
              <input
                id="prog-weight"
                type="number"
                step="0.1"
                min="0"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="border border-border rounded-[8px] px-3 py-[9px] text-[13px] text-ink1 outline-none focus:border-orange bg-white"
                placeholder={t('progressWeightPlaceholder')}
              />
            </div>

            {/* Body fat */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-ink2 font-medium" htmlFor="prog-bf">
                {t('progressBodyFat')}
              </label>
              <input
                id="prog-bf"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="border border-border rounded-[8px] px-3 py-[9px] text-[13px] text-ink1 outline-none focus:border-orange bg-white"
                placeholder={t('progressOptional')}
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-ink2 font-medium" htmlFor="prog-date">
                {t('progressDate')}
              </label>
              <input
                id="prog-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-border rounded-[8px] px-3 py-[9px] text-[13px] text-ink1 outline-none focus:border-orange bg-white"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-ink2 font-medium" htmlFor="prog-notes">
                {t('progressNotes')}
              </label>
              <input
                id="prog-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border border-border rounded-[8px] px-3 py-[9px] text-[13px] text-ink1 outline-none focus:border-orange bg-white"
                placeholder={t('progressOptional')}
              />
            </div>
          </div>

          {formError && (
            <p className="text-[12px] text-[#C05A28] mb-3" role="alert">{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-orange text-white text-[13px] font-medium rounded-[8px] px-5 py-[9px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {submitting ? t('progressLogging') : t('progressLogStats')}
          </button>
        </form>
      </div>

      {/* ── Stats strip ── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[82px]" />
          ))}
        </div>
      ) : entries.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Current weight */}
          <div className="rounded-[14px] border border-border bg-white px-4 py-4 flex flex-col gap-1">
            <span className="font-display text-[28px] leading-none text-ink1">
              {Number(latest.weight).toFixed(1)}
            </span>
            <span className="text-[12px] uppercase tracking-[0.06em] text-ink3 font-medium">{t('progressKgNow')}</span>
          </div>

          {/* Change */}
          <div className="rounded-[14px] border border-border bg-white px-4 py-4 flex flex-col gap-1">
            <span
              className={`font-display text-[28px] leading-none ${
                change === null
                  ? 'text-ink3'
                  : change > 0
                  ? 'text-[#3D6B3D]'
                  : 'text-orange'
              }`}
            >
              {change === null
                ? '—'
                : `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`}
            </span>
            <span className="text-[12px] uppercase tracking-[0.06em] text-ink3 font-medium">{t('progressChange')}</span>
          </div>

          {/* Total entries */}
          <div className="rounded-[14px] border border-border bg-white px-4 py-4 flex flex-col gap-1">
            <span className="font-display text-[28px] leading-none text-ink1">{entries.length}</span>
            <span className="text-[12px] uppercase tracking-[0.06em] text-ink3 font-medium">{t('progressEntries')}</span>
          </div>
        </div>
      ) : null}

      {/* ── Charts ── */}
      {loading ? (
        <div className="rounded-[14px] border border-border bg-white px-5 py-5 mb-6">
          <Skeleton className="h-[160px]" />
        </div>
      ) : entries.length >= 2 ? (
        <div className="rounded-[14px] border border-border bg-white px-5 py-5 mb-6 flex flex-col gap-8">
          <LineChart entries={entries} valueKey="weight" label={t('progressWeightTrend')} />
          {hasBodyFat && (
            <LineChart entries={entries} valueKey="bodyFat" label={t('progressBfTrend')} />
          )}
        </div>
      ) : null}

      {/* ── Entries list ── */}
      <div className="rounded-[14px] border border-border bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[13px] font-semibold text-ink1">{t('progressAllEntries')}</p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 px-5 py-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[14px] text-ink2 font-medium mb-1">{t('progressEmpty')}</p>
            <p className="text-[13px] text-ink3">{t('progressEmptySub')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {[...entries].reverse().map((entry, i) => (
              <div key={entry._id ?? entry.id ?? i} className="flex items-start gap-4 px-5 py-[13px]">
                <div className="shrink-0 mt-[2px]">
                  <span className="text-[12px] text-ink3">{fmtDate(entry.date)}</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-[13px] font-medium text-ink1">
                    {Number(entry.weight).toFixed(1)} kg
                  </span>
                  {entry.bodyFat != null && entry.bodyFat !== '' && (
                    <span className="text-[13px] text-ink2">
                      {Number(entry.bodyFat).toFixed(1)}{t('progressBodyFatLabel')}
                    </span>
                  )}
                  {entry.notes && (
                    <span className="text-[13px] text-ink3 italic truncate">{entry.notes}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
