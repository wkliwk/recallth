import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Goals from './onboarding/Goals'
import Supplement from './onboarding/Supplement'
import Schedule from './onboarding/Schedule'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

const TOTAL_STEPS = 3

export default function Onboarding() {
  const navigate = useNavigate()
  const { clearNewUser } = useAuth()
  const [step, setStep] = useState(0)
  const [goalsData, setGoalsData] = useState(null)

  // Clear the new-user flag so PublicRoute resumes normal redirect behaviour
  useEffect(() => { clearNewUser() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGoalsNext(data) {
    setGoalsData(data)
    // Save goals to backend before advancing
    try {
      await api.profile.update({ goals: { primary: data.goals } })
    } catch {
      // Non-blocking — still advance even if save fails
    }
    setStep(1)
  }

  function handleSupplementNext() {
    setStep(2)
  }

  function handleSupplementSkip() {
    setStep(2)
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
      <Supplement
        onNext={handleSupplementNext}
        onBack={() => setStep(0)}
        onSkip={handleSupplementSkip}
        stepIndex={1}
        totalSteps={TOTAL_STEPS}
      />
    )
  }

  return (
    <Schedule
      onFinish={handleScheduleFinish}
      onBack={() => setStep(1)}
      stepIndex={2}
      totalSteps={TOTAL_STEPS}
    />
  )
}
