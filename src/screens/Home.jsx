import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { calcProfileCompleteness, getFirstMissingLabel } from '../utils/profileCompleteness'

// ── Colour palette for schedule time slots ──────────────────────────────────
const SLOT_COLOURS = [
  { bg: '#FDE8DE', border: '#E8C4B0', dot: '#E07B4A' },  // orange
  { bg: '#F2EDE4', border: '#D8D0C4', dot: '#7A6A5A' },  // sand/ink2
  { bg: '#E8E0D4', border: '#C8BCA8', dot: '#2A221A' },  // warm dark
  { bg: '#E8F0E8', border: '#C5D8C5', dot: '#3D6B3D' },  // sage
  { bg: '#FBF9F5', border: '#E8C4B0', dot: '#C05A28' },  // orange-dk
]

// QUICK_PROMPTS are generated inside component to use t()

// ── Skeleton primitives ──────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-sand ${className}`}
      aria-hidden="true"
    />
  )
}

// ── Schedule block component ─────────────────────────────────────────────────
function ScheduleBlock({ block }) {
  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ borderColor: block.border }}>
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-3 gap-2"
        style={{ background: block.bg, borderBottom: `1px solid ${block.border}` }}
      >
        <span className="text-[13px] font-semibold text-ink1 truncate">{block.label}</span>
        <span className="text-[12px] text-ink3 shrink-0">{block.time}</span>
      </div>
      <div className="bg-white divide-y divide-border">
        {block.items.map((item) => (
          <div key={item.name} className="flex items-center gap-3 px-3 sm:px-4 py-[11px] min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: block.dot }} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink1 truncate">{item.name}</p>
              <p className="text-[11px] text-ink3 truncate">{item.dose}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// relativeTime is now inside the component to access t()

// ── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { email } = useAuth()
  const { t } = useLanguage()
  const inputRef = useRef(null)

  function relativeTime(dateStr) {
    const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (diffMin < 60) return t('timeMinAgo', diffMin || 1)
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return t('timeHrAgo', diffHr)
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay === 1) return t('timeYesterday')
    return t('timeDaysAgo', diffDay)
  }

  const hour = new Date().getHours()
  const greetingWord = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening')
  const today = new Date().toLocaleDateString(t('locale'), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Derive display name from email
  const displayName = email
    ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
    : ''

  // ── State ──────────────────────────────────────────────────────────────────
  const [statsLoading, setStatsLoading] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [conversationsLoading, setConversationsLoading] = useState(true)

  const [supplementCount, setSupplementCount] = useState(0)
  const [conflictCount, setConflictCount] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const [schedule, setSchedule] = useState([])
  const [conversations, setConversations] = useState([])

  const [quickInput, setQuickInput] = useState('')
  const [profileCompleteness, setProfileCompleteness] = useState(null)
  const [firstMissingLabel, setFirstMissingLabel] = useState('')

  // ── Fetch stats ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const [cabinetRes, interactionsRes, streakRes, profileRes] = await Promise.allSettled([
          api.cabinet.list(),
          api.cabinet.interactions(),
          api.intake.streak(),
          api.profile.get(),
        ])

        if (cancelled) return

        let cabinetItems = []
        if (cabinetRes.status === 'fulfilled') {
          const items = cabinetRes.value?.data ?? []
          cabinetItems = Array.isArray(items) ? items : []
          setSupplementCount(cabinetItems.length)
        }

        if (interactionsRes.status === 'fulfilled') {
          const ixData = interactionsRes.value?.data
          const warnings = Array.isArray(ixData) ? ixData : ixData?.interactions ?? []
          setConflictCount(Array.isArray(warnings) ? warnings.length : 0)
        }
        if (streakRes.status === 'fulfilled') {
          setStreakDays(streakRes.value?.currentStreak ?? 0)
        }

        if (profileRes.status === 'fulfilled') {
          const profile = profileRes.value?.data ?? null
          const { percentage, missingSections } = calcProfileCompleteness(profile, cabinetItems)
          setProfileCompleteness(percentage)
          setFirstMissingLabel(getFirstMissingLabel(missingSections))
        }
      } catch {
        // silently degrade
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [])

  // ── Fetch schedule ─────────────────────────────────────────────────────────
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
          const blocks = Object.entries(SLOT_LABELS)
            .filter(([key]) => Array.isArray(scheduleObj[key]) && scheduleObj[key].length > 0)
            .map(([key, label], idx) => {
              const colours = SLOT_COLOURS[idx % SLOT_COLOURS.length]
              const items = scheduleObj[key].map((it) => ({
                name: it.name ?? t('unknown'),
                dose: it.dosage ?? it.dose ?? '',
              }))
              return { label, time: '', bg: colours.bg, border: colours.border, dot: colours.dot, items }
            })
          setSchedule(blocks)
        } else if (Array.isArray(scheduleObj) && scheduleObj.length > 0) {
          const blocks = scheduleObj.map((block, idx) => {
            const colours = SLOT_COLOURS[idx % SLOT_COLOURS.length]
            const items = Array.isArray(block.items)
              ? block.items.map((it) => ({ name: it.name ?? t('unknown'), dose: it.dosage ?? '' }))
              : [{ name: block.name ?? t('unknown'), dose: block.dosage ?? '' }]
            return { label: block.label ?? block.timing ?? t('schedule'), time: block.time ?? '', bg: colours.bg, border: colours.border, dot: colours.dot, items }
          })
          setSchedule(blocks)
        } else {
          setSchedule([])
        }
      } catch {
        setSchedule([])
      } finally {
        if (!cancelled) setScheduleLoading(false)
      }
    }

    fetchSchedule()
    return () => { cancelled = true }
  }, [])

  // ── Fetch recent conversations ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchConversations() {
      try {
        const res = await api.chat.history()
        if (cancelled) return
        const items = res?.data?.conversations ?? res?.data ?? []
        setConversations(Array.isArray(items) ? items.slice(0, 3) : [])
      } catch {
        setConversations([])
      } finally {
        if (!cancelled) setConversationsLoading(false)
      }
    }

    fetchConversations()
    return () => { cancelled = true }
  }, [])

  // ── Navigation helpers ─────────────────────────────────────────────────────
  function navigateToChat(query) {
    if (query) {
      navigate(`/chat?q=${encodeURIComponent(query)}`)
    } else {
      navigate('/chat')
    }
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && quickInput.trim()) {
      navigateToChat(quickInput.trim())
    }
  }

  // ── Stats data ─────────────────────────────────────────────────────────────
  const QUICK_PROMPTS = [t('quickPrompt1'), t('quickPrompt2'), t('quickPrompt3')]

  const STATS = [
    { value: String(supplementCount), label: t('statsSupplements'), color: 'text-ink1' },
    { value: String(conflictCount), label: t('statsConflicts'), color: 'text-ink2' },
    { value: `${streakDays}d`, label: t('statsStreak'), color: 'text-orange' },
    { value: 'AI', label: t('statsPowered'), color: 'text-orange' },
  ]

  return (
    <div className="px-4 py-6 sm:px-5 md:px-8 md:py-7 max-w-[960px] mx-auto w-full">

        {/* ── Greeting row ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <p className="text-[14px] text-ink2 mb-1">{greetingWord}</p>
            <h1 className="font-display text-[28px] sm:text-[32px] text-ink1 leading-none">
              {displayName || 'there'}
            </h1>
          </div>
          <div className="bg-white border border-border rounded-[10px] px-4 py-2 whitespace-nowrap">
            <span className="text-[13px] text-ink2">{today}</span>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[82px]" />
              ))
            : STATS.map((s) => (
                <div key={s.label} className="bg-white border border-border rounded-[12px] px-3 py-4 sm:px-4 flex flex-col gap-1">
                  <span className={`font-display text-[24px] sm:text-[28px] leading-none ${s.color}`}>{s.value}</span>
                  <span className="text-[11px] sm:text-[12px] uppercase tracking-[0.03em] sm:tracking-[0.06em] text-ink3 font-medium">{s.label}</span>
                </div>
              ))}
        </div>

        {/* ── Profile completeness nudge ── */}
        {profileCompleteness !== null && profileCompleteness < 100 && (
          <button
            onClick={() => navigateToChat(`Tell me about my ${firstMissingLabel}`)}
            className="w-full bg-orange-lt border border-orange-md rounded-[14px] px-4 py-4 mb-6 flex items-center gap-3 cursor-pointer hover:bg-orange-lt/80 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-orange/15 flex items-center justify-center shrink-0">
              <span className="text-[16px] font-semibold text-orange">{profileCompleteness}%</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink1">
                {t('profileCompletenessLabel')}
              </p>
              <p className="text-[12px] text-ink2 truncate">
                {t('profileCompleteTellMe')} {firstMissingLabel}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink4 shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}

        {/* ── What can I help with? ── */}
        <div className="mb-6">
          <h2 className="text-[15px] font-semibold text-ink1 mb-3">{t('whatCanIHelp')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => navigateToChat(t('promptCheckStackDesc'))}
              className="rounded-xl bg-orange-lt border border-orange-md px-4 py-4 text-left cursor-pointer hover:bg-orange-lt/70 transition-colors"
            >
              <p className="text-[13px] font-bold text-orange-dk">{t('promptCheckStack')}</p>
              <p className="text-[12px] text-ink2 italic mt-1">{t('promptCheckStackDesc')}</p>
            </button>
            <button
              onClick={() => navigateToChat(t('promptUpdateHealthDesc'))}
              className="rounded-xl bg-[#E0F0FF] border border-[#B0D4F1] px-4 py-4 text-left cursor-pointer hover:bg-[#E0F0FF]/70 transition-colors"
            >
              <p className="text-[13px] font-bold text-[#2B5F8A]">{t('promptUpdateHealth')}</p>
              <p className="text-[12px] text-ink2 italic mt-1">{t('promptUpdateHealthDesc')}</p>
            </button>
            <button
              onClick={() => navigateToChat(t('promptPeriodicReviewDesc'))}
              className="rounded-xl bg-[#D4ECD8] border border-[#B6DFC5] px-4 py-4 text-left cursor-pointer hover:bg-[#D4ECD8]/70 transition-colors"
            >
              <p className="text-[13px] font-bold text-[#2C5A38]">{t('promptPeriodicReview')}</p>
              <p className="text-[12px] text-ink2 italic mt-1">{t('promptPeriodicReviewDesc')}</p>
            </button>
          </div>
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_380px]">

          {/* Left — Today's schedule */}
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink1 mb-4">{t('todaySchedule')}</h2>
            <div className="flex flex-col gap-3">
              {scheduleLoading ? (
                <>
                  <Skeleton className="h-[110px]" />
                  <Skeleton className="h-[90px]" />
                  <Skeleton className="h-[90px]" />
                </>
              ) : schedule.length === 0 ? (
                <div className="rounded-[14px] border border-border bg-white px-4 sm:px-6 py-8 text-center overflow-hidden">
                  <p className="text-[13px] text-ink2 mb-2">{t('noScheduleYet')}</p>
                  <Link
                    to="/cabinet"
                    className="text-[13px] text-orange font-medium hover:underline"
                  >
                    {t('addSuppsForSchedule')}
                  </Link>
                </div>
              ) : (
                schedule.map((block) => (
                  <ScheduleBlock key={`${block.label}-${block.time}`} block={block} />
                ))
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Ask AI card */}
            <div className="rounded-[14px] border p-4 sm:p-5 overflow-hidden" style={{ background: '#FDE8DE', borderColor: '#E8C4B0' }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mb-4 gap-2">
                <div
                  className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                  style={{ background: '#E07B4A' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ink1">{t('askAI')}</p>
                  <p className="text-[12px] text-ink2">{t('askAISubtitle')}</p>
                </div>
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 bg-white border border-border rounded-[10px] px-3 py-[9px] mb-3 overflow-hidden">
                <input
                  ref={inputRef}
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder={t('askPlaceholder')}
                  className="flex-1 min-w-0 text-[13px] text-ink1 placeholder:text-ink4 outline-none bg-transparent"
                  onKeyDown={handleInputKeyDown}
                />
                <button
                  onClick={() => navigateToChat(quickInput.trim() || undefined)}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                  style={{ background: '#E07B4A' }}
                  aria-label="Send"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"/>
                    <polyline points="5 12 12 5 19 12"/>
                  </svg>
                </button>
              </div>

              {/* Quick prompts */}
              <div className="flex flex-col gap-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => navigateToChat(p)}
                    className="w-full text-left text-[12px] text-ink2 bg-white border border-border rounded-[8px] px-3 py-[8px] hover:bg-white/80 transition-colors cursor-pointer truncate"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent conversations */}
            <div className="bg-white border border-border rounded-[14px] overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-border">
                <p className="text-[13px] font-semibold text-ink1">{t('recentConversations')}</p>
              </div>

              {conversationsLoading ? (
                <div className="flex flex-col gap-3 px-4 sm:px-5 py-4">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-4 sm:px-5 py-8 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-orange/10 flex items-center justify-center mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E07B4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <p className="text-[13px] text-ink2 font-medium mb-1">{t('noConversationsYet')}</p>
                  <Link
                    to="/chat"
                    className="text-[12px] text-orange font-medium hover:underline"
                  >
                    {t('startFirstChat')}
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((item) => (
                    <button
                      key={item._id}
                      onClick={() => navigate(`/chat?id=${item._id}`)}
                      className="w-full flex items-center gap-3 px-4 sm:px-5 py-[13px] hover:bg-sand transition-colors cursor-pointer text-left overflow-hidden"
                    >
                      <div
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ background: '#FDE8DE' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E07B4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink1 truncate">{item.title ?? t('conversationFallback')}</p>
                        <p className="text-[11px] text-ink3 truncate">
                          {item.createdAt ? relativeTime(item.createdAt) : ''}
                          {item.messageCount != null ? ` · ${item.messageCount} ${t('msgs')}` : ''}
                        </p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink4 shrink-0">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 sm:px-5 py-3 border-t border-border">
                <button
                  onClick={() => navigate('/chat')}
                  className="text-[12px] text-orange font-medium hover:underline cursor-pointer"
                >
                  {t('viewAllConversations')}
                </button>
              </div>
            </div>

          </div>
        </div>

    </div>
  )
}
