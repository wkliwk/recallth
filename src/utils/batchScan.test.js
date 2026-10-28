import test from 'node:test'
import assert from 'node:assert/strict'
import { limitFiles, isDuplicate, normalizeName, rowErrors, buildCreatePayload, runPool, pickLookupMatch, lookupQuery, createLimiter, hasMissing, mergeMissing, isHttpUrl, queryFromUrl, strengthKey, mergeFound, chooseImage, buildCreatePayload as buildPayload, findDuplicate, buildUpdatePayload, nameTokens, similarity, findMatch } from './batchScan.js'

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

test('isHttpUrl accepts http(s) links only', () => {
  assert.equal(isHttpUrl('https://www.iherb.com/pr/now-foods-zinc/123'), true)
  assert.equal(isHttpUrl(' http://example.com/a '), true)
  assert.equal(isHttpUrl('abc'), false)
  assert.equal(isHttpUrl('ftp://example.com/x'), false)
  assert.equal(isHttpUrl('javascript:alert(1)'), false)
  assert.equal(isHttpUrl('https://localhost/x'), false)
  assert.equal(isHttpUrl('https://exa mple.com'), false)
  assert.equal(isHttpUrl(''), false)
})

test('queryFromUrl reads the product slug from a link', () => {
  assert.equal(queryFromUrl('https://www.iherb.com/pr/now-foods-zinc-picolinate-50-mg-120-veg-capsules/22436'), 'now foods zinc picolinate 50 mg 120 veg capsules')
  assert.equal(queryFromUrl('https://www.nowfoods.com/products/supplements/zinc-picolinate-50-mg'), 'zinc picolinate 50 mg')
  assert.equal(queryFromUrl('https://shop.example.com/Nutricost_L-Arginine_500mg.html?ref=1'), 'Nutricost L Arginine 500mg')
  assert.equal(queryFromUrl('https://www.amazon.com/dp/B0013OXKHC'), '')
  assert.equal(queryFromUrl('https://example.com/'), '')
  assert.equal(queryFromUrl('nonsense'), '')
})

test('strengthKey compares label vs web strength text', () => {
  assert.equal(strengthKey('500 mg'), '500mg')
  assert.equal(strengthKey('500 mg Meriva® (providing 33% curcuminoids)'), '500mg')
  assert.equal(strengthKey('1000 IU/UI'), '1000iu')
  assert.equal(strengthKey('25 mcg'), '25mcg')
  assert.equal(strengthKey('Zinc'), '')
})

test('pickLookupMatch: name first, else same brand + same strength (Curcuma vs Turmeric)', () => {
  const results = [
    { name: 'Advanced Absorption Turmeric 500 mg 120 Vegetarian Capsules', brand: 'Webber Naturals', strength: '500 mg Meriva®', servingUnits: 2 },
    { name: 'Curcumin Phytosome', brand: 'NOW Foods', strength: '500 mg', servingUnits: 1 },
  ]
  const scanned = { brand: 'webber naturals', strength: '500 mg' }
  assert.equal(pickLookupMatch(results, 'Curcuma', scanned).servingUnits, 2)
  // same strength but different brand must NOT match
  assert.equal(pickLookupMatch(results, 'Curcuma', { brand: 'Jamieson', strength: '500 mg' }), null)
  // same brand but different strength must NOT match
  assert.equal(pickLookupMatch(results, 'Curcuma', { brand: 'Webber Naturals', strength: '250 mg' }), null)
  // name match still wins
  assert.equal(pickLookupMatch(results, 'Curcumin Phytosome', {}).brand, 'NOW Foods')
})

test('lookupQuery pins strength and pack size', () => {
  assert.equal(lookupQuery({ brand: 'webber naturals', name: 'Curcuma', strength: '500 mg', unitForm: 'capsule', bottleCount: '120' }), 'webber naturals Curcuma 500 mg 120 capsules')
  assert.equal(lookupQuery({ brand: '', name: 'Zinc' }), 'Zinc')
})

const structuredForm = { name: 'Curcuma', brand: 'webber naturals', strength: '500 mg', unitForm: 'capsule', servingUnits: '', dosage: '', ingredients: '' }

test('mergeFound (structured): fills per-dose count from the web, composes dosage, keeps directions', () => {
  const r = mergeFound(structuredForm, { servingUnits: 2, unitForm: 'capsule', directions: 'Adults: take 2 capsules daily', dosage: '2 capsules', brand: 'Webber Naturals' })
  assert.equal(r.form.servingUnits, '2')
  assert.equal(r.form.dosage, '2 capsules (500 mg each)')
  assert.equal(r.form.brand, 'webber naturals') // existing brand kept
  assert.deepEqual(r.filled, ['servingUnits'])
  assert.equal(r.directions, 'Adults: take 2 capsules daily')
})

