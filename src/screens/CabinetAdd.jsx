import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import BottomNav from '../components/BottomNav'
import { api } from '../services/api'

const TYPE_OPTIONS = ['Supplement', 'Medication', 'Vitamin', 'Herb', 'Other']
const FREQUENCY_OPTIONS = ['Daily', 'Twice daily', 'As needed']
const TIMING_OPTIONS = ['Morning', 'Pre-workout', 'With meals', 'Evening', 'Before bed']

function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium text-ink2">
        {label}
        {required && <span className="text-orange ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

const inputClass =
  'w-full bg-page border-[1.5px] border-border rounded-[12px] px-4 py-[10px] text-[14px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors'

const selectClass =
  'w-full bg-page border-[1.5px] border-border rounded-[12px] px-4 py-[10px] text-[14px] text-ink1 outline-none focus:border-orange transition-colors appearance-none cursor-pointer'

export default function CabinetAdd() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    name: '',
    type: 'Supplement',
    dosage: '',
    frequency: 'Daily',
    timing: 'Morning',
    brand: '',
    notes: '',
  })

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate() {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.dosage.trim()) newErrors.dosage = 'Dosage is required'
    return newErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        dosage: form.dosage.trim(),
        frequency: form.frequency,
        timing: form.timing,
        ...(form.brand.trim() ? { brand: form.brand.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      }
      await api.cabinet.create(payload)
      navigate('/cabinet')
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to add supplement' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <OrangeHeader
        title="Add Supplement"
        subtitle="Track a new item"
        onBack={() => navigate('/cabinet')}
      />

      <div className="-mt-[40px]">
        <Wave />
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-2 pb-[100px]">
        <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-4">

          <Field label="Name" required error={errors.name}>
            <input
              className={inputClass}
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Creatine Monohydrate"
              autoFocus
            />
          </Field>

          <Field label="Type">
            <div className="relative">
              <select
                className={selectClass}
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </Field>

          <Field label="Dosage" required error={errors.dosage}>
            <input
              className={inputClass}
              type="text"
              value={form.dosage}
              onChange={(e) => handleChange('dosage', e.target.value)}
              placeholder="e.g. 5g, 1000mg, 2 capsules"
            />
          </Field>

          <Field label="Frequency">
            <div className="relative">
              <select
                className={selectClass}
                value={form.frequency}
                onChange={(e) => handleChange('frequency', e.target.value)}
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </Field>

          <Field label="Timing">
            <div className="relative">
              <select
                className={selectClass}
                value={form.timing}
                onChange={(e) => handleChange('timing', e.target.value)}
              >
                {TIMING_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </Field>

          <Field label="Brand (optional)">
            <input
              className={inputClass}
              type="text"
              value={form.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              placeholder="e.g. Optimum Nutrition"
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes..."
            />
          </Field>
        </div>

        {errors.submit && (
          <p className="text-[13px] text-red-500 text-center mt-4">{errors.submit}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-5 rounded-pill bg-orange text-white text-[15px] font-medium py-[14px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
        >
          {submitting ? 'Adding...' : 'Add to cabinet'}
        </button>
      </form>

      <BottomNav />
    </div>
  )
}
