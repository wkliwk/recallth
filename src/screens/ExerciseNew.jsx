import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const QUICK_PROMPTS = [
  '今日做gym 60分鐘',
  '跑咗5公里，45分鐘',
  'Bench press 3x10 80kg, Squat 4x8 100kg',
  '打咗1個鐘羽毛球',
  '游水30分鐘',
]

const ACTIVITY_LABELS = {
  gym: 'Gym',
  running: 'Running',
  swimming: 'Swimming',
  basketball: 'Basketball',
  badminton: 'Badminton',
  cycling: 'Cycling',
  yoga: 'Yoga',
  hiking: 'Hiking',
  other: 'Other',
}

const INTENSITY_LABELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' }

const inputClass =
  'w-full bg-sand border-0 rounded-[12px] px-4 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 outline-none focus:ring-2 focus:ring-orange transition-all'

const numInputClass =
  'bg-sand border-0 rounded-[10px] px-3 py-2 text-[14px] text-ink1 outline-none focus:ring-2 focus:ring-orange w-[72px] text-center'

function todayISO() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function ExerciseNew() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan') // planned session to complete

  // AI input state
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsed, setParsed] = useState(null)

  // Manual form state (pre-filled from parsed or entered directly)
  const [showManual, setShowManual] = useState(false)
  const [activityType, setActivityType] = useState('gym')
  const [activityLabel, setActivityLabel] = useState('')
  const [date, setDate] = useState(todayISO())
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState('moderate')
  const [distanceKm, setDistanceKm] = useState('')
  const [exercises, setExercises] = useState([{ name: '', type: 'strength', sets: '', reps: '', weightKg: '', durationSec: '' }])
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Pre-fill form from planned session
  useEffect(() => {
    if (!planId) return
    api.exercise.get(planId).then(res => {
      const s = res?.data ?? res
      if (!s) return
      setActivityType(s.activityType || 'gym')
      setActivityLabel(s.activityLabel || '')
      setDate(s.date || todayISO())
      setDuration(s.durationMinutes ? String(s.durationMinutes) : '')
      setIntensity(s.intensity || 'moderate')
      setNotes(s.notes || '')
      setShowManual(true)
    }).catch(() => {})
  }, [planId])

  async function handleParse() {
    if (!text.trim()) return
    setParseError('')
    setParsed(null)
    setParsing(true)
    try {
      const res = await api.exercise.parse(text.trim())
      const d = res.data
      setParsed(d)
      // Pre-fill manual form too so "Edit manually" is populated
      setActivityType(d.activityType || 'gym')
      setActivityLabel(d.activityLabel || '')
      setDate(d.date || todayISO())
      setDuration(String(d.durationMinutes || ''))
      setIntensity(d.intensity || 'moderate')
      setDistanceKm(d.distanceKm ? String(d.distanceKm) : '')
      if (d.exercises?.length) {
        setExercises(d.exercises.map(ex => ({
          name: ex.name || '',
          type: ex.type === 'stretch' ? 'stretch' : 'strength',
          sets: String(ex.sets || ''),
          reps: String(ex.reps || ''),
          weightKg: ex.weightKg ? String(ex.weightKg) : '',
          durationSec: ex.durationMin ? String(Math.round(ex.durationMin * 60)) : '',
        })))
      }
      setNotes(d.notes || '')
    } catch {
      setParseError('Failed to parse. Try again or fill manually.')
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    const useParsed = !!parsed && !showManual
    const payload = {
      activityType: useParsed ? parsed.activityType : activityType,
      activityLabel: (useParsed
        ? parsed.activityLabel
        : (activityType === 'other' ? activityLabel : undefined)) || undefined,
      date: useParsed ? parsed.date : date,
      durationMinutes: useParsed ? Number(parsed.durationMinutes) : Number(duration),
      intensity: useParsed ? parsed.intensity : intensity,
      notes: (useParsed ? parsed.notes : notes)?.trim() || undefined,
    }

    if (!payload.durationMinutes || payload.durationMinutes <= 0) {
      setSaveError('Duration is missing — please fill manually.')
      setShowManual(true)
      return
    }

    const type = payload.activityType
    if (useParsed) {
      if ((type === 'running' || type === 'swimming' || type === 'cycling' || type === 'hiking') && parsed.distanceKm) {
        payload.distanceKm = Number(parsed.distanceKm)
      }
      if (type === 'gym' && parsed.exercises?.length) {
        payload.exercises = parsed.exercises.map(ex => {
          if (ex.type === 'stretch') return {
            name: ex.name, type: 'stretch',
            sets: Number(ex.sets) || 1,
            durationMin: ex.durationMin ? Number(ex.durationMin) : undefined,
          }
          return {
            name: ex.name,
            sets: Number(ex.sets) || 1,
            reps: Number(ex.reps) || 1,
            weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
          }
        })
      }
    } else {
      if ((type === 'running' || type === 'swimming' || type === 'cycling' || type === 'hiking') && distanceKm) {
        payload.distanceKm = Number(distanceKm)
      }
      if (type === 'gym') {
        const valid = exercises.filter(ex => ex.name.trim()).map(ex => {
          if (ex.type === 'stretch') return {
            name: ex.name.trim(), type: 'stretch',
            sets: Number(ex.sets) || 1,
            durationMin: ex.durationSec ? Number(ex.durationSec) / 60 : undefined,
          }
          return {
            name: ex.name.trim(),
            sets: Number(ex.sets) || 1,
            reps: Number(ex.reps) || 1,
            weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
          }
        })
        if (valid.length) payload.exercises = valid
      }
    }

    setSaveError('')
    setSaving(true)
    try {
      await api.exercise.create(payload)
      // Delete the planned session now that it's been completed
      if (planId) {
        await api.exercise.remove(planId).catch(() => {})
      }
      navigate('/exercise')
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function addExercise() {
    setExercises(prev => [...prev, { name: '', type: 'strength', sets: '', reps: '', weightKg: '', durationSec: '' }])
  }
  function removeExercise(i) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateExercise(i, field, value) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  const hasParsed = !!parsed && !showManual

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

      <div className="flex-1 overflow-y-auto px-4 pb-32 flex flex-col gap-5">

        {/* AI text input */}
        <div className="flex flex-col gap-3">
          <textarea
            className={`${inputClass} resize-none`}
            style={{ minHeight: '96px' }}
            placeholder={t('exerciseAiPlaceholder')}
            value={text}
            onChange={e => { setText(e.target.value); setParsed(null); setShowManual(false) }}
          />

          {/* Quick prompt chips */}
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => { setText(p); setParsed(null); setShowManual(false) }}
                className="px-3 py-[6px] rounded-full bg-sand text-ink2 text-[12px] font-medium"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Parse button */}
          <button
            onClick={handleParse}
            disabled={parsing || !text.trim()}
            className="w-full bg-orange text-white font-semibold text-[14px] py-3 rounded-full disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {parsing ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                {t('parsing')}
              </>
            ) : t('parseWithAI')}
          </button>

          {parseError && <p className="text-[13px] text-[#C05A28]">{parseError}</p>}
        </div>

        {/* Parsed preview card */}
        {hasParsed && (
          <div className="bg-white rounded-[16px] p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink1">{t('parsedPreview')}</p>
              <button
                onClick={() => setShowManual(true)}
                className="text-[12px] text-orange font-medium"
              >
                {t('editManually')}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-orange/10 text-orange text-[12px] font-medium">
                {ACTIVITY_LABELS[parsed.activityType] || parsed.activityLabel || parsed.activityType}
              </span>
              <span className="px-3 py-1 rounded-full bg-sand text-ink2 text-[12px]">{parsed.date}</span>
              <span className="px-3 py-1 rounded-full bg-sand text-ink2 text-[12px]">{parsed.durationMinutes} min</span>
              <span className="px-3 py-1 rounded-full bg-sand text-ink2 text-[12px] capitalize">
                {INTENSITY_LABELS[parsed.intensity] || parsed.intensity}
              </span>
              {parsed.distanceKm && (
                <span className="px-3 py-1 rounded-full bg-sand text-ink2 text-[12px]">{parsed.distanceKm} km</span>
              )}
            </div>

            {parsed.exercises?.length > 0 && (
              <div className="flex flex-col gap-2">
                {parsed.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 bg-sand rounded-[10px] px-3 py-2">
                    <span className="flex-1 text-[13px] font-medium text-ink1">{ex.name}</span>
                    <span className="text-[12px] text-ink3">
                      {ex.type === 'stretch'
                        ? `${ex.sets}×${ex.durationMin ? Math.round(ex.durationMin * 60) + 'sec' : '—'}`
                        : `${ex.sets}×${ex.reps}${ex.weightKg ? ` @ ${ex.weightKg}kg` : ''}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {parsed.notes && (
              <p className="text-[12px] text-ink3 italic">{parsed.notes}</p>
            )}
          </div>
        )}

        {/* "Fill manually" toggle (shown when no parsed result yet) */}
        {!hasParsed && (
          <button
            onClick={() => setShowManual(v => !v)}
            className="flex items-center gap-2 text-[13px] text-ink3 font-medium self-start"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showManual ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
            {t('fillManually')}
          </button>
        )}

        {/* Manual form */}
        {showManual && (
          <div className="flex flex-col gap-5">
            {/* Activity type */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">{t('activityType')}</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setActivityType(value)}
                    className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                      activityType === value ? 'bg-orange text-white' : 'bg-sand text-ink2'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {activityType === 'other' && (
                <input
                  type="text"
                  className={inputClass + ' mt-1'}
                  placeholder="Activity name..."
                  value={activityLabel}
                  onChange={e => setActivityLabel(e.target.value)}
                />
              )}
            </div>

            {/* Date */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">Date</label>
              <input type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {/* Duration */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="1"
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
                {Object.entries(INTENSITY_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setIntensity(value)}
                    className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                      intensity === value ? 'bg-orange text-white' : 'bg-sand text-ink2'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance */}
            {(activityType === 'running' || activityType === 'swimming' || activityType === 'cycling' || activityType === 'hiking') && (
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">Distance</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" step="0.1"
                    className={numInputClass + ' w-24'}
                    placeholder="5.0"
                    value={distanceKm}
                    onChange={e => setDistanceKm(e.target.value)}
                  />
                  <span className="text-[14px] text-ink2">km</span>
                </div>
              </div>
            )}

            {/* Gym exercises */}
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
                    {/* Type toggle */}
                    <div className="flex items-center bg-sand rounded-full p-0.5 self-start">
                      <button
                        type="button"
                        onClick={() => updateExercise(i, 'type', 'strength')}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${ex.type !== 'stretch' ? 'bg-orange text-white shadow-sm' : 'text-ink3'}`}
                      >Strength</button>
                      <button
                        type="button"
                        onClick={() => updateExercise(i, 'type', 'stretch')}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${ex.type === 'stretch' ? 'bg-orange text-white shadow-sm' : 'text-ink3'}`}
                      >Timed</button>
                    </div>
                    {ex.type === 'stretch' ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <input type="number" min="1" className={numInputClass} placeholder="5" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} />
                          <span className="text-[12px] text-ink3">sets</span>
                        </div>
                        <span className="text-ink3">×</span>
                        <div className="flex items-center gap-1">
                          <input type="number" min="1" className={numInputClass} placeholder="30" value={ex.durationSec} onChange={e => updateExercise(i, 'durationSec', e.target.value)} />
                          <span className="text-[12px] text-ink3">sec</span>
                        </div>
                      </div>
                    ) : (
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
                    )}
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
          </div>
        )}

        {saveError && <p className="text-[13px] text-[#C05A28]">{saveError}</p>}
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-4 bg-page border-t border-[#EDE8E0]">
        <button
          onClick={handleSave}
          disabled={saving || (!hasParsed && !showManual)}
          className="w-full bg-orange text-white font-semibold text-[15px] py-4 rounded-full disabled:opacity-60"
        >
          {saving ? 'Saving...' : t('saveSession')}
        </button>
      </div>
    </div>
  )
}
