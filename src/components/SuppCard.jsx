const palette = {
  C: { bg: '#D4ECD8', text: '#2C5A38' },
  H: { bg: '#FAE8D0', text: '#7A4A1A' },
  E: { bg: '#DAE8F8', text: '#1A3A6A' },
  S: { bg: '#E8F4D8', text: '#3A5A1A' },
  W: { bg: '#FDE8DE', text: '#7A2A1A' },
}

export default function SuppCard({ letter, name, meta, dose }) {
  const colors = palette[letter] || palette.C

  return (
    <div className="bg-white rounded-card border border-border px-5 py-[14px] flex items-center gap-3">
      {/* Letter avatar */}
      <div
        className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
        style={{ background: colors.bg, color: colors.text }}
      >
        {letter}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-medium text-ink1 truncate">{name}</p>
        {meta && <p className="text-[8px] text-ink3">{meta}</p>}
      </div>

      {/* Dose badge */}
      {dose && (
        <span
          className="rounded-pill px-[10px] py-[3px] text-[10px] font-medium shrink-0"
          style={{ background: colors.bg, color: colors.text }}
        >
          {dose}
        </span>
      )}
    </div>
  )
}
