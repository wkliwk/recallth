import { useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import Wave from './Wave'

export default function AppShell({ title, backPath, children }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backPath) {
      navigate(backPath)
    } else {
      navigate(-1)
    }
  }

  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Top bar */}
      <div className="bg-orange px-5 pt-12 pb-4 flex items-center gap-3 shrink-0">
        <button
          onClick={handleBack}
          className="w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.2)' }}
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-[17px] font-medium text-white leading-tight truncate">{title}</h1>
      </div>

      {/* Wave separator */}
      <div className="-mt-[40px] shrink-0">
        <Wave />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-[100px]">
        {children}
      </div>

      <BottomNav />
    </div>
  )
}
