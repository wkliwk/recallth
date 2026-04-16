import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { useAiUsage } from '../context/AiUsageContext'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

const MEAL_TRANSLATION_KEYS = {
  breakfast: 'nutritionMealBreakfast',
  lunch: 'nutritionMealLunch',
  dinner: 'nutritionMealDinner',
  snack: 'nutritionMealSnack',
}

function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function Field({ label, required, error, children }) {
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

// Shared result card used by Search and Photo tabs
function NutritionResultCard({ item, selected, onSelect }) {
  const name = item.name ?? item.product_name ?? ''
  const brand = item.brand ?? item.brands ?? ''
  const calories = item.nutrients?.calories ?? item.calories ?? item.nutriments?.energy_value ?? undefined
  const protein = item.nutrients?.protein ?? item.protein ?? item.nutriments?.proteins ?? undefined
  const carbs = item.nutrients?.carbs ?? item.carbs ?? item.nutriments?.carbohydrates ?? undefined
  const fat = item.nutrients?.fat ?? item.fat ?? item.nutriments?.fat ?? undefined
  const serving = item.quantity ?? item.serving ?? item.serving_size ?? item.servingSize ?? ''

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full text-left rounded-[12px] border px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
        selected ? 'border-orange bg-orange/5' : 'border-border bg-page hover:border-orange/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-ink1">{name}</span>
        {calories !== undefined && (
          <span className="text-[12px] text-ink3 shrink-0">{calories} kcal</span>
        )}
      </div>
      {brand ? <p className="text-[12px] text-ink2 mt-0.5">{brand}</p> : null}
      {serving ? <p className="text-[12px] text-ink3">{serving}</p> : null}
      {(protein !== undefined || carbs !== undefined || fat !== undefined) && (
        <div className="flex gap-2 mt-1.5 flex-wrap">
          {protein !== undefined && (
            <span className="text-[11px] text-ink3 bg-sand rounded-pill px-2 py-0.5">P {protein}g</span>
          )}
          {carbs !== undefined && (
            <span className="text-[11px] text-ink3 bg-sand rounded-pill px-2 py-0.5">C {carbs}g</span>
          )}
          {fat !== undefined && (
            <span className="text-[11px] text-ink3 bg-sand rounded-pill px-2 py-0.5">F {fat}g</span>
          )}
        </div>
      )}
    </button>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
    </svg>
  )
}

