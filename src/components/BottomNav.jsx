import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function BottomNav() {
  const { pathname } = useLocation()
  const { t } = useLanguage()

  const tabs = [
    { labelKey: 'home', path: '/home' },
    { labelKey: 'chat', path: '/chat' },
    { labelKey: 'cabinet', path: '/cabinet' },
    { labelKey: 'profile', path: '/profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-page border-t border-border flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom,8px)] md:hidden z-50">
      {tabs.map((tab) => {
        const active = pathname === tab.path

        return (
          <Link
            key={tab.path}
            to={tab.path}
            className="flex flex-col items-center gap-1 no-underline"
          >
            {active ? (
              <span className="w-5 h-5 rounded-full bg-orange-lt flex items-center justify-center">
                <span className="w-[6px] h-[6px] rounded-full bg-orange" />
              </span>
            ) : (
              <span className="w-5 h-5 flex items-center justify-center">
                <span className="w-[6px] h-[6px] rounded-full bg-ink3" />
              </span>
            )}

            <span className={`text-[10px] ${active ? 'text-ink1 font-medium' : 'text-ink3'}`}>
              {t(tab.labelKey)}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
