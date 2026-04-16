import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

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

export default function NutritionAdd() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  // ── Form state ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    foodName: '',
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
  const [aiText, setAiText] = useState('')
  const [aiParsing, setAiParsing] = useState(false)
  const [aiResults, setAiResults] = useState([])
  const [aiSelectedIndex, setAiSelectedIndex] = useState(null)
  const [aiError, setAiError] = useState(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(true)

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // ── AI parse ─────────────────────────────────────────────────────────
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
        date: todayISO(),
        mealType: form.mealType,
        foods: [
          {
            name: form.foodName.trim(),
            quantity: form.quantity.trim(),
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

  return (
    <div className="min-h-screen bg-page">
      <OrangeHeader
        title={t('nutritionAddTitle')}
        onBack={() => navigate(-1)}
      />

      <div className="-mt-[40px]">
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
            <div className="px-5 pb-5 flex flex-col gap-3 border-t border-border">
              {/* AI text input */}
              <div className="flex gap-2 pt-3">
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
                  {aiParsing ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                    </svg>
                  ) : (
                    'Parse'
                  )}
                </button>
              </div>

              {/* AI error */}
              {aiError && (
                <p className="text-[12px] text-red-500">{aiError}</p>
              )}

              {/* AI results list */}
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
