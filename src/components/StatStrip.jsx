export default function StatStrip({ stats = [] }) {
  return (
    <div className="flex flex-row gap-[10px]">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center rounded-[16px] py-[14px] px-2"
          style={{ background: 'rgba(255,255,255,0.14)' }}
        >
          <span className="text-[24px] font-medium text-white leading-none">{stat.value}</span>
          <span className="text-[10px] uppercase text-white/50 tracking-[0.08em] mt-1">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
