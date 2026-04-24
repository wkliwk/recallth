import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FAB from '../components/FAB'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { useChatPage } from '../context/ChatPageContext'

// ── Activity config ────────────────────────────────────────────────────────────
const ACTIVITY_TYPES = ['gym', 'running', 'swimming', 'basketball', 'badminton', 'cycling', 'yoga', 'hiking', 'other']

function activityLabel(type, t) {
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

function groupByDate(sessions) {
  const groups = []
  const map = {}
  for (const s of sessions) {
    if (!map[s.date]) {
      map[s.date] = []
      groups.push({ date: s.date, sessions: map[s.date] })
    }
    map[s.date].push(s)
  }
  return groups
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

// ── Activity icon ─────────────────────────────────────────────────────────────
function ActivityIcon({ type, size = 20 }) {
  const t = (type || '').toLowerCase()
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }

  if (t === 'running') return (
    <svg {...props}>
      <circle cx="13" cy="4" r="1.5"/>
      <path d="M6 20l3.5-5 2.5 3 3.5-4.5"/>
      <path d="M9 8l-1 4h5l2-4"/>
      <path d="M15 13l2 4"/>
    </svg>
  )
  if (t === 'swimming') return (
    <svg {...props}>
      <path d="M2 12c1.5-1 3-.5 4 .5s2.5 1.5 4 .5 2.5-1.5 4-.5 2.5 1.5 4 .5"/>
      <path d="M2 17c1.5-1 3-.5 4 .5s2.5 1.5 4 .5 2.5-1.5 4-.5 2.5 1.5 4 .5"/>
      <circle cx="14" cy="6" r="1.5"/>
      <path d="M10 8l2-2 3 3-2 3H9l-2-2"/>
    </svg>
  )
  if (t === 'basketball' || t === 'badminton') return (
    <svg {...props}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3a9 9 0 0 0 3 6 9 9 0 0 0-3 6"/>
      <path d="M12 3a9 9 0 0 1-3 6 9 9 0 0 1 3 6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  )
  if (t === 'cycling') return (
    <svg {...props}>
      <circle cx="6" cy="15" r="4"/>
      <circle cx="18" cy="15" r="4"/>
      <path d="M6 15l4-8h4l2 5"/>
      <circle cx="12" cy="5" r="1"/>
    </svg>
  )
  if (t === 'yoga') return (
    <svg {...props}>
      <circle cx="12" cy="4" r="1.5"/>
      <path d="M8 22v-4l4-4 4 4v4"/>
      <path d="M4 12c2-4 4-6 8-6s6 2 8 6"/>
    </svg>
  )
  if (t === 'hiking') return (
    <svg {...props}>
      <path d="M3 22l5-10 4 5 3-7 6 12"/>
      <circle cx="14" cy="5" r="1.5"/>
    </svg>
  )
  if (t === 'other') return (
    <svg {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
  // default: gym / dumbbell
  return (
    <svg {...props}>
      <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M2 8.5h2M2 15.5h2M20 8.5h2M20 15.5h2"/>
    </svg>
  )
}

// ── Intensity badge ───────────────────────────────────────────────────────────
function IntensityBadge({ intensity, t }) {
  const i = (intensity || '').toLowerCase()
  let bg = 'bg-[#4CAF50]/15 text-[#2E7D32]'
  if (i === 'moderate') bg = 'bg-orange/15 text-orange'
  if (i === 'hard') bg = 'bg-[#D32F2F]/15 text-[#C62828]'
  return (
    <span className={`text-[10px] font-medium px-2 py-[2px] rounded-full ${bg}`}>
      {intensityLabel(intensity, t)}
    </span>
  )
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ session, onClick, hideDate, t }) {
  const label = session.activityType === 'other' && session.activityLabel
    ? session.activityLabel
    : activityLabel(session.activityType, t)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-[14px] px-4 py-3 flex items-center gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-shadow cursor-pointer"
    >
      <span className="w-9 h-9 rounded-full bg-orange/10 flex items-center justify-center text-orange shrink-0">
        <ActivityIcon type={session.activityType} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink1 capitalize leading-tight">{label}</p>
        {!hideDate && <p className="text-[12px] text-ink3 mt-[2px]">{formatCardDate(session.date)}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {session.durationMinutes > 0 && (
          <p className="text-[12px] text-ink2 font-medium">{session.durationMinutes} min</p>
        )}
        {session.intensity && <IntensityBadge intensity={session.intensity} t={t} />}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink4 shrink-0">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}

// ── Week section ──────────────────────────────────────────────────────────────
function WeekSection({ label, sessions, onCardClick, t }) {
  if (!sessions || sessions.length === 0) return null
  const groups = groupByDate(sessions)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] font-medium text-ink3 uppercase tracking-wide px-1">{label}</p>
      <div className="flex flex-col gap-4">
        {groups.map(({ date, sessions: daySessions }) => (
          <div key={date} className="flex flex-col gap-2">
            <p className="text-[12px] font-semibold text-ink2 px-1">{formatCardDate(date)}</p>
            {daySessions.map((s) => (
              <SessionCard
                key={s._id || s.id || s.date + s.activityType}
                session={s}
                onClick={() => onCardClick(s._id || s.id)}
                hideDate
                t={t}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AI Plan Modal ─────────────────────────────────────────────────────────────
function AiPlanModal({ plan, onConfirm, onDismiss, confirming, t }) {
  if (!plan) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-0 md:px-5">
      <div className="w-full md:max-w-[480px] bg-white rounded-t-[24px] md:rounded-[20px] px-5 pt-5 pb-8 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center text-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <div>
              <p className="text-[15px] font-semibold text-ink1">AI 建議聽日計劃</p>
              <p className="text-[11px] text-ink3">{plan.date}</p>
            </div>
          </div>
          <button onClick={onDismiss} className="w-7 h-7 flex items-center justify-center rounded-full bg-sand text-ink3 hover:bg-border transition-colors cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {plan.sessions.map((s, i) => (
            <div key={i} className="bg-sand rounded-[14px] px-4 py-3 flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center text-orange shrink-0 mt-[1px]">
                <ActivityIcon type={s.activityType} size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-medium text-ink1 capitalize">{s.activityType}</p>
                  <span className="text-[11px] text-ink3">{s.durationMinutes} min</span>
                  <IntensityBadge intensity={s.intensity} t={t} />
                </div>
                {s.notes && <p className="text-[12px] text-ink3 mt-1 leading-snug">{s.notes}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 rounded-full border border-border text-ink2 text-[14px] font-medium hover:bg-sand transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 py-3 rounded-full bg-orange text-white text-[14px] font-semibold hover:bg-orange-dk transition-colors cursor-pointer disabled:opacity-60"
          >
            {confirming ? '加入中…' : '加到計劃'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Quick AI action pills ─────────────────────────────────────────────────────
function QuickActions({ sessions, openChat, onPlanAdded }) {
  const { t } = useLanguage()
  const [planLoading, setPlanLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState(null)

  function handleAnalyze() {
    const today = new Date().toISOString().slice(0, 10)
    const todaySessions = sessions.filter(s => s.date === today)
    let msg
    if (todaySessions.length === 0) {
      msg = '請根據我最近嘅運動記錄，分析我嘅訓練表現，幫我指出有咩好嘅地方同可以改善嘅地方。用廣東話回覆。'
    } else {
      const lines = todaySessions.map(s => `- ${s.activityType}${s.durationMinutes ? ` ${s.durationMinutes} 分鐘` : ''}${s.intensity ? `（${s.intensity}）` : ''}`).join('\n')
      msg = `請分析我今日（${today}）嘅運動表現，幫我指出表現幾好同有咩可以改善。用廣東話回覆。\n\n今日訓練：\n${lines}`
    }
    openChat(msg)
  }

  async function handlePlanTomorrow() {
    setPlanLoading(true)
    try {
      const res = await api.exercise.aiPlan()
      const data = res.data ?? res
      setPlan(data)
    } catch {
      setToast('AI 計劃生成失敗，請稍後再試')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setPlanLoading(false)
    }
  }

  async function handleConfirmPlan() {
    if (!plan) return
    setConfirming(true)
    try {
      const sessionsToAdd = plan.sessions.map(s => ({
        ...s,
        date: plan.date,
        status: 'planned',
      }))
      await api.exercise.bulk(sessionsToAdd)
      setPlan(null)
      onPlanAdded()
      setToast(`✓ ${sessionsToAdd.length} 個計劃加入成功`)
      setTimeout(() => setToast(null), 3000)
    } catch {
      setToast('加入計劃失敗，請稍後再試')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <>
      {plan && (
        <AiPlanModal
          plan={plan}
          onConfirm={handleConfirmPlan}
          onDismiss={() => setPlan(null)}
          confirming={confirming}
          t={t}
        />
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-ink1 text-white text-[13px] font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleAnalyze}
          className="flex items-center gap-[6px] px-3 py-[7px] rounded-full bg-orange/10 text-orange text-[12px] font-medium hover:bg-orange/20 transition-colors cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          分析今日表現
        </button>
        <button
          onClick={handlePlanTomorrow}
          disabled={planLoading}
          className="flex items-center gap-[6px] px-3 py-[7px] rounded-full bg-sand text-ink2 text-[12px] font-medium hover:bg-border transition-colors cursor-pointer disabled:opacity-60"
        >
          {planLoading ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          )}
          {planLoading ? 'AI 生成中…' : 'AI 計劃聽日'}
        </button>
      </div>
    </>
  )
}

// ── Planned session card ──────────────────────────────────────────────────────
function PlannedSessionCard({ session, onStart, onDelete, t }) {
  const label = session.activityType === 'other' && session.activityLabel
    ? session.activityLabel
    : activityLabel(session.activityType, t)
  return (
    <div className="w-full text-left bg-orange/5 border border-orange/25 rounded-[14px] px-4 py-3 flex items-center gap-3">
      <span className="w-9 h-9 rounded-full bg-orange/15 flex items-center justify-center text-orange shrink-0">
        <ActivityIcon type={session.activityType} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-medium text-ink1 capitalize leading-tight">{label}</p>
          <span className="text-[10px] font-medium px-[6px] py-[2px] rounded-full bg-orange/15 text-orange">計劃中</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {session.durationMinutes > 0 && (
          <p className="text-[12px] text-ink2 font-medium">{session.durationMinutes} min</p>
        )}
        {session.intensity && <IntensityBadge intensity={session.intensity} t={t} />}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-sand text-ink3 hover:bg-[#fde8e8] hover:text-[#C62828] transition-colors cursor-pointer"
          aria-label="刪除計劃"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
        <button
          onClick={onStart}
          className="bg-orange text-white rounded-[8px] px-[10px] py-[5px] text-[12px] font-medium flex items-center gap-1 hover:bg-orange-dk transition-colors cursor-pointer"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          開始
        </button>
      </div>
    </div>
  )
}

// ── Weekly summary ────────────────────────────────────────────────────────────
function WeeklySummary({ sessions, t }) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const thisWeekStart = startOfWeek(now)
  const thisWeekSessions = sessions.filter(s => new Date(s.date + 'T00:00:00') >= thisWeekStart)
  const totalMin = thisWeekSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0)
  if (thisWeekSessions.length === 0) return null
  return (
    <div className="bg-orange/8 rounded-[14px] px-4 py-3 flex items-center gap-4">
      <span className="text-orange">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </span>
      <div className="flex gap-4">
        <div className="text-center">
          <p className="text-[20px] font-semibold text-orange leading-none">{thisWeekSessions.length}</p>
          <p className="text-[11px] text-ink3 mt-[2px]">{t('weekSessions')}</p>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-[20px] font-semibold text-orange leading-none">{totalMin}</p>
          <p className="text-[11px] text-ink3 mt-[2px]">{t('weekMinutes')}</p>
        </div>
      </div>
    </div>
  )
}

// ── Filter chips ──────────────────────────────────────────────────────────────
function FilterChips({ sessions, active, onChange, t }) {
  const typesInData = [...new Set(sessions.map(s => s.activityType))].filter(Boolean)
  if (typesInData.length < 2) return null
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange('all')}
        className={`px-3 py-[5px] rounded-full text-[12px] font-medium transition-colors ${active === 'all' ? 'bg-orange text-white' : 'bg-sand text-ink2'}`}
      >
        {t('filterAll')}
      </button>
      {typesInData.map(type => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`px-3 py-[5px] rounded-full text-[12px] font-medium transition-colors flex items-center gap-[5px] ${active === type ? 'bg-orange text-white' : 'bg-sand text-ink2'}`}
        >
          <span className={active === type ? 'text-white' : 'text-ink3'}>
            <ActivityIcon type={type} size={13} />
          </span>
          {activityLabel(type, t)}
        </button>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onLog, t }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 gap-5">
      <span className="w-16 h-16 rounded-full bg-orange/10 flex items-center justify-center text-orange">
        <ActivityIcon type="gym" size={32} />
      </span>
      <div className="text-center">
        <p className="text-[16px] font-semibold text-ink1">{t('noWorkoutsYet')}</p>
        <p className="text-[13px] text-ink3 mt-1">{t('logFirstActivityHint')}</p>
      </div>
      <button
        onClick={onLog}
        className="bg-orange text-white text-[14px] font-medium px-6 py-3 rounded-full"
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
  const { openChat } = useChatPage()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

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

  useEffect(() => {
    load()
  }, [])

  const planned = sessions.filter(s => s.status === 'planned')
  const completed = sessions.filter(s => s.status !== 'planned')
  const filtered = filter === 'all' ? completed : completed.filter(s => s.activityType === filter)
  const { thisWeek, lastWeek, older } = groupSessionsByWeek(filtered)
  const hasSessions = sessions.length > 0

  return (
    <div className="min-h-screen bg-page">
      {/* Mobile-only orange header */}
      <div className="md:hidden">
        <div className="bg-orange px-5 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-8 flex items-center gap-3">
          <span className="text-white">
            <ActivityIcon type="gym" size={22} />
          </span>
          <h1 className="text-white text-[20px] font-semibold">{t('exercise')}</h1>
        </div>
        <div className="h-8 bg-page -mt-4 rounded-t-[24px]" />
      </div>

      {/* Desktop header */}
      <div className="hidden md:block px-8 pt-8 pb-2 max-w-[800px]">
        <h1 className="font-display text-[28px] text-ink1">{t('exercise')}</h1>
      </div>

      <div className="px-5 md:px-8 pt-2 pb-[100px] md:pb-10 flex flex-col gap-5 max-w-[800px]">

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
          <EmptyState onLog={() => navigate('/exercise/new')} t={t} />
        )}

        {!loading && !error && hasSessions && (
          <>
            <WeeklySummary sessions={completed} t={t} />
            <QuickActions sessions={completed} openChat={openChat} onPlanAdded={load} />
            <FilterChips sessions={completed} active={filter} onChange={setFilter} t={t} />

            {/* UPCOMING — real planned sessions */}
            {planned.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[12px] font-medium text-ink3 uppercase tracking-wide px-1">即將到來</p>
                {planned.map(s => (
                  <PlannedSessionCard
                    key={s._id}
                    session={s}
                    onStart={() => navigate(`/exercise/new?plan=${s._id}`)}
                    onDelete={async () => {
                      try {
                        await api.exercise.remove(s._id)
                        setSessions(prev => prev.filter(x => x._id !== s._id))
                      } catch { /* silent — list will refresh on next load */ }
                    }}
                    t={t}
                  />
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <p className="text-[13px] text-ink3 text-center py-8">{t('noSessionsForFilter')}</p>
            ) : (
              <>
                <WeekSection label={t('thisWeek')} sessions={thisWeek} onCardClick={id => navigate(`/exercise/${id}`)} t={t} />
                <WeekSection label={t('lastWeek')} sessions={lastWeek} onCardClick={id => navigate(`/exercise/${id}`)} t={t} />
                {Object.entries(older).map(([label, sArr]) => (
                  <WeekSection key={label} label={label} sessions={sArr} onCardClick={id => navigate(`/exercise/${id}`)} t={t} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      <FAB onClick={() => navigate('/exercise/new')} />
    </div>
  )
}
