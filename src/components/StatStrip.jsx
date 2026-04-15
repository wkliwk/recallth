export default function StatStrip({ stats = [] }) {
  return (
    <div className="flex flex-row gap-2">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center rounded-[12px] py-[10px] px-2"
          style={{ background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(8px)' }}
        >
          <span className="text-[20px] font-semibold text-white leading-none">{stat.value}</span>
          <span className="text-[9px] uppercase text-white/70 tracking-[0.06em] mt-[4px] font-medium">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
