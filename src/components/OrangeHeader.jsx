import StatStrip from './StatStrip'

export default function OrangeHeader({ title, subtitle, pill, hasStats, avatar, stats = [] }) {
  return (
    <div className="bg-orange px-5 pt-12 pb-4">
      {/* Top row */}
      <div className="flex items-start justify-between">
        {/* Left side: avatar + text */}
        <div className="flex items-center gap-3">
          {avatar && (
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.3)' }}
            >
              {typeof avatar === 'string' ? (
                <img src={avatar} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-white text-[18px] font-medium">R</span>
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