test('mergeFound (structured): never overwrites a count from the label or the user', () => {
  const r = mergeFound({ ...structuredForm, servingUnits: '1', dosage: '1 capsule (500 mg each)' }, { servingUnits: 2, directions: 'take 2' })
  assert.equal(r.form.servingUnits, '1')
  assert.equal(r.form.dosage, '1 capsule (500 mg each)')
  assert.equal(r.directions, '')
})

test('mergeFound (structured): ignores a missing/invalid web count', () => {
  for (const bad of [null, 0, 'x', 120]) {
    const r = mergeFound(structuredForm, { servingUnits: bad })
    assert.equal(r.form.servingUnits, '')
    assert.equal(r.form.dosage, '')
  }
  assert.deepEqual(mergeFound(structuredForm, null).filled, [])
})

test('mergeFound (free-text form): behaves like mergeMissing', () => {
  const r = mergeFound({ name: 'Zinc', dosage: '', brand: '', ingredients: '' }, { dosage: '1 capsule', brand: 'NOW' })
  assert.equal(r.form.dosage, '1 capsule')
  assert.equal(r.form.brand, 'NOW')
})

test('chooseImage: web image wins, else the user photo, else nothing', () => {
  assert.equal(chooseImage({ imageUrl: 'https://api/img/image-proxy?url=x' }, 'data:image/jpeg;base64,AAA'), 'https://api/img/image-proxy?url=x')
  assert.equal(chooseImage({ imageUrl: '' }, 'data:image/jpeg;base64,AAA'), 'data:image/jpeg;base64,AAA')
  assert.equal(chooseImage({}, ''), '')
})

test('buildCreatePayload carries the chosen image only when there is one', () => {
  const form = { name: 'Zinc', dosage: '1 capsule', brand: '', ingredients: '', type: 'vitamin' }
  assert.equal(buildPayload(form, 'data:image/jpeg;base64,AAA').imageUrl, 'data:image/jpeg;base64,AAA')
  assert.equal('imageUrl' in buildPayload(form, ''), false)
  assert.equal(buildPayload({ ...form, imageUrl: 'https://x/y' }, 'data:image/jpeg;base64,AAA').imageUrl, 'https://x/y')
})

test('mergeFound fills a web image only when the form has none', () => {
  const base = { name: 'Zinc', brand: 'NOW', dosage: '', ingredients: '', description: '', imageUrl: '' }
  const r = mergeFound(base, { imageUrl: 'https://api/img/image-proxy?url=a', dosage: '1 capsule' })
  assert.equal(r.form.imageUrl, 'https://api/img/image-proxy?url=a')
  assert.ok(r.filled.includes('imageUrl'))
  const keep = mergeFound({ ...base, imageUrl: 'https://mine/x.png' }, { imageUrl: 'https://api/img/image-proxy?url=a' })
  assert.equal(keep.form.imageUrl, 'https://mine/x.png')
})

test('findDuplicate matches by normalised name and returns the item', () => {
  const items = [{ _id: 'a', name: 'L-Arginine' }, { _id: 'b', name: 'Vitamin D3' }]
  assert.equal(findDuplicate('l arginine', items)._id, 'a')
  assert.equal(findDuplicate('VITAMIN d3', items)._id, 'b')
  assert.equal(findDuplicate('Zinc', items), null)
  assert.equal(findDuplicate('', items), null)
  assert.equal(findDuplicate('Zinc', null), null)
})

test('buildUpdatePayload is narrow: no name/schedule/notes/purchase, no blanking', () => {
  const form = { name: 'L-arginine', type: 'supplement', dosage: ' 2 capsules (500 mg each) ', brand: '', ingredients: '', imageUrl: '' }
  const p = buildUpdatePayload(form, '', { _id: 'a', type: 'supplement' })
  assert.deepEqual(p, { type: 'supplement', dosage: '2 capsules (500 mg each)' })
  for (const k of ['name', 'frequency', 'timing', 'notes', 'purchasePrice', 'purchaseDate', 'startDate', 'brand', 'ingredients']) assert.equal(k in p, false)
})

test('buildUpdatePayload image rules: keep existing, web wins, thumbnail only fills a gap', () => {
  const base = { name: 'X', type: 'vitamin', dosage: '1', brand: 'NOW', ingredients: 'Zinc' }
  assert.equal('imageUrl' in buildUpdatePayload(base, 'data:image/jpeg;base64,AAA', { imageUrl: 'https://old/img' }), false)
  assert.equal(buildUpdatePayload(base, 'data:image/jpeg;base64,AAA', {}).imageUrl, 'data:image/jpeg;base64,AAA')
  assert.equal(buildUpdatePayload({ ...base, imageUrl: 'https://web/x.png' }, 'data:image/jpeg;base64,AAA', { imageUrl: 'https://old/img' }).imageUrl, 'https://web/x.png')
  const p = buildUpdatePayload(base, '', {})
  assert.equal(p.brand, 'NOW')
  assert.equal(p.ingredients, 'Zinc')
})

