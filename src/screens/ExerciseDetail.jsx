import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { useChatPage } from '../context/ChatPageContext'

const ACTIVITY_ICONS = {
  running: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="1.5"/>
      <path d="M6 20l3.5-5 2.5 3 3.5-4.5"/>
      <path d="M9 8l-1 4h5l2-4"/>
      <path d="M15 13l2 4"/>
    </svg>
  ),
  swimming: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1.5-1 3-.5 4 .5s2.5 1.5 4 .5 2.5-1.5 4-.5 2.5 1.5 4 .5"/>
      <path d="M2 17c1.5-1 3-.5 4 .5s2.5 1.5 4 .5 2.5-1.5 4-.5 2.5 1.5 4 .5"/>
      <circle cx="14" cy="6" r="1.5"/>
      <path d="M10 8l2-2 3 3-2 3H9l-2-2"/>
    </svg>
  ),
  basketball: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3a9 9 0 0 0 3 6 9 9 0 0 0-3 6"/>
      <path d="M12 3a9 9 0 0 1-3 6 9 9 0 0 1 3 6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  ),
  badminton: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3a9 9 0 0 0 3 6 9 9 0 0 0-3 6"/>
      <path d="M12 3a9 9 0 0 1-3 6 9 9 0 0 1 3 6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  ),
  cycling: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="15" r="4"/>
      <circle cx="18" cy="15" r="4"/>
      <path d="M6 15l4-8h4l2 5"/>
      <circle cx="12" cy="5" r="1"/>
    </svg>
  ),
  yoga: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="1.5"/>
      <path d="M8 22v-4l4-4 4 4v4"/>
      <path d="M4 12c2-4 4-6 8-6s6 2 8 6"/>
    </svg>
  ),
  hiking: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22l5-10 4 5 3-7 6 12"/>
      <circle cx="14" cy="5" r="1.5"/>
    </svg>
  ),
}

const GymIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M2 8.5h2M2 15.5h2M20 8.5h2M20 15.5h2"/>
  </svg>
)

const ACTIVITY_LABELS = {
  gym: 'Gym', running: 'Running', swimming: 'Swimming', basketball: 'Basketball',
  badminton: 'Badminton', cycling: 'Cycling', yoga: 'Yoga', hiking: 'Hiking', other: 'Other',
}
const INTENSITY_LABELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' }
const DISTANCE_TYPES = new Set(['running', 'swimming', 'cycling', 'hiking'])

const inputClass = 'w-full bg-sand border-0 rounded-[12px] px-4 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 outline-none focus:ring-2 focus:ring-orange transition-all'
const numInputClass = 'bg-sand border-0 rounded-[10px] px-3 py-2 text-[14px] text-ink1 outline-none focus:ring-2 focus:ring-orange w-[72px] text-center'

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function activityLabel(type, label, t) {
  if (type === 'other' && label) return label
  const map = {
    gym: t('activityGym'), running: t('activityRunning'), swimming: t('activitySwimming'),
    basketball: t('activityBasketball'), badminton: t('activityBadminton'), cycling: t('activityCycling'),
    yoga: t('activityYoga'), hiking: t('activityHiking'), other: t('activityOther'),
  }
  return map[type] || type
}

function intensityLabel(intensity, t) {
  if (intensity === 'easy') return t('intensityEasy')
  if (intensity === 'moderate') return t('intensityModerate')
  if (intensity === 'hard') return t('intensityHard')
  return intensity || ''
}

function intensityColor(intensity) {
  if (intensity === 'easy') return 'bg-[#4CAF50]/10 text-[#2E7D32]'
  if (intensity === 'moderate') return 'bg-orange/10 text-orange'
  if (intensity === 'hard') return 'bg-[#D32F2F]/10 text-[#C62828]'
  return 'bg-sand text-ink2'
}

