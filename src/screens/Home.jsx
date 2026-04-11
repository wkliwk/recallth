import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'

const SCHEDULE = [
  {
    time: '7:00 AM',
    label: 'Morning',
    color: 'amber',
    bg: '#FFFBEB',
    border: '#FEF3C7',
    dot: '#D97706',
    items: [
      { name: 'Vitamin D3', dose: '5000 IU · with breakfast' },
      { name: 'Omega-3 Fish Oil', dose: '2 g · with breakfast' },
      { name: 'Vitamin B12', dose: '1000 mcg · sublingual' },
    ],
  },
  {
    time: '5:30 PM',
    label: 'Pre-Workout',
    color: 'blue',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    dot: '#2563EB',
    items: [
      { name: 'Creatine', dose: '5 g · with water' },
      { name: 'Magnesium', dose: '500 mg · 30 min before' },
    ],
  },
  {
    time: '9:00 PM',
    label: 'Evening',
    color: 'purple',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    dot: '#7C3AED',
    items: [
      { name: 'Zinc', dose: '15 mg · with food' },
      { name: 'Magnesium Glycinate', dose: '400 mg · before bed' },
    ],
  },
]

const RECENT = [
  { type: 'chat', title: 'B12 timing and absorption', meta: '2 hours ago · 4 messages' },
  { type: 'chat', title: 'Creatine + exercise timing', meta: 'Yesterday · 6 messages' },
  { type: 'cabinet', title: 'Added Omega-3 Fish Oil', meta: '2 days ago' },
]

const STATS = [
  { value: '5', label: 'Supplements', color: 'text-ink1' },
  { value: '0', label: 'Conflicts', color: 'text-[#059669]' },
  { value: '14d', label: 'Streak', color: 'text-orange' },
  { value: 'AI', label: 'Powered', color: 'text-[#7C3AED]' },
]

const QUICK_PROMPTS = [
  'Should I take D3 with food?',
  'Check my interactions',
  'Best time for magnesium?',
]

function ScheduleBlock({ block }) {
  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ borderColor: block.border }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: block.bg, borderBottom: `1px solid ${block.border}` }}>
        <span className="text-[13px] font-semibold text-ink1">{block.label}</span>
        <span className="text-[12px] text-ink3">{block.time}</span>
      </div>
      {/* Pill rows */}
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

export default function Home() {
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <AppShell title="Dashboard">
      <div className="px-8 py-7 max-w-[960px]">

        {/* ── Greeting row ── */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[14px] text-ink2 mb-1">{greeting}</p>
            <h1 className="font-display text-[32px] text-ink1 leading-none">{greeting}, Ricky</h1>
          </div>
          <div className="bg-white border border-border rounded-[10px] px-4 py-2">
            <span className="text-[13px] text-ink2">{today}</span>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-4 gap-3 mb-7">
          {STATS.map((s) => (
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
              {SCHEDULE.map((block) => (
                <ScheduleBlock key={block.label} block={block} />
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Ask AI card */}
            <div className="rounded-[14px] border p-5" style={{ background: '#F5F3FF', borderColor: '#DDD6FE' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: '#7C3AED' }}>
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
                  placeholder="Ask about supplements, dosing, interactions…"
                  className="flex-1 text-[13px] text-ink1 placeholder:text-ink4 outline-none bg-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/chat')}
                />
                <button
                  onClick={() => navigate('/chat')}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                  style={{ background: '#7C3AED' }}
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
                    onClick={() => navigate('/chat')}
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
              <div className="divide-y divide-border">
                {RECENT.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => navigate('/chat')}
                    className="w-full flex items-center gap-3 px-5 py-[13px] hover:bg-sand transition-colors cursor-pointer text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ background: item.type === 'chat' ? '#F5F3FF' : '#ECFDF5' }}
                    >
                      {item.type === 'chat' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.5 1.5l-8 8a5.66 5.66 0 0 0 8 8l8-8a5.66 5.66 0 0 0-8-8z"/>
                          <line x1="6" y1="14" x2="14" y2="6"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink1 truncate">{item.title}</p>
                      <p className="text-[11px] text-ink3">{item.meta}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink4 shrink-0">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border">
                <button onClick={() => navigate('/chat')} className="text-[12px] text-orange font-medium hover:underline cursor-pointer">
                  View all conversations →
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </AppShell>
  )
}
