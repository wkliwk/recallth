import { useState, useEffect, useCallback, useRef } from 'react'
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

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-[0.08em] text-ink3 font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-border-md rounded-[10px] px-3 py-[8px] text-[13px] text-ink1 outline-none focus:border-orange-md transition-colors cursor-pointer"
        >
          <option value="">—</option>
          {options.map(({ value: v, label: l }) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}

const SEX_OPTIONS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
]

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',   label: 'Sedentary (little/no exercise)' },
  { value: 'light',       label: 'Lightly active (1–3x/week)' },
  { value: 'moderate',    label: 'Moderately active (3–5x/week)' },
  { value: 'active',      label: 'Active (6–7x/week)' },
  { value: 'very_active', label: 'Very active (2x/day)' },
]

function EditActions({ saving, error, onSave, onCancel }) {
  const { t } = useLanguage()
  return (
    <>
      {error && <p className="text-[12px] text-[#C05A28]">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 bg-orange text-white rounded-pill py-[9px] text-[12px] font-medium disabled:opacity-60 cursor-pointer"
        >
          {saving ? t('savingEllipsis') : t('saveButton')}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-border-md text-ink2 rounded-pill py-[9px] text-[12px] font-medium cursor-pointer"
        >
          {t('cancelButton')}
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
  const { t } = useLanguage()
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
    catch { setError(t('failedToSave')) }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title={t('aboutMe')}
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field label={t('fieldAge')} value={draft.age} onChange={(v) => set('age', v)} />
          <Field label={t('fieldHeight')} value={draft.height} onChange={(v) => set('height', v)} />
          <Field label={t('fieldWeight')} value={draft.weight} onChange={(v) => set('weight', v)} />
          <SelectField label={t('fieldGender')} value={draft.sex} onChange={(v) => set('sex', v)} options={SEX_OPTIONS} />
          <SelectField label={t('fieldActivityLevel')} value={draft.activityLevel} onChange={(v) => set('activityLevel', v)} options={ACTIVITY_OPTIONS} />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label={t('fieldAge')} value={data.age} />
          <ReadRow label={t('fieldHeight')} value={data.height} />
          <ReadRow label={t('fieldWeight')} value={data.weight} />
          <ReadRow label={t('fieldGender')} value={SEX_OPTIONS.find((o) => o.value === data.sex)?.label ?? data.sex} />
          <ReadRow label={t('fieldActivityLevel')} value={ACTIVITY_OPTIONS.find((o) => o.value === data.activityLevel)?.label ?? data.activityLevel} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Goals ──────────────────────────────────────────────────────────────────
function GoalsSection({ data, onSave }) {
  const { t } = useLanguage()
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
    catch { setError(t('failedToSave')) }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title={t('goalsSection')}
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field
            label={t('fieldPrimaryGoal')}
            value={draft.primaryGoal}
            onChange={(v) => set('primaryGoal', v)}
          />
          <Field
            label={t('fieldGoalsList')}
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
          <ReadRow label={t('fieldPrimaryGoal')} value={data.primaryGoal} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Exercise ───────────────────────────────────────────────────────────────
function ExerciseSection({ data, onSave }) {
  const { t } = useLanguage()
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
    catch { setError(t('failedToSave')) }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title={t('exerciseSection')}
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field label={t('fieldFrequency')} value={draft.frequency} onChange={(v) => set('frequency', v)} />
          <Field label={t('fieldType')} value={draft.type} onChange={(v) => set('type', v)} />
          <Field label={t('fieldFitnessLevel')} value={draft.fitnessLevel} onChange={(v) => set('fitnessLevel', v)} />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label={t('fieldFrequency')} value={data.frequency} />
          <ReadRow label={t('fieldType')} value={data.type} />
          <ReadRow label={t('fieldFitnessLevel')} value={data.fitnessLevel} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Diet ───────────────────────────────────────────────────────────────────
function DietSection({ data, onSave }) {
  const { t } = useLanguage()
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
    catch { setError(t('failedToSave')) }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title={t('dietSection')}
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field
            label={t('fieldRestrictions')}
            value={toCommaString(draft.restrictions)}
            onChange={(v) => set('restrictions', fromCommaString(v))}
          />
          <Field
            label={t('fieldAllergies')}
            value={toCommaString(draft.allergies)}
            onChange={(v) => set('allergies', fromCommaString(v))}
          />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label={t('fieldRestrictions')} value={data.restrictions} />
          <ReadRow label={t('fieldAllergies')} value={data.allergies} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Sleep ──────────────────────────────────────────────────────────────────
function SleepSection({ data, onSave }) {
  const { t } = useLanguage()
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
    catch { setError(t('failedToSave')) }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title={t('sleepSection')}
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field
            label={t('fieldHoursPerNight')}
            value={draft.hoursPerNight}
            onChange={(v) => set('hoursPerNight', v)}
          />
          <Field
            label={t('fieldIssues')}
            value={toCommaString(draft.issues)}
            onChange={(v) => set('issues', fromCommaString(v))}
          />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label={t('fieldHoursPerNight')} value={data.hoursPerNight} />
          <ReadRow label={t('fieldIssues')} value={data.issues} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Lifestyle ──────────────────────────────────────────────────────────────
function LifestyleSection({ data, onSave }) {
  const { t } = useLanguage()
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
    catch { setError(t('failedToSave')) }
    finally { setSaving(false) }
  }

  return (
    <ProfileSection
      title={t('lifestyleSection')}
      open={open}
      onToggle={() => setOpen((p) => !p)}
      onEdit={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field label={t('fieldStressLevel')} value={draft.stressLevel} onChange={(v) => set('stressLevel', v)} />
          <Field label={t('fieldSmokingStatus')} value={draft.smokingStatus} onChange={(v) => set('smokingStatus', v)} />
          <Field label={t('fieldAlcohol')} value={draft.alcoholConsumption} onChange={(v) => set('alcoholConsumption', v)} />
          <EditActions saving={saving} error={error} onSave={save} onCancel={cancel} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ReadRow label={t('fieldStressLevel')} value={data.stressLevel} />
          <ReadRow label={t('fieldSmokingStatus')} value={data.smokingStatus} />
          <ReadRow label={t('fieldAlcohol')} value={data.alcoholConsumption} />
        </div>
      )}
    </ProfileSection>
  )
}

// ── Security section ───────────────────────────────────────────────────────
function StatusBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#EAF7EE] text-[#2E7D4F] border border-[#B6DFC5] rounded-full px-3 py-[5px] text-[12px] font-medium">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {label}
    </span>
  )
}

function SetPasswordCard() {
  const { t } = useLanguage()
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [done, setDone]           = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (newPw.length < 8) {
      setError(t('securityPasswordTooShort'))
      return
    }
    if (newPw !== confirmPw) {
      setError(t('securityPasswordMismatch'))
      return
    }
    setSaving(true)
    try {
      await api.auth.setPassword(newPw)
      setDone(true)
    } catch (err) {
      setError(err.message ?? t('securityPasswordFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white border border-border rounded-[20px] p-5">
        <p className="text-[13px] font-medium text-ink2 mb-3">{t('securityPassword')}</p>
        <StatusBadge label={t('securityPasswordSet')} />
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-[20px] p-5">
      <p className="text-[13px] font-medium text-ink2 mb-1">{t('securitySetPassword')}</p>
      <p className="text-[11px] text-ink3 mb-4">{t('securitySetPasswordSub')}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-ink2">{t('securityNewPassword')}</label>
          <input
            type="password"
            placeholder={t('securityPasswordHint')}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="border border-border rounded-[14px] px-4 py-[13px] text-[15px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors bg-white"
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-ink2">{t('securityConfirmPassword')}</label>
          <input
            type="password"
            placeholder={t('securityRepeatPassword')}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="border border-border rounded-[14px] px-4 py-[13px] text-[15px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors bg-white"
          />
        </div>
        {error && (
          <p className="text-[13px] text-[#C05A28] bg-[#FDE8DE] border border-[#E8C4B0] rounded-[10px] px-4 py-3">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-pill bg-orange text-white py-[15px] text-[14px] font-medium disabled:opacity-60 cursor-pointer"
        >
          {saving ? t('savingEllipsis') : t('securitySetPassword')}
        </button>
      </form>
    </div>
  )
}

function LinkGoogleCard() {
  const { t } = useLanguage()
  const googleBtnRef  = useRef(null)
  const [linked, setLinked]   = useState(false)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const handleCredential = useCallback(async ({ credential }) => {
    setError(null)
    setLoading(true)
    try {
      await api.auth.linkGoogle(credential)
      setLinked(true)
    } catch (err) {
      setError(err.message ?? 'Failed to link Google account.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (linked || !googleClientId || !googleBtnRef.current) return

    const renderBtn = () => {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredential,
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        size: 'large',
        text: 'signin_with',
        width: googleBtnRef.current.offsetWidth || 400,
      })
    }

    if (window.google?.accounts?.id) {
      renderBtn()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = renderBtn
      document.head.appendChild(script)
    }
  }, [linked, googleClientId, handleCredential])

  if (linked) {
    return (
      <div className="bg-white border border-border rounded-[20px] p-5">
        <p className="text-[13px] font-medium text-ink2 mb-3">Google</p>
        <StatusBadge label={t('securityGoogleLinked')} />
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-[20px] p-5">
      <p className="text-[13px] font-medium text-ink2 mb-1">{t('securityLinkGoogle')}</p>
      <p className="text-[11px] text-ink3 mb-4">{t('securityLinkGoogleSub')}</p>
      {loading && <p className="text-[12px] text-ink3 mb-3">{t('securityLinking')}</p>}
      {error && (
        <p className="text-[13px] text-[#C05A28] bg-[#FDE8DE] border border-[#E8C4B0] rounded-[10px] px-4 py-3 mb-3">
          {error}
        </p>
      )}
      {googleClientId ? (
        <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
      ) : (
        <p className="text-[12px] text-ink4">{t('securityGoogleNotConfigured')}</p>
      )}
    </div>
  )
}

function SecuritySection({ hasPassword, googleLinked }) {
  const { t } = useLanguage()
  const bothSet = hasPassword && googleLinked

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink3 font-medium px-1">{t('securitySection')}</p>

      {bothSet ? (
        <div className="bg-white border border-border rounded-[20px] p-5 flex gap-3 flex-wrap">
          <StatusBadge label={t('securityPasswordSet')} />
          <StatusBadge label={t('securityGoogleLinked')} />
        </div>
      ) : (
        <>
          {!hasPassword  && <SetPasswordCard />}
          {!googleLinked && <LinkGoogleCard />}
        </>
      )}
    </div>
  )
}

// ── Empty state fallbacks ──────────────────────────────────────────────────
const EMPTY_BODY       = { weight: '', height: '', age: '', sex: '', activityLevel: '' }
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
  const [streakDays, setStreakDays]   = useState('—')
  const [loadError, setLoadError]     = useState(null)
  const [hasPassword, setHasPassword]   = useState(null)
  const [googleLinked, setGoogleLinked] = useState(null)

  const displayName   = email ? email.split('@')[0] : 'You'
  const avatarLetter  = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, cabinetRes, interactionsRes, streakRes, meRes] = await Promise.allSettled([
          api.profile.get(),
          api.cabinet.list(),
          api.cabinet.interactions(),
          api.intake.streak(),
          api.auth.me(),
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

        if (streakRes.status === 'fulfilled') {
          setStreakDays(`${streakRes.value?.currentStreak ?? 0}d`)
        }

        if (meRes.status === 'fulfilled') {
          const meData = meRes.value?.data ?? meRes.value
          setHasPassword(meData?.hasPassword ?? false)
          setGoogleLinked(meData?.googleLinked ?? false)
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
    { value: streakDays,    label: 'Streak' },
  ]

  const quickActions = [
    { label: t('profileHistory'),  path: '/history' },
    { label: t('profileSchedule'), path: '/schedule' },
    { label: t('profileDashboard'), path: '/home' },
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

      <div className="-mt-[40px] md:mt-0">
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
        <p className="text-[12px] text-[#C05A28] px-5 mb-3">{loadError}</p>
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

      {/* Security */}
      {hasPassword !== null && (
        <div className="px-5 mt-6">
          <SecuritySection hasPassword={hasPassword} googleLinked={googleLinked} />
        </div>
      )}

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
