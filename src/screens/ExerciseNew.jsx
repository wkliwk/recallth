import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const ACTIVITY_TYPES = [
  { value: 'gym', labelKey: 'Gym' },
  { value: 'running', labelKey: 'Running' },
  { value: 'swimming', labelKey: 'Swimming' },
  { value: 'basketball', labelKey: 'Basketball' },
  { value: 'badminton', labelKey: 'Badminton' },
  { value: 'other', labelKey: 'Other' },
]

const INTENSITIES = [
  { value: 'easy', key: 'intensityEasy' },
  { value: 'moderate', key: 'intensityModerate' },
  { value: 'hard', key: 'intensityHard' },
]

function todayISO() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const inputClass =
  'w-full bg-sand border-0 rounded-[12px] px-4 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 outline-none focus:ring-2 focus:ring-orange transition-all'

const numInputClass =
  'bg-sand border-0 rounded-[10px] px-3 py-2 text-[14px] text-ink1 outline-none focus:ring-2 focus:ring-orange w-[72px] text-center'

export default function ExerciseNew() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [activityType, setActivityType] = useState('gym')
  const [customLabel, setCustomLabel] = useState('')
  const [date, setDate] = useState(todayISO())
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState('moderate')
  const [distanceKm, setDistanceKm] = useState('')
  const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '', weightKg: '' }])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addExercise() {
    setExercises(prev => [...prev, { name: '', sets: '', reps: '', weightKg: '' }])
  }

  function removeExercise(i) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateExercise(i, field, value) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  async function handleSave() {
    if (!duration || isNaN(Number(duration)) || Number(duration) <= 0) {
      setError('Please enter a valid duration.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload = {
        activityType,
        activityLabel: activityType === 'other' ? customLabel : undefined,
        date,
        durationMinutes: Number(duration),
        intensity,
        notes: notes.trim() || undefined,
      }
      if (activityType === 'running' || activityType === 'swimming') {
        if (distanceKm) payload.distanceKm = Number(distanceKm)
      }
      if (activityType === 'gym') {
        const validExercises = exercises
          .filter(ex => ex.name.trim())
          .map(ex => ({
            name: ex.name.trim(),
            sets: Number(ex.sets) || 1,
            reps: Number(ex.reps) || 1,
            weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
          }))
        if (validExercises.length > 0) payload.exercises = validExercises
      }
      await api.post('/exercise', payload)
      navigate('/exercise')
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-4 bg-page">
        <button
          onClick={() => navigate('/exercise')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-sand text-ink2"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[18px] font-semibold text-ink1">{t('logActivity')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32 flex flex-col gap-6">

        {/* Activity type */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">{t('activityType')}</label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map(a => (
              <button
                key={a.value}
                onClick={() => setActivityType(a.value)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  activityType === a.value
                    ? 'bg-orange text-white'
                    : 'bg-sand text-ink2'
                }`}
              >
                {a.labelKey}
              </button>
            ))}
          </div>
          {activityType === 'other' && (
            <input
              type="text"
              className={inputClass + ' mt-1'}
              placeholder="Activity name..."
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
            />
          )}
        </div>

        {/* Date */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">Date</label>
          <input
            type="date"
            className={inputClass}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">Duration</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              className={numInputClass + ' w-24'}
              placeholder="30"
              value={duration}
              onChange={e => setDuration(e.target.value)}
            />
            <span className="text-[14px] text-ink2">min</span>
          </div>
        </div>

        {/* Intensity */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">{t('intensity')}</label>
          <div className="flex gap-2">
            {INTENSITIES.map(i => (
              <button
                key={i.value}
                onClick={() => setIntensity(i.value)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  intensity === i.value
                    ? 'bg-orange text-white'
                    : 'bg-sand text-ink2'
                }`}
              >
                {t(i.key)}
              </button>
            ))}
          </div>
        </div>

        {/* Running / Swimming — distance */}
        {(activityType === 'running' || activityType === 'swimming') && (
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">Distance</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                className={numInputClass + ' w-24'}
                placeholder="5.0"
                value={distanceKm}
                onChange={e => setDistanceKm(e.target.value)}
              />
              <span className="text-[14px] text-ink2">km</span>
            </div>
          </div>
        )}

        {/* Gym — exercises */}
        {activityType === 'gym' && (
          <div className="flex flex-col gap-3">
            <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">Exercises</label>
            {exercises.map((ex, i) => (
              <div key={i} className="bg-white rounded-[14px] p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className={inputClass + ' flex-1'}
                    placeholder="Exercise name (e.g. Bench Press)"
                    value={ex.name}
                    onChange={e => updateExercise(i, 'name', e.target.value)}
                  />
                  {exercises.length > 1 && (
                    <button
                      onClick={() => removeExercise(i)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-sand text-ink3 flex-shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" className={numInputClass} placeholder="3" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} />
                    <span className="text-[12px] text-ink3">sets</span>
                  </div>
                  <span className="text-ink3">×</span>
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" className={numInputClass} placeholder="10" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} />
                    <span className="text-[12px] text-ink3">reps</span>
                  </div>
                  <span className="text-ink3">×</span>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" step="0.5" className={numInputClass} placeholder="60" value={ex.weightKg} onChange={e => updateExercise(i, 'weightKg', e.target.value)} />
                    <span className="text-[12px] text-ink3">kg</span>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addExercise}
              className="text-[13px] font-medium text-orange bg-orange-lt rounded-[12px] px-4 py-3 text-center"
            >
              {t('addExercise')}
            </button>
          </div>
        )}

        {/* Notes */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">Notes</label>
          <textarea
            className={inputClass + ' resize-none h-20'}
            placeholder="Optional notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-[13px] text-[#C05A28]">{error}</p>}
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-4 bg-page border-t border-[#EDE8E0]">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-orange text-white font-semibold text-[15px] py-4 rounded-full disabled:opacity-60"
        >
          {saving ? 'Saving...' : t('saveSession')}
        </button>
      </div>
    </div>
  )
}
