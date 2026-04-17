import { useState } from 'react'
import Wave from '../../components/Wave'
import { api } from '../../services/api'
import { useLanguage } from '../../context/LanguageContext'

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`

function InputField({ label, type = 'text', placeholder, value, onChange }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-medium text-ink2">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        inputMode={type === 'number' ? 'numeric' : undefined}
        className="border border-border rounded-[14px] px-4 py-[13px] text-[15px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors bg-white"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-medium text-ink2">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-border rounded-[14px] px-4 py-[13px] text-[15px] text-ink1 outline-none focus:border-orange transition-colors bg-white appearance-none cursor-pointer"
        >
          <option value="">—</option>
          {options.map(({ value: v, label: l }) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}

export default function BodyStats({ onNext, onBack, onSkip, stepIndex, totalSteps }) {
  const { t } = useLanguage()
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [sex, setSex] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const hasAnyValue = age || height || weight || sex || activityLevel

  const SEX_OPTIONS = [
    { value: 'male',              label: t('onboardingBodySexMale') },
    { value: 'female',            label: t('onboardingBodySexFemale') },
    { value: 'other',             label: t('onboardingBodySexOther') },
    { value: 'prefer_not_to_say', label: t('onboardingBodySexPreferNot') },
  ]

  const ACTIVITY_OPTIONS = [
    { value: 'sedentary',   label: t('onboardingBodyActivitySedentary') },
    { value: 'light',       label: t('onboardingBodyActivityLight') },
    { value: 'moderate',    label: t('onboardingBodyActivityModerate') },
    { value: 'active',      label: t('onboardingBodyActivityActive') },
    { value: 'very_active', label: t('onboardingBodyActivityVeryActive') },
  ]

  async function handleContinue() {
    setError('')
    setLoading(true)
    try {
      const bodyData = {}
      if (age)           bodyData.age           = age
      if (height)        bodyData.height        = height
      if (weight)        bodyData.weight        = weight
      if (sex)           bodyData.sex           = sex
      if (activityLevel) bodyData.activityLevel = activityLevel

      if (Object.keys(bodyData).length > 0) {
        await api.profile.update({ body: bodyData })
      }
      onNext()
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
            {t('onboardingStep', stepIndex + 1, totalSteps)}
          </span>
        </div>

        <div className="relative z-10 text-center pb-12">
          <h1 className="font-display text-white text-[28px] leading-tight">
            {t('onboardingBodyTitle')}
          </h1>
          <p className="text-white/60 text-[14px] mt-2 font-light">
            {t('onboardingBodySub')}
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
            {t('onboardingBack')}
          </button>

          <div className="flex flex-col gap-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label={t('onboardingBodyAge')}
                type="number"
                placeholder={t('onboardingBodyAgePlaceholder')}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
              <SelectField
                label={t('onboardingBodySex')}
                value={sex}
                onChange={setSex}
                options={SEX_OPTIONS}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label={t('onboardingBodyHeight')}
                type="number"
                placeholder={t('onboardingBodyHeightPlaceholder')}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
              <InputField
                label={t('onboardingBodyWeight')}
                type="number"
                placeholder={t('onboardingBodyWeightPlaceholder')}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <SelectField
              label={t('onboardingBodyActivity')}
              value={activityLevel}
              onChange={setActivityLevel}
              options={ACTIVITY_OPTIONS}
            />

            {error && (
              <p className="text-[13px] text-[#C05A28] bg-[#FDE8DE] border border-[#E8C4B0] rounded-[10px] px-4 py-3">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full rounded-pill bg-orange text-white text-[15px] font-medium py-[15px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-dk"
            >
              {loading ? t('savingEllipsis') : t('onboardingContinue')}
            </button>
            {!hasAnyValue && (
              <button
                onClick={onSkip}
                className="w-full text-center text-[14px] text-ink3 hover:text-ink2 transition-colors cursor-pointer py-2"
              >
                {t('onboardingBodySkip')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
