import { UNIT_FORMS, applyDose, isStructured, parseServingUnits } from './dose.js'

export const MAX_BATCH = 10
export const SCAN_CONCURRENCY = 3

// Keep the first MAX_BATCH files; report whether any were dropped.
export function limitFiles(files, max = MAX_BATCH) {
  const list = Array.from(files || [])
  return { files: list.slice(0, max), truncated: list.length > max }
}

export function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '')
}

export function isDuplicate(name, existingNames) {
  const n = normalizeName(name)
  if (!n) return false
  return existingNames.some((e) => normalizeName(e) === n)
}

// Fields a row must have before it can be saved.
export function rowErrors(form) {
  const errors = {}
  if (!String(form?.name || '').trim()) errors.name = true
  if (!String(form?.dosage || '').trim()) errors.dosage = true
  return errors
}

// The image to save: a web product image already on the form wins, otherwise the user's own photo thumbnail.
export function chooseImage(form, photoThumb = '') {
  return String(form?.imageUrl || '').trim() || String(photoThumb || '').trim()
}

export function buildCreatePayload(form, photoThumb = '') {
  const brand = String(form.brand || '').trim()
  const ingredients = String(form.ingredients || '').trim()
  const imageUrl = chooseImage(form, photoThumb)
  return {
    name: form.name.trim(),
    type: form.type || 'supplement',
    dosage: form.dosage.trim(),
    frequency: 'Daily',
    timing: 'Morning',
    ...(brand ? { brand } : {}),
    ...(ingredients ? { ingredients } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  }
}

// Run worker(item, index) over items with at most `limit` in flight.
export async function runPool(items, worker, limit = SCAN_CONCURRENCY) {
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      await worker(items[i], i)
    }
  })
  await Promise.all(runners)
}

// "500 mg Meriva® (providing …)" -> "500mg" so label strength and web strength can be compared.
export function strengthKey(s) {
  const m = String(s || '').match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|iu|ui)\b/i)
  return m ? `${m[1]}${m[2].toLowerCase().replace('µg', 'mcg').replace('ui', 'iu')}` : ''
}

// Choose the ai-lookup result that is actually the scanned product.
// 1) same product name (either contains the other), else
// 2) same brand AND same strength (e.g. label "Curcuma" vs web "Turmeric" — same Webber 500 mg product).
// Returns null when nothing matches, so we never use data for a different product.
export function pickLookupMatch(results, scannedName, scanned = {}) {
  const list = Array.isArray(results) ? results : results ? [results] : []
  const target = normalizeName(scannedName)
  if (target) {
    const byName = list.find((r) => {
      const n = normalizeName(r?.name)
      return n && (n.includes(target) || target.includes(n))
    })
    if (byName) return byName
  }
  const brand = normalizeName(scanned.brand)
  const strength = strengthKey(scanned.strength)
  if (brand && strength) {
    return (
      list.find((r) => {
        const rb = normalizeName(r?.brand)
        return rb && (rb.includes(brand) || brand.includes(rb)) && strengthKey(r?.strength || r?.dosage) === strength
      }) || null
    )
  }
  return null
}

// Search text for the web lookup: brand + name + strength (+ pack size when the label showed it),
// which pins the exact product/pack (directions can differ between products).
export function lookupQuery(form) {
  const pack = Number(form.bottleCount) > 0 ? `${form.bottleCount} ${form.unitForm || ''}s`.trim() : ''
  return [form.brand, form.name, form.strength, pack].map((s) => String(s || '').trim()).filter(Boolean).join(' ')
}

// Returns run(fn) that executes fn with at most `limit` running concurrently.
export function createLimiter(limit) {
  let active = 0
  const queue = []
  const next = () => {
    if (active >= limit || queue.length === 0) return
    active++
    const { fn, resolve, reject } = queue.shift()
    fn().then(resolve, reject).finally(() => {
      active--
      next()
    })
  }
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      next()
    })
}

export const FILLABLE_FIELDS = ['dosage', 'brand', 'ingredients', 'description', 'imageUrl']
// Fields a user sees and expects to be complete; the button shows when one of these is empty.
export const VISIBLE_FIELDS = ['dosage', 'brand']

