import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

// ── Colour palette for schedule time slots ──────────────────────────────────
const SLOT_COLOURS = [
  { bg: '#FDE8DE', border: '#E8C4B0', dot: '#E07B4A' },  // orange
  { bg: '#F2EDE4', border: '#D8D0C4', dot: '#7A6A5A' },  // sand/ink2
  { bg: '#E8E0D4', border: '#C8BCA8', dot: '#2A221A' },  // warm dark
  { bg: '#E8F0E8', border: '#C5D8C5', dot: '#3D6B3D' },  // sage
  { bg: '#FBF9F5', border: '#E8C4B0', dot: '#C05A28' },  // orange-dk
]

// Canonical ordering for the five named time windows
const TIME_WINDOW_ORDER = [
  'Morning',
  'Pre-Workout',
  'With Meals',
  'Evening',
  'Before Bed',
]

// ── Schedule block component ─────────────────────────────────────────────────
function ScheduleBlock({ block }) {
  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ borderColor: block.border }}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: block.bg, borderBottom: `1px solid ${block.border}` }}
      >
        <span className="text-[13px] font-semibold text-ink1">{block.label}</span>
        <span className="text-[12px] text-ink3">{block.time}</span>
      </div>
      <div className="bg-white divide-y divide-border">
        {block.items.map((item, idx) => (
          <div key={`${item.name}-${idx}`}>
            <div className="flex items-center gap-3 px-4 py-[11px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: block.dot }} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink1 truncate">{item.name}</p>
                <p className="text-[11px] text-ink3">{item.dose}</p>
              </div>
            </div>
            {item.conflict && (
              <div className="flex items-center gap-2 px-4 py-[8px] bg-orange-lt border-t border-orange-md">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C05A28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p className="text-[11px] text-orange-dk">{item.conflict}</p>
              </div>
            )}
          </div>
        ))}
        {block.conflicts && block.conflicts.length > 0 && (
          <div className="flex items-start gap-2 px-4 py-[10px] bg-orange-lt">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C05A28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-[1px]" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div className="min-w-0">
              {block.conflicts.map((c, i) => (
                <p key={i} className="text-[11px] text-orange-dk">{c}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Schedule() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState([])

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  useEffect(() => {
    let cancelled = false

    async function fetchSchedule() {
      try {
        const res = await api.cabinet.schedule()
        if (cancelled) return

        const raw = res?.data ?? {}

        // Backend returns { schedule: { morning: [...], ... } } or flat array
        const scheduleObj = raw.schedule ?? raw
        const SLOT_LABELS = { morning: t('slotMorning'), afternoon: t('slotAfternoon'), evening: t('slotEvening'), night: t('slotNight'), anytime: t('slotAnytime') }

        if (scheduleObj && typeof scheduleObj === 'object' && !Array.isArray(scheduleObj)) {
          const normalised = Object.entries(SLOT_LABELS)
            .filter(([key]) => Array.isArray(scheduleObj[key]) && scheduleObj[key].length > 0)
            .map(([key, label], idx) => {
              const colours = SLOT_COLOURS[idx % SLOT_COLOURS.length]
              const items = scheduleObj[key].map((it) => ({
                name: it.name ?? 'Unknown',
                dose: it.dosage ?? it.dose ?? '',
                conflict: it.conflict ?? null,
              }))
              return { label, time: '', bg: colours.bg, border: colours.border, dot: colours.dot, items, conflicts: [] }
            })

          // Sort by canonical time window order; unknowns go last
          const sorted = [...normalised].sort((a, b) => {
            const ai = TIME_WINDOW_ORDER.indexOf(a.label)
            const bi = TIME_WINDOW_ORDER.indexOf(b.label)
            const aIdx = ai === -1 ? TIME_WINDOW_ORDER.length : ai
            const bIdx = bi === -1 ? TIME_WINDOW_ORDER.length : bi
            return aIdx - bIdx
          })

          setSchedule(sorted)
        } else {
          setSchedule([])
        }
      } catch {
        setSchedule([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSchedule()
    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[960px]">
      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] text-ink1 mb-1">{t('scheduleTitle')}</h1>
        <p className="text-[13px] text-ink3">{today}</p>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-[10px] bg-sand h-[90px]"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : schedule.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-ink2 mb-3">
            {t('scheduleEmpty')}
          </p>
          <p className="text-[13px] text-ink3 mb-5">
            {t('scheduleEmptySub')}
          </p>
          <Link
            to="/cabinet"
            className="inline-block text-[13px] font-medium text-orange hover:underline"
          >
            {t('scheduleGoToCabinet')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {schedule.map((block) => (
            <ScheduleBlock key={`${block.label}-${block.time}`} block={block} />
          ))}
        </div>
      )}
    </div>
  )
}
