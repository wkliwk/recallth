import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const MEAL_COLORS = {
  Breakfast: { bg: '#E8EEFF', text: '#3D5BA0' },
  Lunch:     { bg: '#E8F0E8', text: '#3D6B3D' },
  Dinner:    { bg: '#FDE8DE', text: '#C05A28' },
  Snack:     { bg: '#F5F0E8', text: '#7A6030' },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function relativeTime(dateStr) {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin || 1} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  return `${diffDay} days ago`
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function NutrientPill({ label, value, colorClass }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill px-[10px] py-[4px] text-[12px] font-medium ${colorClass}`}>
      {label}: {value}
    </span>
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
        <div className="h-[22px] w-2/3 bg-sand rounded-pill" />
        <div className="flex gap-2">
          <div className="h-[24px] w-[70px] bg-sand rounded-pill" />
          <div className="h-[24px] w-[70px] bg-sand rounded-pill" />
          <div className="h-[24px] w-[70px] bg-sand rounded-pill" />
        </div>
        <div className="h-[14px] w-1/2 bg-sand rounded-pill" />
        <div className="h-[14px] w-3/4 bg-sand rounded-pill" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */
export default function NutritionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimeoutRef = useRef(null)

  useEffect(() => {
    async function fetchEntry() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.nutrition.get(id)
        const data = res?.data ?? res
        if (!data) {
          setError('Entry not found')
        } else {
          setEntry(data)
          setForm({
            name:     data.name     || '',
            mealType: data.mealType || 'Breakfast',
            quantity: data.quantity || '',
            calories: data.calories !== undefined ? String(data.calories) : '',
            protein:  data.protein  !== undefined ? String(data.protein)  : '',
            carbs:    data.carbs    !== undefined ? String(data.carbs)    : '',
            fat:      data.fat      !== undefined ? String(data.fat)      : '',
            notes:    data.notes    || '',
          })
        }
      } catch {
        setError('Failed to load entry')
      } finally {
        setLoading(false)
      }
    }

    fetchEntry()
  }, [id])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    }
  }, [])

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate() {
    const errs = {}
    if (!form.name?.trim()) errs.name = 'Food name is required'
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
        name:     form.name.trim(),
        mealType: form.mealType,
        ...(form.quantity?.trim()                  ? { quantity: form.quantity.trim() }     : {}),
        ...(form.calories !== '' ? { calories: Number(form.calories) } : {}),
        ...(form.protein  !== '' ? { protein:  Number(form.protein)  } : {}),
        ...(form.carbs    !== '' ? { carbs:    Number(form.carbs)    } : {}),
        ...(form.fat      !== '' ? { fat:      Number(form.fat)      } : {}),
        ...(form.notes?.trim()                     ? { notes: form.notes.trim() }           : {}),
      }
      const res = await api.nutrition.update(id, payload)
      const updated = res?.data ?? res
      setEntry((prev) => ({ ...prev, ...updated }))
      setEditing(false)
      setFormErrors({})
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to save changes' })
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteFirstTap() {
    setConfirmDelete(true)
    confirmTimeoutRef.current = setTimeout(() => {
      setConfirmDelete(false)
    }, 3000)
  }

  async function handleDelete() {
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    setDeleting(true)
    try {
      await api.nutrition.remove(id)
      navigate('/nutrition')
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to delete entry' })
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const mealColors = MEAL_COLORS[entry?.mealType] || MEAL_COLORS.Snack

  return (
    <div className="min-h-screen bg-page">
      <OrangeHeader
        title={t('nutritionAddTitle')}
        onBack={() => navigate('/nutrition')}
      />

      <div className="-mt-[40px] md:mt-0">
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
        /* ── Edit mode ─────────────────────────────────────────────── */
        <div className="px-5 pt-2 pb-[100px]">
          <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-4">

            <EditField label={t('nutritionFieldFood')} required error={formErrors.name}>
              <input
                className={inputClass}
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Grilled chicken"
              />
            </EditField>

            <EditField label={t('nutritionFieldMeal')}>
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.mealType}
                  onChange={(e) => handleChange('mealType', e.target.value)}
                >
                  {MEAL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3 pointer-events-none"
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </EditField>

            <EditField label={t('nutritionFieldQuantity')}>
              <input
                className={inputClass}
                type="text"
                value={form.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="e.g. 150g, 1 cup"
              />
            </EditField>

            <EditField label={t('nutritionCalories')}>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.calories}
                onChange={(e) => handleChange('calories', e.target.value)}
                placeholder="kcal"
              />
            </EditField>

            <EditField label={t('nutritionProtein')}>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.protein}
                onChange={(e) => handleChange('protein', e.target.value)}
                placeholder="g"
              />
            </EditField>

            <EditField label={t('nutritionCarbs')}>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.carbs}
                onChange={(e) => handleChange('carbs', e.target.value)}
                placeholder="g"
              />
            </EditField>

            <EditField label={t('nutritionFat')}>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.fat}
                onChange={(e) => handleChange('fat', e.target.value)}
                placeholder="g"
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
            <p className="text-[13px] text-red-500 text-center mt-4">{formErrors.submit}</p>
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
        /* ── Read mode ─────────────────────────────────────────────── */
        <div className="px-5 pt-2 pb-[100px] flex flex-col gap-4">
          <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-4">

            {/* Food name */}
            <h2 className="font-display text-[22px] text-ink1 leading-tight">
              {entry.name}
            </h2>

            {/* Meal type badge */}
            {entry.mealType && (
              <span
                className="self-start rounded-pill px-[12px] py-[4px] text-[12px] font-semibold"
                style={{ background: mealColors.bg, color: mealColors.text }}
              >
                {entry.mealType}
              </span>
            )}

            {/* Nutrient pills */}
            {(entry.calories !== undefined || entry.protein !== undefined ||
              entry.carbs !== undefined || entry.fat !== undefined) && (
              <div className="flex flex-wrap gap-2">
                <NutrientPill
                  label={t('nutritionCalories')}
                  value={entry.calories !== undefined ? `${entry.calories} kcal` : undefined}
                  colorClass="bg-[#FDE8DE] text-[#C05A28]"
                />
                <NutrientPill
                  label={t('nutritionProtein')}
                  value={entry.protein !== undefined ? `${entry.protein}g` : undefined}
                  colorClass="bg-[#E8F0E8] text-[#3D6B3D]"
                />
                <NutrientPill
                  label={t('nutritionCarbs')}
                  value={entry.carbs !== undefined ? `${entry.carbs}g` : undefined}
                  colorClass="bg-[#E8EEFF] text-[#3D5BA0]"
                />
                <NutrientPill
                  label={t('nutritionFat')}
                  value={entry.fat !== undefined ? `${entry.fat}g` : undefined}
                  colorClass="bg-sand text-ink2"
                />
              </div>
            )}

            {/* Quantity */}
            {entry.quantity && (
              <div className="flex items-start justify-between gap-3 py-[10px] border-t border-border">
                <span className="text-[12px] text-ink3 shrink-0">{t('nutritionFieldQuantity')}</span>
                <span className="text-[14px] text-ink1 text-right">{entry.quantity}</span>
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <div className="flex flex-col gap-1 py-[10px] border-t border-border">
                <span className="text-[12px] text-ink3">{t('fieldNotes')}</span>
                <span className="text-[14px] text-ink1 leading-relaxed">{entry.notes}</span>
              </div>
            )}

            {/* Raw input text */}
            {entry.rawInput && (
              <p className="text-[13px] text-ink3 italic border-t border-border pt-[10px]">
                You said: &ldquo;{entry.rawInput}&rdquo;
              </p>
            )}

            {/* Timestamp */}
            {entry.createdAt && (
              <p className="text-[11px] text-ink4 border-t border-border pt-[10px]">
                {relativeTime(entry.createdAt)}
              </p>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={() => setEditing(true)}
            className="w-full rounded-pill bg-orange text-white text-[15px] font-medium py-[14px] cursor-pointer hover:bg-orange-dk transition-colors"
          >
            {t('editButton')}
          </button>

          {/* Delete — two-step confirmation */}
          {confirmDelete ? (
            <div className="rounded-card border border-red-200 bg-red-50 p-4 flex flex-col gap-3">
              <p className="text-[14px] text-ink1 text-center font-medium">
                {t('nutritionDeleteConfirm')}
              </p>
              <p className="text-[12px] text-ink3 text-center">{t('cannotUndo')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
                    setConfirmDelete(false)
                  }}
                  className="flex-1 rounded-pill border-[1.5px] border-border text-ink2 text-[14px] font-medium py-[10px] cursor-pointer hover:border-ink3 transition-colors"
                >
                  {t('cancelButton')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-pill bg-red-500 text-white text-[14px] font-medium py-[10px] cursor-pointer disabled:opacity-60 hover:bg-red-600 transition-colors"
                >
                  {deleting ? t('deleting') : t('deleteButton')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleDeleteFirstTap}
              className="w-full rounded-pill border-[1.5px] border-red-200 text-red-500 text-[15px] font-medium py-[13px] cursor-pointer hover:bg-red-50 transition-colors"
            >
              {t('deleteButton')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
