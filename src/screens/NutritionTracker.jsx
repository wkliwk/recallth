import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import FAB from '../components/FAB'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

// ── Date helper ───────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ── Skeleton primitive ────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-sand ${className}`}
      aria-hidden="true"
    />
  )
}

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'gym', labelKey: 'nutritionCategoryGym' },
  { key: 'weight-loss', labelKey: 'nutritionCategoryWeightLoss' },
  { key: 'diabetes', labelKey: 'nutritionCategoryDiabetes' },
  { key: 'kidney', labelKey: 'nutritionCategoryKidney' },
  { key: 'pregnancy', labelKey: 'nutritionCategoryPregnancy' },
  { key: 'custom', labelKey: 'nutritionCategoryCustom' },
]

const MEDICAL_DISCLAIMER_CATEGORIES = new Set(['diabetes', 'kidney', 'pregnancy'])

// Nutrients to show per category, with translation key and unit
const CATEGORY_NUTRIENTS = {
  gym: [
    { key: 'calories', labelKey: 'nutritionCalories', unit: 'kcal' },
    { key: 'protein', labelKey: 'nutritionProtein', unit: 'g' },
    { key: 'carbs', labelKey: 'nutritionCarbs', unit: 'g' },
    { key: 'fat', labelKey: 'nutritionFat', unit: 'g' },
  ],
  'weight-loss': [
    { key: 'calories', labelKey: 'nutritionCalories', unit: 'kcal' },
    { key: 'fat', labelKey: 'nutritionFat', unit: 'g' },
    { key: 'sugar', labelKey: 'nutritionSugar', unit: 'g' },
    { key: 'fiber', labelKey: 'nutritionFiber', unit: 'g' },
  ],
  diabetes: [
    { key: 'carbs', labelKey: 'nutritionCarbs', unit: 'g' },
    { key: 'sugar', labelKey: 'nutritionSugar', unit: 'g' },
    { key: 'fiber', labelKey: 'nutritionFiber', unit: 'g' },
  ],
  kidney: [
    { key: 'sodium', labelKey: 'nutritionSodium', unit: 'mg' },
    { key: 'protein', labelKey: 'nutritionProtein', unit: 'g' },
  ],
  pregnancy: [
    { key: 'calories', labelKey: 'nutritionCalories', unit: 'kcal' },
    { key: 'protein', labelKey: 'nutritionProtein', unit: 'g' },
    { key: 'folate', labelKey: 'nutritionFolate', unit: 'mcg' },
    { key: 'iron', labelKey: 'nutritionIron', unit: 'mg' },
  ],
  custom: [
    { key: 'calories', labelKey: 'nutritionCalories', unit: 'kcal' },
    { key: 'protein', labelKey: 'nutritionProtein', unit: 'g' },
    { key: 'carbs', labelKey: 'nutritionCarbs', unit: 'g' },
    { key: 'fat', labelKey: 'nutritionFat', unit: 'g' },
  ],
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABEL_KEYS = {
  breakfast: 'nutritionMealBreakfast',
  lunch: 'nutritionMealLunch',
  dinner: 'nutritionMealDinner',
  snack: 'nutritionMealSnack',
}

// ── Nutrient progress bar ─────────────────────────────────────────────────────
function NutrientBar({ label, actual, target, unit }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-[5px]">
        <span className="text-[12px] font-medium text-ink2">{label}</span>
        <span className="text-[12px] text-ink3">
          {actual ?? 0} / {target ?? '—'} {unit}
        </span>
      </div>
      <div className="h-[6px] rounded-full bg-sand overflow-hidden">
        <div
          className="h-full rounded-full bg-orange transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={actual ?? 0}
          aria-valuemin={0}
          aria-valuemax={target ?? 100}
          aria-label={label}
        />
      </div>
    </div>
  )
}

