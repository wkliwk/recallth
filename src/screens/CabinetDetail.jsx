import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const TYPE_OPTIONS = ['supplement', 'medication', 'vitamin']
const FREQUENCY_OPTIONS = [
  { value: 'Daily', key: 'freqDaily' },
  { value: 'Twice daily', key: 'freqTwiceDaily' },
  { value: 'As needed', key: 'freqAsNeeded' },
]
const TIMING_OPTIONS = [
  { value: 'Morning', key: 'timingMorning' },
  { value: 'With breakfast', key: 'timingWithBreakfast' },
  { value: 'Pre-workout', key: 'timingPreWorkout' },
  { value: 'Afternoon', key: 'timingAfternoon' },
  { value: 'With lunch', key: 'timingWithLunch' },
  { value: 'Post-workout', key: 'timingPostWorkout' },
  { value: 'With meals', key: 'timingWithMeals' },
  { value: 'Evening', key: 'timingEvening' },
  { value: 'With dinner', key: 'timingWithDinner' },
  { value: 'Before bed', key: 'timingBeforeBed' },
  { value: 'As needed', key: 'timingAsNeeded' },
]

const EVIDENCE_COLORS = {
  A: { bg: '#D4ECD8', text: '#2C5A38', labelKey: 'evidenceStrong' },
  B: { bg: '#DAE8F8', text: '#1A3A6A', labelKey: 'evidenceGood' },
  C: { bg: '#FAE8D0', text: '#7A4A1A', labelKey: 'evidenceModerate' },
  D: { bg: '#FDE8DE', text: '#7A2A1A', labelKey: 'evidenceLimited' },
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
      {error && <p className="text-[11px] text-[#C05A28]">{error}</p>}
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
  const { t } = useLanguage()

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
  const [uploadingImage, setUploadingImage] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [aiLooking, setAiLooking] = useState(false)
  const [showAiLookup, setShowAiLookup] = useState(false)
  const [aiResults, setAiResults] = useState([]) // array of AI results
  const [aiSelected, setAiSelected] = useState(0) // selected index
  const [originalSupp, setOriginalSupp] = useState(null) // for undo after AI fill

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
            setError(t('suppNotFound'))
          } else {
            setSupp(found)
            setForm({
              name: found.name || '',
              type: found.type || 'supplement',
              dosage: found.dosage || '',
              frequency: found.frequency || 'Daily',
              timing: found.timing || 'Morning',
              brand: found.brand || '',
              notes: found.notes || '',
            })
          }
        } else {
          setError(t('failedToLoad'))
        }

        if (interactRes.status === 'fulfilled') {
          const ixData = interactRes.value.data
          setInteractions(Array.isArray(ixData) ? ixData : ixData?.interactions ?? [])
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
    if (!form.name?.trim()) errs.name = t('nameRequired')
    if (!form.dosage?.trim()) errs.dosage = t('dosageRequired')
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
      setFormErrors({ submit: err.message || t('failedToSaveChanges') })
    } finally {
      setSaving(false)
    }
  }

  async function handleAiLookup() {
    if (!aiQuery.trim() || aiLooking) return
    setAiLooking(true)
    setFormErrors({})
    try {
      const res = await api.cabinet.aiLookup(aiQuery.trim())
      if (res.success && res.data) {
        const results = Array.isArray(res.data) ? res.data : [res.data]
        setAiResults(results)
        setAiSelected(0)
      }
    } catch (err) {
      setFormErrors({ submit: err.message || 'AI lookup failed' })
    } finally {
      setAiLooking(false)
    }
  }

  async function handleConfirmAiFill() {
    if (aiResults.length === 0) return
    const p = aiResults[aiSelected]
    const payload = {
      ...(p.name ? { name: p.name } : {}),
      ...(p.nameZh ? { nameZh: p.nameZh } : {}),
      ...(p.brand ? { brand: p.brand } : {}),
      ...(p.type ? { type: p.type } : {}),
      ...(p.dosage ? { dosage: p.dosage } : {}),
      ...(p.frequency ? { frequency: p.frequency } : {}),
      ...(p.timing ? { timing: p.timing } : {}),
      ...(p.description ? { description: p.description } : {}),
      ...(p.ingredients ? { ingredients: p.ingredients } : {}),
      ...(p.notes ? { notes: p.notes } : {}),
      ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
    }
    setSaving(true)
    try {
      setOriginalSupp({ ...supp }) // save original for undo
      const updateRes = await api.cabinet.update(id, payload)
      setSupp(updateRes.data || { ...supp, ...payload })
      setForm((prev) => ({ ...prev, ...payload }))
      setAiResults([])
      setAiSelected(0)
      setAiQuery('')
      setShowAiLookup(false)
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  async function handleUndoAiFill() {
    if (!originalSupp) return
    setSaving(true)
    try {
      const payload = {
        name: originalSupp.name || '',
        nameZh: originalSupp.nameZh || '',
        brand: originalSupp.brand || '',
        type: originalSupp.type || 'supplement',
        dosage: originalSupp.dosage || '',
        frequency: originalSupp.frequency || '',
        timing: originalSupp.timing || '',
        description: originalSupp.description || '',
        ingredients: originalSupp.ingredients || '',
        notes: originalSupp.notes || '',
      }
      const updateRes = await api.cabinet.update(id, payload)
      setSupp(updateRes.data || { ...supp, ...payload })
      setForm((prev) => ({ ...prev, ...payload }))
      setOriginalSupp(null)
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to undo' })
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setFormErrors({ submit: t('imageTooLarge') || 'Image must be under 2MB' })
      return
    }
    setUploadingImage(true)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await api.cabinet.update(id, { imageUrl: dataUrl })
      setSupp(res.data || { ...supp, imageUrl: dataUrl })
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to upload image' })
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.cabinet.remove(id)
      navigate('/cabinet')
    } catch (err) {
      setFormErrors({ submit: err.message || t('failedToDelete') })
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleToggleOutOfStock() {
    const newValue = !supp.outOfStock
    try {
      const res = await api.cabinet.update(id, { outOfStock: newValue })
      setSupp(res.data || { ...supp, outOfStock: newValue })
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to update stock status' })
    }
  }

  const evidenceScore = supp?.evidenceScore
  const evidenceLevel = evidenceScore?.level
  const evidenceColors = EVIDENCE_COLORS[evidenceLevel] || null

  return (
    <div className="min-h-screen bg-page">
      <OrangeHeader
        title={supp?.name || t('supplement')}
        subtitle={supp?.type || ''}
        onBack={() => navigate('/cabinet')}
      />

      <div className="-mt-[40px] md:mt-0">
        <Wave />
      </div>

      {/* Desktop breadcrumb */}
      <div className="hidden md:block px-8 pt-7 pb-2 max-w-[960px]">
        <div className="text-[12px] text-ink3 mb-2">
          <button onClick={() => navigate('/cabinet')} className="text-orange hover:underline cursor-pointer">Cabinet</button>
          <span className="mx-1.5">&rsaquo;</span>
          <span>{supp?.name || t('supplement')}</span>
        </div>
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
        <div className="px-5 md:px-8 pt-2 pb-[100px] md:pb-10 max-w-[960px]">
          <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-4">

            <EditField label={t('fieldName')} required error={formErrors.name}>
              <input
                className={inputClass}
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </EditField>

            <EditField label={t('fieldType')}>
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </EditField>

            <EditField label={t('fieldDosage')} required error={formErrors.dosage}>
              <input
                className={inputClass}
                type="text"
                value={form.dosage}
                onChange={(e) => handleChange('dosage', e.target.value)}
                placeholder="e.g. 5g, 1000mg, 2 capsules"
              />
            </EditField>

            <EditField label={t('fieldFrequency')}>
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.frequency}
                  onChange={(e) => handleChange('frequency', e.target.value)}
                >
                  {FREQUENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{t(o.key)}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </EditField>

            <EditField label={t('fieldTiming')}>
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.timing}
                  onChange={(e) => handleChange('timing', e.target.value)}
                >
                  {TIMING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{t(o.key)}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </EditField>

            <EditField label={t('fieldBrand')}>
              <input
                className={inputClass}
                type="text"
                value={form.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
              />
            </EditField>

            <EditField label={t('fieldNotes')}>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </EditField>
          </div>

          {formErrors.submit && (
            <p className="text-[13px] text-[#C05A28] text-center mt-4">{formErrors.submit}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => { setEditing(false); setFormErrors({}) }}
              className="flex-1 rounded-pill border-[1.5px] border-border text-ink2 text-[15px] font-medium py-[12px] cursor-pointer hover:border-ink3 transition-colors"
            >
              {t('cancelButton')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-pill bg-orange text-white text-[15px] font-medium py-[12px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
            >
              {saving ? t('saving') : t('saveButton')}
            </button>
          </div>
        </div>
      ) : (
        /* Read mode */
        <div className="px-5 md:px-8 pt-2 pb-[100px] md:pb-10 max-w-[960px]">
          <div className="md:grid md:grid-cols-[280px_1fr] md:gap-6">
            {/* Desktop left column — sticky image */}
            <div className="hidden md:block">
              <div className="sticky top-8">
                <div className="bg-sand rounded-card aspect-square flex items-center justify-center overflow-hidden">
                  {supp.imageUrl ? (
                    <img
                      src={supp.imageUrl}
                      alt={supp.name}
                      className="w-full h-full object-contain p-4"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full items-center justify-center text-[56px] font-semibold"
                    style={{ display: supp.imageUrl ? 'none' : 'flex', color: '#E07B4A22' }}
                  >
                    {supp.name?.charAt(0)?.toUpperCase()}
                  </div>
                </div>
                <label className="block text-center mt-3 text-[12px] text-orange font-medium cursor-pointer hover:text-orange-dk transition-colors">
                  {uploadingImage ? t('uploading') || 'Uploading...' : supp.imageUrl ? t('changePhoto') || 'Change photo' : t('uploadPhoto') || 'Upload photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
            </div>

            {/* Right column (or full width on mobile) */}
            <div className="flex flex-col gap-4">
          {/* Mobile hero card — image + name + brand + badges */}
          <div className="md:hidden bg-white rounded-card border border-border overflow-hidden">
            {/* Image */}
            <div className="relative w-full aspect-[3/1] bg-sand flex items-center justify-center">
              {supp.imageUrl ? (
                <img
                  src={supp.imageUrl}
                  alt={supp.name}
                  className="w-full h-full object-contain p-4"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                />
              ) : null}
              <div
                className="w-full h-full items-center justify-center text-[48px] font-semibold"
                style={{ display: supp.imageUrl ? 'none' : 'flex', color: '#E07B4A22' }}
              >
                {supp.name?.charAt(0)?.toUpperCase()}
              </div>
              {evidenceLevel && (
                <span
                  className="absolute top-3 right-3 rounded-pill px-[10px] py-[3px] text-[11px] font-bold backdrop-blur-sm"
                  style={{ background: `${evidenceColors.bg}dd`, color: evidenceColors.text }}
                >
                  Grade {evidenceLevel}
                </span>
              )}
            </div>

            {/* Name + brand + upload */}
            <div className="px-5 py-4">
              <h2 className="text-[18px] font-bold text-ink1 leading-snug">{supp.name}</h2>
              {supp.brand && <p className="text-[13px] text-ink2 mt-[2px]">{supp.brand}</p>}
              <div className="flex items-center gap-3 mt-3">
                {supp.type && (
                  <span className="rounded-pill px-[10px] py-[3px] text-[11px] font-medium bg-sand text-ink2 capitalize">{supp.type}</span>
                )}
                {supp.dosage && (
                  <span className="rounded-pill px-[10px] py-[3px] text-[11px] font-medium bg-orange/10 text-orange">{supp.dosage}</span>
                )}
              </div>
              <label className="inline-block mt-3 text-[12px] text-orange font-medium cursor-pointer hover:text-orange-dk transition-colors">
                {uploadingImage ? t('uploading') || 'Uploading...' : supp.imageUrl ? t('changePhoto') || 'Change photo' : t('uploadPhoto') || 'Upload photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            </div>
          </div>

          {/* Desktop name section (no image — image is in left column) */}
          <div className="hidden md:block">
            <h2 className="text-[22px] font-bold text-ink1 leading-snug">{supp.name}</h2>
            {supp.brand && <p className="text-[14px] text-ink2 mt-1">{supp.brand}</p>}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {supp.type && (
                <span className="rounded-pill px-[10px] py-[3px] text-[11px] font-medium bg-sand text-ink2 capitalize">{supp.type}</span>
              )}
              {supp.dosage && (
                <span className="rounded-pill px-[10px] py-[3px] text-[11px] font-medium bg-orange/10 text-orange">{supp.dosage}</span>
              )}
              {evidenceLevel && (
                <span
                  className="rounded-pill px-[10px] py-[3px] text-[11px] font-bold"
                  style={{ background: evidenceColors.bg, color: evidenceColors.text }}
                >
                  Grade {evidenceLevel}
                </span>
              )}
            </div>
          </div>

          {/* Undo banner after AI fill */}
          {originalSupp && aiResults.length === 0 && !showAiLookup && (
            <div
              className="rounded-card px-4 py-3 flex items-center justify-between"
              style={{ background: '#DAE8F8', border: '1px solid #B0C8E8' }}
            >
              <span className="text-[13px] text-[#1A3A6A]">{t('aiLookupFilled')}</span>
              <button
                onClick={handleUndoAiFill}
                disabled={saving}
                className="text-[13px] font-semibold text-[#1A3A6A] underline cursor-pointer hover:no-underline"
              >
                {t('aiLookupUndo')}
              </button>
            </div>
          )}

          {/* AI Lookup — input always visible when open */}
          <div className="bg-white rounded-card border border-border p-4">
            {showAiLookup ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E07B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
                  </svg>
                  <span className="text-[13px] font-medium text-ink1">{t('aiLookupTitle')}</span>
                </div>
                <p className="text-[11px] text-ink3">{t('aiLookupHint')}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiLookup()}
                    placeholder={t('aiLookupPlaceholder')}
                    className="flex-1 border border-border rounded-[10px] px-3 py-[9px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors bg-page"
                    disabled={aiLooking}
                  />
                  <button
                    onClick={handleAiLookup}
                    disabled={!aiQuery.trim() || aiLooking}
                    className="rounded-[10px] bg-orange text-white text-[13px] font-medium px-4 py-[9px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors shrink-0"
                  >
                    {aiLooking ? t('aiLookupSearching') : t('aiLookupSearch')}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {aiQuery && (
                    <button
                      onClick={() => { setAiQuery(''); setAiResults([]); setAiSelected(0) }}
                      className="text-[12px] text-ink3 hover:text-ink2 cursor-pointer"
                    >
                      {t('aiLookupClear')}
                    </button>
                  )}
                  <button
                    onClick={() => { setShowAiLookup(false); setAiQuery(''); setAiResults([]); setAiSelected(0) }}
                    className="text-[12px] text-ink3 hover:text-ink2 cursor-pointer"
                  >
                    {t('cancelButton')}
                  </button>
                </div>

                {/* Loading animation */}
                {aiLooking && (
                  <div className="border-t border-border pt-4 mt-1 flex flex-col items-center gap-3 py-6">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-orange animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-orange animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-[12px] text-ink3">{t('aiLookupSearching')}</p>
                  </div>
                )}

                {/* AI Results — hero card style matching detail page */}
                {aiResults.length > 0 && !aiLooking && (
                  <div className="border-t border-border pt-3 mt-1 flex flex-col gap-3">
                    {/* Result selector tabs */}
                    <div className="flex gap-2">
                      {aiResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => setAiSelected(i)}
                          className={`flex-1 rounded-[10px] px-2 py-[10px] flex flex-col items-center gap-1 border-[1.5px] cursor-pointer transition-all ${
                            aiSelected === i
                              ? 'border-orange bg-orange/5'
                              : 'border-border bg-page hover:border-ink3/30'
                          }`}
                        >
                          {r.imageUrl ? (
                            <img
                              src={r.imageUrl}
                              alt={r.name || ''}
                              className="w-10 h-10 object-contain rounded-[6px]"
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                            />
                          ) : null}
                          <div
                            className="w-10 h-10 rounded-[6px] bg-sand items-center justify-center text-[16px] text-ink3/40"
                            style={{ display: r.imageUrl ? 'none' : 'flex' }}
                          >
                            {(r.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[11px] text-ink1 font-medium text-center leading-tight line-clamp-2">
                            {r.brand ? `${r.brand} ` : ''}{r.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Selected product — hero card style */}
                    {(() => {
                      const p = aiResults[aiSelected]
                      if (!p) return null
                      return (
                        <div className="rounded-[12px] border border-border overflow-hidden bg-white">
                          {/* Image area — same 2:1 ratio as detail hero */}
                          <div className="relative w-full aspect-[2/1] bg-sand flex items-center justify-center">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name || ''}
                                className="w-full h-full object-contain p-5"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                              />
                            ) : null}
                            <div
                              className="w-full h-full items-center justify-center text-[40px] font-semibold"
                              style={{ display: p.imageUrl ? 'none' : 'flex', color: '#E07B4A22' }}
                            >
                              {(p.name || '?').charAt(0).toUpperCase()}
                            </div>
                            {p.type && (
                              <span className="absolute top-2 right-2 rounded-pill px-[8px] py-[2px] text-[10px] font-medium bg-white/80 text-ink2 capitalize backdrop-blur-sm">
                                {p.type}
                              </span>
                            )}
                          </div>

                          {/* Info — same layout as detail hero */}
                          <div className="px-4 py-3">
                            <h3 className="text-[16px] font-bold text-ink1 leading-snug">
                              {p.name}{p.nameZh ? <span className="text-ink3 font-normal text-[13px] ml-1.5">({p.nameZh})</span> : ''}
                            </h3>
                            {p.brand && <p className="text-[12px] text-ink2 mt-[2px]">{p.brand}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {p.dosage && (
                                <span className="rounded-pill px-[8px] py-[2px] text-[10px] font-medium bg-orange/10 text-orange">{p.dosage}</span>
                              )}
                              {p.timing && (
                                <span className="rounded-pill px-[8px] py-[2px] text-[10px] font-medium bg-sand text-ink2">{t(TIMING_OPTIONS.find(o => o.value === p.timing)?.key ?? '') || p.timing}</span>
                              )}
                            </div>

                            {/* Description */}
                            {p.description && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <span className="text-ink3 text-[10px] uppercase tracking-wide font-medium">{t('fieldDescription')}</span>
                                <p className="text-ink1 mt-1 leading-relaxed text-[12px]">{p.description}</p>
                              </div>
                            )}
                            {p.ingredients && (
                              <div className="mt-2">
                                <span className="text-ink3 text-[10px] uppercase tracking-wide font-medium">{t('fieldIngredients')}</span>
                                <p className="text-ink2 mt-1 leading-relaxed text-[12px]">{p.ingredients}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Confirm */}
                    <button
                      onClick={handleConfirmAiFill}
                      disabled={saving}
                      className="w-full rounded-pill bg-orange text-white text-[14px] font-medium py-[10px] cursor-pointer disabled:opacity-60 hover:bg-orange-dk transition-colors"
                    >
                      {saving ? t('saving') : t('aiLookupConfirm')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAiLookup(true)}
                className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-orange cursor-pointer hover:text-orange-dk transition-colors py-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
                </svg>
                {t('aiLookupButton')}
              </button>
            )}
          </div>

          {/* Details card */}
          <div className="bg-white rounded-card border border-border p-5">
            <InfoRow label={t('fieldFrequency')} value={t(FREQUENCY_OPTIONS.find(o => o.value === supp.frequency)?.key ?? '') || supp.frequency} />
            <InfoRow label={t('fieldTiming')} value={t(TIMING_OPTIONS.find(o => o.value === supp.timing)?.key ?? '') || supp.timing} />
            <InfoRow label={t('fieldNotes')} value={supp.notes} />
          </div>

          {/* Description & Ingredients */}
          {(supp.description || supp.ingredients) && (
            <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-4">
              {supp.description && (
                <div>
                  <span className="text-[11px] uppercase text-ink3 tracking-wide font-medium">{t('fieldDescription') || 'Description'}</span>
                  <p className="text-[13px] text-ink1 mt-1.5 leading-relaxed">{supp.description}</p>
                </div>
              )}
              {supp.ingredients && (
                <div>
                  <span className="text-[11px] uppercase text-ink3 tracking-wide font-medium">{t('fieldIngredients') || 'Ingredients'}</span>
                  <p className="text-[13px] text-ink2 mt-1.5 leading-relaxed">{supp.ingredients}</p>
                </div>
              )}
            </div>
          )}

          {/* Evidence */}
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
                  {t(evidenceColors.labelKey)}
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
              <p className="text-[12px] font-semibold text-ink2 uppercase tracking-wide">{t('interactions')}</p>
              {myInteractions.map((ix, i) => (
                <div
                  key={i}
                  className="rounded-card p-4"
                  style={{ background: '#FDE8DE', border: '1px solid #E8C4B0' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-[14px] h-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="#C05A28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="text-[12px] font-semibold" style={{ color: '#C05A28' }}>
                      {ix.supplements?.join(' + ')} — {ix.severity}
                    </span>
                  </div>
                  {ix.description && (
                    <p className="text-[12px] leading-relaxed" style={{ color: '#C05A28' }}>
                      {ix.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {/* Out-of-stock toggle */}
          <button
            onClick={handleToggleOutOfStock}
            className={`w-full rounded-pill border-[1.5px] text-[14px] font-medium py-[11px] cursor-pointer transition-colors ${
              supp.outOfStock
                ? 'border-[#ccc] text-ink3 bg-[#f5f5f5] hover:bg-[#ebebeb]'
                : 'border-[#ccc] text-ink2 hover:bg-[#f5f5f5]'
            }`}
          >
            {supp.outOfStock ? '✓ 已用完  —  按此恢復存貨' : '標記為已用完'}
          </button>

          {confirmDelete ? (
            <div className="rounded-card border border-[#E8C4B0] bg-[#FDE8DE] p-4 flex flex-col gap-3">
              <p className="text-[14px] text-ink1 text-center font-medium">
                {t('removeFromCabinetPrefix')}<strong>{supp.name}</strong>{t('removeFromCabinetSuffix')}
              </p>
              <p className="text-[12px] text-ink3 text-center">{t('cannotUndo')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-pill border-[1.5px] border-border text-ink2 text-[14px] font-medium py-[10px] cursor-pointer hover:border-ink3 transition-colors"
                >
                  {t('cancelButton')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-pill bg-[#C05A28] text-white text-[14px] font-medium py-[10px] cursor-pointer disabled:opacity-60 hover:bg-[#A04820] transition-colors"
                >
                  {deleting ? t('deleting') : t('removeButton')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 rounded-pill bg-orange text-white text-[14px] font-medium py-[12px] cursor-pointer hover:bg-orange-dk transition-colors"
              >
                {t('editButton')}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-pill border-[1.5px] border-[#E8C4B0] text-[#C05A28] text-[14px] font-medium px-5 py-[12px] cursor-pointer hover:bg-[#FDE8DE] transition-colors"
              >
                {t('deleteButton')}
              </button>
            </div>
          )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
