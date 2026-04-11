import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

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
      {/* ── Sidebar ── */}
      <aside className="w-[240px] shrink-0 flex flex-col border-r border-border bg-white">
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
        <header className="h-[60px] shrink-0 flex items-center justify-between px-8 border-b border-border bg-white">
          <span className="font-display text-ink1 text-[20px]">{title}</span>

          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search or ask anything…"
                className="w-[320px] bg-page border border-border rounded-[10px] px-4 py-[8px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors"
              />
            </form>

            {/* Bell */}
            <button className="relative w-9 h-9 rounded-[10px] border border-border bg-white flex items-center justify-center hover:bg-sand transition-colors">
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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
