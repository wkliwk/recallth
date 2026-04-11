import StatStrip from './StatStrip'

export default function OrangeHeader({ title, subtitle, pill, hasStats, avatar, stats = [] }) {
  return (
    <div className="bg-orange px-5 pt-5 pb-4">
      {/* Top row */}
      <div className="flex items-start justify-between">
        {/* Left side: avatar + text */}
        <div className="flex items-center gap-3">
          {avatar && (
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center border-[3px] border-white overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {typeof avatar === 'string' ? (
                <img src={avatar} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                avatar
              )}
            </div>
          )}
          <div>
            <h1 className="text-[17px] font-medium text-white">{title}</h1>
            {subtitle && (
              <p className="text-[8px] text-white/55">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Pill */}
        {pill && (
          <span
            className="rounded-pill border border-white text-white text-[11px] px-3 py-1"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            {pill}
          </span>
        )}
      </div>

      {/* Stats strip */}
      {hasStats && stats.length > 0 && (
        <div className="mt-3">
          <StatStrip stats={stats} />
        </div>
      )}
    </div>
  )
}