function buildExerciseSystemPrompt(session, name, t) {
  const lines = [
    `[Page context — Exercise Session]`,
    `Session ID: ${session._id}`,
    `Activity: ${name}`,
    `Date: ${session.date}`,
    `Duration: ${session.durationMinutes} minutes`,
    `Intensity: ${session.intensity || 'unknown'}`,
  ]
  if (session.distanceKm > 0) lines.push(`Distance: ${session.distanceKm} km`)
  if (session.exercises?.length > 0) {
    lines.push(`Exercises:`)
    session.exercises.forEach((ex) => {
      lines.push(`  - ${ex.name}: ${ex.sets} sets × ${ex.reps} reps${ex.weightKg ? ` @ ${ex.weightKg} kg` : ''}`)
    })
  }
  if (session.notes) lines.push(`Notes: ${session.notes}`)
  lines.push(`\nThe user is viewing this specific exercise session and may ask questions about their performance, improvement, or the workout itself. Answer in the same language the user writes in.`)
  return lines.join('\n')
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-sand rounded-[12px] px-4 py-3 flex items-center gap-3">
      <span className="text-orange">{icon}</span>
      <div>
        <p className="text-[11px] text-ink3">{label}</p>
        <p className="text-[15px] font-semibold text-ink1">{value}</p>
      </div>
    </div>
  )
}

