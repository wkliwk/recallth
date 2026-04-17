// ── Feature flags ─────────────────────────────────────────────────────────────
// Default values are the "off" state for every flag.
// Override at runtime via browser console:
//   localStorage.setItem('ff_NUTRITION_V2', 'true')  → enable
//   localStorage.setItem('ff_NUTRITION_V2', 'false') → disable

const DEFAULTS = {
  NUTRITION_V2: false, // New nutrition tracker UI (redesign #149)
}

export function getFlag(name) {
  try {
    const stored = localStorage.getItem(`ff_${name}`)
    if (stored !== null) return stored === 'true'
  } catch {}
  return DEFAULTS[name] ?? false
}

export function setFlag(name, value) {
  try {
    localStorage.setItem(`ff_${name}`, String(Boolean(value)))
  } catch {}
}