export default function NutritionAdd() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const { showUsage } = useAiUsage()
  const entryDate = location.state?.date ?? todayISO()

  // ── Form state ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    foodName: '',
    brand: '',
    mealType: 'breakfast',
    quantity: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // ── AI panel state ───────────────────────────────────────────────────
  const [aiPanelOpen, setAiPanelOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('search') // 'search' | 'photo' | 'describe'

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(null)
  const [searchError, setSearchError] = useState(null)
  const [searchSubmitted, setSearchSubmitted] = useState(false)

  // Photo tab state
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [photoResult, setPhotoResult] = useState(null)
  const [photoSelected, setPhotoSelected] = useState(false)
  const fileInputRef = useRef(null)

  // Describe tab state (existing AI)
  const [aiText, setAiText] = useState('')
  const [aiParsing, setAiParsing] = useState(false)
  const [aiResults, setAiResults] = useState([])
  const [aiSelectedIndex, setAiSelectedIndex] = useState(null)
  const [aiError, setAiError] = useState(null)

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // ── Helper: fill form from a nutrition item ───────────────────────────
  function fillFormFromItem(item) {
    const name = item.name ?? item.product_name ?? ''
    const brand = item.brand ?? item.brands ?? ''
    const quantity = item.quantity ?? item.serving ?? item.serving_size ?? item.servingSize ?? ''
    const calories = item.nutrients?.calories ?? item.calories ?? item.nutriments?.energy_value ?? ''
    const protein = item.nutrients?.protein ?? item.protein ?? item.nutriments?.proteins ?? ''
    const carbs = item.nutrients?.carbs ?? item.carbs ?? item.nutriments?.carbohydrates ?? ''
    const fat = item.nutrients?.fat ?? item.fat ?? item.nutriments?.fat ?? ''

    setForm((prev) => ({
      ...prev,
      foodName: name || prev.foodName,
      brand: brand || prev.brand,
      quantity: quantity !== undefined && quantity !== '' ? String(quantity) : prev.quantity,
      calories: calories !== undefined && calories !== '' ? String(calories) : prev.calories,
      protein: protein !== undefined && protein !== '' ? String(protein) : prev.protein,
      carbs: carbs !== undefined && carbs !== '' ? String(carbs) : prev.carbs,
      fat: fat !== undefined && fat !== '' ? String(fat) : prev.fat,
    }))
    setErrors((prev) => ({ ...prev, foodName: undefined }))
    setAiPanelOpen(false)
  }

  // ── Search tab handlers ──────────────────────────────────────────────
  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchResults([])
    setSearchSelectedIndex(null)
    setSearchError(null)
    setSearchSubmitted(true)
    try {
      const res = await api.nutrition.search(searchQuery.trim())
      const products = res?.data?.products ?? res?.products ?? []
      setSearchResults(products)
    } catch (err) {
      setSearchError(err.message || 'Search failed — please try again.')
    } finally {
      setSearchLoading(false)
    }
  }

  function handleSearchUse() {
    if (searchSelectedIndex === null || !searchResults[searchSelectedIndex]) return
    fillFormFromItem(searchResults[searchSelectedIndex])
  }

  // ── Photo tab handlers ───────────────────────────────────────────────
  function handlePhotoBoxClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    setPhotoError(null)
    setPhotoResult(null)
    setPhotoSelected(false)

    const mimeType = file.type || 'image/jpeg'
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      const base64 = dataUrl.split(',')[1]
      try {
        const res = await api.nutrition.ocr(base64, mimeType)
        const item = res?.data?.food ?? res?.data ?? res
        setPhotoResult(item)
        if (res?.aiUsage) showUsage(res.aiUsage, 'nutrition-ocr', {
          output: item?.name ? `${item.name}${item.calories ? ` · ${item.calories} kcal` : ''}` : undefined,
        })
      } catch (err) {
        setPhotoError(err.message || 'Failed to read the photo — please try again.')
      } finally {
        setPhotoLoading(false)
        e.target.value = ''
      }
    }
    reader.onerror = () => {
      setPhotoError('Failed to read the file.')
      setPhotoLoading(false)
    }
    reader.readAsDataURL(file)
  }

  function handlePhotoUse() {
    if (!photoResult) return
    fillFormFromItem(photoResult)
  }

  // ── Describe tab handlers (existing AI) ──────────────────────────────
  async function handleAiParse(e) {
    e.preventDefault()
    if (!aiText.trim()) return
    setAiParsing(true)
    setAiResults([])
    setAiSelectedIndex(null)
    setAiError(null)
    try {
      const res = await api.nutrition.aiParse(aiText.trim())
      const items = res?.data?.foods ?? res?.data ?? res ?? []
      const parsed = Array.isArray(items) ? items : []
      setAiResults(parsed)
      if (parsed.length === 0) {
        setAiError('No foods found. Try describing your meal differently.')
      }
    } catch (err) {
      setAiError(err.message || 'Failed to parse — please try again.')
    } finally {
      setAiParsing(false)
    }
  }

  function handleAiUse() {
    if (aiSelectedIndex === null || !aiResults[aiSelectedIndex]) return
    const item = aiResults[aiSelectedIndex]
    setForm((prev) => ({
      ...prev,
      foodName: item.name ?? prev.foodName,
      quantity: [item.quantity, item.unit].filter(Boolean).join(' ') || item.serving || prev.quantity,
      calories: item.nutrients?.calories ?? item.calories ?? prev.calories,
      protein: item.nutrients?.protein ?? item.protein ?? prev.protein,
      carbs: item.nutrients?.carbs ?? item.carbs ?? prev.carbs,
      fat: item.nutrients?.fat ?? item.fat ?? prev.fat,
    }))
    setErrors((prev) => ({ ...prev, foodName: undefined }))
    setAiPanelOpen(false)
  }

  // ── Validation ───────────────────────────────────────────────────────
  function validate() {
    const newErrors = {}
    if (!form.foodName.trim()) newErrors.foodName = `${t('nutritionFieldFood')} is required`
    return newErrors
  }

  // ── Submit ───────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        date: entryDate,
        mealType: form.mealType,
        foods: [
          {
            name: form.foodName.trim(),
            brand: form.brand.trim() || undefined,
            quantity: 1,
            unit: form.quantity.trim() || 'serving',
            nutrients: {
              calories: form.calories === '' ? undefined : Number(form.calories),
              protein: form.protein === '' ? undefined : Number(form.protein),
              carbs: form.carbs === '' ? undefined : Number(form.carbs),
              fat: form.fat === '' ? undefined : Number(form.fat),
            },
          },
        ],
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      }
      await api.nutrition.create(payload)
      navigate(-1)
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to save — please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Tab button styles ────────────────────────────────────────────────
  function tabClass(tab) {
    return `flex-1 rounded-pill py-[7px] text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
      activeTab === tab ? 'bg-orange text-white' : 'bg-sand text-ink2'
    }`
  }

  return (
    <div className="min-h-screen bg-page">
      <OrangeHeader
        title={t('nutritionAddTitle')}
        onBack={() => navigate(-1)}
      />

      <div className="-mt-[40px] md:mt-0">
        <Wave />
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-2 pb-[100px] flex flex-col gap-3">

        {/* ── AI auto-fill panel ─────────────────────────────────────── */}
        <div className="bg-white rounded-card border border-border overflow-hidden">
          {/* Panel header / toggle */}
          <button
            type="button"
            onClick={() => setAiPanelOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
            aria-expanded={aiPanelOpen}
          >
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-[13px] font-semibold text-ink1">AI Auto-fill</span>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`text-ink3 transition-transform ${aiPanelOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {aiPanelOpen && (
            <div className="border-t border-border">
              {/* Tab bar */}
              <div className="flex gap-2 px-5 pt-4 pb-3">
                <button type="button" className={tabClass('search')} onClick={() => setActiveTab('search')}>
                  Search
                </button>
                <button type="button" className={tabClass('photo')} onClick={() => setActiveTab('photo')}>
                  Photo
                </button>
                <button type="button" className={tabClass('describe')} onClick={() => setActiveTab('describe')}>
                  Describe
                </button>
              </div>

              {/* Tab content */}
              <div className="px-5 pb-5 flex flex-col gap-3">

                {/* ── Tab 1: Search ─────────────────────────────────── */}
                {activeTab === 'search' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <input
                        className={`${inputClass} flex-1`}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by brand or product..."
                        disabled={searchLoading}
                        aria-label="Search by brand or product"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e) }}
                      />
                      <button
                        type="button"
                        onClick={handleSearch}
                        disabled={searchLoading || !searchQuery.trim()}
                        className="shrink-0 rounded-[12px] bg-orange text-white text-[13px] font-medium px-4 py-[10px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
                      >
                        {searchLoading ? <Spinner /> : 'Search'}
                      </button>
                    </div>

                    {searchError && (
                      <p className="text-[12px] text-red-500">{searchError}</p>
                    )}

                    {searchResults.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[12px] text-ink2 font-medium">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</p>
                        <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
                          {searchResults.map((product, idx) => (
                            <NutritionResultCard
                              key={idx}
                              item={product}
                              selected={searchSelectedIndex === idx}
                              onSelect={() => setSearchSelectedIndex(idx)}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleSearchUse}
                          disabled={searchSelectedIndex === null}
                          className="w-full rounded-[12px] bg-orange text-white text-[13px] font-medium py-[10px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
                        >
                          Use this
                        </button>
                      </div>
                    )}

                    {searchSubmitted && !searchLoading && searchResults.length === 0 && !searchError && (
                      <p className="text-[12px] text-ink2">
                        No database match — try the Describe tab for AI estimate
                      </p>
                    )}
                  </div>
                )}

                {/* ── Tab 2: Photo ──────────────────────────────────── */}
                {activeTab === 'photo' && (
                  <div className="flex flex-col gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {!photoLoading && !photoResult && (
                      <button
                        type="button"
                        onClick={handlePhotoBoxClick}
                        className="w-full rounded-[12px] border-2 border-dashed border-border bg-sand flex flex-col items-center justify-center gap-2 py-8 text-ink2 hover:border-orange/60 hover:text-orange transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                        aria-label="Upload nutrition label photo"
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span className="text-[13px] font-medium">Upload nutrition label photo</span>
                        <span className="text-[11px] text-ink3">Tap to select a photo from your device</span>
                      </button>
                    )}

                    {photoLoading && (
                      <div className="flex flex-col items-center justify-center gap-3 py-8">
                        <Spinner />
                        <p className="text-[13px] text-ink2">Reading nutrition label...</p>
                      </div>
                    )}

                    {photoError && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[12px] text-red-500">{photoError}</p>
                        <button
                          type="button"
                          onClick={handlePhotoBoxClick}
                          className="text-[12px] text-orange underline text-left"
                        >
                          Try again
                        </button>
                      </div>
                    )}

                    {photoResult && !photoLoading && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[12px] text-ink2 font-medium">Extracted from photo</p>
                        <NutritionResultCard
                          item={photoResult}
                          selected={photoSelected}
                          onSelect={() => setPhotoSelected(true)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handlePhotoUse}
                            disabled={!photoSelected}
                            className="flex-1 rounded-[12px] bg-orange text-white text-[13px] font-medium py-[10px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
                          >
                            Use this
                          </button>
                          <button
                            type="button"
                            onClick={handlePhotoBoxClick}
                            className="shrink-0 rounded-[12px] border border-border bg-sand text-ink2 text-[13px] font-medium px-4 py-[10px] hover:border-orange/40 transition-colors"
                          >
                            Retake
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tab 3: Describe ───────────────────────────────── */}
                {activeTab === 'describe' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <input
                        className={`${inputClass} flex-1`}
                        type="text"
                        value={aiText}
                        onChange={(e) => setAiText(e.target.value)}
                        placeholder={t('nutritionAiPlaceholder')}
                        disabled={aiParsing}
                        aria-label={t('nutritionAiPlaceholder')}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAiParse(e) }}
                      />
                      <button
                        type="button"
                        onClick={handleAiParse}
                        disabled={aiParsing || !aiText.trim()}
                        className="shrink-0 rounded-[12px] bg-orange text-white text-[13px] font-medium px-4 py-[10px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
                      >
                        {aiParsing ? <Spinner /> : 'Parse'}
                      </button>
                    </div>

                    {aiError && (
                      <p className="text-[12px] text-red-500">{aiError}</p>
                    )}

                    {aiResults.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[12px] text-ink2 font-medium">
                          {t('nutritionAiParsed').replace('{n}', aiResults.length)}
                        </p>
                        <div className="flex flex-col gap-2">
                          {aiResults.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setAiSelectedIndex(idx)}
                              aria-pressed={aiSelectedIndex === idx}
                              className={`w-full text-left rounded-[12px] border px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
                                aiSelectedIndex === idx
                                  ? 'border-orange bg-orange/5'
                                  : 'border-border bg-page hover:border-orange/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[14px] font-medium text-ink1">{item.name}</span>
                                {(item.nutrients?.calories ?? item.calories) !== undefined && (
                                  <span className="text-[12px] text-ink3 shrink-0">
                                    {item.nutrients?.calories ?? item.calories} kcal
                                  </span>
                                )}
                              </div>
                              {(item.quantity != null || item.serving) && (
                                <span className="text-[12px] text-ink3">
                                  {[item.quantity, item.unit].filter(Boolean).join(' ') || item.serving}
                                </span>
                              )}
                              {(item.nutrients || item.protein !== undefined) && (
                                <div className="flex gap-3 mt-1">
                                  {(item.nutrients?.protein ?? item.protein) !== undefined && (
                                    <span className="text-[11px] text-ink3">P {item.nutrients?.protein ?? item.protein}g</span>
                                  )}
                                  {(item.nutrients?.carbs ?? item.carbs) !== undefined && (
                                    <span className="text-[11px] text-ink3">C {item.nutrients?.carbs ?? item.carbs}g</span>
                                  )}
                                  {(item.nutrients?.fat ?? item.fat) !== undefined && (
                                    <span className="text-[11px] text-ink3">F {item.nutrients?.fat ?? item.fat}g</span>
                                  )}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleAiUse}
                          disabled={aiSelectedIndex === null}
                          className="w-full rounded-[12px] bg-orange text-white text-[13px] font-medium py-[10px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
                        >
                          Use this
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Manual form ───────────────────────────────────────────── */}
        <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-4">

          <Field label={t('nutritionFieldFood')} required error={errors.foodName}>
            <input
              className={inputClass}
              type="text"
              value={form.foodName}
              onChange={(e) => handleChange('foodName', e.target.value)}
              placeholder="e.g. Grilled chicken, Apple"
              autoFocus
            />
          </Field>

          <Field label="Brand">
            <input
              className={inputClass}
              type="text"
              value={form.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              placeholder="e.g. Quaker, Nestlé"
            />
          </Field>

          <Field label={t('nutritionFieldMeal')}>
            <div className="relative">
              <select
                className={selectClass}
                value={form.mealType}
                onChange={(e) => handleChange('mealType', e.target.value)}
              >
                {MEAL_TYPES.map((mt) => (
                  <option key={mt} value={mt}>
                    {t(MEAL_TRANSLATION_KEYS[mt])}
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </Field>

          <Field label={t('nutritionFieldQuantity')}>
            <input
              className={inputClass}
              type="text"
              value={form.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              placeholder="e.g. 1 plate, 250g"
            />
          </Field>

          <Field label={`${t('nutritionCalories')} (kcal)`}>
            <input
              className={inputClass}
              type="number"
              min="0"
              value={form.calories}
              onChange={(e) => handleChange('calories', e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label={`${t('nutritionProtein')} (g)`}>
            <input
              className={inputClass}
              type="number"
              min="0"
              value={form.protein}
              onChange={(e) => handleChange('protein', e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label={`${t('nutritionCarbs')} (g)`}>
            <input
              className={inputClass}
              type="number"
              min="0"
              value={form.carbs}
              onChange={(e) => handleChange('carbs', e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label={`${t('nutritionFat')} (g)`}>
            <input
              className={inputClass}
              type="number"
              min="0"
              value={form.fat}
              onChange={(e) => handleChange('fat', e.target.value)}
              placeholder="0"
            />
          </Field>

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
          <p className="text-[13px] text-red-500 text-center mt-2">{errors.submit}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-5 rounded-pill bg-orange text-white text-[15px] font-medium py-[14px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-dk transition-colors"
        >
          {submitting ? t('adding') : t('nutritionConfirm')}
        </button>
      </form>
    </div>
  )
}