// ── Daily summary card ────────────────────────────────────────────────────────
function SummaryCard({ category, loading, summary, t }) {
  const nutrients = CATEGORY_NUTRIENTS[category] ?? CATEGORY_NUTRIENTS.custom

  if (loading) {
    return (
      <div className="mx-5 mb-5 rounded-[14px] border border-border bg-white px-5 py-4 flex flex-col gap-3">
        <Skeleton className="h-[12px] w-1/3" />
        {nutrients.map((n) => (
          <div key={n.key} className="flex flex-col gap-[5px]">
            <div className="flex justify-between">
              <Skeleton className="h-[12px] w-[60px]" />
              <Skeleton className="h-[12px] w-[80px]" />
            </div>
            <Skeleton className="h-[6px] w-full rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-[14px] border border-border bg-white px-5 py-4 md:px-6 md:py-5 flex flex-col gap-[14px] shadow-sm">
      <p className="text-[13px] font-semibold text-ink1">Today</p>
      {nutrients.map((n) => (
        <NutrientBar
          key={n.key}
          label={t(n.labelKey) !== n.labelKey ? t(n.labelKey) : n.key}
          actual={summary?.nutrients?.[n.key]?.actual ?? 0}
          target={summary?.nutrients?.[n.key]?.target ?? 0}
          unit={n.unit}
        />
      ))}
    </div>
  )
}

// ── Parsed food item row ──────────────────────────────────────────────────────
function ParsedFoodRow({ food, checked, onToggle }) {
  const id = `food-${food.name}-${Math.random().toString(36).slice(2)}`
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 py-[10px] border-b border-border last:border-0 cursor-pointer"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(food.name)}
        className="mt-[2px] w-4 h-4 accent-orange cursor-pointer shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-[13px] font-medium text-ink1 leading-snug">{food.name}</p>
          {(food.quantity != null || food.unit) && (
            <span className="text-[11px] text-ink3 shrink-0">{food.quantity} {food.unit}</span>
          )}
        </div>
        <p className="text-[11px] text-ink3 mt-[2px]">
          {[
            (food.nutrients?.calories ?? food.calories) != null && `${food.nutrients?.calories ?? food.calories} kcal`,
            (food.nutrients?.protein ?? food.protein) != null && `${food.nutrients?.protein ?? food.protein}g protein`,
            (food.nutrients?.carbs ?? food.carbs) != null && `${food.nutrients?.carbs ?? food.carbs}g carbs`,
            (food.nutrients?.fat ?? food.fat) != null && `${food.nutrients?.fat ?? food.fat}g fat`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </label>
  )
}

// ── Meal group card ───────────────────────────────────────────────────────────
function MealGroup({ mealType, entries, t, onDelete }) {
  const label = t(MEAL_LABEL_KEYS[mealType] ?? mealType)
  const [expandedId, setExpandedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const totalCal = entries.reduce((sum, e) => {
    const c = e.foods?.reduce((s, f) => s + (f.nutrients?.calories ?? f.calories ?? 0), 0) ?? e.calories ?? 0
    return sum + c
  }, 0)

  async function handleDelete(entryId) {
    setDeletingId(entryId)
    try {
      await api.nutrition.remove(entryId)
      setExpandedId(null)
      onDelete?.()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-[14px] border border-border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-[10px] border-b border-border bg-sand/40">
        <p className="text-[13px] font-semibold text-ink1">{label}</p>
        <p className="text-[12px] text-ink3">{totalCal} kcal</p>
      </div>
      {entries.map((entry) => {
        const names = entry.foods?.map((f) => f.name).join(', ') ?? entry.rawText ?? '—'
        const cal =
          entry.foods?.reduce((s, f) => s + (f.nutrients?.calories ?? f.calories ?? 0), 0) ?? entry.calories ?? 0
        const isExpanded = expandedId === entry._id
        const isDeleting = deletingId === entry._id
        return (
          <div key={entry._id} className="border-b border-border last:border-0">
            {/* Entry row — tap to expand/collapse */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : entry._id)}
              className="w-full text-left flex items-center justify-between px-4 py-[11px] hover:bg-sand/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 text-ink3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <p className="text-[13px] text-ink1 truncate">{names}</p>
              </div>
              <p className="text-[12px] text-ink3 shrink-0 ml-3">{cal} kcal</p>
            </button>

            {/* Expanded food details */}
            {isExpanded && (
              <div className="px-4 pb-3 flex flex-col gap-[6px] bg-sand/20">
                {entry.foods?.length > 0 ? entry.foods.map((food, idx) => {
                  const kcal = food.nutrients?.calories ?? food.calories
                  const protein = food.nutrients?.protein ?? food.protein
                  const carbs = food.nutrients?.carbs ?? food.carbs
                  const fat = food.nutrients?.fat ?? food.fat
                  const macros = [
                    protein != null && `P ${protein}g`,
                    carbs != null && `C ${carbs}g`,
                    fat != null && `F ${fat}g`,
                  ].filter(Boolean).join('  ')
                  return (
                    <div key={food.name ?? idx} className="flex items-start justify-between gap-3 py-[6px] border-b border-border/50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-[13px] text-ink1 font-medium leading-snug">
                          {food.name}
                          {(food.quantity != null || food.unit) && (
                            <span className="text-ink3 font-normal ml-1">{food.quantity} {food.unit}</span>
                          )}
                        </p>
                        {macros && <p className="text-[11px] text-ink3 mt-[2px]">{macros}</p>}
                      </div>
                      {kcal != null && (
                        <p className="text-[12px] text-ink2 shrink-0 font-medium">{kcal} kcal</p>
                      )}
                    </div>
                  )
                }) : (
                  <p className="text-[12px] text-ink3 py-2">No food details available</p>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(entry._id)}
                  disabled={isDeleting}
                  className="mt-2 w-full flex items-center justify-center gap-[6px] rounded-[10px] border border-red-200 text-red-500 text-[12px] font-medium py-[8px] hover:bg-red-50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  {isDeleting ? (
                    <span className="w-[12px] h-[12px] border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  )}
                  {isDeleting ? 'Deleting…' : 'Delete record'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NutritionTracker() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const today = todayISO()

  // ── Category state ────────────────────────────────────────────────────────
  const [category, setCategory] = useState('gym')
  const [categoryLoading, setCategoryLoading] = useState(true)

  // ── Summary state ─────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  // ── Food log state ────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [entriesError, setEntriesError] = useState(null)

  // ── AI input state ────────────────────────────────────────────────────────
  const [aiText, setAiText] = useState('')
  const [aiParsing, setAiParsing] = useState(false)
  const [parsedFoods, setParsedFoods] = useState([])
  const [checkedFoods, setCheckedFoods] = useState(new Set())
  const [aiError, setAiError] = useState(null)
  const [addingToLog, setAddingToLog] = useState(false)

  // ── Fetch category on mount ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function fetchCategory() {
      try {
        const res = await api.nutrition.getCategory()
        if (!cancelled) {
          const cat = res?.data?.category ?? res?.category ?? 'gym'
          setCategory(cat)
        }
      } catch {
        // fallback to 'gym'
      } finally {
        if (!cancelled) setCategoryLoading(false)
      }
    }
    fetchCategory()
    return () => { cancelled = true }
  }, [])

  // ── Fetch summary ─────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await api.nutrition.summary(today)
      setSummary(res?.data ?? res ?? null)
    } catch {
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [today])

  // ── Fetch today's log ─────────────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    setEntriesLoading(true)
    setEntriesError(null)
    try {
      const res = await api.nutrition.list(today)
      const data = res?.data ?? res ?? []
      setEntries(Array.isArray(data) ? data : [])
    } catch (err) {
      setEntriesError(err?.message ?? 'Failed to load entries')
      setEntries([])
    } finally {
      setEntriesLoading(false)
    }
  }, [today])

  useEffect(() => {
    fetchSummary()
    fetchEntries()
  }, [fetchSummary, fetchEntries])

  // ── Category selection handler ────────────────────────────────────────────
  async function handleSelectCategory(cat) {
    setCategory(cat)
    try {
      await api.nutrition.setCategory(cat)
    } catch {
      // non-fatal — UI already updated optimistically
    }
  }

  // ── AI parse handler ──────────────────────────────────────────────────────
  async function handleAiParse() {
    if (!aiText.trim()) return
    setAiParsing(true)
    setAiError(null)
    setParsedFoods([])
    setCheckedFoods(new Set())
    try {
      const res = await api.nutrition.aiParse(aiText.trim(), category)
      const foods = res?.data?.foods ?? res?.foods ?? []
      setParsedFoods(Array.isArray(foods) ? foods : [])
      setCheckedFoods(new Set((Array.isArray(foods) ? foods : []).map((f) => f.name)))
    } catch (err) {
      setAiError(err?.message ?? 'Failed to parse — please try again')
    } finally {
      setAiParsing(false)
    }
  }

  // ── Toggle food checkbox ──────────────────────────────────────────────────
  function toggleFood(name) {
    setCheckedFoods((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  // ── Add to log ────────────────────────────────────────────────────────────
  async function handleAddToLog() {
    const selected = parsedFoods.filter((f) => checkedFoods.has(f.name))
    if (selected.length === 0) return
    setAddingToLog(true)
    try {
      await api.nutrition.create({
        date: today,
        mealType: 'snack',
        foods: selected,
        rawText: aiText.trim(),
      })
      setAiText('')
      setParsedFoods([])
      setCheckedFoods(new Set())
      await Promise.all([fetchEntries(), fetchSummary()])
    } catch (err) {
      setAiError(err?.message ?? 'Failed to add to log — please try again')
    } finally {
      setAddingToLog(false)
    }
  }

  // ── Compute calorie subtitle ──────────────────────────────────────────────
  const calSub = (() => {
    if (summaryLoading || categoryLoading) return t('nutritionSub')
    const actual = summary?.nutrients?.calories?.actual ?? 0
    const target = summary?.nutrients?.calories?.target ?? 0
    if (!target) return t('nutritionSub')
    return `${actual.toLocaleString()} / ${target.toLocaleString()} kcal`
  })()

  // ── Group entries by mealType ─────────────────────────────────────────────
  const mealGroups = MEAL_ORDER.reduce((acc, mt) => {
    const group = entries.filter(
      (e) => (e.mealType ?? '').toLowerCase() === mt
    )
    if (group.length > 0) acc[mt] = group
    return acc
  }, {})

  const showDisclaimer = MEDICAL_DISCLAIMER_CATEGORIES.has(category)

  return (
    <div className="min-h-screen bg-page">
      {/* ── Mobile header + wave ── */}
      <OrangeHeader
        title={t('nutritionTitle')}
        subtitle={calSub}
      />
      <div className="-mt-[40px] md:mt-0">
        <Wave />
      </div>

      {/* ── Desktop sticky header ── */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
        <div>
          <h1 className="text-[20px] font-semibold text-ink1">{t('nutritionTitle')}</h1>
          <p className="text-[13px] text-ink3 mt-[2px]">{calSub}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/nutrition/add')}
          className="flex items-center gap-2 bg-orange text-white text-[13px] font-semibold px-4 py-[9px] rounded-[10px] hover:bg-orange-dk transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        >
          + Add food
        </button>
      </div>

      {/* ── Main content container ── */}
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 lg:px-8 pt-2 md:pt-6">

        {/* ── Category selector ── */}
        <div className="mb-5 md:mb-6">
          <div
            className="flex gap-2 overflow-x-auto md:overflow-x-visible md:flex-wrap pb-1 scrollbar-hide"
            role="group"
            aria-label="Nutrition category"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {CATEGORIES.map(({ key, labelKey }) => {
              const active = category === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectCategory(key)}
                  aria-pressed={active}
                  disabled={categoryLoading}
                  className={[
                    'shrink-0 px-[14px] py-[7px] rounded-pill text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange',
                    active
                      ? 'bg-orange text-white'
                      : 'bg-sand text-ink2 hover:bg-orange/10',
                    categoryLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer',
                  ].join(' ')}
                >
                  {t(labelKey)}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Two-column grid at lg ── */}
        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-6 lg:items-start">

          {/* ── LEFT: Summary + disclaimer (sticky on desktop) ── */}
          <div className="lg:sticky lg:top-[80px]">
            {showDisclaimer && (
              <div
                className="mb-5 px-4 py-3 rounded-[12px] bg-[#FDE8DE]"
                role="note"
                aria-label="Medical disclaimer"
              >
                <p className="text-[12px] text-ink2">{t('nutritionDisclaimer')}</p>
              </div>
            )}
            <SummaryCard
              category={category}
              loading={summaryLoading}
              summary={summary}
              t={t}
            />
          </div>

          {/* ── RIGHT: AI Analyser + Today's log ── */}
          <div className="flex flex-col gap-5">

            {/* AI input section */}
            <div className="rounded-[14px] border border-border bg-white px-5 py-5 md:px-6 md:py-6 shadow-sm">
              <p className="text-[14px] md:text-[16px] font-semibold text-ink1 mb-3">AI Food Analyser</p>

              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder={t('nutritionAiPlaceholder')}
                rows={3}
                disabled={aiParsing}
                className="w-full border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 resize-none focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white disabled:opacity-60 md:min-h-[120px]"
              />

              <button
                type="button"
                onClick={handleAiParse}
                disabled={aiParsing || !aiText.trim()}
                className="mt-3 w-full rounded-[10px] bg-orange text-white text-[13px] font-semibold py-[10px] hover:bg-orange-dk transition-colors disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
              >
                {aiParsing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-[14px] h-[14px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {t('nutritionAiParsing')}
                  </span>
                ) : (
                  'Analyse'
                )}
              </button>

              {aiError && (
                <p className="mt-2 text-[12px] text-[#E11D48]" role="alert">
                  {aiError}
                </p>
              )}

              {parsedFoods.length > 0 && (
                <div className="mt-4">
                  <p className="text-[12px] font-medium text-ink2 mb-1">
                    {t('nutritionAiParsed').replace('{n}', parsedFoods.length)}
                  </p>
                  <div className="border border-border rounded-[10px] overflow-hidden">
                    {parsedFoods.map((food) => (
                      <ParsedFoodRow
                        key={food.name}
                        food={food}
                        checked={checkedFoods.has(food.name)}
                        onToggle={toggleFood}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddToLog}
                    disabled={addingToLog || checkedFoods.size === 0}
                    className="mt-3 w-full rounded-[10px] border border-orange text-orange text-[13px] font-semibold py-[10px] hover:bg-orange/5 transition-colors disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                  >
                    {addingToLog ? 'Adding…' : t('nutritionConfirm')}
                  </button>
                </div>
              )}
            </div>

            {/* Today's food log */}
            <div className="pb-[100px] md:pb-8">
              <p className="text-[14px] md:text-[16px] font-semibold text-ink1 mb-3 md:mb-4">Today's log</p>

              {entriesLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-[90px]" />
                  <Skeleton className="h-[90px]" />
                </div>
              ) : entriesError ? (
                <p className="text-[13px] text-ink3 text-center py-6">{entriesError}</p>
              ) : Object.keys(mealGroups).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-[15px] text-ink2 font-medium mb-1">{t('nutritionEmpty')}</p>
                  <p className="text-[13px] text-ink3">{t('nutritionEmptySub')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {MEAL_ORDER.filter((mt) => mealGroups[mt]).map((mt) => (
                    <MealGroup
                      key={mt}
                      mealType={mt}
                      entries={mealGroups[mt]}
                      t={t}
                      onDelete={() => Promise.all([fetchEntries(), fetchSummary()])}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── FAB — mobile only ── */}
      <div className="md:hidden">
        <FAB onClick={() => navigate('/nutrition/add')} />
      </div>
    </div>
  )
}
