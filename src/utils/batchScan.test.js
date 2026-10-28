import test from 'node:test'
import assert from 'node:assert/strict'
import { limitFiles, isDuplicate, normalizeName, rowErrors, buildCreatePayload, runPool } from './batchScan.js'

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
