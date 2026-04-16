import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { useAiUsage } from '../context/AiUsageContext'

// ── Skeleton primitive ───────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-sand ${className}`}
      aria-hidden="true"
    />
  )
}

// ── Week-start helper ────────────────────────────────────────────────────────
function getWeekStarts(n = 8) {
  const starts = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff - i * 7)
    starts.push(d.toISOString().slice(0, 10))
  }
  return starts
}

// ── Inline SVG sparkline ─────────────────────────────────────────────────────
function Sparkline({ checkIns }) {
  const W = 200
  const H = 40
  const P = 8
  const weeks = getWeekStarts(8)

  // Build a map from weekStart -> rating
  const byWeek = {}
  checkIns.forEach((ci) => {
    if (ci.weekStart) byWeek[ci.weekStart.slice(0, 10)] = ci.rating
  })

  const points = weeks.map((w, i) => ({
    x: P + (i / 7) * (W - P * 2),
    y: byWeek[w] != null ? H - P - ((byWeek[w] - 1) / 4) * (H - P * 2) : null,
    rating: byWeek[w] ?? null,
  }))

  const connected = points.filter((p) => p.y !== null)
  const polylinePoints = connected.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {connected.length > 1 && (
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#F97316"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {connected.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#F97316" />
      ))}
    </svg>
  )
}

// ── Rating emoji buttons ─────────────────────────────────────────────────────
const EMOJIS = [
  { value: 1, label: '😞' },
  { value: 2, label: '😟' },
  { value: 3, label: '😐' },
  { value: 4, label: '🙂' },
  { value: 5, label: '😄' },
]

// ── Trend badge ──────────────────────────────────────────────────────────────
function TrendBadge({ checkIns }) {
  const weeks = getWeekStarts(8)
  const byWeek = {}
  checkIns.forEach((ci) => {
    if (ci.weekStart) byWeek[ci.weekStart.slice(0, 10)] = ci.rating
  })

  const thisWeek = byWeek[weeks[7]] ?? null
  const lastWeek = byWeek[weeks[6]] ?? null

  if (thisWeek === null || lastWeek === null) {
    return <span className="text-[12px] text-ink3">—</span>
  }

  const diff = thisWeek - lastWeek
  if (diff === 0) return <span className="text-[12px] text-ink3">—</span>
  if (diff > 0)
    return (
      <span className="text-[12px] font-semibold text-[#3D6B3D]">
        +{diff}
      </span>
    )
  return (
    <span className="text-[12px] font-semibold text-[#C05A28]">
      {diff}
    </span>
  )
}