export function hasMissing(form, fields = VISIBLE_FIELDS) {
  return fields.some((f) => !String(form?.[f] || '').trim())
}

// Fill ONLY empty fields from `found`. Never overwrites an existing value.
export function mergeMissing(form, found, fields = FILLABLE_FIELDS) {
  const next = { ...form }
  const filled = []
  for (const f of fields) {
    const incoming = String(found?.[f] || '').trim()
    if (!String(next[f] || '').trim() && incoming) {
      next[f] = incoming
      filled.push(f)
    }
  }
  return { form: next, filled }
}

export function isHttpUrl(s) {
  const v = String(s || '').trim()
  if (!/^https?:\/\/\S+$/i.test(v)) return false
  try {
    const u = new URL(v)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

// Derive a search query from a product link's slug, e.g.
// .../pr/now-foods-zinc-picolinate-50-mg-120-veg-capsules/22436 -> "now foods zinc picolinate 50 mg 120 veg capsules".
// Returns '' when the link has no readable slug (e.g. amazon.com/dp/B0013OXKHC).
export function queryFromUrl(url) {
  let path = ''
  try {
    path = new URL(String(url || '').trim()).pathname
  } catch {
    return ''
  }
  const slugs = path
    .split('/')
    .map((seg) => {
      try { return decodeURIComponent(seg) } catch { return seg }
    })
    .map((seg) => seg.replace(/\.(html?|php|aspx?)$/i, ''))
    .filter((seg) => /^[a-z0-9]+([-_][a-z0-9]+){2,}$/i.test(seg)) // at least 3 words joined by - or _
  if (slugs.length === 0) return ''
  const best = slugs.sort((a, b) => b.length - a.length)[0]
  return best.replace(/[-_]+/g, ' ').trim()
}

// Merge a web/link lookup into a form, filling ONLY what is empty. In structured mode (strength known from
// the label) Dosage is derived: the per-dose count and unit are filled, never the strength, and never over
// a value from the label or the user. Returns { form, filled, directions } (directions only when the count
// came from the web).
export function mergeFound(form, found) {
  if (!found) return { form, filled: [], directions: '' }
  if (!isStructured(form)) {
    const { form: next, filled } = mergeMissing(form, found)
    return { form: next, filled, directions: '' }
  }
  const { form: base, filled } = mergeMissing(form, found, ['brand', 'ingredients', 'description', 'imageUrl'])
  const next = { ...base }
  let directions = ''
  const units = parseServingUnits(found.servingUnits)
  if (!String(next.servingUnits || '').trim() && units) {
    next.servingUnits = units
    filled.push('servingUnits')
    directions = String(found.directions || '').trim()
    if (!String(next.unitForm || '').trim() && UNIT_FORMS.includes(found.unitForm)) next.unitForm = found.unitForm
  }
  return { form: applyDose(next), filled, directions }
}

// The existing cabinet item with the same (normalised) name, or null.
export function findDuplicate(name, items) {
  const n = normalizeName(name)
  if (!n) return null
  return (items || []).find((i) => normalizeName(i?.name) === n) || null
}

// Payload for overwriting an existing item with a scanned row. Deliberately narrow:
// never renames, never touches schedule/notes/purchase/start date, and empty scanned values never blank
// saved ones. An existing image is kept unless a web product image was found; a photo thumbnail only
// fills a missing image.
export function buildUpdatePayload(form, photoThumb = '', existing = {}) {
  const brand = String(form.brand || '').trim()
  const ingredients = String(form.ingredients || '').trim()
  const webImage = String(form.imageUrl || '').trim()
  const image = webImage || (existing.imageUrl ? '' : String(photoThumb || '').trim())
  return {
    type: form.type || existing.type || 'supplement',
    dosage: form.dosage.trim(),
    ...(brand ? { brand } : {}),
    ...(ingredients ? { ingredients } : {}),
    ...(image ? { imageUrl: image } : {}),
  }
}
