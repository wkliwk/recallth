const EVIDENCE_COLORS = {
  A: { bg: '#D4ECD8', text: '#2C5A38' },
  B: { bg: '#DAE8F8', text: '#1A3A6A' },
  C: { bg: '#FAE8D0', text: '#7A4A1A' },
  D: { bg: '#FDE8DE', text: '#7A2A1A' },
}

function EvidenceBadgeInline({ level }) {
  const c = EVIDENCE_COLORS[level] || EVIDENCE_COLORS.C
  return (
    <span
      className="rounded-pill px-[8px] py-[2px] text-[10px] font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      {level}
    </span>
  )
}

function EvidenceBadgeOverlay({ level }) {
  const c = EVIDENCE_COLORS[level] || EVIDENCE_COLORS.C
  return (
    <span
      className="absolute top-2 right-2 rounded-pill px-[8px] py-[2px] text-[10px] font-bold backdrop-blur-sm"
      style={{ background: `${c.bg}dd`, color: c.text }}
    >
      {level}
    </span>
  )
}

const palette = {
  C: { bg: '#D4ECD8', text: '#2C5A38' },
  H: { bg: '#FAE8D0', text: '#7A4A1A' },
  E: { bg: '#DAE8F8', text: '#1A3A6A' },
  S: { bg: '#E8F4D8', text: '#3A5A1A' },
  W: { bg: '#FDE8DE', text: '#7A2A1A' },
}

export default function SuppCard({ letter, name, meta, dose, evidenceLevel, colors: colorsProp, imageUrl, brand, variant = 'grid', outOfStock = false }) {
  const colors = colorsProp || palette[letter] || palette.C

  if (variant === 'list') {
    return (
      <div className={`bg-white rounded-card border border-border px-4 py-3 flex items-center gap-3 transition-transform hover:translate-x-1 ${outOfStock ? 'opacity-50' : ''}`}>
        {/* Avatar */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-[52px] h-[52px] rounded-[12px] object-cover shrink-0 bg-sand"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div
          className="w-[52px] h-[52px] rounded-[12px] items-center justify-center text-[18px] font-medium shrink-0"
          style={{ background: outOfStock ? '#E8E8E8' : colors.bg, color: outOfStock ? '#999' : colors.text, display: imageUrl ? 'none' : 'flex' }}
        >
          {letter}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold truncate ${outOfStock ? 'text-ink3 line-through' : 'text-ink1'}`}>{name}</p>
          {brand && <p className="text-[11px] text-ink3 mt-[1px] truncate">{brand}</p>}
          <div className="flex items-center gap-2 mt-[3px]">
            {meta && <span className="text-[11px] text-ink3">{meta}</span>}
            {dose && !outOfStock && (
              <span
                className="rounded-pill px-[7px] py-[1px] text-[10px] font-medium"
                style={{ background: colors.bg, color: colors.text }}
              >
                {dose}
              </span>
            )}
            {outOfStock && (
              <span className="rounded-pill px-[7px] py-[1px] text-[10px] font-medium bg-[#E8E8E8] text-[#999]">
                用完
              </span>
            )}
          </div>
        </div>

        {!outOfStock && evidenceLevel && <EvidenceBadgeInline level={evidenceLevel} />}
      </div>
    )
  }

  // Grid variant (default)
  return (
    <div className={`bg-white rounded-card border border-border overflow-hidden transition-transform hover:scale-[1.02] ${outOfStock ? 'opacity-55' : ''}`}>
      {/* Image area */}
      <div className="relative w-full aspect-[4/3] bg-sand">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className={`w-full h-full object-contain p-3 ${outOfStock ? 'grayscale' : ''}`}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div
          className="w-full h-full items-center justify-center text-[32px] font-semibold"
          style={{ background: outOfStock ? '#E8E8E8' : colors.bg, color: outOfStock ? '#aaa' : colors.text, display: imageUrl ? 'none' : 'flex' }}
        >
          {letter}
        </div>
        {outOfStock ? (
          <span className="absolute top-2 right-2 rounded-pill px-[8px] py-[2px] text-[10px] font-bold bg-[#E8E8E8] text-[#888]">
            用完
          </span>
        ) : (
          evidenceLevel && <EvidenceBadgeOverlay level={evidenceLevel} />
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-3 flex flex-col gap-[3px]">
        <p className={`text-[13px] font-semibold line-clamp-2 leading-snug ${outOfStock ? 'text-ink3' : 'text-ink1'}`}>{name}</p>
        {brand && <p className="text-[11px] text-ink3">{brand}</p>}
        {!outOfStock && (
          <div className="flex items-center gap-2 mt-1">
            {dose && (
              <span
                className="rounded-pill px-[7px] py-[2px] text-[10px] font-medium"
                style={{ background: colors.bg, color: colors.text }}
              >
                {dose}
              </span>
            )}
            {meta && <span className="text-[10px] text-ink3 truncate">{meta}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
