import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Goals from './onboarding/Goals'
import BodyStats from './onboarding/BodyStats'
import Supplement from './onboarding/Supplement'
import Schedule from './onboarding/Schedule'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

// Steps: 0=Goals, 1=BodyStats, 2=Supplement, 3=Schedule
const TOTAL_STEPS = 4

export default function Onboarding() {
  const navigate = useNavigate()
  const { clearNewUser } = useAuth()
  const [step, setStep] = useState(0)

  // Clear the new-user flag so PublicRoute resumes normal redirect behaviour
  useEffect(() => { clearNewUser() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGoalsNext(data) {
    // Save goals to backend before advancing
    try {
      await api.profile.update({ goals: { primary: data.goals } })
    } catch {
      // Non-blocking — still advance even if save fails
    }
    setStep(1)
  }

  function handleBodyStatsNext() {
    setStep(2)
  }

  function handleSupplementNext() {
    setStep(3)
  }

  function handleSupplementSkip() {
    setStep(3)
  }

  function handleScheduleFinish() {
    navigate('/home')
  }

  if (step === 0) {
    return (
      <Goals
        onNext={handleGoalsNext}
        stepIndex={0}
        totalSteps={TOTAL_STEPS}
      />
    )
  }

  if (step === 1) {
    return (
      <BodyStats
        onNext={handleBodyStatsNext}
        onBack={() => setStep(0)}
        onSkip={handleBodyStatsNext}
        stepIndex={1}
        totalSteps={TOTAL_STEPS}
      />
    )
  }

  if (step === 2) {
    return (
      <Supplement
        onNext={handleSupplementNext}
        onBack={() => setStep(1)}
        onSkip={handleSupplementSkip}
        stepIndex={2}
        totalSteps={TOTAL_STEPS}
      />
    )
  }

  return (
    <Schedule
      onFinish={handleScheduleFinish}
      onBack={() => setStep(2)}
      stepIndex={3}
      totalSteps={TOTAL_STEPS}
    />
  )
}
