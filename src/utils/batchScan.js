import { UNIT_FORMS, applyDose, composeDosage, isStructured, parseServingUnits } from './dose.js'

export const MAX_BATCH = 10
export const SCAN_CONCURRENCY = 3

// Keep the first MAX_BATCH files; report whether any were dropped.
export function limitFiles(files, max = MAX_BATCH) {
  const list = Array.from(files || [])
  return { files: list.slice(0, max), truncated: list.length > max }
}

// Letters/digits plus CJK, kana and hangul (so Japanese/Korean/Chinese names are kept, not erased);
// accents are stripped (é → e) so French/English forms compare equal.
export function normalizeName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC') // recompose hangul / kana that NFD split apart
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]+/g, '')
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

// Reference links kept with an item (from the identify lookup): http(s) only, at most 5.
const REF_KINDS = ['official', 'database', 'retailer', 'other']
export function cleanReferences(list) {
  const seen = new Set()
  const out = []
  for (const r of Array.isArray(list) ? list : []) {
    const url = String(r?.url || '').trim()
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue
    seen.add(url)
    out.push({ url, title: String(r?.title || '').trim().slice(0, 200) || url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0], kind: REF_KINDS.includes(r?.kind) ? r.kind : 'other' })
    if (out.length >= 5) break
  }
  return out
}

// A web product picture arriving late may only fill an EMPTY image, and never once the user chose their own photo.
export function applyWebImage(form, url, photoPinned = false) {
  const clean = /^https?:\/\//i.test(String(url || '')) ? String(url).trim() : ''
  if (!clean || photoPinned || String(form?.imageUrl || '').trim()) return form
  return { ...form, imageUrl: clean }
}

// The image to save: a web product image already on the form wins, otherwise the user's own photo thumbnail.
export function chooseImage(form, photoThumb = '') {
  return String(form?.imageUrl || '').trim() || String(photoThumb || '').trim()
}

export function buildCreatePayload(form, photoThumb = '') {
  const brand = String(form.brand || '').trim()
  const ingredients = String(form.ingredients || '').trim()
  const description = String(form.description || '').trim()
  const imageUrl = chooseImage(form, photoThumb)
  const references = cleanReferences(form.references)
  return {
    name: form.name.trim(),
    type: form.type || 'supplement',
    dosage: form.dosage.trim(),
    frequency: 'Daily',
    timing: 'Morning',
    ...(brand ? { brand } : {}),
    ...(ingredients ? { ingredients } : {}),
    ...(description ? { description } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(references.length ? { references } : {}),
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
  const m = String(s || '').match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|μg|g|iu|ui|ml|%)(?![a-z])/i)
  return m ? `${m[1]}${m[2].toLowerCase().replace(/[µμ]g/, 'mcg').replace('ui', 'iu')}` : ''
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
      return n && Math.min(n.length, target.length) >= 2 && (n.includes(target) || target.includes(n)) // 1-char names ("S") match everything
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
  // Pack size only when we know the unit ("120 capsules"); never a dangling "10 s".
  const pack = Number(form.bottleCount) > 0 && form.unitForm ? `${form.bottleCount} ${form.unitForm}s` : ''
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
// A fuller web ingredient list may replace the short "key actives" line the label scan read (flagged
// ingredientsFromScan) when it is clearly longer; a value the user typed/edited (flag cleared) is never replaced.
function upgradeIngredients(next, found, filled) {
  const web = String(found.ingredients || '').trim()
  const cur = String(next.ingredients || '').trim()
  if (web && cur && next.ingredientsFromScan && web.length > cur.length + 20) {
    next.ingredients = web
    next.ingredientsFromScan = false
    if (!filled.includes('ingredients')) filled.push('ingredients')
  }
}

// Reference links fill only an empty list (a list the user trimmed is never refilled mid-edit by a re-run of the same row).
function fillReferences(next, found, filled) {
  const refs = cleanReferences(found?.references)
  if (!cleanReferences(next.references).length && refs.length) {
    next.references = refs
    filled.push('references')
  }
}

export function mergeFound(form, found) {
  if (!found) return { form, filled: [], directions: '', source: '' }
  if (!isStructured(form)) {
    const { form: next, filled } = mergeMissing(form, found)
    upgradeIngredients(next, found, filled)
    fillReferences(next, found, filled)
    return { form: next, filled, directions: '', source: '' }
  }
  const { form: base, filled } = mergeMissing(form, found, ['brand', 'ingredients', 'description', 'imageUrl'])
  const next = { ...base }
  upgradeIngredients(next, found, filled)
  fillReferences(next, found, filled)
  let directions = ''
  let source = ''
  const units = parseServingUnits(found.servingUnits)
  if (!String(next.servingUnits || '').trim() && units) {
    next.servingUnits = units
    filled.push('servingUnits')
    directions = String(found.directions || '').trim()
    source = String(found.sourceUrl || '').trim()
    if (!String(next.unitForm || '').trim() && UNIT_FORMS.includes(found.unitForm)) next.unitForm = found.unitForm
  }
  return { form: applyDose(next), filled, directions, source }
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
  const description = String(form.description || '').trim()
  const webImage = String(form.imageUrl || '').trim()
  const image = webImage || (existing.imageUrl ? '' : String(photoThumb || '').trim())
  const references = cleanReferences(form.references)
  return {
    type: form.type || existing.type || 'supplement',
    dosage: form.dosage.trim(),
    ...(brand ? { brand } : {}),
    ...(ingredients ? { ingredients } : {}),
    ...(description ? { description } : {}),
    ...(image ? { imageUrl: image } : {}),
    ...(references.length ? { references } : {}),
  }
}

// ─── Duplicate / similar-product detection ───────────────────────────────────

const GENERIC_WORDS = new Set([
  'the', 'and', 'of', 'with', 'for', 'de', 'la', 'le', 'des', 'et', 'capsul', 'tablet', 'softgel', 'gummi', 'cap', 'tab', 'veg',
  'vegetarian', 'vegetarien', 'supplement', 'extra', 'strength', 'advanced', 'super', 'concentrat', 'absorption', 'avance', 'original',
])

// Lower-case, strip accents, light stemming so "complexe"/"complex", "capsules"/"capsule" compare equal.
function stem(word) {
  let w = word
  if (w.length > 3 && w.endsWith('s')) w = w.slice(0, -1)
  if (w.length > 6 && w.endsWith('e')) w = w.slice(0, -1)
  return w
}

export function nameTokens(name, brand = '') {
  const clean = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9一-鿿]+/)
      .filter(Boolean)
      .map(stem)
  const brandWords = new Set(clean(brand))
  return new Set(clean(name).filter((t) => !brandWords.has(t) && !GENERIC_WORDS.has(t)))
}

