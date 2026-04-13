import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

// ── Colour palette for schedule time slots ──────────────────────────────────
const SLOT_COLOURS = [
  { bg: '#FFFBEB', border: '#FEF3C7', dot: '#D97706' },
  { bg: '#EFF6FF', border: '#BFDBFE', dot: '#2563EB' },
  { bg: '#F5F3FF', border: '#DDD6FE', dot: '#7C3AED' },
  { bg: '#ECFDF5', border: '#A7F3D0', dot: '#059669' },
  { bg: '#FFF1F2', border: '#FECDD3', dot: '#E11D48' },
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
              <div className="flex items-center gap-2 px-4 py-[8px] bg-[#FFFBEB] border-t border-[#FEF3C7]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p className="text-[11px] text-[#92400E]">{item.conflict}</p>
              </div>
            )}
          </div>
        ))}
        {block.conflicts && block.conflicts.length > 0 && (
          <div className="flex items-start gap-2 px-4 py-[10px] bg-[#FFFBEB]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-[1px]" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div className="min-w-0">
              {block.conflicts.map((c, i) => (
                <p key={i} className="text-[11px] text-[#92400E]">{c}</p>
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

        const raw = res?.data ?? res ?? []

        if (Array.isArray(raw) && raw.length > 0) {
          // Backend may return grouped blocks or flat items — normalise both
          const normalised = raw.map((block, idx) => {
            const colours = SLOT_COLOURS[idx % SLOT_COLOURS.length]
            const items = Array.isArray(block.items)
              ? block.items.map((it) => ({
                  name: it.name ?? it.supplementName ?? 'Unknown',
                  dose: it.dose ?? it.dosage ?? '',
                  conflict: it.conflict ?? null,
                }))
              : [
                  {
                    name: block.name ?? block.supplementName ?? 'Unknown',
                    dose: block.dose ?? block.dosage ?? '',
                    conflict: block.conflict ?? null,
                  },
                ]

            return {
              label: block.label ?? block.timing ?? block.slot ?? 'Schedule',
              time: block.time ?? block.scheduledTime ?? '',
              bg: colours.bg,
              border: colours.border,
              dot: colours.dot,
              items,
              conflicts: Array.isArray(block.conflicts) ? block.conflicts : [],
            }
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
  }, [])

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[960px]">
      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] text-ink1 mb-1">Schedule</h1>
        <p className="text-[13px] text-ink3">{today}</p>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-[10px] bg-gray-100 h-[90px]"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : schedule.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-ink2 mb-3">
            No schedule yet
          </p>
          <p className="text-[13px] text-ink3 mb-5">
            Add supplements to your cabinet to generate a schedule
          </p>
          <Link
            to="/cabinet"
            className="inline-block text-[13px] font-medium text-orange hover:underline"
          >
            Go to Cabinet
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
