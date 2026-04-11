import { useState } from 'react'
import Wave from '../../components/Wave'
import { api } from '../../services/api'

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`

const TIMING_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'pre-workout', label: 'Pre-workout' },
  { value: 'with-meals', label: 'With meals' },
  { value: 'evening', label: 'Evening' },
  { value: 'before-bed', label: 'Before bed' },
]

function InputField({ label, type = 'text', placeholder, value, onChange, required }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-medium text-ink2">
        {label}
        {required && <span className="text-orange ml-1">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="border border-border rounded-[14px] px-4 py-[13px] text-[15px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors bg-white"
      />
    </div>
  )
}

export default function Supplement({ onNext, onBack, onSkip, stepIndex, totalSteps }) {
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [timing, setTiming] = useState('morning')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = name.trim() !== '' && dose.trim() !== ''

  async function handleContinue() {
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      await api.cabinet.add({
        name: name.trim(),
        type: 'supplement',
        dosage: dose.trim(),
        frequency: 'daily',
        timing,
      })
      onNext({ supplement: { name, dose, timing } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-page">
      {/* Orange header */}
      <div
        className="relative bg-orange px-6 pt-14 pb-0 overflow-hidden"
        style={{ minHeight: 200 }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_SVG, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }}
        />

        {/* Progress indicator */}
        <div className="relative z-10 flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === stepIndex ? 20 : 8,
                  height: 8,
                  background: i === stepIndex ? 'white' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>
          <span className="text-white/60 text-[12px] font-medium">
            Step {stepIndex + 1} of {totalSteps}
          </span>
        </div>

        <div className="relative z-10 text-center pb-12">
          <h1 className="font-display text-white text-[28px] leading-tight">
            Add your first supplement
          </h1>
          <p className="text-white/60 text-[14px] mt-2 font-light">
            You can add more from your cabinet later
          </p>
        </div>

        <div className="absolute -bottom-[2px] left-0 right-0">
          <Wave />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col px-5 pt-6 pb-10">
        <div className="w-full max-w-[440px] mx-auto flex flex-col flex-1">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-ink3 text-[13px] mb-6 cursor-pointer w-fit hover:text-ink2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          <div className="flex flex-col gap-4 flex-1">
            <InputField
              label="Supplement name"
              placeholder="e.g. Creatine, Omega-3, Vitamin D"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <InputField
              label="Dose"
              placeholder="e.g. 5g, 1000mg, 2 capsules"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              required
            />

            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-ink2">Timing</label>
              <select
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
                className="border border-border rounded-[14px] px-4 py-[13px] text-[15px] text-ink1 outline-none focus:border-orange transition-colors bg-white appearance-none cursor-pointer"
              >
                {TIMING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-[13px] text-red-500 bg-red-50 border border-red-100 rounded-[10px] px-4 py-3">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleContinue}
              disabled={!canSubmit || loading}
              className="w-full rounded-pill bg-orange text-white text-[15px] font-medium py-[15px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-dk"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
            <button
              onClick={onSkip}
              className="w-full text-center text-[14px] text-ink3 hover:text-ink2 transition-colors cursor-pointer py-2"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
