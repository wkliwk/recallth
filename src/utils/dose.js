export const UNIT_FORMS = ['capsule', 'tablet', 'softgel', 'gummy', 'scoop', 'drop']

export function unitLabel(unitForm, n) {
  const base = UNIT_FORMS.includes(unitForm) ? unitForm : 'unit'
  return Number(n) === 1 ? base : `${base}s`
}

// "2 capsules (500 mg each)", "1 capsule (500 mg each)". '' when the per-dose count is not known —
// we never assume 1.
export function composeDosage({ servingUnits, unitForm, strength }) {
  const n = Number(servingUnits)
  if (!Number.isFinite(n) || n <= 0) return ''
  const s = String(strength || '').trim()
  const base = `${n} ${unitLabel(unitForm, n)}`
  return s ? `${base} (${s} each)` : base
}

// Structured mode: the scan told us the strength per unit, so Dosage is "how many per dose" x strength.
export function isStructured(form) {
  return !form?.dosageFreeText && Boolean(String(form?.strength || '').trim() || String(form?.unitForm || '').trim())
}

// Recompute Dosage from the structured fields (no-op for free-text forms).
export function applyDose(form) {
  return isStructured(form) ? { ...form, dosage: composeDosage(form) } : form
}

// Positive per-dose count from raw input; '' when empty/invalid.
export function parseServingUnits(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const n = Number(s)
  return Number.isFinite(n) && n > 0 && n <= 50 ? String(n) : ''
}
