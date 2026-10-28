import test from 'node:test'
import assert from 'node:assert/strict'
import { limitFiles, isDuplicate, normalizeName, rowErrors, buildCreatePayload, runPool, pickLookupMatch, lookupQuery, createLimiter, hasMissing, mergeMissing } from './batchScan.js'

test('limitFiles keeps first 10 and flags truncation', () => {
  const r = limitFiles(Array.from({ length: 12 }, (_, i) => i))
  assert.equal(r.files.length, 10)
  assert.equal(r.files[9], 9)
  assert.equal(r.truncated, true)
  assert.equal(limitFiles([1, 2]).truncated, false)
})

test('duplicate detection ignores case and punctuation', () => {
  assert.equal(normalizeName('L-Arginine '), 'larginine')
  assert.equal(isDuplicate('l arginine', ['Vitamin D', 'L-Arginine']), true)
  assert.equal(isDuplicate('Zinc', ['Vitamin D']), false)
  assert.equal(isDuplicate('', ['']), false)
})

test('rowErrors flags missing name or dosage', () => {
  assert.deepEqual(rowErrors({ name: 'A', dosage: '1g' }), {})
  assert.deepEqual(rowErrors({ name: ' ', dosage: '' }), { name: true, dosage: true })
})

test('buildCreatePayload applies defaults and omits empty optionals', () => {
  const p = buildCreatePayload({ name: ' Zinc ', dosage: ' 25mg ', brand: '', type: 'vitamin' })
  assert.deepEqual(p, { name: 'Zinc', type: 'vitamin', dosage: '25mg', frequency: 'Daily', timing: 'Morning' })
})

test('runPool never exceeds the concurrency limit and visits every item', async () => {
  let active = 0, peak = 0, seen = 0
  await runPool(Array.from({ length: 10 }, (_, i) => i), async () => {
    active++; peak = Math.max(peak, active)
    await new Promise((r) => setTimeout(r, 5))
    active--; seen++
  }, 3)
  assert.equal(seen, 10)
  assert.equal(peak, 3)
})

test('pickLookupMatch only returns a result for the same product', () => {
  const results = [{ name: 'Whey Gold Standard', dosage: '1 scoop' }, { name: 'L-Arginine 500', dosage: '2 capsules' }]
  assert.equal(pickLookupMatch(results, 'L-Arginine').dosage, '2 capsules')
  assert.equal(pickLookupMatch(results, 'Zinc'), null)
  assert.equal(pickLookupMatch(null, 'Zinc'), null)
  assert.equal(pickLookupMatch({ name: 'Zinc Picolinate', dosage: '1 cap' }, 'zinc').dosage, '1 cap')
  assert.equal(pickLookupMatch(results, ''), null)
})

test('lookupQuery joins brand and name', () => {
  assert.equal(lookupQuery({ brand: 'NOW', name: 'Zinc' }), 'NOW Zinc')
  assert.equal(lookupQuery({ brand: '', name: 'Zinc' }), 'Zinc')
})

test('createLimiter caps concurrency and runs everything', async () => {
  const run = createLimiter(2)
  let active = 0, peak = 0
  const results = await Promise.all(Array.from({ length: 6 }, (_, i) => run(async () => {
    active++; peak = Math.max(peak, active)
    await new Promise((r) => setTimeout(r, 5))
    active--
    return i
  })))
  assert.deepEqual(results, [0, 1, 2, 3, 4, 5])
  assert.equal(peak, 2)
})

test('hasMissing checks dosage and brand by default', () => {
  assert.equal(hasMissing({ dosage: '1g', brand: 'NOW' }), false)
  assert.equal(hasMissing({ dosage: '', brand: 'NOW' }), true)
  assert.equal(hasMissing({ dosage: '1g', brand: ' ' }), true)
})

test('mergeMissing fills only empty fields and never overwrites', () => {
  const form = { name: 'L-Arginine', dosage: '500mg', brand: '', ingredients: '' }
  const { form: out, filled } = mergeMissing(form, { dosage: '5000mg', brand: 'Nutricost', ingredients: 'L-Arginine HCl', description: 'x' })
  assert.equal(out.dosage, '500mg')
  assert.equal(out.brand, 'Nutricost')
  assert.equal(out.ingredients, 'L-Arginine HCl')
  assert.equal(out.description, 'x')
  assert.deepEqual(filled, ['brand', 'ingredients', 'description'])
  assert.equal(form.brand, '')
  assert.deepEqual(mergeMissing(form, null).filled, [])
})
