export default function StatStrip({ stats = [] }) {
  return (
    <div className="flex flex-row gap-2">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center rounded-[14px] px-[6px] py-2"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <span className="text-[14px] font-medium text-white">{stat.value}</span>
          <span className="text-[6px] uppercase text-white/55">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
