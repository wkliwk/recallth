import { api } from '../services/api'
import { lookupQuery, pickLookupMatch, queryFromUrl } from './batchScan'

// Search online (ai-lookup, Google Search grounded) for details the label scan missed.
// Resolves to { dosage, brand, ingredients, description, servingUnits, unitForm, directions } from the
// matching product, or null.
export async function lookupMissingDetails(form, showUsage) {
  const query = lookupQuery(form)
  if (query.length < 2) return null
  const res = await api.cabinet.aiLookup(query)
  if (!res.success || !res.data) return null
  const match = pickLookupMatch(res.data, form.name, { brand: form.brand, strength: form.strength })
  if (res.aiUsage && showUsage) showUsage(res.aiUsage, 'dosage-lookup', { input: query, output: match?.dosage ?? '' })
  if (!match) return null
  return pickFields(match)
}

// Read a product page the user pasted (server-side url-lookup). Many retailers block that
// (e.g. 403), so on failure fall back to a web search built from the link's product slug,
// accepting a result only if it is the same product as `scannedName`.
// Throws with the original server message when neither works.
export async function lookupFromUrl(url, showUsage, scanned = {}) {
  const clean = url.trim()
  try {
    const res = await api.cabinet.urlLookup(clean)
    if (!res.success || !res.data) throw new Error(res.error || 'Could not read that link')
    const p = res.data
    if (res.aiUsage && showUsage) showUsage(res.aiUsage, 'url-lookup', { input: clean, output: p.name ?? '' })
    return pickFields(p)
  } catch (err) {
    const query = queryFromUrl(clean)
    if (query.length >= 6) {
      try {
        const res = await api.cabinet.aiLookup(query)
        const match = res.success && res.data ? pickLookupMatch(res.data, scanned.name, scanned) : null
        if (res.aiUsage && showUsage) showUsage(res.aiUsage, 'url-slug-lookup', { input: query, output: match?.dosage ?? '' })
        if (match) return pickFields(match)
      } catch { /* fall through to the original error */ }
    }
    throw err
  }
}

function pickFields(p) {
  return {
    servingUnits: p.servingUnits ?? null,
    unitForm: p.unitForm ?? null,
    directions: String(p.directions || '').trim(),
    imageUrl: /^https?:\/\//i.test(String(p.imageUrl || '')) ? String(p.imageUrl).trim() : '',
    dosage: String(p.dosage || '').trim(),
    brand: String(p.brand || '').trim(),
    ingredients: String(p.ingredients || '').trim(),
    description: String(p.description || '').trim(),
  }
}
