import { useState } from 'react'
import Wave from '../../components/Wave'
import { api } from '../../services/api'
import { useLanguage } from '../../context/LanguageContext'

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`

const SCHEDULE_OPTIONS = [
  {
    value: 'morning',
    emoji: '☀️',
    titleKey: 'onboardingSchedMorning',
    descriptionKey: 'onboardingSchedMorningSub',
  },
  {
    value: 'evening',
    emoji: '🌙',
    titleKey: 'onboardingSchedEvening',
    descriptionKey: 'onboardingSchedEveningSub',
  },
]

export default function Schedule({ onFinish, onBack, stepIndex, totalSteps }) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleFinish() {
    if (!selected) return
    setError('')
    setLoading(true)
    try {
      await api.profile.update({
        lifestyle: { schedulePreference: selected },
      })
      onFinish()
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
            {t('onboardingSchedTitle')}
          </h1>
          <p className="text-white/60 text-[14px] mt-2 font-light">
            {t('onboardingSchedSub')}
          </p>
        </div>

        <div className="absolute -bottom-[2px] left-0 right-0">
          <Wave />
        </div>
      </div>

      {/* Schedule options */}
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

          <div className="flex flex-col gap-3 flex-1">
            {SCHEDULE_OPTIONS.map((option) => {
              const isSelected = selected === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => setSelected(option.value)}
                  className="flex items-center gap-4 rounded-[20px] border-2 p-5 text-left transition-all duration-150 cursor-pointer w-full"
                  style={{
                    borderColor: isSelected ? '#E07B4A' : '#EDE8E0',
                    background: isSelected ? '#FDE8DE' : 'white',
                  }}
                >
                  <span className="text-[36px] leading-none shrink-0">{option.emoji}</span>
                  <div>
                    <p
                      className="text-[16px] font-medium leading-tight"
                      style={{ color: isSelected ? '#C05A28' : '#2A221A' }}
                    >
                      {t(option.titleKey)}
                    </p>
                    <p
                      className="text-[13px] mt-1 leading-snug"
                      style={{ color: isSelected ? '#C05A28' : '#7A6A5A' }}
                    >
                      {t(option.descriptionKey)}
                    </p>
                  </div>
                  {isSelected && (
                    <div
                      className="ml-auto shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                      style={{ background: '#E07B4A' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}

            {error && (
              <p className="text-[13px] text-[#C05A28] bg-[#FDE8DE] border border-[#E8C4B0] rounded-[10px] px-4 py-3">
                {error}
              </p>
            )}
          </div>

          <button
            onClick={handleFinish}
            disabled={!selected || loading}
            className="mt-6 w-full rounded-pill bg-orange text-white text-[15px] font-medium py-[15px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-dk"
          >
            {loading ? 'Saving…' : t('onboardingFinish')}
          </button>
        </div>
      </div>
    </div>
  )
}