// ── Current week emoji for goal card header ──────────────────────────────────
function CurrentEmoji({ checkIns }) {
  const weeks = getWeekStarts(8)
  const byWeek = {}
  checkIns.forEach((ci) => {
    if (ci.weekStart) byWeek[ci.weekStart.slice(0, 10)] = ci.rating
  })
  const rating = byWeek[weeks[7]] ?? null
  if (rating === null) return <span className="text-[18px]">—</span>
  return <span className="text-[18px]">{EMOJIS.find((e) => e.value === rating)?.label ?? '—'}</span>
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Goals() {
  const { t } = useLanguage()
  const { showUsage } = useAiUsage()

  // ── Data state ──────────────────────────────────────────────────────────
  const [checkIns, setCheckIns] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Form state ──────────────────────────────────────────────────────────
  const [goalName, setGoalName] = useState('')
  const [rating, setRating] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [aiNudge, setAiNudge] = useState('')
  const [nudgeTimer, setNudgeTimer] = useState(null)

  // ── Fetch check-ins on mount ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchCheckIns() {
      try {
        const res = await api.goals.checkIns()
        if (!cancelled) {
          const items = res?.data ?? []
          setCheckIns(Array.isArray(items) ? items : [])
        }
      } catch {
        if (!cancelled) setCheckIns([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCheckIns()
    return () => { cancelled = true }
  }, [])

  // ── Clear nudge timer on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (nudgeTimer) clearTimeout(nudgeTimer)
    }
  }, [nudgeTimer])

  // ── Submit handler ───────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!goalName.trim()) {
      setFormError(t('goalsNameRequired'))
      return
    }
    if (rating === null) {
      setFormError(t('goalsRatingRequired'))
      return
    }
    setFormError('')
    setSubmitting(true)

    try {
      const res = await api.goals.checkIn({ goal: goalName.trim(), rating })
      if (res?.data?.aiUsage) showUsage(res.data.aiUsage, 'goal-check-in')
      const nudge = res?.data?.aiResponse ?? ''
      if (nudge) {
        setAiNudge(nudge)
        if (nudgeTimer) clearTimeout(nudgeTimer)
        const t = setTimeout(() => setAiNudge(''), 8000)
        setNudgeTimer(t)
      }

      // Refresh check-ins
      const updated = await api.goals.checkIns()
      const items = updated?.data ?? []
      setCheckIns(Array.isArray(items) ? items : [])

      // Reset form
      setGoalName('')
      setRating(null)
    } catch (err) {
      setFormError(err.message ?? t('goalsSubmitError'))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Group check-ins by goal name ─────────────────────────────────────────
  const goalMap = {}
  checkIns.forEach((ci) => {
    const key = ci.goal ?? 'Unknown'
    if (!goalMap[key]) goalMap[key] = []
    goalMap[key].push(ci)
  })
  const goalEntries = Object.entries(goalMap)

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[760px]">

      {/* ── Page heading ── */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] text-ink1 leading-none mb-1">{t('goals')}</h1>
        <p className="text-[13px] text-ink2">{t('goalsSubtitle')}</p>
      </div>

      {/* ── Log form card ── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-[14px] border border-border bg-white px-5 py-5 mb-6"
      >
        <p className="text-[14px] font-semibold text-ink1 mb-4">{t('goalsLogTitle')}</p>

        {/* Goal name input */}
        <div className="mb-4">
          <label className="block text-[12px] font-medium text-ink2 mb-1" htmlFor="goal-name">
            {t('goalsNameLabel')}
          </label>
          <input
            id="goal-name"
            type="text"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder={t('goalsNamePlaceholder')}
            className="w-full border border-border rounded-[10px] px-3 py-[9px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors bg-white"
          />
        </div>

        {/* Emoji rating */}
        <div className="mb-5">
          <p className="text-[12px] font-medium text-ink2 mb-2">{t('goalsRatingLabel')}</p>
          <div className="flex gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => setRating(e.value)}
                aria-label={`Rating ${e.value}`}
                aria-pressed={rating === e.value}
                className={`w-10 h-10 rounded-[10px] text-[20px] flex items-center justify-center transition-all cursor-pointer ${
                  rating === e.value
                    ? 'ring-2 ring-orange ring-offset-1 bg-orange/5'
                    : 'bg-sand hover:bg-orange/5'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {formError && (
          <p className="text-[12px] text-[#C05A28] mb-3" role="alert">
            {formError}
          </p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange text-white text-[13px] font-semibold rounded-[10px] py-[10px] hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
        >
          {submitting ? t('goalsSubmitting') : t('goalsSubmit')}
        </button>
      </form>

      {/* ── AI nudge success card ── */}
      {aiNudge && (
        <div
          className="rounded-[14px] border border-[#C5D8C5] bg-[#E8F0E8] px-5 py-4 mb-6"
          role="status"
          aria-live="polite"
        >
          <p className="text-[13px] font-semibold text-[#3D6B3D] mb-1">{t('goalsNudgeTitle')}</p>
          <p className="text-[13px] text-ink1">{aiNudge}</p>
        </div>
      )}

      {/* ── Goal cards ── */}
      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
        </div>
      ) : goalEntries.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white px-6 py-10 text-center">
          <p className="text-[13px] text-ink2">{t('goalsEmpty')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {goalEntries.map(([goal, entries]) => (
            <div
              key={goal}
              className="rounded-[14px] border border-border bg-white px-5 py-4"
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CurrentEmoji checkIns={entries} />
                  <p className="text-[14px] font-semibold text-ink1">{goal}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-ink3 mr-1">{t('goalsTrend')}</span>
                  <TrendBadge checkIns={entries} />
                </div>
              </div>

              {/* Sparkline */}
              <div className="flex items-center gap-3">
                <Sparkline checkIns={entries} />
                <div className="flex flex-col gap-[2px]">
                  <span className="text-[10px] text-ink3 leading-none">😄 5</span>
                  <span className="text-[10px] text-ink3 leading-none mt-auto">😞 1</span>
                </div>
              </div>

              {/* 8-week label */}
              <p className="text-[10px] text-ink3 mt-1">{t('goalsWeeks')}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
