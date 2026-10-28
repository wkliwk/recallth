import { useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { useAiUsage } from '../context/AiUsageContext'
import BatchScanModal from '../components/BatchScanModal'
import { imageFileToBase64, scanResultToForm } from '../utils/labelScan'
import { limitFiles, hasMissing, mergeFound, chooseImage, findMatch, buildUpdatePayload } from '../utils/batchScan'
import DoseInput from '../components/DoseInput'
import { isStructured, applyDose } from '../utils/dose'
import { lookupMissingDetails, lookupFromUrl } from '../utils/dosageLookup'
import PasteLinkFill from '../components/PasteLinkFill'
import PurchaseFields from '../components/PurchaseFields'
import { parsePriceInput } from '../utils/purchase'

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

function Field({ label, required, error, children }) {
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

// Structured dosage fields (see DoseInput): reset whenever a new source fills the form.
const EMPTY_DOSE = { strength: '', unitForm: '', servingUnits: '', bottleCount: '', dosageFreeText: false }

const webInputClass = inputClass.replace('bg-page', 'bg-[#EEF4FC]').replace('border-border', 'border-[#7BA3D6]')

const selectClass =
  'w-full bg-page border-[1.5px] border-border rounded-[12px] px-4 py-[10px] text-[14px] text-ink1 outline-none focus:border-orange transition-colors appearance-none cursor-pointer'

export default function CabinetAdd() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const { showUsage } = useAiUsage()
  const [submitting, setSubmitting] = useState(false)
  const [dupPrompt, setDupPrompt] = useState(null) // { item, kind } when the form matches a saved item
  const [errors, setErrors] = useState({})
  const [showAiLookup, setShowAiLookup] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [aiLooking, setAiLooking] = useState(false)
  const [aiResults, setAiResults] = useState([])
  const [aiSelected, setAiSelected] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const scanInputRef = useRef(null)
  const [batch, setBatch] = useState(null) // { files, truncated, existingItems } | null
  const batchSavedRef = useRef(false)
  const [fillStatus, setFillStatus] = useState('idle') // idle | looking | none | failed
  const [webFields, setWebFields] = useState({})
  const [webDirections, setWebDirections] = useState('')
  const [photoThumb, setPhotoThumb] = useState('') // small data-URL thumbnail of the scanned photo

  const prefilled = location.state?.aiResult
  const [aiFilled, setAiFilled] = useState(!!prefilled)

  const [form, setForm] = useState(() => {
    if (prefilled) {
      return {
        name: prefilled.name || '',
        type: prefilled.type || 'supplement',
        dosage: prefilled.dosage || '',
        frequency: prefilled.frequency || 'Daily',
        timing: prefilled.timing || 'Morning',
        brand: prefilled.brand || '',
        notes: prefilled.notes || '',
        description: prefilled.description || '',
        ingredients: prefilled.ingredients || '',
        imageUrl: prefilled.imageUrl || '',
        purchasePrice: '',
        purchaseCurrency: 'HKD',
        purchaseDate: '',
        ...EMPTY_DOSE,
      }
    }
    return {
      name: '',
      type: 'supplement',
      dosage: '',
      frequency: 'Daily',
      timing: 'Morning',
      brand: '',
      notes: '',
      description: '',
      ingredients: '',
      imageUrl: '',
      purchasePrice: '',
      purchaseCurrency: 'HKD',
      purchaseDate: '',
      ...EMPTY_DOSE,
    }
  })

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setWebFields((prev) => (prev[field] ? { ...prev, [field]: false } : prev))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate() {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = t('nameRequired')
    if (!form.dosage.trim()) newErrors.dosage = t('dosageRequired')
    if (!parsePriceInput(form.purchasePrice).ok) newErrors.purchasePrice = t('purchasePriceInvalid')
    return newErrors
  }

  function buildPayload() {
    const price = parsePriceInput(form.purchasePrice)
    return {
      name: form.name.trim(),
      type: form.type,
      dosage: form.dosage.trim(),
      frequency: form.frequency,
      timing: form.timing,
      ...(form.brand.trim() ? { brand: form.brand.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      ...(form.description?.trim() ? { description: form.description.trim() } : {}),
      ...(form.ingredients?.trim() ? { ingredients: form.ingredients.trim() } : {}),
      ...(chooseImage(form, photoThumb) ? { imageUrl: chooseImage(form, photoThumb) } : {}),
      ...(price.value !== null ? { purchasePrice: price.value, currency: form.purchaseCurrency } : {}),
      ...(form.purchaseDate ? { purchaseDate: form.purchaseDate } : {}),
    }
  }

  // Save as a new item, or overwrite `existing`. Overwrite never renames the item and keeps its saved
  // schedule (frequency/timing, which the form only holds as defaults); empty values never blank saved ones.
  async function persist(existing) {
    setSubmitting(true)
    setErrors({})
    try {
      if (existing) {
        const payload = buildPayload()
        const narrow = {
          ...buildUpdatePayload(form, photoThumb, existing),
          ...(payload.description ? { description: payload.description } : {}),
          ...(payload.notes ? { notes: payload.notes } : {}),
          ...(payload.purchasePrice !== undefined ? { purchasePrice: payload.purchasePrice, currency: payload.currency } : {}),
          ...(payload.purchaseDate ? { purchaseDate: payload.purchaseDate } : {}),
        }
        await api.cabinet.update(existing._id, narrow)
      } else {
        await api.cabinet.create(buildPayload())
      }
      try { sessionStorage.removeItem('recallth_evidence_scores') } catch { /* ignore */ }
      navigate('/cabinet')
    } catch (err) {
      setErrors({ submit: err.message || t('failedToAdd') })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // Duplicate check against the saved list (best effort: a failed lookup never blocks saving).
    setSubmitting(true)
    let match = null
    try {
      const res = await api.cabinet.list()
      match = findMatch(form, res.data || [])
    } catch { /* ignore */ }
    setSubmitting(false)
    if (match) {
      setDupPrompt(match)
      return
    }
    await persist(null)
  }

  const isUrl = (s) => /^https?:\/\/.+/.test(s.trim())

  async function handleAiLookup() {
    if (!aiQuery.trim() || aiLooking) return
    setAiLooking(true)
    setErrors({})
    try {
      const query = aiQuery.trim()
      const res = isUrl(query)
        ? await api.cabinet.urlLookup(query)
        : await api.cabinet.aiLookup(query)
      if (res.success && res.data) {
        const results = Array.isArray(res.data) ? res.data : [res.data]
        setAiResults(results)
        setAiSelected(0)
        if (res.aiUsage) showUsage(res.aiUsage, 'ai-lookup', {
          input: query,
          output: results.map(p => p.name ?? p.productName ?? JSON.stringify(p)).join(', '),
        })
      }
    } catch (err) {
      setErrors({ submit: err.message || 'AI lookup failed' })
    } finally {
      setAiLooking(false)
    }
  }

  async function handleScanFile(e) {
    const picked = limitFiles(e.target.files)
    e.target.value = ''
    if (picked.files.length === 0 || scanning) return
    if (picked.files.length > 1 || picked.truncated) {
      let existingItems = []
      try {
        const res = await api.cabinet.list()
        existingItems = res.data || []
      } catch { /* duplicate marking is best-effort */ }
      batchSavedRef.current = false
      setBatch({ ...picked, existingItems })
      return
    }
    const file = picked.files[0]
    setScanning(true)
    setErrors({})
    try {
      const { imageBase64, mimeType, thumbnail } = await imageFileToBase64(file)
      const res = await api.cabinet.scan(imageBase64, mimeType)
      if (!res.success || !res.data) throw new Error(res.error || t('scanLabelError'))
      setForm((prev) => ({ ...prev, ...EMPTY_DOSE, imageUrl: '', ...scanResultToForm(res.data) }))
      setPhotoThumb(thumbnail || '')
      setWebDirections('')
      setScanned(true)
      setAiFilled(false)
      if (res.aiUsage) showUsage(res.aiUsage, 'label-scan', {
        input: file.name,
        output: res.data.name ?? '',
      })
      setFillStatus('idle')
      setWebFields({})
    } catch (err) {
      setErrors({ submit: err.message || t('scanLabelError') })
    } finally {
      setScanning(false)
    }
  }

  // Search online for fields the scan left empty; only empty fields are filled.
  async function handleFillMissing() {
    if (fillStatus === 'looking') return
    setFillStatus('looking')
    try {
      const found = await lookupMissingDetails(form, showUsage)
      const { filled, directions } = mergeFound(form, found)
      setForm((prev) => mergeFound(prev, found).form)
      setWebFields((prev) => ({ ...prev, ...Object.fromEntries(filled.map((f) => [f, true])), ...(filled.includes('servingUnits') ? { dosage: true } : {}) }))
      if (directions) setWebDirections(directions)
      setFillStatus(found ? 'idle' : 'none')
    } catch {
      setFillStatus('failed')
    }
  }

  // Fallback: fill empty fields from a product page the user pasted. Throws on failure.
  async function handleFillFromLink(url) {
    const found = await lookupFromUrl(url, showUsage, form)
    const { filled, directions } = mergeFound(form, found)
    setForm((prev) => mergeFound(prev, found).form)
    setWebFields((prev) => ({ ...prev, ...Object.fromEntries(filled.map((f) => [f, true])), ...(filled.includes('servingUnits') ? { dosage: true } : {}) }))
    if (directions) setWebDirections(directions)
    if (filled.length) setFillStatus('idle')
    return filled.length ? 'filled' : 'nothing'
  }

  // Structured dosage edits (count / unit): recompute the Dosage string.
  function handleDoseChange(patch) {
    if (patch.dosageFreeText) {
      handleChange('dosageFreeText', true)
      return
    }
    setForm((prev) => applyDose({ ...prev, ...patch }))
    setWebFields((prev) => ({ ...prev, servingUnits: false, dosage: false }))
    setWebDirections('')
    if (errors.dosage) setErrors((prev) => ({ ...prev, dosage: undefined }))
  }

  function handleAiConfirm() {
    const p = aiResults[aiSelected]
    if (!p) return
    setForm((prev) => ({
      ...prev,
      ...EMPTY_DOSE,
      name: p.name || '',
      type: p.type || 'supplement',
      dosage: p.dosage || '',
      frequency: p.frequency || 'Daily',
      timing: p.timing || 'Morning',
      brand: p.brand || '',
      notes: p.notes || '',
      description: p.description || '',
      ingredients: p.ingredients || '',
      imageUrl: p.imageUrl || '',
    }))
    setAiResults([])
    setAiQuery('')
    setShowAiLookup(false)
    setAiFilled(true)
  }

  return (
    <div className="min-h-screen bg-page">
      <OrangeHeader
        title={t('addTitle')}
        subtitle={t('addSubtitle')}
        onBack={() => navigate('/cabinet')}
      />

      <div className="-mt-[40px] md:mt-0">
        <Wave />
      </div>

      {/* Desktop header */}
      <div className="hidden md:block px-8 pt-7 pb-2 max-w-[720px]">
        <div className="text-[12px] text-ink3 mb-2">
          <button type="button" onClick={() => navigate('/cabinet')} className="text-orange hover:underline cursor-pointer">Cabinet</button>
          <span className="mx-1.5">&rsaquo;</span>
          <span>{t('addTitle')}</span>
        </div>
        <h1 className="font-display text-[28px] text-ink1">{t('addTitle')}</h1>
        <p className="text-[14px] text-ink3 mt-1">{t('addSubtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} className="px-5 md:px-8 pt-2 pb-[100px] md:pb-10 flex flex-col gap-3 max-w-[720px]">
        {/* AI Lookup — inline, same style as detail page */}
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
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAiLookup())}
                  placeholder={t('aiLookupPlaceholder')}
                  className="flex-1 border border-border rounded-[10px] px-3 py-[9px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors bg-page"
                  disabled={aiLooking}
                  autoFocus
                />
                <button
                  type="button"
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
                    type="button"
                    onClick={() => { setAiQuery(''); setAiResults([]); setAiSelected(0) }}
                    className="text-[12px] text-ink3 hover:text-ink2 cursor-pointer"
                  >
                    {t('aiLookupClear')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowAiLookup(false); setAiQuery(''); setAiResults([]); setAiSelected(0) }}
                  className="text-[12px] text-ink3 hover:text-ink2 cursor-pointer"
                >
                  {t('cancelButton')}
                </button>
              </div>

              {/* Loading */}
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

              {/* Results */}
              {aiResults.length > 0 && !aiLooking && (
                <div className="border-t border-border pt-3 mt-1 flex flex-col gap-3">
                  {/* Selector tabs */}
                  <div className="flex gap-2">
                    {aiResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
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
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex' }}
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

                  {/* Selected detail — hero card */}
                  {(() => {
                    const p = aiResults[aiSelected]
                    if (!p) return null
                    return (
                      <div className="rounded-[12px] border border-border overflow-hidden bg-white">
                        <div className="relative w-full aspect-[2/1] bg-sand flex items-center justify-center">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name || ''}
                              className="w-full h-full object-contain p-5"
                              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex' }}
                            />
                          ) : null}
                          <div
                            className="w-full h-full items-center justify-center text-[40px] font-semibold"
                            style={{ display: p.imageUrl ? 'none' : 'flex', color: '#E07B4A22' }}
                          >
                            {(p.name || '?').charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <h3 className="text-[16px] font-bold text-ink1 leading-snug">
                            {p.name}{p.nameZh ? <span className="text-ink3 font-normal text-[13px] ml-1.5">({p.nameZh})</span> : ''}
                          </h3>
                          {p.brand && <p className="text-[12px] text-ink2 mt-[2px]">{p.brand}</p>}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {p.dosage && <span className="rounded-pill px-[8px] py-[2px] text-[10px] font-medium bg-orange/10 text-orange">{p.dosage}</span>}
                            {p.timing && <span className="rounded-pill px-[8px] py-[2px] text-[10px] font-medium bg-sand text-ink2">{t(TIMING_OPTIONS.find(o => o.value === p.timing)?.key ?? '') || p.timing}</span>}
                          </div>
                          {p.description && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <span className="text-ink3 text-[10px] uppercase tracking-wide font-medium">{t('fieldDescription')}</span>
                              <p className="text-ink1 mt-1 leading-relaxed text-[12px]">{p.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  <button
                    type="button"
                    onClick={handleAiConfirm}
                    className="w-full rounded-pill bg-orange text-white text-[14px] font-medium py-[10px] cursor-pointer hover:bg-orange-dk transition-colors"
                  >
                    {t('aiLookupConfirm')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAiLookup(true)}
              className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-orange cursor-pointer hover:text-orange-dk transition-colors py-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
              </svg>
              {t('aiLookupButton')}
            </button>
          )}
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleScanFile}
            className="hidden"
            data-testid="scan-label-input"
          />
          <button
            type="button"
            onClick={() => scanInputRef.current?.click()}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-orange cursor-pointer hover:text-orange-dk transition-colors py-1 disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            {scanning ? t('scanLabelScanning') : t('scanLabelButton')}
          </button>
        </div>

        {/* Scan-filled banner */}
        {scanned && (
          <div
            className="rounded-card px-4 py-3 flex flex-col gap-2"
            style={{ background: '#DAE8F8', border: '1px solid #B0C8E8' }}
          >
            <div className="flex items-center gap-3">
              {chooseImage(form, photoThumb) && (
                <img
                  src={chooseImage(form, photoThumb)}
                  alt=""
                  width="44"
                  height="44"
                  className="w-[44px] h-[44px] rounded-[8px] object-cover border border-[#B0C8E8] shrink-0"
                  data-testid="single-preview"
                  data-source={form.imageUrl ? 'web' : 'photo'}
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                />
              )}
              <span className="text-[12px] text-[#1A3A6A]">{t('scanLabelDone')}</span>
              {form.imageUrl && photoThumb && (
                <button
                  type="button"
                  onClick={() => handleChange('imageUrl', '')}
                  className="text-[12px] text-orange hover:underline cursor-pointer whitespace-nowrap"
                  data-testid="single-use-my-photo"
                >
                  {t('batchScanUseMyPhoto')}
                </button>
              )}
            </div>
            {form.name.trim() && hasMissing(form) && (
              <button
                type="button"
                onClick={handleFillMissing}
                disabled={fillStatus === 'looking'}
                data-testid="single-fill-missing"
                className="self-start text-[12px] font-medium text-orange hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-default"
              >
                {fillStatus === 'looking' ? t('batchScanLooking') : t('batchScanFillRow')}
              </button>
            )}
            {form.name.trim() && hasMissing(form) && (
              <PasteLinkFill
                forceOpen={fillStatus === 'none' || fillStatus === 'failed'}
                onSubmit={handleFillFromLink}
              />
            )}
            {fillStatus === 'none' && <span className="text-[12px] text-ink3" data-testid="single-no-match">{t('batchScanNoMatch')}</span>}
            {fillStatus === 'failed' && <span className="text-[12px] text-[#C05A28]">{t('batchScanLookupFailed')}</span>}
            {Object.values(webFields).some(Boolean) && (
              <span className="text-[12px] text-[#1A3A6A]" data-testid="single-web-note">{t('batchScanWebSuggested')}</span>
            )}
          </div>
        )}

        {/* AI-filled banner */}
        {aiFilled && (
          <div
            className="rounded-card px-4 py-3 flex items-center gap-2"
            style={{ background: '#DAE8F8', border: '1px solid #B0C8E8' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A3A6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[12px] text-[#1A3A6A]">AI filled — review and submit</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-4">
          <Field label={t('fieldName')} required error={errors.name}>
            <input
              className={inputClass}
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Creatine Monohydrate"
            />
          </Field>

          <Field label={t('fieldType')}>
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
          </Field>

          <Field label={t('fieldDosage')} required error={errors.dosage}>
            {isStructured(form) ? (
              <DoseInput
                form={form}
                onChange={handleDoseChange}
                invalid={Boolean(errors.dosage)}
                webFilled={Boolean(webFields.servingUnits)}
                directions={webDirections}
              />
            ) : (
              <input
                className={webFields.dosage ? webInputClass : inputClass}
                type="text"
                value={form.dosage}
                onChange={(e) => handleChange('dosage', e.target.value)}
                placeholder="e.g. 5g, 1000mg, 2 capsules"
              />
            )}
          </Field>

          <Field label={t('fieldFrequency')}>
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
          </Field>

          <Field label={t('fieldTiming')}>
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
          </Field>

          <Field label={t('fieldBrand')}>
            <input
              className={webFields.brand ? webInputClass : inputClass}
              type="text"
              value={form.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              placeholder="e.g. Optimum Nutrition"
            />
          </Field>

          <PurchaseFields form={form} onChange={handleChange} error={errors.purchasePrice} />

          <Field label={t('fieldNotes')}>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes..."
            />
          </Field>
        </div>

        {errors.submit && (
          <p className="text-[13px] text-[#C05A28] text-center mt-1">{errors.submit}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-pill bg-orange text-white text-[15px] font-medium py-[14px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
        >
          {submitting ? t('adding') : t('addButton')}
        </button>
      </form>

      {dupPrompt && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center" data-testid="add-dup-prompt">
          <div className="bg-white w-full md:max-w-[480px] rounded-t-[20px] md:rounded-[20px] p-5 flex flex-col gap-3">
            <h3 className="font-display text-[18px] text-ink1">{t('dupAddTitle')}</h3>
            <p className="text-[12px] text-ink3">{t('dupAddBody')}</p>
            <div className="rounded-card border border-border p-3 flex flex-col gap-1">
              <p className="text-[14px] font-medium text-ink1">{dupPrompt.item.name}</p>
              {dupPrompt.kind === 'similar' && (
                <p className="text-[11px] text-ink3">{t('batchScanDupSimilarNote').replace('{name}', form.name)}</p>
              )}
              <p className="text-[12px] text-ink3">
                {t('batchScanDupCurrent')}: <span className="text-ink1">{dupPrompt.item.dosage || '—'}</span>
                {' → '}
                {t('batchScanDupNew')}: <span className="text-ink1">{form.dosage || '—'}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setDupPrompt(null); persist(null) }}
              data-testid="add-dup-keep-both"
              className="w-full rounded-full bg-orange text-white text-[14px] font-semibold py-[11px] cursor-pointer hover:opacity-90"
            >
              {t('batchScanDupKeepBoth')}
            </button>
            <button
              type="button"
              onClick={() => { const item = dupPrompt.item; setDupPrompt(null); persist(item) }}
              data-testid="add-dup-overwrite"
              className="w-full rounded-full border-[1.5px] border-border text-ink1 text-[14px] font-medium py-[11px] cursor-pointer"
            >
              {t('batchScanDupOverwrite')}
            </button>
            <button
              type="button"
              onClick={() => setDupPrompt(null)}
              data-testid="add-dup-cancel"
              className="text-[13px] text-ink3 hover:text-ink1 cursor-pointer py-1"
            >
              {t('dupAddCancel')}
            </button>
          </div>
        </div>
      )}

      {batch && (
        <BatchScanModal
          files={batch.files}
          truncated={batch.truncated}
          existingItems={batch.existingItems}
          onSaved={() => {
            batchSavedRef.current = true
            try { sessionStorage.removeItem('recallth_evidence_scores') } catch { /* ignore */ }
          }}
          onClose={() => {
            const saved = batchSavedRef.current
            setBatch(null)
            if (saved) navigate('/cabinet')
          }}
        />
      )}
    </div>
  )
}
