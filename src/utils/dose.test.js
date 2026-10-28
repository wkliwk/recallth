import test from 'node:test'
import assert from 'node:assert/strict'
import { composeDosage, unitLabel, isStructured, applyDose, parseServingUnits } from './dose.js'
import { scanResultToForm } from './labelScan.js'

test('composeDosage: count x strength, singular for 1, empty when unknown', () => {
  assert.equal(composeDosage({ servingUnits: '2', unitForm: 'capsule', strength: '500 mg' }), '2 capsules (500 mg each)')
  assert.equal(composeDosage({ servingUnits: 1, unitForm: 'capsule', strength: '500 mg' }), '1 capsule (500 mg each)')
  assert.equal(composeDosage({ servingUnits: '0.5', unitForm: 'tablet', strength: '10 mg' }), '0.5 tablets (10 mg each)')
  assert.equal(composeDosage({ servingUnits: '2', unitForm: 'capsule', strength: '' }), '2 capsules')
  assert.equal(composeDosage({ servingUnits: '', unitForm: 'capsule', strength: '500 mg' }), '')
  assert.equal(composeDosage({ servingUnits: '0', unitForm: 'capsule', strength: '500 mg' }), '')
  assert.equal(composeDosage({ servingUnits: '2', unitForm: '', strength: '5 g' }), '2 units (5 g each)')
})

test('unitLabel pluralises', () => {
  assert.equal(unitLabel('softgel', 1), 'softgel')
  assert.equal(unitLabel('softgel', 3), 'softgels')
})

test('parseServingUnits accepts sane positive counts only', () => {
  assert.equal(parseServingUnits('2'), '2')
  assert.equal(parseServingUnits(' 1.5 '), '1.5')
  for (const bad of ['', '0', '-1', 'abc', '120', null, undefined]) assert.equal(parseServingUnits(bad), '')
})

test('isStructured / applyDose', () => {
  assert.equal(isStructured({ strength: '500 mg' }), true)
  assert.equal(isStructured({ strength: '500 mg', dosageFreeText: true }), false)
  assert.equal(isStructured({ dosage: '1 scoop' }), false)
  assert.equal(applyDose({ strength: '500 mg', unitForm: 'capsule', servingUnits: '2', dosage: 'x' }).dosage, '2 capsules (500 mg each)')
  assert.equal(applyDose({ dosage: '1 scoop' }).dosage, '1 scoop')
})

test('scanResultToForm: front-of-bottle label -> strength set, count and dosage empty (no guessing)', () => {
  const f = scanResultToForm({ name: 'Curcuma', brand: 'webber naturals', type: 'supplement', strength: '500 mg', unitForm: 'capsule', servingUnits: null, bottleCount: 120, dosage: '500 mg' })
  assert.equal(f.strength, '500 mg')
  assert.equal(f.servingUnits, '')
  assert.equal(f.dosage, '')
  assert.equal(f.bottleCount, '120')
  assert.equal(isStructured(f), true)
})

test('scanResultToForm: label states the count -> dosage composed', () => {
  const f = scanResultToForm({ name: 'Curcuma', strength: '500 mg', unitForm: 'capsule', servingUnits: 2 })
  assert.equal(f.dosage, '2 capsules (500 mg each)')
})

test('scanResultToForm: older backend (no strength) keeps free-text dosage', () => {
  const f = scanResultToForm({ name: 'Zinc', dosage: '25 mg', brand: 'NOW' })
  assert.equal(f.dosage, '25 mg')
  assert.equal(isStructured(f), false)
})
