import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const ACTIVITY_ICONS = {
  running: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="1.5"/>
      <path d="M6 20l3.5-5 2.5 3 3.5-4.5"/>
      <path d="M9 8l-1 4h5l2-4"/>
      <path d="M15 13l2 4"/>
    </svg>
  ),
  swimming: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1.5-1 3-.5 4 .5s2.5 1.5 4 .5 2.5-1.5 4-.5 2.5 1.5 4 .5"/>
      <path d="M2 17c1.5-1 3-.5 4 .5s2.5 1.5 4 .5 2.5-1.5 4-.5 2.5 1.5 4 .5"/>
      <circle cx="14" cy="6" r="1.5"/>
      <path d="M10 8l2-2 3 3-2 3H9l-2-2"/>
    </svg>
  ),
  basketball: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3a9 9 0 0 0 3 6 9 9 0 0 0-3 6"/>
      <path d="M12 3a9 9 0 0 1-3 6 9 9 0 0 1 3 6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  ),
  badminton: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3a9 9 0 0 0 3 6 9 9 0 0 0-3 6"/>
      <path d="M12 3a9 9 0 0 1-3 6 9 9 0 0 1 3 6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  ),
  cycling: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="15" r="4"/>
      <circle cx="18" cy="15" r="4"/>
      <path d="M6 15l4-8h4l2 5"/>
      <circle cx="12" cy="5" r="1"/>
    </svg>
  ),
  yoga: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="1.5"/>
      <path d="M8 22v-4l4-4 4 4v4"/>
      <path d="M4 12c2-4 4-6 8-6s6 2 8 6"/>
    </svg>
  ),
  hiking: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22l5-10 4 5 3-7 6 12"/>
      <circle cx="14" cy="5" r="1.5"/>
    </svg>
  ),
}

const GymIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M2 8.5h2M2 15.5h2M20 8.5h2M20 15.5h2"/>
  </svg>
)

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function activityLabel(type, label, t) {
  if (type === 'other' && label) return label
  const map = {
    gym: t('activityGym'),
    running: t('activityRunning'),
    swimming: t('activitySwimming'),
    basketball: t('activityBasketball'),
    badminton: t('activityBadminton'),
    cycling: t('activityCycling'),
    yoga: t('activityYoga'),
    hiking: t('activityHiking'),
    other: t('activityOther'),
  }
  return map[type] || type
}

function intensityLabel(intensity, t) {
  if (intensity === 'easy') return t('intensityEasy')
  if (intensity === 'moderate') return t('intensityModerate')
  if (intensity === 'hard') return t('intensityHard')
  return intensity || ''
}

function intensityColor(intensity) {
  if (intensity === 'easy') return 'bg-[#4CAF50]/10 text-[#2E7D32]'
  if (intensity === 'moderate') return 'bg-orange/10 text-orange'
  if (intensity === 'hard') return 'bg-[#D32F2F]/10 text-[#C62828]'
  return 'bg-sand text-ink2'
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-sand rounded-[12px] px-4 py-3 flex items-center gap-3">
      <span className="text-orange">{icon}</span>
      <div>
        <p className="text-[11px] text-ink3">{label}</p>
        <p className="text-[15px] font-semibold text-ink1">{value}</p>
      </div>
    </div>
  )
}

export default function ExerciseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await api.exercise.get(id)
        setSession(res.data ?? res)
      } catch {
        setError('Session not found.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.exercise.remove(id)
      navigate('/exercise')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-4">
          <div className="w-9 h-9 rounded-full bg-sand animate-pulse" />
          <div className="h-5 w-32 bg-sand rounded animate-pulse" />
        </div>
        <div className="px-4 flex flex-col gap-4 mt-4">
          <div className="h-28 rounded-[16px] bg-sand animate-pulse" />
          <div className="h-16 rounded-[16px] bg-sand animate-pulse" />
          <div className="h-24 rounded-[16px] bg-sand animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center gap-4">
        <p className="text-[14px] text-ink3">{error || 'Session not found.'}</p>
        <button onClick={() => navigate('/exercise')} className="text-orange text-[14px] font-medium">{t('back')}</button>
      </div>
    )
  }

  const icon = ACTIVITY_ICONS[session.activityType] ?? GymIcon
  const name = activityLabel(session.activityType, session.activityLabel, t)

  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-4 bg-page">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/exercise')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-sand text-ink2"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h1 className="text-[18px] font-semibold text-ink1">{name}</h1>
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-sand text-ink3"
          aria-label="Delete"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-5 max-w-[640px]">

        {/* Hero card */}
        <div className="bg-white rounded-[18px] p-5 shadow-sm flex items-center gap-4">
          <span className="w-14 h-14 rounded-[14px] bg-orange/10 flex items-center justify-center text-orange shrink-0">
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[20px] font-semibold text-ink1 capitalize">{name}</p>
            <p className="text-[13px] text-ink3 mt-[2px]">{formatDate(session.date)}</p>
            <span className={`inline-block mt-2 text-[12px] font-medium px-3 py-[3px] rounded-full capitalize ${intensityColor(session.intensity)}`}>
              {intensityLabel(session.intensity, t)}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>}
            label={t('duration')}
            value={`${session.durationMinutes} min`}
          />
          {session.distanceKm > 0 && (
            <StatCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>}
              label={t('distance')}
              value={`${session.distanceKm} km`}
            />
          )}
        </div>

        {/* Gym exercises */}
        {session.exercises?.length > 0 && (
          <div className="bg-white rounded-[16px] p-4 shadow-sm flex flex-col gap-3">
            <p className="text-[13px] font-semibold text-ink2 uppercase tracking-wide">{t('exercises')}</p>
            {session.exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#EDE8E0] last:border-0">
                <p className="text-[14px] font-medium text-ink1">{ex.name}</p>
                <p className="text-[13px] text-ink3">
                  {ex.sets} × {ex.reps}{ex.weightKg ? ` @ ${ex.weightKg} kg` : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {session.notes && (
          <div className="bg-white rounded-[16px] p-4 shadow-sm">
            <p className="text-[13px] font-semibold text-ink2 uppercase tracking-wide mb-2">{t('notes')}</p>
            <p className="text-[14px] text-ink2 leading-relaxed">{session.notes}</p>
          </div>
        )}
      </div>

      {/* Delete confirmation sheet */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(false)} />
          <div className="relative w-full max-w-[420px] bg-white rounded-t-[24px] md:rounded-[20px] px-5 py-6 flex flex-col gap-4 mx-auto">
            <p className="text-[17px] font-semibold text-ink1 text-center">{t('deleteSession')}</p>
            <p className="text-[14px] text-ink3 text-center">{t('deleteSessionConfirm')}</p>
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-3 rounded-full bg-[#D32F2F] text-white font-semibold text-[15px] disabled:opacity-60"
              >
                {deleting ? t('deleting') : t('deleteConfirmBtn')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full py-3 rounded-full bg-sand text-ink2 font-medium text-[15px]"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
