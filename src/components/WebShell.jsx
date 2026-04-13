import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import BottomNav from './BottomNav'
import FloatingChat from './FloatingChat'

const NAV_KEYS = [
  {
    to: '/home',
    key: 'home',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V13h6v8" />
      </svg>
    ),
  },
  {
    to: '/chat',
    key: 'chat',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    to: '/cabinet',
    key: 'cabinet',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 12h18" />
        <path d="M12 3v18" />
      </svg>
    ),
  },
  {
    to: '/schedule',
    key: 'schedule',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/stack-builder',
    key: 'stackBuilder',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    to: '/doctor-prep',
    key: 'doctorPrep',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12 19.79 19.79 0 0 1 1.07 3.37a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
      </svg>
    ),
  },
  {
    to: '/side-effects',
    key: 'sideEffects',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    to: '/history',
    key: 'history',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </svg>
    ),
  },
  {
    to: '/progress',
    key: 'progress',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    to: '/profile',
    key: 'profile',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
]

export default function WebShell({ children }) {
  const { email } = useAuth()
  const { t } = useLanguage()
  const displayName = email ? email.split('@')[0] : 'User'
  const avatarLetter = displayName[0]?.toUpperCase() || 'U'

  return (
    <div className="flex h-screen bg-page overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-border bg-white overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-[10px] bg-orange flex items-center justify-center shrink-0">
            <span className="font-display text-white text-[16px] font-semibold leading-none">R</span>
          </div>
          <span className="font-display text-orange text-[20px] leading-none">Recallth</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_KEYS.map(({ to, key, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-[14px] font-medium transition-colors ${
                  isActive ? 'bg-orange/10 text-orange' : 'text-ink2 hover:bg-sand'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-orange' : 'text-ink3'}>{icon(isActive)}</span>
                  {t(key)}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User strip */}
        <div className="px-4 py-4 border-t border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange flex items-center justify-center shrink-0">
            <span className="text-white text-[14px] font-semibold">{avatarLetter}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink1 truncate">{displayName}</p>
            <p className="text-[11px] text-ink3">{t('freePlan')}</p>
          </div>
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>

      {/* Mobile bottom nav — hidden on md+ where sidebar takes over */}
      <BottomNav />

      {/* FloatingChat available on all authenticated screens */}
      <FloatingChat />
    </div>
  )
}
