import { api } from '../services/api'
import { lookupQuery, pickLookupMatch, queryFromUrl, foundFromIdentify } from './batchScan'

// Look the product up online. With the label photo (`photo` = { imageBase64, mimeType }) the backend identifies the
// exact product from the picture + Google Search and returns the manufacturer's per-dose directions (far more
// reliable than matching OCR'd text, esp. non-English labels); if that is unsure/fails we fall back to the text
// search (ai-lookup). Resolves to { dosage, brand, ingredients, description, servingUnits, unitForm, directions,
// sourceUrl, imageUrl } or null.
export async function lookupMissingDetails(form, showUsage, photo) {
  if (photo?.imageBase64) {
    try {
      const res = await api.cabinet.identify(photo.imageBase64, photo.mimeType, { name: form.name, brand: form.brand, strength: form.strength })
      if (res.aiUsage && showUsage) showUsage(res.aiUsage, 'identify-photo', { input: form.name, output: res.data?.nameEnglish ?? res.data?.nameOriginal ?? '' })
      const found = res.success ? foundFromIdentify(res.data, form) : null
      if (found) return found
    } catch { /* fall back to the text search */ }
  }
  return lookupByText(form, showUsage)
}

async function lookupByText(form, showUsage) {
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

// A clear front-facing product picture from the identified product's reference pages (official first), chosen by a
// vision model against the user's photo. Slow (up to ~14 s), so callers run it in the background. '' when none.
export async function findWebImage(photo, found, form = {}) {
  const urls = (found?.references || []).map((r) => r.url).filter(Boolean).slice(0, 4)
  if (!photo?.imageBase64 || urls.length === 0) return ''
  try {
    const res = await api.cabinet.productImage(photo.imageBase64, photo.mimeType, urls, form.name, form.brand || found?.brand)
    const u = res.success ? String(res.data?.imageUrl || '') : ''
    return /^https?:\/\//i.test(u) ? u : ''
  } catch {
    return ''
  }
}
