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
