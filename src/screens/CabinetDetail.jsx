import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import { api } from '../services/api'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const TYPE_OPTIONS = ['Supplement', 'Medication', 'Vitamin', 'Herb', 'Other']
const FREQUENCY_OPTIONS = ['Daily', 'Twice daily', 'As needed']
const TIMING_OPTIONS = ['Morning', 'Pre-workout', 'With meals', 'Evening', 'Before bed']

const EVIDENCE_COLORS = {
  A: { bg: '#D4ECD8', text: '#2C5A38', label: 'Strong evidence' },
  B: { bg: '#DAE8F8', text: '#1A3A6A', label: 'Good evidence' },
  C: { bg: '#FAE8D0', text: '#7A4A1A', label: 'Moderate evidence' },
  D: { bg: '#FDE8DE', text: '#7A2A1A', label: 'Limited evidence' },
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 py-[10px] border-b border-border last:border-b-0">
      <span className="text-[12px] text-ink3 shrink-0">{label}</span>
      <span className="text-[14px] text-ink1 text-right">{value}</span>
    </div>
  )
}

function EditField({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium text-ink2">
        {label}
        {required && <span className="text-orange ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

const inputClass =
  'w-full bg-page border-[1.5px] border-border rounded-[12px] px-4 py-[10px] text-[14px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors'

const selectClass =
  'w-full bg-page border-[1.5px] border-border rounded-[12px] px-4 py-[10px] text-[14px] text-ink1 outline-none focus:border-orange transition-colors appearance-none cursor-pointer'

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */
function Skeleton() {
  return (
    <div className="px-5 pt-2 animate-pulse flex flex-col gap-4">
      <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-3">
        <div className="h-[20px] w-2/3 bg-sand rounded-pill" />
        <div className="h-[14px] w-1/2 bg-sand rounded-pill" />
        <div className="h-[14px] w-3/4 bg-sand rounded-pill" />
        <div className="h-[14px] w-1/3 bg-sand rounded-pill" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */
export default function CabinetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [supp, setSupp] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [listRes, interactRes] = await Promise.allSettled([
          api.cabinet.list(),
          api.cabinet.interactions(),
        ])

        if (listRes.status === 'fulfilled') {
          const items = listRes.value.data || []
          const found = items.find((s) => s._id === id)
          if (!found) {
            setError('Supplement not found')
          } else {
            setSupp(found)
            setForm({
              name: found.name || '',
              type: found.type || 'Supplement',
              dosage: found.dosage || '',
              frequency: found.frequency || 'Daily',
              timing: found.timing || 'Morning',
              brand: found.brand || '',
              notes: found.notes || '',
            })
          }
        } else {
          setError('Failed to load supplement')
        }

        if (interactRes.status === 'fulfilled') {
          setInteractions(interactRes.value.data || [])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const myInteractions = interactions.filter((ix) =>
    supp && ix.supplements && ix.supplements.some(
      (name) => name.toLowerCase() === supp.name.toLowerCase()
    )
  )

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate() {
    const errs = {}
    if (!form.name?.trim()) errs.name = 'Name is required'
    if (!form.dosage?.trim()) errs.dosage = 'Dosage is required'
    return errs
  }

  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        dosage: form.dosage.trim(),
        frequency: form.frequency,
        timing: form.timing,
        ...(form.brand?.trim() ? { brand: form.brand.trim() } : {}),
        ...(form.notes?.trim() ? { notes: form.notes.trim() } : {}),
      }
      const res = await api.cabinet.update(id, payload)
      setSupp(res.data || { ...supp, ...payload })
      setEditing(false)
      setFormErrors({})
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to save changes' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.cabinet.remove(id)
      navigate('/cabinet')
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to delete supplement' })
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const evidenceScore = supp?.evidenceScore
  const evidenceLevel = evidenceScore?.level
  const evidenceColors = EVIDENCE_COLORS[evidenceLevel] || null

  return (
    <div className="min-h-screen bg-page">
      <OrangeHeader
        title={supp?.name || 'Supplement'}
        subtitle={supp?.type || ''}
        onBack={() => navigate('/cabinet')}
      />

      <div className="-mt-[40px]">
        <Wave />
      </div>

      {loading ? (
        <div className="px-5 pt-2">
          <Skeleton />
        </div>
      ) : error ? (
        <div className="px-5 pt-8 text-center">
          <p className="text-ink3 text-[14px]">{error}</p>
        </div>
      ) : editing ? (
        /* Edit mode */
        <div className="px-5 pt-2 pb-[100px]">
          <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-4">

            <EditField label="Name" required error={formErrors.name}>
              <input
                className={inputClass}
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </EditField>

            <EditField label="Type">
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </EditField>

            <EditField label="Dosage" required error={formErrors.dosage}>
              <input
                className={inputClass}
                type="text"
                value={form.dosage}
                onChange={(e) => handleChange('dosage', e.target.value)}
                placeholder="e.g. 5g, 1000mg, 2 capsules"
              />
            </EditField>

            <EditField label="Frequency">
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.frequency}
                  onChange={(e) => handleChange('frequency', e.target.value)}
                >
                  {FREQUENCY_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </EditField>

            <EditField label="Timing">
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.timing}
                  onChange={(e) => handleChange('timing', e.target.value)}
                >
                  {TIMING_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </EditField>

            <EditField label="Brand (optional)">
              <input
                className={inputClass}
                type="text"
                value={form.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
              />
            </EditField>

            <EditField label="Notes (optional)">
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </EditField>
          </div>

          {formErrors.submit && (
            <p className="text-[13px] text-red-500 text-center mt-4">{formErrors.submit}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => { setEditing(false); setFormErrors({}) }}
              className="flex-1 rounded-pill border-[1.5px] border-border text-ink2 text-[15px] font-medium py-[12px] cursor-pointer hover:border-ink3 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-pill bg-orange text-white text-[15px] font-medium py-[12px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        /* Read mode */
        <div className="px-5 pt-2 pb-[100px] flex flex-col gap-4">
          <div className="bg-white rounded-card border border-border p-5">
            <InfoRow label="Type" value={supp.type} />
            <InfoRow label="Dosage" value={supp.dosage} />
            <InfoRow label="Frequency" value={supp.frequency} />
            <InfoRow label="Timing" value={supp.timing} />
            <InfoRow label="Brand" value={supp.brand} />
            <InfoRow label="Notes" value={supp.notes} />
          </div>

          {evidenceLevel && (
            <div
              className="rounded-card p-5"
              style={{ background: evidenceColors.bg, border: `1px solid ${evidenceColors.text}22` }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="rounded-pill px-[10px] py-[3px] text-[12px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.6)', color: evidenceColors.text }}
                >
                  Grade {evidenceLevel}
                </span>
                <span className="text-[13px] font-medium" style={{ color: evidenceColors.text }}>
                  {evidenceColors.label}
                </span>
              </div>
              {evidenceScore.rationale && (
                <p className="text-[13px] leading-relaxed" style={{ color: evidenceColors.text }}>
                  {evidenceScore.rationale}
                </p>
              )}
            </div>
          )}

          {myInteractions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-semibold text-ink2 uppercase tracking-wide">Interactions</p>
              {myInteractions.map((ix, i) => (
                <div
                  key={i}
                  className="rounded-card p-4"
                  style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-[14px] h-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="text-[12px] font-semibold" style={{ color: '#92400E' }}>
                      {ix.supplements?.join(' + ')} — {ix.severity}
                    </span>
                  </div>
                  {ix.description && (
                    <p className="text-[12px] leading-relaxed" style={{ color: '#92400E' }}>
                      {ix.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setEditing(true)}
            className="w-full rounded-pill bg-orange text-white text-[15px] font-medium py-[14px] cursor-pointer hover:bg-orange-dk transition-colors"
          >
            Edit
          </button>

          {confirmDelete ? (
            <div className="rounded-card border border-red-200 bg-red-50 p-4 flex flex-col gap-3">
              <p className="text-[14px] text-ink1 text-center font-medium">Delete this supplement?</p>
              <p className="text-[12px] text-ink3 text-center">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-pill border-[1.5px] border-border text-ink2 text-[14px] font-medium py-[10px] cursor-pointer hover:border-ink3 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-pill bg-red-500 text-white text-[14px] font-medium py-[10px] cursor-pointer disabled:opacity-60 hover:bg-red-600 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-pill border-[1.5px] border-red-200 text-red-500 text-[15px] font-medium py-[13px] cursor-pointer hover:bg-red-50 transition-colors"
            >
              Delete supplement
            </button>
          )}
        </div>
      )}

    </div>
  )
}
