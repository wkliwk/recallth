import test from 'node:test'
import assert from 'node:assert/strict'
import { toggleId, selectAllIds, pruneSelection, allSelected, summarizeNames } from './selection.js'

test('toggleId adds and removes', () => {
  assert.deepEqual(toggleId([], 'a'), ['a'])
  assert.deepEqual(toggleId(['a', 'b'], 'a'), ['b'])
  assert.deepEqual(toggleId(['a'], 'b'), ['a', 'b'])
})

test('selectAllIds dedupes and keeps order', () => {
  assert.deepEqual(selectAllIds(['a', 'b', 'a', 'c']), ['a', 'b', 'c'])
  assert.deepEqual(selectAllIds([]), [])
})

test('pruneSelection drops hidden ids and keeps the same array when nothing changes', () => {
  const sel = ['a', 'b']
  assert.equal(pruneSelection(sel, ['a', 'b', 'c']), sel)
  assert.deepEqual(pruneSelection(['a', 'b', 'x'], ['a', 'b']), ['a', 'b'])
  assert.deepEqual(pruneSelection(['a'], []), [])
})

test('allSelected needs at least one visible item', () => {
  assert.equal(allSelected(['a', 'b'], ['a', 'b']), true)
  assert.equal(allSelected(['a'], ['a', 'b']), false)
  assert.equal(allSelected([], []), false)
})

test('summarizeNames caps the list and counts the rest', () => {
  assert.deepEqual(summarizeNames(['a', 'b'], 5), { shown: ['a', 'b'], more: 0 })
  assert.deepEqual(summarizeNames(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 5), { shown: ['a', 'b', 'c', 'd', 'e'], more: 2 })
})
