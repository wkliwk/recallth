import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import FloatingChat from './FloatingChat'

const NAV = [
  {
    to: '/home',
    label: 'Home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V13h6v8"/>
      </svg>
    ),
  },
  {
    to: '/chat',
    label: 'Chat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    ),
  },
  {
    to: '/cabinet',
    label: 'Cabinet',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M3 12h18"/>
        <path d="M12 3v18"/>
      </svg>
    ),
  },
  {
    to: '/schedule',
    label: 'Schedule',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    to: '/stack-builder',
    label: 'Stack Builder',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    to: '/doctor-prep',
    label: 'Doctor Prep',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12 19.79 19.79 0 0 1 1.07 3.37a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="12 7 12 12 15 15"/>
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M20 21a8 8 0 0 0-16 0"/>
      </svg>
    ),
  },
]

export default function AppShell({ children, title = 'Dashboard' }) {
  const navigate = useNavigate()
  const [searchVal, setSearchVal] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchVal.trim()) navigate('/chat')
  }

  return (
    <div className="flex h-screen bg-page overflow-hidden">
      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-border bg-white overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-[10px] bg-orange flex items-center justify-center shrink-0">
            <span className="font-display text-white text-[16px] font-semibold leading-none">R</span>
          </div>
          <span className="font-display text-orange text-[20px] leading-none">Recallth</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'bg-orange/10 text-orange'
                    : 'text-ink2 hover:bg-sand'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-orange' : 'text-ink3'}>{icon}</span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange flex items-center justify-center shrink-0">
            <span className="text-white text-[14px] font-semibold">R</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink1 truncate">Ricky</p>
            <p className="text-[11px] text-ink3">Free plan</p>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[60px] shrink-0 flex items-center justify-between px-5 md:px-8 border-b border-border bg-white">
          <span className="font-display text-ink1 text-[20px]">{title}</span>

          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search or ask anything…"
                className="w-[280px] bg-page border border-border rounded-[10px] px-4 py-[8px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors"
              />
            </form>

            {/* Bell */}
            <button className="w-9 h-9 rounded-[10px] border border-border bg-white flex items-center justify-center hover:bg-sand transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-orange flex items-center justify-center cursor-pointer">
              <span className="text-white text-[13px] font-semibold">R</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto pb-[72px] md:pb-0">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom,8px)] z-40">
        {[
          { to: '/home', label: 'Home' },
          { to: '/chat', label: 'Chat' },
          { to: '/cabinet', label: 'Cabinet' },
          { to: '/profile', label: 'Profile' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 no-underline ${isActive ? 'text-ink1' : 'text-ink3'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`w-5 h-5 flex items-center justify-center`}>
                  {isActive
                    ? <span className="w-5 h-5 rounded-full bg-orange-lt flex items-center justify-center"><span className="w-[6px] h-[6px] rounded-full bg-orange" /></span>
                    : <span className="w-[6px] h-[6px] rounded-full bg-ink3" />
                  }
                </span>
                <span className={`text-[10px] ${isActive ? 'font-medium text-ink1' : 'text-ink3'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Floating chat FAB + panel ── */}
      <FloatingChat />
    </div>
  )
}
