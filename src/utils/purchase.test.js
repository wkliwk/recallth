import test from 'node:test'
import assert from 'node:assert/strict'
import { intlLocale, parsePriceInput, toDateInputValue, formatPrice, formatPurchaseDate, formatPurchase } from './purchase.js'

test('parsePriceInput: empty is null, numbers pass, bad input rejected', () => {
  assert.deepEqual(parsePriceInput(''), { ok: true, value: null })
  assert.deepEqual(parsePriceInput('  '), { ok: true, value: null })
  assert.deepEqual(parsePriceInput('128.5'), { ok: true, value: 128.5 })
  assert.deepEqual(parsePriceInput('0'), { ok: true, value: 0 })
  assert.equal(parsePriceInput('-1').ok, false)
  assert.equal(parsePriceInput('abc').ok, false)
  assert.equal(parsePriceInput('1e999').ok, false)
})

test('toDateInputValue uses the UTC calendar date', () => {
  assert.equal(toDateInputValue('2026-10-20T00:00:00.000Z'), '2026-10-20')
  assert.equal(toDateInputValue(''), '')
  assert.equal(toDateInputValue('garbage'), '')
})

test('formatPurchaseDate does not shift the day for UTC-midnight dates', () => {
  assert.equal(formatPurchaseDate('2026-10-20T00:00:00.000Z', 'en-GB'), '20 Oct 2026')
  assert.equal(formatPurchaseDate('bad', 'en-GB'), '')
})

test('formatPrice shows currency symbol and two decimals', () => {
  assert.match(formatPrice(128.5, 'HKD', 'en-GB'), /HK\$128\.50/)
  assert.match(formatPrice(19.99, 'CAD', 'en-GB'), /CA\$19\.99/)
  assert.equal(formatPrice(null, 'HKD'), '')
  assert.match(formatPrice(5, 'XXXNOTREAL', 'en-GB'), /5/)
})

test('formatPurchase joins price and date, handles either missing', () => {
  assert.match(formatPurchase(128.5, 'HKD', '2026-10-20T00:00:00.000Z', 'en-GB'), /HK\$128\.50 · 20 Oct 2026/)
  assert.match(formatPurchase(128.5, 'HKD', null, 'en-GB'), /^HK\$128\.50$/)
  assert.equal(formatPurchase(null, 'HKD', '2026-10-20T00:00:00.000Z', 'en-GB'), '20 Oct 2026')
  assert.equal(formatPurchase(null, null, null, 'en-GB'), '')
})

test('intlLocale maps app languages', () => {
  assert.equal(intlLocale('en'), 'en-GB')
  assert.equal(intlLocale('zh-HK'), 'zh-HK')
  assert.equal(intlLocale('xx'), 'en-GB')
  assert.equal(formatPurchaseDate('2026-10-20T00:00:00.000Z', intlLocale('zh-HK')), '2026年10月20日')
})
