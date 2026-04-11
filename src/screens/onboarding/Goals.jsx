import { useState } from 'react'
import Wave from '../../components/Wave'

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`

const GOAL_OPTIONS = [
  { id: 'muscle', emoji: '💪', label: 'Muscle & strength' },
  { id: 'recovery', emoji: '🔄', label: 'Recovery' },
  { id: 'sleep', emoji: '😴', label: 'Better sleep' },
  { id: 'energy', emoji: '⚡', label: 'More energy' },
  { id: 'health', emoji: '🌿', label: 'General health' },
  { id: 'weight', emoji: '⚖️', label: 'Weight management' },
]

export default function Goals({ onNext, stepIndex, totalSteps }) {
  const [selected, setSelected] = useState([])

  function toggleGoal(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  function handleContinue() {
    if (selected.length === 0) return
    onNext({ goals: selected })
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
            What are your goals?
          </h1>
          <p className="text-white/60 text-[14px] mt-2 font-light">
            Select all that apply
          </p>
        </div>

        <div className="absolute -bottom-[2px] left-0 right-0">
          <Wave />
        </div>
      </div>

      {/* Goal grid */}
      <div className="flex-1 flex flex-col px-5 pt-6 pb-10">
        <div className="w-full max-w-[440px] mx-auto flex flex-col flex-1">
          <div className="grid grid-cols-2 gap-3 flex-1">
            {GOAL_OPTIONS.map((goal) => {
              const isSelected = selected.includes(goal.id)
              return (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className="flex flex-col items-center justify-center gap-2 rounded-[20px] border-2 p-5 transition-all duration-150 cursor-pointer text-center"
                  style={{
                    borderColor: isSelected ? '#E07B4A' : '#EDE8E0',
                    background: isSelected ? '#FDE8DE' : 'white',
                  }}
                >
                  <span className="text-[28px] leading-none">{goal.emoji}</span>
                  <span
                    className="text-[14px] font-medium leading-tight"
                    style={{ color: isSelected ? '#C05A28' : '#2A221A' }}
                  >
                    {goal.label}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={selected.length === 0}
            className="mt-6 w-full rounded-pill text-white text-[15px] font-medium py-[15px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: selected.length > 0 ? '#E07B4A' : '#E07B4A' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
