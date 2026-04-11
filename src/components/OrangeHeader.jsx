import StatStrip from './StatStrip'

export default function OrangeHeader({ title, subtitle, pill, onPillClick, hasStats, avatar, stats = [], onBack }) {
  return (
    <div className="bg-orange px-5 pb-4" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top, 3rem))' }}>
      {/* Back button — rendered after safe-area clearance so it is not hidden by status bar */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-white text-[13px] mb-3 cursor-pointer"
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      )}

      {/* Top row */}
      <div className="flex items-start justify-between">
        {/* Left side: avatar + text */}
        <div className="flex items-center gap-3">
          {avatar && (
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.3)' }}
            >
              {typeof avatar === 'string' && avatar.startsWith('http') ? (
                <img src={avatar} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-white text-[18px] font-medium">
                  {typeof avatar === 'string' ? avatar : 'U'}
                </span>
              )}
            </div>
          )}
          <div>
            <h1 className="text-[17px] font-medium text-white leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-[11px] text-white/55 mt-[2px]">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Pill */}
        {pill && (
          <span
            onClick={onPillClick}
            className="rounded-pill border border-white/30 text-white text-[12px] font-medium px-4 py-[6px] cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            {pill}
          </span>
        )}
      </div>

      {/* Stats strip */}
      {hasStats && stats.length > 0 && (
        <div className="mt-4">
          <StatStrip stats={stats} />
        </div>
      )}
    </div>
  )
}
