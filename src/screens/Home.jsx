import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

// ── Colour palette for schedule time slots ──────────────────────────────────
const SLOT_COLOURS = [
  { bg: '#FFFBEB', border: '#FEF3C7', dot: '#D97706' },
  { bg: '#EFF6FF', border: '#BFDBFE', dot: '#2563EB' },
  { bg: '#F5F3FF', border: '#DDD6FE', dot: '#7C3AED' },
  { bg: '#ECFDF5', border: '#A7F3D0', dot: '#059669' },
  { bg: '#FFF1F2', border: '#FECDD3', dot: '#E11D48' },
]

const QUICK_PROMPTS = [
  'Should I take D3 with food?',
  'Check my interactions',
  'Best time for magnesium?',
]

// ── Skeleton primitives ──────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-gray-100 ${className}`}
      aria-hidden="true"
    />
  )
}

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
        {block.items.map((item) => (
          <div key={item.name} className="flex items-center gap-3 px-4 py-[11px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: block.dot }} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink1 truncate">{item.name}</p>
              <p className="text-[11px] text-ink3">{item.dose}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Relative-time helper ─────────────────────────────────────────────────────
function relativeTime(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin || 1} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  return `${diffDay} days ago`
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { email } = useAuth()
  const inputRef = useRef(null)

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const hour = new Date().getHours()
  const greetingWord = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

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
  const [schedule, setSchedule] = useState([])
  const [conversations, setConversations] = useState([])

  const [quickInput, setQuickInput] = useState('')

  // ── Fetch stats ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const [cabinetRes, interactionsRes] = await Promise.allSettled([
          api.cabinet.list(),
          api.cabinet.interactions(),
        ])

        if (cancelled) return

        if (cabinetRes.status === 'fulfilled') {
          const items = cabinetRes.value?.data ?? []
          setSupplementCount(Array.isArray(items) ? items.length : 0)
        }

        if (interactionsRes.status === 'fulfilled') {
          const warnings = interactionsRes.value?.data ?? []
          setConflictCount(Array.isArray(warnings) ? warnings.length : 0)
        }
        // If interactions endpoint unavailable, conflictCount stays 0 (default)
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

        const raw = res?.data ?? []

        if (Array.isArray(raw) && raw.length > 0) {
          // Backend may return grouped blocks or flat items — normalise both
          const blocks = raw.map((block, idx) => {
            const colours = SLOT_COLOURS[idx % SLOT_COLOURS.length]
            // If items are nested under a key, extract them
            const items = Array.isArray(block.items)
              ? block.items.map((it) => ({
                  name: it.name ?? it.supplementName ?? 'Unknown',
                  dose: it.dose ?? it.dosage ?? '',
                }))
              : [{ name: block.name ?? block.supplementName ?? 'Unknown', dose: block.dose ?? block.dosage ?? '' }]

            return {
              label: block.label ?? block.timing ?? block.slot ?? 'Schedule',
              time: block.time ?? block.scheduledTime ?? '',
              bg: colours.bg,
              border: colours.border,
              dot: colours.dot,
              items,
            }
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
        const items = res?.data ?? res ?? []
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
  const STATS = [
    { value: String(supplementCount), label: 'Supplements', color: 'text-ink1' },
    { value: String(conflictCount), label: 'Conflicts', color: 'text-[#059669]' },
    { value: '14d', label: 'Streak', color: 'text-orange' },
    { value: 'AI', label: 'Powered', color: 'text-[#7C3AED]' },
  ]

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[960px]">

        {/* ── Greeting row ── */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[14px] text-ink2 mb-1">{greetingWord}</p>
            <h1 className="font-display text-[32px] text-ink1 leading-none">
              {greetingWord}{displayName ? `, ${displayName}` : ''}
            </h1>
          </div>
          <div className="bg-white border border-border rounded-[10px] px-4 py-2">
            <span className="text-[13px] text-ink2">{today}</span>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-4 gap-3 mb-7">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[82px]" />
              ))
            : STATS.map((s) => (
                <div key={s.label} className="bg-white border border-border rounded-[12px] px-4 py-4 flex flex-col gap-1">
                  <span className={`font-display text-[28px] leading-none ${s.color}`}>{s.value}</span>
                  <span className="text-[12px] uppercase tracking-[0.06em] text-ink3 font-medium">{s.label}</span>
                </div>
              ))}
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 380px' }}>

          {/* Left — Today's schedule */}
          <div>
            <h2 className="text-[15px] font-semibold text-ink1 mb-4">Today's schedule</h2>
            <div className="flex flex-col gap-3">
              {scheduleLoading ? (
                <>
                  <Skeleton className="h-[110px]" />
                  <Skeleton className="h-[90px]" />
                  <Skeleton className="h-[90px]" />
                </>
              ) : schedule.length === 0 ? (
                <div className="rounded-[14px] border border-border bg-white px-6 py-8 text-center">
                  <p className="text-[13px] text-ink2 mb-2">No schedule yet.</p>
                  <Link
                    to="/cabinet"
                    className="text-[13px] text-orange font-medium hover:underline"
                  >
                    Add supplements to see your schedule
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
            <div className="rounded-[14px] border p-5" style={{ background: '#F5F3FF', borderColor: '#DDD6FE' }}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                  style={{ background: '#7C3AED' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ink1">Ask Recallth AI</p>
                  <p className="text-[12px] text-ink2">I remember your full health profile</p>
                </div>
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 bg-white border border-border rounded-[10px] px-3 py-[9px] mb-3">
                <input
                  ref={inputRef}
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Ask about supplements, dosing, interactions…"
                  className="flex-1 text-[13px] text-ink1 placeholder:text-ink4 outline-none bg-transparent"
                  onKeyDown={handleInputKeyDown}
                />
                <button
                  onClick={() => navigateToChat(quickInput.trim() || undefined)}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                  style={{ background: '#7C3AED' }}
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
                    className="w-full text-left text-[12px] text-ink2 bg-white border border-[#DDD6FE] rounded-[8px] px-3 py-[8px] hover:bg-white/80 transition-colors cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent conversations */}
            <div className="bg-white border border-border rounded-[14px] overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-[13px] font-semibold text-ink1">Recent conversations</p>
              </div>

              {conversationsLoading ? (
                <div className="flex flex-col gap-3 px-5 py-4">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-[13px] text-ink2 mb-2">No conversations yet.</p>
                  <Link
                    to="/chat"
                    className="text-[12px] text-orange font-medium hover:underline"
                  >
                    Start your first chat
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((item) => (
                    <button
                      key={item._id}
                      onClick={() => navigate(`/chat?id=${item._id}`)}
                      className="w-full flex items-center gap-3 px-5 py-[13px] hover:bg-sand transition-colors cursor-pointer text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ background: '#F5F3FF' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink1 truncate">{item.title ?? 'Conversation'}</p>
                        <p className="text-[11px] text-ink3">
                          {item.createdAt ? relativeTime(item.createdAt) : ''}
                          {item.messageCount != null ? ` · ${item.messageCount} message${item.messageCount !== 1 ? 's' : ''}` : ''}
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

              <div className="px-5 py-3 border-t border-border">
                <button
                  onClick={() => navigate('/chat')}
                  className="text-[12px] text-orange font-medium hover:underline cursor-pointer"
                >
                  View all conversations →
                </button>
              </div>
            </div>

          </div>
        </div>

    </div>
  )
}
