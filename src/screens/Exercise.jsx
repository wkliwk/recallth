import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import FAB from '../components/FAB'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

// ── Date helpers ──────────────────────────────────────────────────────────────
function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatCardDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function groupSessionsByWeek(sessions) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const thisWeekStart = startOfWeek(now)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const thisWeek = []
  const lastWeek = []
  const older = {}

  for (const s of sessions) {
    const d = new Date(s.date + 'T00:00:00')
    if (d >= thisWeekStart) {
      thisWeek.push(s)
    } else if (d >= lastWeekStart) {
      lastWeek.push(s)
    } else {
      const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      if (!older[label]) older[label] = []
      older[label].push(s)
    }
  }

  return { thisWeek, lastWeek, older }
}

// ── Activity icon map ─────────────────────────────────────────────────────────
function ActivityIcon({ type }) {
  const t = (type || '').toLowerCase()

  if (t === 'running') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13" cy="4" r="1.5"/>
        <path d="M6 20l3.5-5 2.5 3 3.5-4.5"/>
        <path d="M9 8l-1 4h5l2-4"/>
        <path d="M15 13l2 4"/>
      </svg>
    )
  }
  if (t === 'swimming') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c1.5-1 3-.5 4 .5s2.5 1.5 4 .5 2.5-1.5 4-.5 2.5 1.5 4 .5"/>
        <path d="M2 17c1.5-1 3-.5 4 .5s2.5 1.5 4 .5 2.5-1.5 4-.5 2.5 1.5 4 .5"/>
        <circle cx="14" cy="6" r="1.5"/>
        <path d="M10 8l2-2 3 3-2 3H9l-2-2"/>
      </svg>
    )
  }
  if (t === 'basketball' || t === 'badminton') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 3a9 9 0 0 0 3 6 9 9 0 0 0-3 6"/>
        <path d="M12 3a9 9 0 0 1-3 6 9 9 0 0 1 3 6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
      </svg>
    )
  }
  if (t === 'other') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    )
  }
  // default: gym / dumbbell
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M2 8.5h2M2 15.5h2M20 8.5h2M20 15.5h2"/>
    </svg>
  )
}

// ── Intensity badge ───────────────────────────────────────────────────────────
function IntensityBadge({ intensity }) {
  const i = (intensity || '').toLowerCase()
  let bg = 'bg-[#4CAF50]/15 text-[#2E7D32]'
  let label = intensity || ''
  if (i === 'moderate') bg = 'bg-orange/15 text-orange'
  if (i === 'hard' || i === 'intense') bg = 'bg-[#D32F2F]/15 text-[#C62828]'
  return (
    <span className={`text-[10px] font-medium px-2 py-[2px] rounded-full ${bg}`}>
      {label}
    </span>
  )
}

// ── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ session }) {
  return (
    <div className="bg-white rounded-[14px] px-4 py-3 flex items-center gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <span className="w-9 h-9 rounded-full bg-orange/10 flex items-center justify-center text-orange shrink-0">
        <ActivityIcon type={session.activityType} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink1 capitalize leading-tight">
          {session.activityType === 'other' && session.customLabel
            ? session.customLabel
            : session.activityType}
        </p>
        <p className="text-[12px] text-ink3 mt-[2px]">{formatCardDate(session.date)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {session.durationMin && (
          <p className="text-[12px] text-ink2 font-medium">{session.durationMin} min</p>
        )}
        {session.intensity && <IntensityBadge intensity={session.intensity} />}
      </div>
    </div>
  )
}

// ── Week section ──────────────────────────────────────────────────────────────
function WeekSection({ label, sessions }) {
  if (!sessions || sessions.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-ink2 text-sm font-medium px-1">{label}</p>
      {sessions.map((s) => (
        <SessionCard key={s._id || s.id || s.date + s.activityType} session={s} />
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onLog }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 gap-5">
      <span className="w-16 h-16 rounded-full bg-orange/10 flex items-center justify-center text-orange">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M2 8.5h2M2 15.5h2M20 8.5h2M20 15.5h2"/>
        </svg>
      </span>
      <div className="text-center">
        <p className="text-[16px] font-semibold text-ink1">{t('noWorkoutsYet')}</p>
      </div>
      <button
        onClick={onLog}
        className="rounded-pill bg-orange text-white text-[14px] font-medium px-6 py-[12px] cursor-pointer hover:bg-orange-dk transition-colors"
      >
        {t('logFirstActivity')}
      </button>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Exercise() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.exercise.list()
        setSessions(Array.isArray(res) ? res : (res.data ?? []))
      } catch (err) {
        setError(err.message || 'Failed to load exercise history')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const { thisWeek, lastWeek, older } = groupSessionsByWeek(sessions)
  const hasSessions = sessions.length > 0

  return (
    <div className="min-h-screen bg-page">
      <OrangeHeader
        title={t('exercise')}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M2 8.5h2M2 15.5h2M20 8.5h2M20 15.5h2"/>
          </svg>
        }
      />

      <div className="-mt-[40px] md:mt-0">
        <Wave />
      </div>

      {/* Desktop header */}
      <div className="hidden md:block px-8 pt-7 pb-2 max-w-[720px]">
        <h1 className="font-display text-[28px] text-ink1">{t('exercise')}</h1>
      </div>

      <div className="px-5 md:px-8 pt-2 pb-[100px] md:pb-10 flex flex-col gap-4 max-w-[720px]">
        {loading && (
          <div className="flex flex-col gap-3 mt-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[68px] rounded-[14px] bg-sand animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-[13px] text-[#C05A28] text-center py-8">{error}</p>
        )}

        {!loading && !error && !hasSessions && (
          <EmptyState onLog={() => navigate('/exercise/new')} />
        )}

        {!loading && !error && hasSessions && (
          <>
            <WeekSection label={t('thisWeek')} sessions={thisWeek} />
            <WeekSection label={t('lastWeek')} sessions={lastWeek} />
            {Object.entries(older).map(([label, sArr]) => (
              <WeekSection key={label} label={label} sessions={sArr} />
            ))}
          </>
        )}
      </div>

      <FAB onClick={() => navigate('/exercise/new')} />
    </div>
  )
}
