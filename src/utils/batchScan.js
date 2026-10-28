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

export function buildCreatePayload(form) {
  const brand = String(form.brand || '').trim()
  const ingredients = String(form.ingredients || '').trim()
  return {
    name: form.name.trim(),
    type: form.type || 'supplement',
    dosage: form.dosage.trim(),
    frequency: 'Daily',
    timing: 'Morning',
    ...(brand ? { brand } : {}),
    ...(ingredients ? { ingredients } : {}),
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

// Choose the ai-lookup result that is actually the scanned product.
// Returns null when nothing matches, so we never guess a dosage for a different product.
export function pickLookupMatch(results, scannedName) {
  const target = normalizeName(scannedName)
  if (!target) return null
  const list = Array.isArray(results) ? results : results ? [results] : []
  return (
    list.find((r) => {
      const n = normalizeName(r?.name)
      return n && (n.includes(target) || target.includes(n))
    }) || null
  )
}

export function lookupQuery(form) {
  return [form.brand, form.name].map((s) => String(s || '').trim()).filter(Boolean).join(' ')
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

export const FILLABLE_FIELDS = ['dosage', 'brand', 'ingredients', 'description']
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
