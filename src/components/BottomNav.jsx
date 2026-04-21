import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const SHORTCUTS = [
  {
    labelKey: 'home',
    path: '/home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V13h6v8" />
      </svg>
    ),
  },
  {
    labelKey: 'chat',
    path: '/chat',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    labelKey: 'cabinet',
    path: '/cabinet',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 12h18" />
        <path d="M12 3v18" />
      </svg>
    ),
  },
  {
    labelKey: 'exercise',
    path: '/exercise',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M2 8.5h2M2 15.5h2M20 8.5h2M20 15.5h2"/>
      </svg>
    ),
  },
]

export default function BottomNav({ onMenuOpen }) {
  const { pathname } = useLocation()
  const { t } = useLanguage()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom,8px)] md:hidden z-30">
      {SHORTCUTS.map((tab) => {
        const active = pathname === tab.path
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className="flex flex-col items-center gap-[3px] no-underline min-w-[56px]"
          >
            <span className={`w-6 h-6 flex items-center justify-center ${active ? 'text-orange' : 'text-ink3'}`}>
              {tab.icon}
            </span>
            <span className={`text-[10px] ${active ? 'text-ink1 font-medium' : 'text-ink3'}`}>
              {t(tab.labelKey)}
            </span>
          </Link>
        )
      })}

      {/* Hamburger — opens full drawer */}
      <button
        onClick={onMenuOpen}
        className="flex flex-col items-center gap-[3px] min-w-[56px] bg-transparent border-none"
        aria-label="Open navigation menu"
      >
        <span className="w-6 h-6 flex items-center justify-center text-ink3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </span>
        <span className="text-[10px] text-ink3">{t('menu')}</span>
      </button>
    </nav>
  )
}