function ExerciseRow({ row, onSave, onDelete }) {
  const [name, setName] = useState(row.name || '')
  const [sets, setSets] = useState(String(row.sets ?? ''))
  const [reps, setReps] = useState(String(row.reps ?? ''))
  const [weight, setWeight] = useState(String(row.weightKg ?? ''))
  const cur = useRef({})
  cur.current = { name, sets, reps, weight }

  function handleBlur() {
    onSave(cur.current)
  }

  function onKey(e) {
    if (e.key === 'Enter') e.target.blur()
  }

  const cell = 'text-[13px] bg-transparent text-center w-full outline-none focus:bg-sand rounded-[4px] py-0.5 px-0.5 tabular-nums'
  const nameCls = 'text-[14px] bg-transparent w-full outline-none focus:bg-sand rounded-[4px] py-0.5 px-1 text-ink1 placeholder:text-ink3/50 min-w-0'

  return (
    <div className="grid grid-cols-[1fr_44px_44px_56px_28px] items-center px-3 py-1 border-b border-[#EDE8E0] last:border-0">
      <input className={nameCls} value={name} onChange={e => setName(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="Exercise" />
      <input className={cell} type="number" min="1" value={sets} onChange={e => setSets(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
      <input className={cell} type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
      <input className={cell} type="number" min="0" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
      <button onClick={onDelete} className="text-ink3/60 hover:text-red-500 transition-colors text-[18px] leading-none flex items-center justify-center">×</button>
    </div>
  )
}

function ExerciseTable({ sessionId, initialExercises, onSaved }) {
  const [rows, setRows] = useState(
    (initialExercises ?? []).map(ex => ({
      id: Math.random(),
      name: ex.name || '',
      sets: ex.sets ?? '',
      reps: ex.reps ?? '',
      weightKg: ex.weightKg ?? '',
    }))
  )
  const [saving, setSaving] = useState(false)

  const saveRows = useCallback(async (updatedRows) => {
    setSaving(true)
    try {
      const exercises = updatedRows
        .filter(r => r.name.trim())
        .map(r => ({
          name: r.name.trim(),
          sets: Number(r.sets) || 1,
          reps: Number(r.reps) || 1,
          ...(r.weightKg !== '' && r.weightKg != null && !isNaN(Number(r.weightKg)) ? { weightKg: Number(r.weightKg) } : {}),
        }))
      const res = await api.exercise.update(sessionId, { exercises })
      onSaved(res.data ?? res)
    } finally {
      setSaving(false)
    }
  }, [sessionId, onSaved])

  function handleRowSave(i, cur) {
    const updated = rows.map((r, idx) => idx === i ? { ...r, name: cur.name, sets: cur.sets, reps: cur.reps, weightKg: cur.weight } : r)
    setRows(updated)
    saveRows(updated)
  }

  function handleDelete(i) {
    const updated = rows.filter((_, idx) => idx !== i)
    setRows(updated)
    saveRows(updated)
  }

  function addRow() {
    setRows(prev => [...prev, { id: Math.random(), name: '', sets: '', reps: '', weightKg: '' }])
  }

  return (
    <div className="bg-white rounded-[16px] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_44px_44px_56px_28px] items-center px-3 pt-3 pb-2 border-b border-[#EDE8E0]">
        <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide px-1">Exercise</p>
        <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide text-center">Sets</p>
        <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide text-center">Reps</p>
        <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide text-center">kg</p>
        <div />
      </div>
      {rows.map((row, i) => (
        <ExerciseRow
          key={row.id}
          row={row}
          onSave={(cur) => handleRowSave(i, cur)}
          onDelete={() => handleDelete(i)}
        />
      ))}
      <button
        onClick={addRow}
        className="w-full py-2.5 text-[13px] text-orange font-medium flex items-center justify-center gap-1 border-t border-[#EDE8E0] hover:bg-sand/40 transition-colors cursor-pointer"
      >
        <span className="text-[16px] leading-none">+</span> Add exercise
      </button>
      {saving && (
        <p className="text-[10px] text-ink3 text-center py-1 border-t border-[#EDE8E0]">Saving…</p>
      )}
    </div>
  )
}

function EditSheet({ session, onClose, onSaved, t }) {
  const [activityType, setActivityType] = useState(session.activityType || 'gym')
  const [customLabel, setCustomLabel] = useState(session.activityLabel || '')
  const [date, setDate] = useState(session.date || '')
  const [duration, setDuration] = useState(String(session.durationMinutes || ''))
  const [intensity, setIntensity] = useState(session.intensity || 'moderate')
  const [distanceKm, setDistanceKm] = useState(session.distanceKm ? String(session.distanceKm) : '')
  const [exercises, setExercises] = useState(
    session.exercises?.length
      ? session.exercises.map(ex => ({
          name: ex.name || '',
          sets: String(ex.sets || ''),
          reps: String(ex.reps || ''),
          weightKg: ex.weightKg != null ? String(ex.weightKg) : '',
        }))
      : [{ name: '', sets: '', reps: '', weightKg: '' }]
  )
  const [notes, setNotes] = useState(session.notes || '')
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
    const dur = Number(duration)
    if (!dur || dur <= 0) { setError('Duration is required.'); return }

    const payload = {
      activityType,
      activityLabel: activityType === 'other' ? customLabel.trim() || undefined : undefined,
      date,
      durationMinutes: dur,
      intensity,
      notes: notes.trim() || undefined,
    }

    if (DISTANCE_TYPES.has(activityType) && distanceKm) {
      payload.distanceKm = Number(distanceKm)
    }
    if (activityType === 'gym') {
      const valid = exercises.filter(ex => ex.name.trim()).map(ex => ({
        name: ex.name.trim(),
        sets: Number(ex.sets) || 1,
        reps: Number(ex.reps) || 1,
        weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
      }))
      if (valid.length) payload.exercises = valid
    }

    setError('')
    setSaving(true)
    try {
      const res = await api.exercise.update(session._id, payload)
      onSaved(res.data ?? res)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(42,34,26,0.35)' }}>
      <div
        className="flex-1"
        onClick={onClose}
      />
      <div
        className="bg-page rounded-t-[24px] flex flex-col"
        style={{ maxHeight: '90dvh', animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <button onClick={onClose} className="text-[14px] text-ink3 font-medium">{t('cancel')}</button>
          <p className="text-[16px] font-semibold text-ink1">{t('editSession')}</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[14px] font-semibold text-orange disabled:opacity-50"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] flex flex-col gap-5">

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
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
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
            <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">{t('duration')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="1"
                className={numInputClass + ' w-24'}
                placeholder="60"
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
          {DISTANCE_TYPES.has(activityType) && (
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">{t('distance')}</label>
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
              <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">{t('exercises')}</label>
              {exercises.map((ex, i) => (
                <div key={i} className="bg-white rounded-[14px] p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className={inputClass + ' flex-1'}
                      placeholder="Exercise name"
                      value={ex.name}
                      onChange={e => updateExercise(i, 'name', e.target.value)}
                    />
                    {exercises.length > 1 && (
                      <button
                        onClick={() => removeExercise(i)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-sand text-ink3 shrink-0"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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
                    <span className="text-ink3">@</span>
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" step="0.5" className={numInputClass} placeholder="60" value={ex.weightKg} onChange={e => updateExercise(i, 'weightKg', e.target.value)} />
                      <span className="text-[12px] text-ink3">kg</span>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addExercise}
                className="text-[13px] font-medium text-orange bg-orange/10 rounded-[12px] px-4 py-3 text-center"
              >
                {t('addExercise')}
              </button>
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-ink2 uppercase tracking-wide">{t('notes')}</label>
            <textarea
              className={inputClass + ' resize-none h-20'}
              placeholder="Optional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-[13px] text-[#C05A28]">{error}</p>}

          {/* Full-width confirm button at bottom */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-full bg-orange text-white font-semibold text-[15px] disabled:opacity-60"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default function ExerciseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { setChatContext, clearChatContext } = useChatPage()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await api.exercise.get(id)
        const data = res.data ?? res
        setSession(data)
      } catch {
        setError('Session not found.')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => clearChatContext()
  }, [id])

  useEffect(() => {
    if (!session) return
    const name = activityLabel(session.activityType, session.activityLabel, t)
    setChatContext({
      title: name,
      placeholder: t('chatExerciseContextPlaceholder'),
      data: session,
      systemPrompt: buildExerciseSystemPrompt(session, name, t),
    })
  }, [session])

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.exercise.remove(id)
      navigate('/exercise')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-4">
          <div className="w-9 h-9 rounded-full bg-sand animate-pulse" />
          <div className="h-5 w-32 bg-sand rounded animate-pulse" />
        </div>
        <div className="px-4 flex flex-col gap-4 mt-4">
          <div className="h-28 rounded-[16px] bg-sand animate-pulse" />
          <div className="h-16 rounded-[16px] bg-sand animate-pulse" />
          <div className="h-24 rounded-[16px] bg-sand animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center gap-4">
        <p className="text-[14px] text-ink3">{error || 'Session not found.'}</p>
        <button onClick={() => navigate('/exercise')} className="text-orange text-[14px] font-medium">{t('back')}</button>
      </div>
    )
  }

  const icon = ACTIVITY_ICONS[session.activityType] ?? GymIcon
  const name = activityLabel(session.activityType, session.activityLabel, t)

  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-4 bg-page">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/exercise')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-sand text-ink2"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h1 className="text-[18px] font-semibold text-ink1">{name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-sand text-ink2"
            aria-label="Edit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-sand text-ink3"
            aria-label="Delete"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-5 max-w-[640px]">

        {/* Hero card */}
        <div className="bg-white rounded-[18px] p-5 shadow-sm flex items-center gap-4">
          <span className="w-14 h-14 rounded-[14px] bg-orange/10 flex items-center justify-center text-orange shrink-0">
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[20px] font-semibold text-ink1 capitalize">{name}</p>
            <p className="text-[13px] text-ink3 mt-[2px]">{formatDate(session.date)}</p>
            <span className={`inline-block mt-2 text-[12px] font-medium px-3 py-[3px] rounded-full capitalize ${intensityColor(session.intensity)}`}>
              {intensityLabel(session.intensity, t)}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>}
            label={t('duration')}
            value={`${session.durationMinutes} min`}
          />
          {session.distanceKm > 0 && (
            <StatCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>}
              label={t('distance')}
              value={`${session.distanceKm} km`}
            />
          )}
        </div>

        {/* Gym exercises — inline editable table */}
        {(session.activityType === 'gym' || session.exercises?.length > 0) && (
          <ExerciseTable
            sessionId={session._id}
            initialExercises={session.exercises ?? []}
            onSaved={(updated) => setSession(updated)}
          />
        )}

        {/* Notes */}
        {session.notes && (
          <div className="bg-white rounded-[16px] p-4 shadow-sm">
            <p className="text-[13px] font-semibold text-ink2 uppercase tracking-wide mb-2">{t('notes')}</p>
            <p className="text-[14px] text-ink2 leading-relaxed">{session.notes}</p>
          </div>
        )}
      </div>

      {/* Edit sheet */}
      {showEdit && (
        <EditSheet
          session={session}
          t={t}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setSession(updated)
            setShowEdit(false)
          }}
        />
      )}

      {/* Delete confirmation sheet */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(false)} />
          <div className="relative w-full max-w-[420px] bg-white rounded-t-[24px] md:rounded-[20px] px-5 py-6 flex flex-col gap-4 mx-auto">
            <p className="text-[17px] font-semibold text-ink1 text-center">{t('deleteSession')}</p>
            <p className="text-[14px] text-ink3 text-center">{t('deleteSessionConfirm')}</p>
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-3 rounded-full bg-[#D32F2F] text-white font-semibold text-[15px] disabled:opacity-60"
              >
                {deleting ? t('deleting') : t('deleteConfirmBtn')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full py-3 rounded-full bg-sand text-ink2 font-medium text-[15px]"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
