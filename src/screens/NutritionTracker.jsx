import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import FAB from '../components/FAB'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function offsetDate(iso, days) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateLabel(iso) {
  const today = todayISO()
  if (iso === today) return 'Today'
  if (iso === offsetDate(today, -1)) return 'Yesterday'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
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

const MEAL_TYPE_KEYWORDS = [
  { type: 'breakfast', words: ['早餐', '早飯', '早午餐', 'breakfast', '早'] },
  { type: 'lunch',     words: ['午餐', '午飯', 'lunch'] },
  { type: 'dinner',    words: ['晚餐', '晚飯', 'dinner', '晚'] },
  { type: 'snack',     words: ['下午茶', '茶餐', '小食', 'snack', '宵夜', '下午'] },
]

function detectMealType(text) {
  const lower = text.toLowerCase()
  for (const { type, words } of MEAL_TYPE_KEYWORDS) {
    if (words.some((w) => lower.includes(w.toLowerCase()))) return type
  }
  return 'snack'
}

const LOG_METRICS = [
  { key: 'calories', label: 'kcal', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
]

function getFoodMetric(food, key) {
  return food.nutrients?.[key] ?? food[key] ?? 0
}

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
function SummaryCard({ category, loading, summary, t, dateLabel = 'Today' }) {
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
      <p className="text-[13px] font-semibold text-ink1">{dateLabel}</p>
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

// ── Algorithm explanation card ────────────────────────────────────────────────
function AlgorithmCard({ summary, navigate }) {
  const [open, setOpen] = useState(false)
  const basis = summary?.targetBasis
  const f = summary?.formula

  return (
    <div className="rounded-[14px] border border-border bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 focus:outline-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange shrink-0">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-[12px] font-semibold text-ink1">How are targets calculated?</span>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-ink3 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border text-[12px] leading-relaxed">
          {basis === 'personalised' && f ? (
            <div className="flex flex-col gap-[6px] pt-3">
              <p className="text-[11px] font-semibold text-orange uppercase tracking-wide mb-1">Personalised · Mifflin-St Jeor</p>
              <div className="bg-sand/60 rounded-[10px] p-3 flex flex-col gap-[5px] font-mono text-[11px] text-ink2">
                <p>BMR = 10×{f.weightKg}kg + 6.25×{f.heightCm}cm − 5×{f.age} {f.sex === 'male' ? '+ 5' : '− 161'}</p>
                <p className="font-semibold text-ink1">BMR = {f.bmr} kcal</p>
                <p className="mt-1">TDEE = {f.bmr} × {f.activityMultiplier} ({f.activityLevel.replace('_', ' ')})</p>
                <p className="font-semibold text-ink1">TDEE = {f.tdee} kcal</p>
                <p className="mt-1">Calorie target = {f.tdee} {f.calorieAdjustmentLabel}</p>
                <p className="font-semibold text-ink1">= {f.calorieTarget} kcal/day</p>
                <p className="mt-1">Protein = {f.weightKg}kg × factor</p>
                <p className="font-semibold text-ink1">= {f.proteinTarget}g/day</p>
              </div>
              <p className="text-[10px] text-ink3 mt-1">Update your profile to recalculate.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-3">
              <p className="text-ink2">Targets are using <strong>general guidelines</strong>.</p>
              <p className="text-ink3 text-[11px]">
                Complete your profile — height, weight, age, sex, and activity level — to get targets personalised to your body using the Mifflin-St Jeor formula.
              </p>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="mt-1 text-[12px] font-semibold text-orange hover:underline text-left focus:outline-none"
              >
                Complete profile →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Mobile collapsible calendar ───────────────────────────────────────────────
function MobileCalendar({ viewDate, onSelectDate, todayStr, dateLabel, refreshKey }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden rounded-[14px] border border-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 focus:outline-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[13px] font-semibold text-ink1">{dateLabel}</span>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className={`text-ink3 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="pt-3">
            <NutritionCalendar
              viewDate={viewDate}
              onSelectDate={(d) => { onSelectDate(d); setOpen(false) }}
              todayStr={todayStr}
              refreshKey={refreshKey}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Nutrition Calendar ────────────────────────────────────────────────────────
const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function NutritionCalendar({ viewDate, onSelectDate, todayStr, refreshKey = 0 }) {
  const toMonthISO = (iso) => iso.slice(0, 7) + '-01'
  const [calMonth, setCalMonth] = useState(() => toMonthISO(viewDate))
  const [recordDays, setRecordDays] = useState(new Set())

  // Sync calendar month when viewDate moves to a different month
  useEffect(() => {
    const newMonth = toMonthISO(viewDate)
    if (newMonth !== calMonth) setCalMonth(newMonth)
  }, [viewDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch which days have records whenever calMonth or refreshKey changes
  useEffect(() => {
    const [year, month] = calMonth.split('-')
    api.nutrition.days(year, month)
      .then((res) => {
        const list = res?.data ?? []
        setRecordDays(new Set(Array.isArray(list) ? list : []))
      })
      .catch(() => {})
  }, [calMonth, refreshKey])

  const year = parseInt(calMonth.slice(0, 4), 10)
  const month = parseInt(calMonth.slice(5, 7), 10)
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const isCurrentMonth = calMonth.slice(0, 7) === todayStr.slice(0, 7)

  function prevMonth() {
    const d = new Date(year, month - 2, 1)
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    const d = new Date(year, month, 1)
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }),
  ]

  return (
    <div className="rounded-[14px] border border-border bg-white px-4 pt-4 pb-3 shadow-sm">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Previous month"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-sand transition-colors focus:outline-none"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[13px] font-semibold text-ink1">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-sand transition-colors focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <span key={d} className="text-[10px] font-medium text-ink3 text-center py-[2px]">{d}</span>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-[2px]">
        {cells.map((iso, i) => {
          if (!iso) return <div key={`empty-${i}`} />
          const isFuture = iso > todayStr
          const isToday = iso === todayStr
          const isSelected = iso === viewDate
          const hasRecord = recordDays.has(iso)
          const dayNum = parseInt(iso.slice(8), 10)
          return (
            <button
              key={iso}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDate(iso)}
              className={[
                'relative flex flex-col items-center justify-center rounded-[8px] h-8 text-[12px] font-medium transition-colors focus:outline-none',
                isFuture ? 'text-ink4 cursor-not-allowed' : 'cursor-pointer',
                isSelected ? 'bg-orange text-white' : '',
                !isSelected && isToday ? 'ring-[1.5px] ring-orange text-orange' : '',
                !isSelected && !isToday && !isFuture ? 'text-ink1 hover:bg-sand' : '',
              ].filter(Boolean).join(' ')}
            >
              {dayNum}
              {hasRecord && !isSelected && (
                <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full bg-orange" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border">
        <div className="flex items-center gap-1">
          <span className="w-[8px] h-[8px] rounded-full bg-orange inline-block" />
          <span className="text-[10px] text-ink3">Has record</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-[8px] h-[8px] rounded-full bg-orange inline-block ring-[1.5px] ring-orange ring-offset-1" />
          <span className="text-[10px] text-ink3">Today</span>
        </div>
      </div>
    </div>
  )
}

// ── Meal group card ───────────────────────────────────────────────────────────
function DraggableEntry({ entry, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: entry._id })
  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.4 : 1 }}>
      {/* Drag handle attached via listeners */}
      {children({ dragHandleProps: { ...listeners, ...attributes } })}
    </div>
  )
}

function MealGroup({ mealType, entries, t, onRequestDelete, logMetric = 'calories', isDropTarget = false }) {
  const label = t(MEAL_LABEL_KEYS[mealType] ?? mealType)
  const [expandedId, setExpandedId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)

  const { setNodeRef } = useDroppable({ id: mealType })

  const metricCfg = LOG_METRICS.find((m) => m.key === logMetric) ?? LOG_METRICS[0]

  const totalMetric = entries.reduce((sum, e) => {
    const c = e.foods?.reduce((s, f) => s + getFoodMetric(f, logMetric), 0) ?? getFoodMetric(e, logMetric)
    return sum + c
  }, 0)

  function handleDeleteClick(entry) {
    setConfirmingId(entry._id)
  }

  function handleConfirmDelete(entry) {
    setConfirmingId(null)
    setExpandedId(null)
    onRequestDelete?.(entry)
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-[14px] border bg-white overflow-hidden transition-colors ${isDropTarget ? 'border-orange shadow-md' : 'border-border'}`}
    >
      <div className={`flex items-center justify-between px-4 py-[10px] border-b border-border transition-colors ${isDropTarget ? 'bg-orange/10' : 'bg-sand/40'}`}>
        <p className="text-[13px] font-semibold text-ink1">{label}</p>
        <p className="text-[12px] text-ink3">{totalMetric} {metricCfg.unit}</p>
      </div>
      {entries.map((entry) => {
        const names = entry.foods?.map((f) => f.name).join(', ') ?? entry.rawText ?? '—'
        const metricVal = entry.foods?.reduce((s, f) => s + getFoodMetric(f, logMetric), 0) ?? getFoodMetric(entry, logMetric)
        const isExpanded = expandedId === entry._id
        const isConfirming = confirmingId === entry._id
        return (
          <DraggableEntry key={entry._id} entry={entry}>
            {({ dragHandleProps }) => (
          <div className="border-b border-border last:border-0">
            {/* Entry row — drag handle + tap to expand */}
            <div className="flex items-center">
              {/* Drag handle */}
              <div
                {...dragHandleProps}
                className="pl-3 pr-1 py-[11px] cursor-grab active:cursor-grabbing touch-none shrink-0 text-ink4 hover:text-ink3"
                aria-label="Drag to move"
              >
                <svg width="12" height="14" viewBox="0 0 10 14" fill="currentColor">
                  <circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/>
                  <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
                  <circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/>
                </svg>
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : entry._id)}
                className="flex-1 text-left flex items-center justify-between pr-4 py-[11px] hover:bg-sand/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    className={`shrink-0 text-ink3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[13px] text-ink1 truncate">{names}</p>
                    {entry.rawText && (
                      <p className="text-[11px] text-ink3 truncate mt-[1px]">{entry.rawText}</p>
                    )}
                  </div>
                </div>
                <p className="text-[12px] text-ink3 shrink-0 ml-3">{metricVal} {metricCfg.unit}</p>
              </button>
            </div>

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

                {/* Delete — confirm step */}
                {!isConfirming ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(entry)}
                    className="mt-2 w-full flex items-center justify-center gap-[6px] rounded-[10px] border border-red-200 text-red-500 text-[12px] font-medium py-[8px] hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Delete record
                  </button>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[12px] text-ink2 flex-1">Delete this entry?</span>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="px-3 py-[6px] rounded-[8px] text-[12px] font-medium text-ink2 bg-sand hover:bg-border transition-colors focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete(entry)}
                      className="px-3 py-[6px] rounded-[8px] text-[12px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors focus:outline-none"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </DraggableEntry>
        )
      })}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NutritionTracker() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const todayStr = todayISO()
  const [viewDate, setViewDate] = useState(todayStr)
  const dateLabel = formatDateLabel(viewDate)
  const isToday = viewDate === todayStr

  function handlePrevDay() { setViewDate((d) => offsetDate(d, -1)) }
  function handleNextDay() {
    const next = offsetDate(viewDate, 1)
    if (next <= todayStr) setViewDate(next)
  }
  function handleGoToday() { setViewDate(todayStr) }

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

  // ── Calendar refresh key (incremented after add/delete to re-fetch dots) ─
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  function bumpCalendar() { setCalendarRefreshKey((k) => k + 1) }

  // ── DnD state ─────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )
  const [activeEntryId, setActiveEntryId] = useState(null)
  const [overMealType, setOverMealType] = useState(null)

  // ── Log metric preference (localStorage) ─────────────────────────────────
  const [logMetric, setLogMetric] = useState(
    () => localStorage.getItem('nutrition_log_metric') ?? 'calories'
  )

  function handleLogMetricChange(key) {
    setLogMetric(key)
    localStorage.setItem('nutrition_log_metric', key)
  }

  // ── Pending delete (undo) state ───────────────────────────────────────────
  const [pendingDelete, setPendingDelete] = useState(null)
  // { entry, timerId }

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
      const res = await api.nutrition.summary(viewDate)
      setSummary(res?.data ?? res ?? null)
    } catch {
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [viewDate])

  // ── Fetch selected day's log ──────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    setEntriesLoading(true)
    setEntriesError(null)
    try {
      const res = await api.nutrition.list(viewDate)
      const data = res?.data ?? res ?? []
      setEntries(Array.isArray(data) ? data : [])
    } catch (err) {
      setEntriesError(err?.message ?? 'Failed to load entries')
      setEntries([])
    } finally {
      setEntriesLoading(false)
    }
  }, [viewDate])

  useEffect(() => {
    fetchSummary()
    fetchEntries()
  }, [fetchSummary, fetchEntries])

  // ── Delete with undo ─────────────────────────────────────────────────────
  function handleRequestDelete(entry) {
    // Cancel any existing pending delete first
    if (pendingDelete) {
      clearTimeout(pendingDelete.timerId)
      api.nutrition.remove(pendingDelete.entry._id).then(() => {
        fetchEntries()
        fetchSummary()
      }).catch(() => {})
    }
    const timerId = setTimeout(async () => {
      await api.nutrition.remove(entry._id).catch(() => {})
      setPendingDelete(null)
      fetchEntries()
      fetchSummary()
      bumpCalendar()
    }, 5000)
    setPendingDelete({ entry, timerId })
  }

  function handleUndoDelete() {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timerId)
    setPendingDelete(null)
    // entry reappears automatically since it's filtered back in
  }

  // ── Category selection handler ────────────────────────────────────────────
  async function handleSelectCategory(cat) {
    setCategory(cat)
    try {
      await api.nutrition.setCategory(cat)
    } catch {
      // non-fatal — UI already updated optimistically
    }
  }

  // ── DnD handlers ──────────────────────────────────────────────────────────
  function handleDragStart({ active }) {
    setActiveEntryId(active.id)
  }

  function handleDragOver({ over }) {
    setOverMealType(over ? over.id : null)
  }

  async function handleDragEnd({ active, over }) {
    setActiveEntryId(null)
    setOverMealType(null)
    if (!over) return
    const newMealType = over.id
    const entry = entries.find((e) => e._id === active.id)
    if (!entry || entry.mealType === newMealType) return
    try {
      await api.nutrition.update(entry._id, { mealType: newMealType })
      await Promise.all([fetchEntries(), fetchSummary()])
    } catch {
      // silent — UI reverts on next fetch
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
        date: viewDate,
        mealType: detectMealType(aiText),
        foods: selected,
        rawText: aiText.trim(),
      })
      setAiText('')
      setParsedFoods([])
      setCheckedFoods(new Set())
      await Promise.all([fetchEntries(), fetchSummary()])
      bumpCalendar()
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

  // ── Group entries by mealType (hide pending-delete entry) ────────────────
  const pendingDeleteId = pendingDelete?.entry?._id
  const mealGroups = MEAL_ORDER.reduce((acc, mt) => {
    const group = entries.filter(
      (e) => (e.mealType ?? '').toLowerCase() === mt && e._id !== pendingDeleteId
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
          onClick={() => navigate('/nutrition/add', { state: { date: viewDate } })}
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

          {/* ── LEFT: Calendar + Summary (sticky on desktop) ── */}
          <div className="lg:sticky lg:top-[80px] flex flex-col gap-4">
            {/* Calendar — always visible on desktop, collapsible on mobile */}
            <div className="hidden lg:block">
              <NutritionCalendar
                viewDate={viewDate}
                onSelectDate={setViewDate}
                todayStr={todayStr}
                refreshKey={calendarRefreshKey}
              />
            </div>

            {/* Mobile: collapsible calendar */}
            <MobileCalendar
              viewDate={viewDate}
              onSelectDate={setViewDate}
              todayStr={todayStr}
              dateLabel={dateLabel}
              refreshKey={calendarRefreshKey}
            />

            {showDisclaimer && (
              <div
                className="px-4 py-3 rounded-[12px] bg-[#FDE8DE]"
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
              dateLabel={dateLabel}
            />
            <AlgorithmCard summary={summary} navigate={navigate} />
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
              {/* Date + metric row */}
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    aria-label="Previous day"
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-sand transition-colors focus:outline-none"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink2">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <span className="px-1 text-[14px] md:text-[15px] font-semibold text-ink1">{dateLabel}</span>
                  <button
                    type="button"
                    onClick={handleNextDay}
                    disabled={isToday}
                    aria-label="Next day"
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-sand transition-colors focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-1" role="group" aria-label="Log display metric">
                  {LOG_METRICS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleLogMetricChange(m.key)}
                      aria-pressed={logMetric === m.key}
                      className={[
                        'px-[10px] py-[4px] rounded-pill text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange',
                        logMetric === m.key
                          ? 'bg-orange text-white'
                          : 'bg-sand text-ink3 hover:bg-orange/10 hover:text-ink2',
                      ].join(' ')}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

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
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex flex-col gap-3">
                    {MEAL_ORDER.filter((mt) => mealGroups[mt]).map((mt) => (
                      <MealGroup
                        key={mt}
                        mealType={mt}
                        entries={mealGroups[mt]}
                        t={t}
                        onRequestDelete={handleRequestDelete}
                        logMetric={logMetric}
                        isDropTarget={overMealType === mt}
                      />
                    ))}
                  </div>
                  <DragOverlay>
                    {activeEntryId ? (
                      <div className="rounded-[10px] bg-white border border-orange shadow-lg px-4 py-3 text-[13px] font-medium text-ink1 opacity-90">
                        {(() => {
                          const e = entries.find((x) => x._id === activeEntryId)
                          return e?.foods?.map((f) => f.name).join(', ') ?? e?.rawText ?? '…'
                        })()}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── FAB — mobile only ── */}
      <div className="md:hidden">
        <FAB onClick={() => navigate('/nutrition/add', { state: { date: viewDate } })} />
      </div>

      {/* ── Undo delete toast ── */}
      <style>{`@keyframes drainBar { from { width: 100% } to { width: 0% } }`}</style>
      {pendingDelete && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[80px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-40px)] max-w-[400px] rounded-[12px] bg-[#1C1C1E] shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-[13px]">
            <span className="text-[13px] font-medium text-white">Entry deleted</span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="text-[13px] font-semibold text-orange ml-4 focus:outline-none focus-visible:underline"
            >
              Undo
            </button>
          </div>
          <div className="h-[3px] bg-white/10">
            <div
              key={pendingDelete.entry._id}
              className="h-full bg-orange"
              style={{ animation: 'drainBar 5s linear forwards' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
