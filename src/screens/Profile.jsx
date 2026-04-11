import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import LanguageSelector from '../components/LanguageSelector'
import Chip from '../components/Chip'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

// ── Icons ──────────────────────────────────────────────────────────────────
function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────
function toCommaString(val) {
  return Array.isArray(val) ? val.join(', ') : (val ?? '')
}

function fromCommaString(val) {
  return val.split(',').map((s) => s.trim()).filter(Boolean)
}

function ReadRow({ label, value }) {
  const display =
    value === null || value === undefined || value === ''
      ? '—'
      : Array.isArray(value)
      ? value.join(', ')
      : String(value)

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-ink3 shrink-0">{label}</span>
      <span className="text-[12px] text-ink2 text-right">{display}</span>
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-[0.08em] text-ink3 font-medium">
        {label}
      </label>
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-border-md rounded-[10px] px-3 py-[8px] text-[13px] text-ink1 outline-none focus:border-orange-md transition-colors"
      />
    </div>
  )
}

function EditActions({ saving, error, onSave, onCancel }) {
  return (
    <>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 bg-orange text-white rounded-pill py-[9px] text-[12px] font-medium disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-border-md text-ink2 rounded-pill py-[9px] text-[12px] font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </>
  )
}

// ── Accordion wrapper that exposes an edit button when open ────────────────
function ProfileSection({ title, open, onToggle, onEdit, children }) {
  return (
    <div
      className={`rounded-[16px] px-[18px] py-[14px] transition-colors ${
        open ? 'bg-orange-lt' : 'bg-white'
      }`}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={onToggle}
      >
        <span
          className={`w-[5px] h-[5px] rounded-full shrink-0 ${
            open ? 'bg-orange-md' : 'bg-ink3'
          }`}
        />
        <span
          className={`flex-1 text-[13px] font-medium ${
            open ? 'text-orange-dk' : 'text-ink2'
          }`}
        >
          {title}
        </span>
        {open && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="text-orange-dk hover:text-orange transition-colors p-1 -mr-1"
            aria-label={`Edit ${title}`}
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {/* Content */}
      {open && (
        <div className="mt-3 pl-[13px]" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── About me ───────────────────────────────────────────────────────────────
function AboutSection({ data, onSave }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setDraft(data) }, [data])

  function set(key, val) { setDraft((prev) => ({ ...prev, [key]: val })) }

  function cancel() { setEditing(false); setDraft(data); setError(null) }

  async function save() {
    setSaving(true); setError(null)
    try { await onSave({ body: draft }); setEditing(false) }
    catch { setError('Failed to save — try again') }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title="About me"
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field label="Age" value={draft.age} onChange={(v) => set('age', v)} />
          <Field label="Height" value={draft.height} onChange={(v) => set('height', v)} />
          <Field label="Weight" value={draft.weight} onChange={(v) => set('weight', v)} />
          <Field label="Gender" value={draft.gender} onChange={(v) => set('gender', v)} />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label="Age" value={data.age} />
          <ReadRow label="Height" value={data.height} />
          <ReadRow label="Weight" value={data.weight} />
          <ReadRow label="Gender" value={data.gender} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Goals ──────────────────────────────────────────────────────────────────
function GoalsSection({ data, onSave }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setDraft(data) }, [data])

  function set(key, val) { setDraft((prev) => ({ ...prev, [key]: val })) }

  function cancel() { setEditing(false); setDraft(data); setError(null) }

  async function save() {
    setSaving(true); setError(null)
    try { await onSave({ goals: draft }); setEditing(false) }
    catch { setError('Failed to save — try again') }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title="Goals"
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field
            label="Primary goal"
            value={draft.primaryGoal}
            onChange={(v) => set('primaryGoal', v)}
          />
          <Field
            label="Goals (comma separated)"
            value={toCommaString(draft.primary)}
            onChange={(v) => set('primary', fromCommaString(v))}
          />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {Array.isArray(data.primary) && data.primary.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {data.primary.map((g) => (
                <Chip key={g}>{g}</Chip>
              ))}
            </div>
          )}
          <ReadRow label="Primary goal" value={data.primaryGoal} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Exercise ───────────────────────────────────────────────────────────────
function ExerciseSection({ data, onSave }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setDraft(data) }, [data])

  function set(key, val) { setDraft((prev) => ({ ...prev, [key]: val })) }

  function cancel() { setEditing(false); setDraft(data); setError(null) }

  async function save() {
    setSaving(true); setError(null)
    try { await onSave({ exercise: draft }); setEditing(false) }
    catch { setError('Failed to save — try again') }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title="Exercise"
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field label="Frequency" value={draft.frequency} onChange={(v) => set('frequency', v)} />
          <Field label="Type" value={draft.type} onChange={(v) => set('type', v)} />
          <Field label="Fitness level" value={draft.fitnessLevel} onChange={(v) => set('fitnessLevel', v)} />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label="Frequency" value={data.frequency} />
          <ReadRow label="Type" value={data.type} />
          <ReadRow label="Fitness level" value={data.fitnessLevel} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Diet ───────────────────────────────────────────────────────────────────
function DietSection({ data, onSave }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setDraft(data) }, [data])

  function set(key, val) { setDraft((prev) => ({ ...prev, [key]: val })) }

  function cancel() { setEditing(false); setDraft(data); setError(null) }

  async function save() {
    setSaving(true); setError(null)
    try { await onSave({ diet: draft }); setEditing(false) }
    catch { setError('Failed to save — try again') }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title="Diet"
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field
            label="Restrictions (comma separated)"
            value={toCommaString(draft.restrictions)}
            onChange={(v) => set('restrictions', fromCommaString(v))}
          />
          <Field
            label="Allergies (comma separated)"
            value={toCommaString(draft.allergies)}
            onChange={(v) => set('allergies', fromCommaString(v))}
          />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label="Restrictions" value={data.restrictions} />
          <ReadRow label="Allergies" value={data.allergies} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Sleep ──────────────────────────────────────────────────────────────────
function SleepSection({ data, onSave }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setDraft(data) }, [data])

  function set(key, val) { setDraft((prev) => ({ ...prev, [key]: val })) }

  function cancel() { setEditing(false); setDraft(data); setError(null) }

  async function save() {
    setSaving(true); setError(null)
    try { await onSave({ sleep: draft }); setEditing(false) }
    catch { setError('Failed to save — try again') }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title="Sleep"
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field
            label="Hours per night"
            value={draft.hoursPerNight}
            onChange={(v) => set('hoursPerNight', v)}
          />
          <Field
            label="Issues (comma separated)"
            value={toCommaString(draft.issues)}
            onChange={(v) => set('issues', fromCommaString(v))}
          />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label="Hours per night" value={data.hoursPerNight} />
          <ReadRow label="Issues" value={data.issues} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Lifestyle ──────────────────────────────────────────────────────────────
function LifestyleSection({ data, onSave }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setDraft(data) }, [data])

  function set(key, val) { setDraft((prev) => ({ ...prev, [key]: val })) }

  function cancel() { setEditing(false); setDraft(data); setError(null) }

  async function save() {
    setSaving(true); setError(null)
    try { await onSave({ lifestyle: draft }); setEditing(false) }
    catch { setError('Failed to save — try again') }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title="Lifestyle"
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field label="Stress level" value={draft.stressLevel} onChange={(v) => set('stressLevel', v)} />
          <Field label="Smoking status" value={draft.smokingStatus} onChange={(v) => set('smokingStatus', v)} />
          <Field label="Alcohol consumption" value={draft.alcoholConsumption} onChange={(v) => set('alcoholConsumption', v)} />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label="Stress level" value={data.stressLevel} />
          <ReadRow label="Smoking" value={data.smokingStatus} />
          <ReadRow label="Alcohol" value={data.alcoholConsumption} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Empty state fallbacks ──────────────────────────────────────────────────
const EMPTY_BODY       = { weight: '', height: '', age: '', gender: '' }
const EMPTY_GOALS      = { primary: [], primaryGoal: '' }
const EMPTY_EXERCISE   = { frequency: '', type: '', fitnessLevel: '' }
const EMPTY_DIET       = { restrictions: [], allergies: [] }
const EMPTY_SLEEP      = { hoursPerNight: '', issues: [] }
const EMPTY_LIFESTYLE  = { stressLevel: '', smokingStatus: '', alcoholConsumption: '' }

// ── Main screen ────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate()
  const { email, clearAuth } = useAuth()
  const { t } = useLanguage()

  const [profileData, setProfileData] = useState(null)
  const [suppCount, setSuppCount]     = useState('—')
  const [conflictCount, setConflictCount] = useState('—')
  const [loadError, setLoadError]     = useState(null)

  const displayName   = email ? email.split('@')[0] : 'You'
  const avatarLetter  = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, cabinetRes, interactionsRes] = await Promise.allSettled([
          api.profile.get(),
          api.cabinet.list(),
          api.cabinet.interactions(),
        ])

        if (profileRes.status === 'fulfilled') {
          setProfileData(profileRes.value.data ?? null)
        } else {
          setLoadError('Could not load profile data')
        }

        if (cabinetRes.status === 'fulfilled') {
          const items = cabinetRes.value.data ?? cabinetRes.value
          setSuppCount(Array.isArray(items) ? String(items.length) : '0')
        }

        if (interactionsRes.status === 'fulfilled') {
          const items = interactionsRes.value.data ?? interactionsRes.value
          setConflictCount(Array.isArray(items) ? String(items.length) : '0')
        }
      } catch {
        setLoadError('Could not load profile data')
      }
    }
    load()
  }, [])

  const handleSave = useCallback(async (patch) => {
    const res = await api.profile.update(patch)
    setProfileData(res.data ?? null)
  }, [])

  const handleLogout = useCallback(() => {
    clearAuth()
    navigate('/auth?mode=login')
  }, [clearAuth, navigate])

  const stats = [
    { value: suppCount,     label: 'Supps' },
    { value: conflictCount, label: 'Conflicts' },
    { value: '14d',         label: 'Streak' },
  ]

  const quickActions = [
    { label: 'History',   path: '/history' },
    { label: 'Schedule',  path: '/schedule' },
    { label: 'Dashboard', path: '/home' },
  ]

  const bodyData      = profileData?.body      ?? EMPTY_BODY
  const goalsData     = profileData?.goals     ?? EMPTY_GOALS
  const exerciseData  = profileData?.exercise  ?? EMPTY_EXERCISE
  const dietData      = profileData?.diet      ?? EMPTY_DIET
  const sleepData     = profileData?.sleep     ?? EMPTY_SLEEP
  const lifestyleData = profileData?.lifestyle ?? EMPTY_LIFESTYLE

  return (
    <div className="min-h-screen bg-page pb-24">
      <OrangeHeader
        avatar={avatarLetter}
        title={displayName}
        subtitle={email ?? ''}
        pill={null}
        hasStats={true}
        stats={stats}
      />

      <div className="-mt-[40px]">
        <Wave />
      </div>

      {/* Quick action pills */}
      <div className="flex gap-3 px-5 py-4">
        {quickActions.map(({ label, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="flex-1 bg-white border-[1.5px] border-border-md rounded-pill py-[10px] text-center text-[12px] font-medium text-ink2 cursor-pointer"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Load error */}
      {loadError && (
        <p className="text-[12px] text-red-500 px-5 mb-3">{loadError}</p>
      )}

      {/* Accordion sections */}
      <div className="flex flex-col gap-3 px-5">
        <AboutSection    data={bodyData}      onSave={handleSave} />
        <GoalsSection    data={goalsData}     onSave={handleSave} />
        <ExerciseSection data={exerciseData}  onSave={handleSave} />
        <DietSection     data={dietData}      onSave={handleSave} />
        <SleepSection    data={sleepData}     onSave={handleSave} />
        <LifestyleSection data={lifestyleData} onSave={handleSave} />
      </div>

      {/* Language selector */}
      <div className="px-5 mt-6">
        <LanguageSelector />
      </div>

      {/* Logout */}
      <div className="px-5 mt-4">
        <button
          onClick={handleLogout}
          className="w-full border-[1.5px] border-orange text-orange rounded-pill py-[11px] text-[13px] font-medium cursor-pointer"
        >
          {t('logOut')}
        </button>
      </div>

    </div>
  )
}