test('nameTokens drops brand words, accents, plurals and generic words', () => {
  assert.deepEqual([...nameTokens('KIRKLAND SIGNATURE B100 COMPLEX', 'Kirkland Signature')].sort(), ['b100', 'complex'])
  assert.deepEqual([...nameTokens('COMPLEXE B100 COMPLEX', 'KIRKLAND Signature')].sort(), ['b100', 'complex'])
  assert.deepEqual([...nameTokens('Kirkland Signature Super Concentrate Omega-3 Fish Oil', 'Kirkland Signature')].sort(), ['3', 'fish', 'oil', 'omega'])
  assert.deepEqual([...nameTokens('Curcuma Absorption avancée', 'webber naturals')], ['curcuma'])
})

test('similarity: exact, similar, and not-a-duplicate cases from the real cabinet', () => {
  const b100old = { name: 'KIRKLAND SIGNATURE B100 COMPLEX', brand: 'Kirkland Signature', strength: '' }
  const b100new = { name: 'COMPLEXE B100 COMPLEX', brand: 'KIRKLAND Signature', strength: '500mcg' }
  assert.equal(similarity(b100new, b100old), 'similar')

  const omegaOld = { name: 'Kirkland Signature Super Concentrate Omega-3 Fish Oil', brand: 'Kirkland Signature', strength: '' }
  const omegaNew = { name: 'Omega-3 Fish Oil', brand: 'KIRKLAND Signature', strength: '1300mg' }
  assert.equal(similarity(omegaNew, omegaOld), 'similar')
  assert.equal(similarity(omegaNew, { ...omegaNew }), 'exact')
  assert.equal(similarity({ name: 'Curcuma', brand: 'webber naturals' }, { name: 'curcuma ', brand: 'Webber Naturals' }), 'exact')

  // guards against false positives
  assert.equal(similarity({ name: 'Omega-3 Krill Oil', brand: 'Kirkland Signature', strength: '500mg' }, { name: 'Omega-3 Fish Oil', brand: 'Kirkland Signature', strength: '1300mg' }), null) // strengths differ
  assert.equal(similarity({ name: 'Omega-3 Krill Oil', brand: 'Kirkland Signature', strength: '' }, { name: 'Omega-3 Fish Oil', brand: 'Kirkland Signature', strength: '' }), null) // 3/4 tokens < 80%
  assert.equal(similarity({ name: 'Magnesium Citrate', brand: 'Webber' }, { name: 'Magnesium Glycinate', brand: 'Webber' }), null)
  assert.equal(similarity({ name: 'Vitamin C', brand: 'Jamieson' }, { name: 'Vitamin D3', brand: 'Jamieson' }), null)
  assert.equal(similarity({ name: 'Zinc', brand: 'NOW' }, { name: 'Zinc', brand: 'Thorne' }), 'exact') // same name stays exact regardless of brand (existing behaviour)
  assert.equal(similarity({ name: 'Zinc Picolinate', brand: 'NOW' }, { name: 'Zinc Picolinate 50 mg', brand: 'Thorne' }), null) // different brand
  assert.equal(similarity({ name: 'Zinc Picolinate', brand: '' }, { name: 'Zinc Picolinate 50 mg', brand: '' }), null) // no brand to anchor
  assert.equal(similarity({ name: '', brand: 'x' }, { name: 'y', brand: 'x' }), null)
})

test('similarity: containment needs a name of at least 4 characters', () => {
  assert.equal(similarity({ name: 'D3', brand: 'Jamieson' }, { name: 'Vitamin D3', brand: 'Jamieson' }), null)
  assert.equal(similarity({ name: 'Curcuma', brand: 'Webber' }, { name: 'Curcuma Advanced', brand: 'Webber' }), 'similar')
})

test('findMatch prefers an exact match and reports the kind', () => {
  const items = [
    { _id: 'k', name: 'KIRKLAND SIGNATURE B100 COMPLEX', brand: 'Kirkland Signature', dosage: '1 tablet' },
    { _id: 'e', name: 'COMPLEXE B100 COMPLEX', brand: 'KIRKLAND Signature', dosage: '1 tablet (500 mcg each)' },
  ]
  const form = { name: 'COMPLEXE B100 COMPLEX', brand: 'KIRKLAND Signature', strength: '500 mcg' }
  assert.deepEqual([findMatch(form, items).item._id, findMatch(form, items).kind], ['e', 'exact'])
  assert.deepEqual([findMatch(form, items.slice(0, 1)).item._id, findMatch(form, items.slice(0, 1)).kind], ['k', 'similar'])
  assert.equal(findMatch({ name: 'Zinc', brand: 'NOW' }, items), null)
  assert.equal(findMatch(form, []), null)
})