// Verdicts: 'exact' = same normalised name AND both brands known and matching; 'maybe' = same name but a brand is
// missing (generic names like "Zinc & Maca" are shared by many products, so we cannot tell); 'similar' = same
// brand + similar name. Never a duplicate when both brands are known and differ, or when known strengths or unit
// forms conflict (e.g. a gummy vs a tablet, 10 mg vs 5 mg). a / b: { name, brand, strength, unit }.
export function similarity(a, b) {
  const na = normalizeName(a?.name)
  const nb = normalizeName(b?.name)
  if (!na || !nb) return null

  const brandA = normalizeName(a?.brand)
  const brandB = normalizeName(b?.brand)
  const brandsKnown = Boolean(brandA && brandB)
  const brandsMatch = brandsKnown && (brandA === brandB || brandA.includes(brandB) || brandB.includes(brandA))
  if (brandsKnown && !brandsMatch) return null // different brands = different products
  if (a.strength && b.strength && a.strength !== b.strength) return null // e.g. 1300 mg fish oil vs 500 mg krill oil
  if (a.unit && b.unit && a.unit !== b.unit) return null // gummy vs tablet

  if (na === nb) return brandsMatch ? 'exact' : 'maybe'
  if (!brandsMatch) return null

  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na]
  if (short.length >= 4 && long.includes(short)) return 'similar'

  const ta = nameTokens(a.name, a.brand)
  const tb = nameTokens(b.name, b.brand)
  if (ta.size === 0 || tb.size === 0) return null
  const shared = [...ta].filter((t) => tb.has(t)).length
  const smaller = Math.min(ta.size, tb.size)
  return shared >= 2 && shared / smaller >= 0.8 ? 'similar' : null
}

// Unit form from free text such as "2 gummies (10 mg each)" or "1 softgel".
export function unitFormFromText(text) {
  const t = String(text || '').toLowerCase()
  if (/\bgumm(y|ies)\b/.test(t)) return 'gummy'
  if (/\bsoftgels?\b|\bsoft gels?\b/.test(t)) return 'softgel'
  if (/\bcapsules?\b|\bcaps?\b/.test(t)) return 'capsule'
  if (/\btablets?\b|\btabs?\b|\bcaplets?\b/.test(t)) return 'tablet'
  if (/\bscoops?\b/.test(t)) return 'scoop'
  if (/\bdrops?\b/.test(t)) return 'drop'
  return ''
}

// What to compare for a saved item / a scanned form.
export function itemFingerprint(item) {
  return {
    name: item?.name,
    brand: item?.brand,
    strength: strengthKey(item?.strength || item?.dosage),
    unit: item?.unitForm || unitFormFromText(item?.dosage),
  }
}

// Best match of `form` among saved items (exact > similar > maybe).
// Returns { item, kind: 'exact' | 'similar' | 'maybe' } or null.
const KIND_RANK = { exact: 3, similar: 2, maybe: 1 }
export function findMatch(form, items) {
  const me = itemFingerprint(form)
  let best = null
  for (const item of items || []) {
    const kind = similarity(me, itemFingerprint(item))
    if (!kind) continue
    if (kind === 'exact') return { item, kind }
    if (!best || KIND_RANK[kind] > KIND_RANK[best.kind]) best = { item, kind }
  }
  return best
}

// Map a /cabinet/identify result (photo-based lookup) to the same "found" shape the text lookup produces.
// Returns null unless the backend marked it usable (exact/likely match WITH a source page).
export function foundFromIdentify(d, form = {}) {
  if (!d || !d.usable) return null
  const units = parseServingUnits(d.servingUnits)
  const unit = UNIT_FORMS.includes(d.unitForm) ? d.unitForm : ''
  const strength = String(form.strength || '').trim() || (String(d.strength || '').length <= 24 ? String(d.strength || '').trim() : '')
  return {
    dosage: units ? composeDosage({ servingUnits: units, unitForm: unit || form.unitForm, strength }) : '',
    servingUnits: units || null,
    unitForm: unit || null,
    brand: String(d.brand || '').trim(),
    ingredients: String(d.ingredients || '').trim(),
    description: String(d.description || '').trim(),
    references: cleanReferences(d.references), // official / reliable pages used to identify it
    directions: String(d.directions || '').trim(),
    sourceUrl: /^https?:\/\//i.test(String(d.sourceUrl || '')) ? String(d.sourceUrl).trim() : '',
    via: 'photo',
  }
}
