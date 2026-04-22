import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFlag } from '../utils/featureFlags'
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
import ProfileOnboardingChat from '../components/ProfileOnboardingChat'
import { api } from '../services/api'
import { useLanguage, getRandomAiPlaceholder } from '../context/LanguageContext'
import { useAiUsage } from '../context/AiUsageContext'

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

const ALL_NUTRIENTS = [
  { key: 'calories', labelKey: 'nutritionCalories', unit: 'kcal' },
  { key: 'protein', labelKey: 'nutritionProtein', unit: 'g' },
  { key: 'carbs', labelKey: 'nutritionCarbs', unit: 'g' },
  { key: 'fat', labelKey: 'nutritionFat', unit: 'g' },
  { key: 'sugar', labelKey: 'nutritionSugar', unit: 'g' },
  { key: 'fiber', labelKey: 'nutritionFiber', unit: 'g' },
  { key: 'sodium', labelKey: 'nutritionSodium', unit: 'mg' },
  { key: 'folate', labelKey: 'nutritionFolate', unit: 'mcg' },
  { key: 'iron', labelKey: 'nutritionIron', unit: 'mg' },
]

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
  { key: 'calories', labelKey: null, label: 'kcal', unit: 'kcal' },
  { key: 'protein', labelKey: 'nutritionProtein', label: 'Protein', unit: 'g' },
  { key: 'carbs', labelKey: 'nutritionCarbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', labelKey: 'nutritionFat', label: 'Fat', unit: 'g' },
]

function getFoodMetric(food, key) {
  return food.nutrients?.[key] ?? food[key] ?? 0
}

function formatNum(val) {
  return parseFloat((+val).toFixed(1))
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
function SummaryCard({ category, loading, summary, t, dateLabel = 'Today', customConfig }) {
  const nutrients = category === 'custom'
    ? (customConfig?.nutrients ?? []).map(k => ALL_NUTRIENTS.find(n => n.key === k)).filter(Boolean)
    : (CATEGORY_NUTRIENTS[category] ?? CATEGORY_NUTRIENTS.custom)

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
  const { t } = useLanguage()
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
            <span className="text-[11px] text-ink3 shrink-0">{food.quantity} {food.unit}{food.grams != null ? ` · 約${food.grams}g` : ''}</span>
          )}
        </div>
        <p className="text-[11px] text-ink3 mt-[2px]">
          {[
            (food.nutrients?.calories ?? food.calories) != null && `${formatNum(food.nutrients?.calories ?? food.calories)} kcal`,
            (food.nutrients?.protein ?? food.protein) != null && `${formatNum(food.nutrients?.protein ?? food.protein)}g ${t('nutritionProtein')}`,
            (food.nutrients?.carbs ?? food.carbs) != null && `${formatNum(food.nutrients?.carbs ?? food.carbs)}g ${t('nutritionCarbs')}`,
            (food.nutrients?.fat ?? food.fat) != null && `${formatNum(food.nutrients?.fat ?? food.fat)}g ${t('nutritionFat')}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </label>
  )
}

// ── Algorithm explanation card ────────────────────────────────────────────────
function AlgorithmCard({ summary, onOpenProfileChat }) {
  const { t } = useLanguage()
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
          <span className="text-[12px] font-semibold text-ink1">{t('nutritionAlgoTitle')}</span>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-ink3 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border text-[12px] leading-relaxed">
          {basis === 'personalised' && f ? (
            <div className="flex flex-col gap-[6px] pt-3">
              <p className="text-[11px] font-semibold text-orange uppercase tracking-wide mb-1">{t('nutritionAlgoPersonalised')}</p>
              <div className="bg-sand/60 rounded-[10px] p-3 flex flex-col gap-[10px] text-[11px] text-ink2">
                <div>
                  <p className="font-sans text-[10px] text-ink3 mb-[3px]">{t('nutritionAlgoBmrHint')}</p>
                  <p className="font-mono">BMR = 10×{f.weightKg}kg + 6.25×{f.heightCm}cm − 5×{f.age} {f.sex === 'male' ? '+ 5' : '− 161'}</p>
                  <p className="font-mono font-semibold text-ink1">BMR = {f.bmr} kcal</p>
                </div>
                <div>
                  <p className="font-sans text-[10px] text-ink3 mb-[3px]">{t('nutritionAlgoTdeeHint')}</p>
                  <p className="font-mono">TDEE = {f.bmr} × {f.activityMultiplier} ({f.activityLevel.replace('_', ' ')})</p>
                  <p className="font-mono font-semibold text-ink1">TDEE = {f.tdee} kcal</p>
                </div>
                <div>
                  <p className="font-sans text-[10px] text-ink3 mb-[3px]">{t('nutritionAlgoCalHint')}</p>
                  <p className="font-mono">Calorie target = {f.tdee} {f.calorieAdjustmentLabel}</p>
                  <p className="font-mono font-semibold text-ink1">= {f.calorieTarget} kcal/day</p>
                </div>
                <div>
                  <p className="font-sans text-[10px] text-ink3 mb-[3px]">{t('nutritionAlgoProteinHint')}</p>
                  <p className="font-mono">Protein = {f.weightKg}kg × {(f.proteinTarget / f.weightKg).toFixed(1)}g/kg</p>
                  <p className="font-mono font-semibold text-ink1">= {f.proteinTarget}g/day</p>
                </div>
              </div>
              <p className="text-[10px] text-ink3 mt-1">{t('nutritionAlgoUpdateProfile')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-3">
              <p className="text-ink2"><strong>{t('nutritionAlgoDefault')}</strong></p>
              <p className="text-ink3 text-[11px]">{t('nutritionAlgoDefaultSub')}</p>
              <button
                type="button"
                onClick={onOpenProfileChat}
                className="mt-1 text-[12px] font-semibold text-orange hover:underline text-left focus:outline-none"
              >
                {t('nutritionAlgoCompleteProfile')}
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
  const isToday = viewDate === todayStr
  return (
    <div className="lg:hidden rounded-[14px] border border-border bg-white overflow-hidden">
      <div className="flex items-center px-2 py-1.5">
        {/* ‹ prev day */}
        <button
          type="button"
          onClick={() => onSelectDate(offsetDate(viewDate, -1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sand transition-colors focus:outline-none shrink-0"
          aria-label="Previous day"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* date label — tap to expand calendar */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1 focus:outline-none"
          aria-expanded={open}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={`text-[13px] font-semibold ${isToday ? 'text-orange' : 'text-ink1'}`}>{dateLabel}</span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className={`text-ink3 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* › next day */}
        <button
          type="button"
          onClick={() => onSelectDate(offsetDate(viewDate, 1))}
          disabled={isToday}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sand transition-colors focus:outline-none shrink-0 disabled:opacity-30"
          aria-label="Next day"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

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
  const { t } = useLanguage()
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
          <span className="text-[10px] text-ink3">{t('nutritionCalHasRecord')}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-[8px] h-[8px] rounded-full bg-orange inline-block ring-[1.5px] ring-orange ring-offset-1" />
          <span className="text-[10px] text-ink3">{t('nutritionCalToday')}</span>
        </div>
      </div>
    </div>
  )
}

// ── Batch delete confirm modal ────────────────────────────────────────────────
function BatchDeleteModal({ open, count, deleting, t, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onCancel() }}
    >
      <div className="w-full md:max-w-[380px] bg-white rounded-t-[20px] md:rounded-[20px] px-5 py-6 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-col gap-1">
          <p className="text-[16px] font-semibold text-ink1">
            {t('nutritionBatchConfirmTitle').replace('{n}', count)}
          </p>
          <p className="text-[13px] text-ink3">{t('nutritionBatchConfirmSub')}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-[11px] rounded-[12px] text-[14px] font-semibold text-ink2 bg-sand hover:bg-border transition-colors focus:outline-none disabled:opacity-50"
          >
            {t('cancelButton')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-[11px] rounded-[12px] text-[14px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors focus:outline-none disabled:opacity-50"
          >
            {deleting ? t('nutritionBatchDeleting') : t('journalDelete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Food entry action sheet ───────────────────────────────────────────────────
function EntryActionSheet({ entry, open, todayStr, onClose, onRequestDelete, onChangeDate, t }) {
  const [datePicking, setDatePicking] = useState(false)
  const [dateVal, setDateVal] = useState('')

  useEffect(() => {
    if (open && entry) {
      setDatePicking(false)
      setDateVal(entry.date ?? todayStr ?? '')
    }
  }, [open, entry, todayStr])

  if (!open || !entry) return null

  const names = entry.foods?.map((f) => f.name).join(', ') ?? entry.rawText ?? '—'

  function handleDelete() {
    onRequestDelete?.(entry)
    onClose()
  }

  function handleMove() {
    if (!dateVal || dateVal === entry.date) { onClose(); return }
    onChangeDate?.(entry, dateVal)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50" onPointerDown={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />
      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] px-4 pt-3 pb-10 max-w-lg mx-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
        {/* Entry name */}
        <p className="text-[12px] text-ink3 font-medium text-center truncate px-4 mb-4">{names}</p>

        {datePicking ? (
          <div className="flex flex-col gap-3">
            <input
              type="date"
              value={dateVal}
              max={todayStr}
              onChange={(e) => setDateVal(e.target.value)}
              className="w-full rounded-[12px] border border-border text-[15px] text-ink1 px-4 py-3 bg-white focus:outline-none focus:border-orange"
            />
            <button
              type="button"
              onClick={handleMove}
              className="w-full py-[15px] rounded-[14px] bg-orange text-white text-[15px] font-semibold"
            >
              {t ? t('nutritionMoveConfirm') : '移動'}
            </button>
            <button
              type="button"
              onClick={() => setDatePicking(false)}
              className="w-full py-3 text-[14px] text-ink2 font-medium"
            >
              {t ? t('nutritionMoveBack') : '← 返回'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setDatePicking(true)}
              className="w-full flex items-center gap-3 px-4 py-[14px] rounded-[14px] bg-sand/60 text-[15px] text-ink1 font-medium hover:bg-sand transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {t ? t('nutritionMoveToDate') : '移到其他日期'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-4 py-[14px] rounded-[14px] bg-red-50 text-[15px] text-red-500 font-medium hover:bg-red-100 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              {t ? t('nutritionDeleteRecord') : '刪除記錄'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 text-[14px] text-ink3 font-medium mt-1"
            >
              {t ? t('cancelButton') : '取消'}
            </button>
          </div>
        )}
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

function MealGroup({
  mealType,
  entries = [],
  t,
  onRequestDelete,
  onRequestAction,
  logMetric = 'calories',
  isDropTarget = false,
  selectMode = false,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onAddFood,
}) {
  const label = t(MEAL_LABEL_KEYS[mealType] ?? mealType)
  const [expandedId, setExpandedId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)

  const { setNodeRef } = useDroppable({ id: mealType })

  const metricCfg = LOG_METRICS.find((m) => m.key === logMetric) ?? LOG_METRICS[0]

  const totalMetric = entries.reduce((sum, e) => {
    const c = e.foods?.reduce((s, f) => s + getFoodMetric(f, logMetric), 0) ?? getFoodMetric(e, logMetric)
    return sum + c
  }, 0)

  // Collapse expanded rows when entering select mode
  useEffect(() => {
    if (selectMode) setExpandedId(null)
  }, [selectMode])

  function handleDeleteClick(entry) {
    setConfirmingId(entry._id)
  }

  function handleConfirmDelete(entry) {
    setConfirmingId(null)
    setExpandedId(null)
    onRequestDelete?.(entry)
  }

  const allSelected = entries.length > 0 && entries.every((e) => selectedIds?.has(e._id))

  return (
    <div
      ref={setNodeRef}
      className={`rounded-[14px] border bg-white overflow-hidden transition-colors ${isDropTarget && !selectMode ? 'border-orange shadow-md' : 'border-border'}`}
    >
      {/* Meal section header */}
      <div className={`flex items-center justify-between px-4 py-[10px] border-b border-border transition-colors ${isDropTarget && !selectMode ? 'bg-orange/10' : 'bg-sand/40'}`}>
        <p className="text-[13px] font-semibold text-ink1">{label}</p>
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-ink3">{formatNum(totalMetric)} {metricCfg.unit}</p>
          {selectMode && (
            <button
              type="button"
              onClick={() => onSelectAll?.(mealType, !allSelected)}
              className={[
                'text-[11px] font-semibold px-[10px] py-[3px] rounded-pill transition-colors focus:outline-none',
                allSelected
                  ? 'bg-orange text-white'
                  : 'bg-sand text-ink2 hover:bg-orange/10',
              ].join(' ')}
            >
              {t('nutritionSelectAll')}
            </button>
          )}
        </div>
      </div>

      {entries.map((entry) => {
        const names = entry.foods?.map((f) => f.name).join(', ') ?? entry.rawText ?? '—'
        const metricVal = entry.foods?.reduce((s, f) => s + getFoodMetric(f, logMetric), 0) ?? getFoodMetric(entry, logMetric)
        const isExpanded = expandedId === entry._id
        const isConfirming = confirmingId === entry._id
        const isSelected = selectedIds?.has(entry._id) ?? false

        if (selectMode) {
          /* ── Select mode row ── */
          return (
            <button
              key={entry._id}
              type="button"
              onClick={() => onToggleSelect?.(entry._id)}
              className={[
                'w-full flex items-center gap-3 px-4 py-[12px] border-b border-border last:border-0 text-left transition-colors focus:outline-none',
                isSelected ? 'bg-orange/5' : 'hover:bg-sand/30',
              ].join(' ')}
            >
              {/* Custom checkbox */}
              <span
                className={[
                  'shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  isSelected ? 'bg-orange border-orange' : 'border-ink3 bg-white',
                ].join(' ')}
                aria-hidden="true"
              >
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-ink1 truncate">{names}</p>
                {entry.rawText && (
                  <p className="text-[11px] text-ink3 truncate mt-[1px]">{entry.rawText}</p>
                )}
              </div>
              <p className="text-[12px] text-ink3 shrink-0 ml-2">{formatNum(metricVal)} {metricCfg.unit}</p>
            </button>
          )
        }

        /* ── Normal mode row ── */
        return (
          <DraggableEntry key={entry._id} entry={entry}>
            {({ dragHandleProps }) => (
          <div className="border-b border-border last:border-0">
            {/* Entry row — drag handle + tap to expand */}
            <div className="flex items-center">
              {/* Drag handle — tap to open action sheet, drag to reorder */}
              <div
                {...dragHandleProps}
                onClick={(e) => { e.stopPropagation(); onRequestAction?.(entry) }}
                className="pl-3 pr-1 py-[11px] cursor-grab active:cursor-grabbing touch-none shrink-0 text-ink3 hover:text-ink1 transition-colors"
                aria-label={t('nutritionDragHandle')}
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
                <p className="text-[12px] text-ink3 shrink-0 ml-3">{formatNum(metricVal)} {metricCfg.unit}</p>
              </button>
            </div>

            {/* Expanded food details */}
            {isExpanded && (
              <div className="px-4 pb-3 flex flex-col gap-[6px] bg-sand/20">
                {entry.foods?.length > 0 ? entry.foods.map((food, idx) => {
                  const protein = food.nutrients?.protein ?? food.protein
                  const carbs = food.nutrients?.carbs ?? food.carbs
                  const fat = food.nutrients?.fat ?? food.fat
                  const kcal = food.nutrients?.calories ?? food.calories
                  const macros = [
                    protein != null && `${t('nutritionProtein')} ${formatNum(protein)}g`,
                    carbs != null && `${t('nutritionCarbs')} ${formatNum(carbs)}g`,
                    fat != null && `${t('nutritionFat')} ${formatNum(fat)}g`,
                  ].filter(Boolean).join(' · ')
                  const foodMetricVal = getFoodMetric(food, logMetric)
                  return (
                    <div key={food.name ?? idx} className="flex items-start justify-between gap-3 py-[6px] border-b border-border/50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-[13px] text-ink1 font-medium leading-snug">
                          {food.name}
                          {(food.quantity != null || food.unit) && (
                            <span className="text-ink3 font-normal ml-1">{food.quantity} {food.unit}{food.grams != null ? ` · 約${food.grams}g` : ''}</span>
                          )}
                        </p>
                        {macros && <p className="text-[11px] text-ink3 mt-[2px]">{macros}</p>}
                      </div>
                      {(logMetric === 'calories' ? kcal != null : true) && (
                        <p className="text-[12px] text-ink2 shrink-0 font-medium">{formatNum(foodMetricVal)} {metricCfg.unit}</p>
                      )}
                    </div>
                  )
                }) : (
                  <p className="text-[12px] text-ink3 py-2">{t('nutritionNoFoodDetails')}</p>
                )}

                {/* Actions row — move to date + delete */}
                {!isConfirming ? (
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRequestAction?.(entry)}
                      className="flex-1 flex items-center justify-center gap-[5px] rounded-[10px] border border-border text-ink2 text-[12px] font-medium py-[8px] hover:bg-sand/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {t('nutritionMoveToDate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(entry)}
                      className="flex-1 flex items-center justify-center gap-[5px] rounded-[10px] border border-red-200 text-red-500 text-[12px] font-medium py-[8px] hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                      {t('nutritionDeleteRecord')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[12px] text-ink2 flex-1">{t('nutritionDeleteEntry')}</span>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="px-3 py-[6px] rounded-[8px] text-[12px] font-medium text-ink2 bg-sand hover:bg-border transition-colors focus:outline-none"
                    >
                      {t('cancelButton')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete(entry)}
                      className="px-3 py-[6px] rounded-[8px] text-[12px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors focus:outline-none"
                    >
                      {t('journalDelete')}
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
      {entries.length === 0 && !selectMode && (
        <button
          type="button"
          onClick={() => onAddFood?.(mealType)}
          className="w-full flex items-center gap-2 px-4 py-[12px] text-[13px] text-ink3 hover:text-orange hover:bg-orange/5 transition-colors focus:outline-none"
        >
          <span className="text-[15px] font-light leading-none">＋</span>
          <span>{t('nutritionAddFood')}</span>
        </button>
      )}
    </div>
  )
}

// ── AI Goal Setup modal ───────────────────────────────────────────────────────
const NUTRIENT_LABELS_BY_LANG = {
  calories: { en: 'Calories', zh: '卡路里' },
  protein:  { en: 'Protein',  zh: '蛋白質' },
  carbs:    { en: 'Carbs',    zh: '碳水化合物' },
  fat:      { en: 'Fat',      zh: '脂肪' },
  sugar:    { en: 'Sugar',    zh: '糖分' },
  fiber:    { en: 'Fiber',    zh: '纖維' },
  sodium:   { en: 'Sodium',   zh: '鈉' },
  folate:   { en: 'Folate',   zh: '葉酸' },
  iron:     { en: 'Iron',     zh: '鐵' },
}

const NUTRIENT_UNITS_MAP = {
  calories: 'kcal', protein: 'g', carbs: 'g', fat: 'g',
  sugar: 'g', fiber: 'g', sodium: 'mg', folate: 'mcg', iron: 'mg',
}

function AiGoalSetupModal({ open, onClose, onComplete }) {
  const language = localStorage.getItem('recallth_language') || 'en'
  const isChinese = language === 'zh-HK' || language === 'zh-TW'

  const [step, setStep] = useState('goals') // 'goals' | 'chat' | 'loading' | 'result'
  const [selectedGoals, setSelectedGoals] = useState([])
  const [selectedConditions, setSelectedConditions] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([]) // [{role: 'ai'|'user', content, suggestions?}]
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (open) {
      setStep('goals')
      setSelectedGoals([])
      setSelectedConditions([])
      setResult(null)
      setError(null)
      setMessages([])
      setChatInput('')
      setChatLoading(false)
    }
  }, [open])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const GOALS_OPTIONS = isChinese
    ? [
        { key: 'weight-loss', label: '減重' },
        { key: 'muscle', label: '增肌' },
        { key: 'maintain', label: '維持健康' },
        { key: 'energy', label: '提升精力' },
        { key: 'digestive', label: '改善消化' },
        { key: 'heart', label: '心臟健康' },
      ]
    : [
        { key: 'weight-loss', label: 'Lose weight' },
        { key: 'muscle', label: 'Build muscle' },
        { key: 'maintain', label: 'Maintain health' },
        { key: 'energy', label: 'Boost energy' },
        { key: 'digestive', label: 'Improve digestion' },
        { key: 'heart', label: 'Heart health' },
      ]

  const CONDITIONS_OPTIONS = isChinese
    ? [
        { key: 'diabetes', label: '糖尿病' },
        { key: 'hypertension', label: '高血壓' },
        { key: 'vegetarian', label: '素食' },
        { key: 'pregnancy', label: '懷孕' },
        { key: 'kidney', label: '腎病' },
      ]
    : [
        { key: 'diabetes', label: 'Diabetes' },
        { key: 'hypertension', label: 'Hypertension' },
        { key: 'vegetarian', label: 'Vegetarian / Vegan' },
        { key: 'pregnancy', label: 'Pregnancy' },
        { key: 'kidney', label: 'Kidney disease' },
      ]

  const toggleGoal = (key) =>
    setSelectedGoals(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const toggleCondition = (key) =>
    setSelectedConditions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const handleGetRecommendations = async () => {
    setStep('loading')
    setError(null)
    try {
      const res = await api.nutrition.aiGoals(selectedGoals, selectedConditions, language, 'conversational', [])
      if (res.data.done) {
        setResult(res.data)
        setStep('result')
      } else {
        setMessages([{ role: 'ai', content: res.data.followUp, suggestions: res.data.suggestions }])
        setStep('chat')
      }
    } catch (err) {
      setError(err?.message ?? 'Failed to generate recommendations')
      setStep('goals')
    }
  }

  const handleSendMessage = async (text) => {
    const trimmed = (text ?? chatInput).trim()
    if (!trimmed || chatLoading) return
    setChatInput('')
    const newMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(newMessages)
    setChatLoading(true)
    try {
      const res = await api.nutrition.aiGoals(
        selectedGoals, selectedConditions, language, 'conversational',
        newMessages.map(m => ({ role: m.role, content: m.content }))
      )
      setChatLoading(false)
      if (res.data.done) {
        setResult(res.data)
        setStep('result')
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: res.data.followUp, suggestions: res.data.suggestions }])
      }
    } catch {
      setChatLoading(false)
      setMessages(prev => [...prev, {
        role: 'ai',
        content: isChinese ? '抱歉，出現錯誤，請再試。' : 'Something went wrong. Please try again.',
      }])
    }
  }

  const handleSave = async () => {
    if (!result) return
    await onComplete({ nutrients: result.nutrients, goals: result.goals }, false)
    onClose()
  }

  const handleAdjust = () => {
    if (!result) return
    onComplete({ nutrients: result.nutrients, goals: result.goals }, true)
    onClose()
  }

  const handleSkip = () => {
    onComplete(null, true)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full md:max-w-[440px] bg-white rounded-t-[20px] md:rounded-[20px] max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-ink1">
            {isChinese ? 'AI 營養目標設定' : 'AI Nutrition Goal Setup'}
          </h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink1 text-[20px] leading-none">✕</button>
        </div>

        {/* Goals step */}
        {step === 'goals' && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
            {error && (
              <div className="px-3 py-2 rounded-[8px] bg-red-50 text-red-600 text-[12px]">{error}</div>
            )}
            <p className="text-[13px] text-ink2 leading-relaxed">
              {isChinese
                ? '告訴 AI 你嘅目標，佢會為你推薦最適合嘅營養素追蹤方案。'
                : 'Tell the AI your goals and it will recommend the right nutrients to track.'}
            </p>

            <div>
              <p className="text-[11px] uppercase tracking-widest text-ink3 font-semibold mb-2">
                {isChinese ? '你嘅健康目標' : 'Your Health Goals'}
              </p>
              <div className="flex flex-wrap gap-2">
                {GOALS_OPTIONS.map(({ key, label }) => {
                  const active = selectedGoals.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleGoal(key)}
                      className={[
                        'px-3 py-1.5 rounded-pill text-[13px] font-medium transition-colors',
                        active ? 'bg-orange text-white' : 'bg-sand text-ink2 hover:bg-orange/10',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-widest text-ink3 font-semibold mb-2">
                {isChinese ? '飲食限制或健康狀況（可選）' : 'Dietary Restrictions / Conditions (optional)'}
              </p>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS_OPTIONS.map(({ key, label }) => {
                  const active = selectedConditions.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleCondition(key)}
                      className={[
                        'px-3 py-1.5 rounded-pill text-[13px] font-medium transition-colors',
                        active ? 'bg-orange text-white' : 'bg-sand text-ink2 hover:bg-orange/10',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Chat step */}
        {step === 'chat' && (
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={['flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start'].join(' ')}>
                <div
                  className={[
                    'max-w-[78%] px-3 py-2 rounded-[14px] text-[13px] leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-orange text-white rounded-br-[4px]'
                      : 'bg-sand text-ink1 rounded-bl-[4px]',
                  ].join(' ')}
                >
                  {msg.content}
                </div>
                {msg.role === 'ai' && msg.suggestions?.length > 0 && i === messages.length - 1 && !chatLoading && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {msg.suggestions.map((s, si) => (
                      <button
                        key={si}
                        type="button"
                        onClick={() => handleSendMessage(s)}
                        className="px-3 py-1.5 rounded-pill text-[12px] font-medium bg-white border border-orange/40 text-orange hover:bg-orange/5 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-start">
                <div className="bg-sand rounded-[14px] rounded-bl-[4px] px-3 py-2.5 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-ink3 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-ink3 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-ink3 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Loading step */}
        {step === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 gap-3">
            <div className="w-8 h-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-ink3">
              {isChinese ? 'AI 正在分析你嘅目標…' : 'AI is analysing your goals…'}
            </p>
          </div>
        )}

        {/* Result step */}
        {step === 'result' && result && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {result.goalDescription && (
              <p className="text-[12px] text-ink3 italic">{result.goalDescription}</p>
            )}
            <p className="text-[13px] text-ink2 leading-relaxed">
              {isChinese
                ? 'AI 根據你嘅目標推薦以下追蹤方案。直接儲存，或點擊「自訂」微調。'
                : 'AI has recommended the following plan. Save directly or tap "Adjust" to fine-tune.'}
            </p>
            {result.nutrients.map((key) => (
              <div key={key} className="rounded-[12px] bg-sand/60 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-ink1">
                    {(isChinese ? NUTRIENT_LABELS_BY_LANG[key]?.zh : NUTRIENT_LABELS_BY_LANG[key]?.en) ?? key}
                    <span className="text-ink3 font-normal ml-1">({NUTRIENT_UNITS_MAP[key]})</span>
                  </span>
                  <span className="text-[13px] font-semibold text-orange">
                    {result.goals[key] ?? '—'}
                  </span>
                </div>
                {result.explanations?.[key] && (
                  <p className="text-[11px] text-ink3 leading-relaxed">{result.explanations[key]}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {step === 'goals' && (
          <div className="px-5 py-4 border-t border-border flex flex-col gap-2">
            <button
              type="button"
              onClick={handleGetRecommendations}
              disabled={selectedGoals.length === 0}
              className="w-full bg-orange text-white py-3 rounded-[12px] text-[14px] font-semibold disabled:opacity-50"
            >
              {isChinese ? '獲取 AI 推薦' : 'Get AI Recommendations'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 text-[12px] text-ink3 hover:text-ink2"
            >
              {isChinese ? '跳過，手動設定' : 'Skip, set manually'}
            </button>
          </div>
        )}

        {step === 'chat' && (
          <div className="px-4 py-3 border-t border-border flex gap-2 items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={isChinese ? '或者自己輸入…' : 'Or type your answer…'}
              disabled={chatLoading}
              className="flex-1 bg-sand rounded-[10px] px-3 py-2 text-[13px] text-ink1 placeholder:text-ink3 outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim() || chatLoading}
              className="w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M13 7L1 1l2.5 6L1 13l12-6z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        )}

        {step === 'result' && (
          <div className="px-5 py-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={handleAdjust}
              className="flex-1 border border-orange text-orange py-3 rounded-[12px] text-[14px] font-semibold hover:bg-orange/5"
            >
              {isChinese ? '自訂' : 'Adjust'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-orange text-white py-3 rounded-[12px] text-[14px] font-semibold"
            >
              {isChinese ? '儲存' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Customise nutrients modal ─────────────────────────────────────────────────
function CustomiseModal({ open, onClose, config, onSave, t }) {
  const [selected, setSelected] = useState(config?.nutrients ?? ['calories', 'protein', 'carbs', 'fat'])
  const [goals, setGoals] = useState(config?.goals ?? {})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setSelected(config?.nutrients ?? ['calories', 'protein', 'carbs', 'fat'])
      setGoals(config?.goals ?? {})
    }
  }, [open, config])

  const toggle = (key) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSave = async () => {
    if (selected.length === 0) return
    setSaving(true)
    await onSave({ nutrients: selected, goals })
    setSaving(false)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full md:max-w-[420px] bg-white rounded-t-[20px] md:rounded-[20px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-ink1">{t('nutritionCustomiseTitle')}</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink1 text-[20px] leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {ALL_NUTRIENTS.map(({ key, labelKey, unit }) => {
            const isOn = selected.includes(key)
            return (
              <div key={key} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className={[
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    isOn ? 'bg-orange border-orange' : 'border-ink3 bg-white',
                  ].join(' ')}
                  aria-pressed={isOn}
                >
                  {isOn && <span className="text-white text-[11px] leading-none">✓</span>}
                </button>
                <span className="text-[13px] text-ink1 w-[100px]">
                  {t(labelKey) !== labelKey ? t(labelKey) : key}{' '}
                  <span className="text-ink3">({unit})</span>
                </span>
                {isOn && (
                  <input
                    type="number"
                    min="0"
                    placeholder={t('nutritionCustomiseGoalPlaceholder')}
                    value={goals[key] ?? ''}
                    onChange={(e) => setGoals(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="ml-auto w-[90px] border border-border rounded-[8px] px-3 py-1.5 text-[13px] text-ink1 focus:outline-none focus:ring-2 focus:ring-orange/30"
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="w-full bg-orange text-white py-3 rounded-[12px] text-[14px] font-semibold disabled:opacity-50"
          >
            {saving ? '…' : t('nutritionCustomiseSave')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── V2: Week strip ────────────────────────────────────────────────────────────
const DOW_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function WeekStrip({ viewDate, onSelectDate, todayStr, refreshKey = 0 }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)

  // Current month for record dot fetching
  const currentMonth = viewDate.slice(0, 7)
  const [recordDays, setRecordDays] = useState(new Set())

  // Fetch record dots for current month (and adjacent when needed)
  useEffect(() => {
    const [year, month] = currentMonth.split('-')
    api.nutrition.days(year, month)
      .then((res) => {
        const list = res?.data ?? []
        setRecordDays(new Set(Array.isArray(list) ? list : []))
      })
      .catch(() => {})
  }, [currentMonth, refreshKey])

  // Build the Mon–Sun week that contains viewDate
  const base = new Date(viewDate + 'T00:00:00')
  const dow = (base.getDay() + 6) % 7 // Mon=0
  const monday = new Date(base)
  monday.setDate(base.getDate() - dow)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })

  function prevWeek() { onSelectDate(offsetDate(days[0], -7)) }
  function nextWeek() {
    if (!days.includes(todayStr)) onSelectDate(offsetDate(days[0], 7))
  }

  const isCurrentWeek = days.includes(todayStr)

  return (
    <div className="bg-white border-b border-border">
      {/* Week row */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between max-w-[560px] mx-auto">
          {/* Prev week (hidden when expanded — month nav takes over) */}
          {!expanded && (
            <button type="button" onClick={prevWeek} aria-label="Previous week"
              className="w-7 h-7 flex items-center justify-center text-ink3 hover:text-ink2 focus:outline-none shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
          {expanded && <div className="w-7 shrink-0" />}

          {/* Day buttons */}
          <div className="flex gap-1 flex-1 justify-around">
            {days.map((iso) => {
              const isFuture = iso > todayStr
              const isToday = iso === todayStr
              const isSelected = iso === viewDate
              const hasRecord = recordDays.has(iso)
              const dayNum = parseInt(iso.slice(8), 10)
              const dowIdx = (new Date(iso + 'T00:00:00').getDay() + 6) % 7
              return (
                <button key={iso} type="button" disabled={isFuture} onClick={() => { onSelectDate(iso); setExpanded(false) }}
                  className="flex flex-col items-center gap-[4px] focus:outline-none disabled:cursor-not-allowed">
                  <span className="text-[10px] font-medium text-ink3 uppercase">{DOW_SHORT[dowIdx]}</span>
                  <span className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors',
                    isSelected ? 'bg-orange text-white' : '',
                    !isSelected && isToday ? 'ring-[1.5px] ring-orange text-orange' : '',
                    !isSelected && !isToday && !isFuture ? 'text-ink2 hover:bg-sand' : '',
                    isFuture ? 'text-ink4' : '',
                  ].filter(Boolean).join(' ')}>
                    {dayNum}
                  </span>
                  {/* Record dot */}
                  <span className={[
                    'w-[4px] h-[4px] rounded-full transition-opacity',
                    hasRecord && !isSelected ? 'bg-orange opacity-100' : 'opacity-0',
                  ].join(' ')} aria-hidden="true" />
                </button>
              )
            })}
          </div>

          {/* Next week */}
          {!expanded && (
            <button type="button" onClick={nextWeek} disabled={isCurrentWeek} aria-label="Next week"
              className="w-7 h-7 flex items-center justify-center text-ink3 hover:text-ink2 focus:outline-none shrink-0 disabled:opacity-30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}
          {expanded && <div className="w-7 shrink-0" />}
        </div>
      </div>

      {/* Bottom row: date label + today + expand toggle */}
      <div className="flex items-center justify-between px-4 pb-2 max-w-[560px] mx-auto">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium text-ink3">{viewDate === todayStr ? t('nutritionCalToday') : formatDateLabel(viewDate)}</p>
          {viewDate !== todayStr && (
            <button
              type="button"
              onClick={() => { onSelectDate(todayStr); setExpanded(false) }}
              className="text-[11px] font-semibold text-orange hover:underline focus:outline-none"
            >
              → {t('nutritionGoToToday')}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-ink3 hover:text-ink2 focus:outline-none"
          aria-expanded={expanded}
        >
          {expanded ? t('nutritionCollapse') : t('nutritionViewMonth')}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Expanded: full month calendar */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="max-w-[560px] mx-auto pt-3">
            <NutritionCalendar
              viewDate={viewDate}
              onSelectDate={(d) => { onSelectDate(d); setExpanded(false) }}
              todayStr={todayStr}
              refreshKey={refreshKey}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── V2: Calorie ring + macro chips card ───────────────────────────────────────
const RING_R = 45
const RING_CIRC = 2 * Math.PI * RING_R // ≈ 282.74

function CalorieRingCard({ category, categories, onCategoryChange, categoryLoading, onOpenCustomise, loading, summary, t, onOpenAlgo, onOpenProfileChat, categoryLabel }) {
  const calActual = summary?.nutrients?.calories?.actual ?? 0
  const calTarget = summary?.nutrients?.calories?.target ?? 0
  const calPct = calTarget > 0 ? Math.min(calActual / calTarget, 1) : 0
  const calRemaining = Math.max(calTarget - calActual, 0)
  const dashOffset = RING_CIRC * (1 - calPct)

  const basis = summary?.targetBasis
  const f = summary?.formula

  const macroNutrients = (() => {
    if (category === 'gym') return ['protein', 'carbs', 'fat']
    if (category === 'weight-loss') return ['fat', 'sugar', 'fiber']
    if (category === 'diabetes') return ['carbs', 'sugar', 'fiber']
    if (category === 'kidney') return ['sodium', 'protein']
    if (category === 'pregnancy') return ['protein', 'folate', 'iron']
    return ['protein', 'carbs', 'fat']
  })()

  const macroLabelKeys = {
    protein: 'nutritionProtein', carbs: 'nutritionCarbs', fat: 'nutritionFat',
    sugar: 'nutritionSugar', fiber: 'nutritionFiber', sodium: 'nutritionSodium',
    folate: 'nutritionFolate', iron: 'nutritionIron',
  }
  const macroUnits = {
    protein: 'g', carbs: 'g', fat: 'g', sugar: 'g', fiber: 'g',
    sodium: 'mg', folate: 'mcg', iron: 'mg',
  }

  if (loading) {
    return (
      <div className="bg-white rounded-[20px] border border-border shadow-sm px-5 py-5 flex flex-col gap-3">
        <div className="flex gap-2 mb-1">
          <Skeleton className="h-[28px] w-[72px] rounded-full" />
          <Skeleton className="h-[28px] w-[56px] rounded-full" />
          <Skeleton className="h-[28px] w-[64px] rounded-full" />
        </div>
        <div className="flex gap-5">
          <Skeleton className="w-[110px] h-[110px] rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2 pt-2">
            <Skeleton className="h-[40px]" />
            <Skeleton className="h-[40px]" />
            <Skeleton className="h-[40px]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[20px] border border-border shadow-sm px-5 py-5">
      {/* Category pills — goal mode selector */}
      {categories && onCategoryChange && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }} role="group" aria-label="Goal mode">
          {categories.map(({ key, labelKey }) => {
            const active = category === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onCategoryChange(key)}
                aria-pressed={active}
                disabled={categoryLoading}
                className={[
                  'shrink-0 px-[12px] py-[6px] rounded-full text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange',
                  active ? 'bg-orange text-white shadow-sm' : 'bg-sand text-ink2 hover:bg-orange/10',
                  categoryLoading ? 'opacity-60 cursor-wait' : '',
                ].join(' ')}
              >
                {t(labelKey)}
              </button>
            )
          })}
        </div>
      )}
      {category === 'custom' && onOpenCustomise && (
        <button type="button" onClick={onOpenCustomise} className="mb-2 flex items-center gap-1 text-[11px] text-orange font-medium hover:underline focus:outline-none">
          <span>⚙</span> {t('nutritionCustomiseBtn')}
        </button>
      )}

      {/* Ring + macros row */}
      <div className="flex items-center gap-5 mt-1">
        {/* Calorie ring */}
        <div className="relative shrink-0">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r={RING_R} strokeWidth="9" fill="none" stroke="#F3EFE8" />
            <circle
              cx="55" cy="55" r={RING_R}
              strokeWidth="9" fill="none" stroke="#C4622D"
              strokeLinecap="round"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 55 55)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[24px] font-bold text-ink1 leading-none">{Math.round(calActual).toLocaleString()}</span>
            <span className="text-[10px] text-ink3 mt-[2px]">kcal</span>
          </div>
        </div>

        {/* Macro chips */}
        <div className="flex flex-col gap-[6px] flex-1 min-w-0">
          {calTarget > 0 && (
            <p className="text-[12px] text-ink2 mb-[2px]">
              還差 <span className="font-semibold text-ink1">{calRemaining.toLocaleString()} kcal</span>
            </p>
          )}
          {macroNutrients.map((key) => {
            const actual = summary?.nutrients?.[key]?.actual ?? 0
            const target = summary?.nutrients?.[key]?.target ?? 0
            const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
            const label = t(macroLabelKeys[key]) !== macroLabelKeys[key] ? t(macroLabelKeys[key]) : key
            return (
              <div key={key} className="rounded-[10px] bg-sand px-3 py-[7px]">
                <div className="flex items-baseline justify-between mb-[4px]">
                  <span className="text-[10px] uppercase tracking-wide text-ink3">{label}</span>
                  <span className="text-[12px] font-semibold text-ink1">
                    {actual} <span className="text-ink3 font-normal text-[10px]">/ {target} {macroUnits[key]}</span>
                  </span>
                </div>
                <div className="h-[3px] rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-orange transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Algo trigger */}
      <div className="mt-4 pt-3 border-t border-border">
        {basis === 'personalised' && f ? (
          <button
            type="button"
            onClick={onOpenAlgo}
            className="text-[11px] text-ink3 hover:text-ink2 transition-colors text-left focus:outline-none"
          >
            {t('nutritionAlgoUpdateProfile').replace('。', '')} · <span className="text-orange underline underline-offset-2">{t('nutritionAlgoTitle')} →</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenProfileChat}
            className="text-[11px] text-orange underline underline-offset-2 focus:outline-none"
          >
            {t('nutritionAlgoCompleteProfile')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── V2: Algorithm bottom sheet ────────────────────────────────────────────────
function AlgorithmSheet({ open, onClose, summary, onOpenProfileChat, t }) {
  const basis = summary?.targetBasis
  const f = summary?.formula
  const category = summary?.category
  const [showFormula, setShowFormula] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const goalNameMap = {
    gym: t('nutritionAlgoGoalGym'),
    'weight-loss': t('nutritionAlgoGoalWeightLoss'),
    diabetes: t('nutritionAlgoGoalDiabetes'),
    kidney: t('nutritionAlgoGoalKidney'),
    pregnancy: t('nutritionAlgoGoalPregnancy'),
    custom: t('nutritionAlgoGoalCustom'),
  }
  const goalName = goalNameMap[category] ?? t('nutritionAlgoGoalMaintain')
  const activityDelta = f ? Math.round(f.tdee - f.bmr) : 0
  const goalDelta = f ? Math.round(f.calorieTarget - f.tdee) : 0

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{ backdropFilter: 'blur(2px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[24px] shadow-2xl max-h-[82vh] overflow-y-auto md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[80vh] md:rounded-[20px]"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-sand" />
        </div>
        <div className="px-5 pb-4 pt-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[17px] font-bold text-ink1">{t('nutritionAlgoTitle')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex w-7 h-7 items-center justify-center rounded-full bg-sand text-ink3 hover:bg-border transition-colors text-[13px] font-bold focus:outline-none"
            >✕</button>
          </div>

          {basis === 'personalised' && f ? (
            <>
              <p className="text-[11px] font-semibold text-orange uppercase tracking-wide mb-3">{t('nutritionAlgoPersonalised')}</p>

              {/* Plain language summary */}
              <p className="text-[14px] text-ink2 leading-relaxed mb-4">
                {t('nutritionAlgoSummaryTemplate')
                  .replace('{w}', f.weightKg)
                  .replace('{h}', f.heightCm)
                  .replace('{a}', f.age)
                  .replace('{bmr}', f.bmr.toLocaleString())
                  .replace('{activity}', f.activityLevel.replace(/_/g, ' '))
                  .replace('{tdee}', f.tdee.toLocaleString())
                  .replace('{goal}', goalName)
                  .replace('{cal}', f.calorieTarget.toLocaleString())}
              </p>

              {/* Waterfall breakdown */}
              <div className="bg-sand rounded-[16px] p-4 mb-3">
                <p className="text-[11px] text-ink3 font-medium mb-3 uppercase tracking-wide">{t('nutritionAlgoWaterfallTitle')}</p>
                <div className="flex flex-col">
                  {/* BMR row */}
                  <div className="flex items-center justify-between py-[10px] border-b border-border/60">
                    <div>
                      <p className="text-[14px] font-semibold text-ink1">{t('nutritionAlgoBmrLabel')}</p>
                      <p className="text-[11px] text-ink3 mt-[1px]">{t('nutritionAlgoBmrDesc')}</p>
                    </div>
                    <span className="text-[15px] font-bold text-ink1 tabular-nums">{f.bmr.toLocaleString()} kcal</span>
                  </div>
                  {/* Activity row */}
                  <div className="flex items-center justify-between py-[10px] border-b border-border/60">
                    <div>
                      <p className="text-[14px] font-semibold text-ink1">
                        <span className="text-[#16a34a] mr-1">＋</span>{t('nutritionAlgoActivityLabel')}
                      </p>
                      <p className="text-[11px] text-ink3 mt-[1px]">{f.activityLevel.replace(/_/g, ' ')}</p>
                    </div>
                    <span className="text-[15px] font-bold text-[#16a34a] tabular-nums">+{activityDelta.toLocaleString()} kcal</span>
                  </div>
                  {/* Goal adjustment row (hidden when delta is 0) */}
                  {goalDelta !== 0 && (
                    <div className="flex items-center justify-between py-[10px] border-b border-border/60">
                      <div>
                        <p className="text-[14px] font-semibold text-ink1">
                          <span className={`mr-1 ${goalDelta > 0 ? 'text-[#16a34a]' : 'text-orange'}`}>{goalDelta > 0 ? '＋' : '－'}</span>
                          {goalName}
                        </p>
                        <p className="text-[11px] text-ink3 mt-[1px]">{f.calorieAdjustmentLabel}</p>
                      </div>
                      <span className={`text-[15px] font-bold tabular-nums ${goalDelta > 0 ? 'text-[#16a34a]' : 'text-orange'}`}>
                        {goalDelta > 0 ? '+' : ''}{goalDelta.toLocaleString()} kcal
                      </span>
                    </div>
                  )}
                  {/* Daily calorie total */}
                  <div className="flex items-center justify-between pt-[12px]">
                    <p className="text-[15px] font-bold text-ink1">{t('nutritionAlgoDailyGoal')}</p>
                    <span className="text-[18px] font-black text-orange tabular-nums">{f.calorieTarget.toLocaleString()} kcal</span>
                  </div>
                  {/* Protein */}
                  <div className="flex items-center justify-between pt-[6px] pb-[2px]">
                    <div>
                      <p className="text-[14px] font-semibold text-ink1">{t('nutritionAlgoProteinGoal')}</p>
                      <p className="text-[11px] text-ink3 mt-[1px]">{f.weightKg}kg × {(f.proteinTarget / f.weightKg).toFixed(1)}g/kg</p>
                    </div>
                    <span className="text-[15px] font-bold text-ink2 tabular-nums">{f.proteinTarget}g/day</span>
                  </div>
                </div>
              </div>

              {/* Collapsible formula */}
              <button
                type="button"
                onClick={() => setShowFormula(v => !v)}
                className="flex items-center justify-between w-full py-2 mb-1 text-[13px] font-semibold text-ink3 hover:text-ink2 transition-colors focus:outline-none"
              >
                <span>{t('nutritionAlgoShowFormula')}</span>
                <span style={{ transform: showFormula ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
              </button>
              {showFormula && (
                <div className="bg-[#F9F7F4] border border-border rounded-[14px] p-4 flex flex-col gap-4 text-[11px] text-ink2 mb-3">
                  <div>
                    <p className="text-[10px] text-ink3 mb-[4px]">{t('nutritionAlgoBmrHint')}</p>
                    <p className="font-mono">BMR = 10×{f.weightKg}kg + 6.25×{f.heightCm}cm − 5×{f.age} {f.sex === 'male' ? '+ 5' : '− 161'}</p>
                    <p className="font-mono font-semibold text-ink1 mt-[2px]">BMR = {f.bmr} kcal</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink3 mb-[4px]">{t('nutritionAlgoTdeeHint')}</p>
                    <p className="font-mono">TDEE = {f.bmr} × {f.activityMultiplier} ({f.activityLevel.replace(/_/g, ' ')})</p>
                    <p className="font-mono font-semibold text-ink1 mt-[2px]">TDEE = {f.tdee} kcal</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink3 mb-[4px]">{t('nutritionAlgoCalHint')}</p>
                    <p className="font-mono">Calorie target = {f.tdee} {f.calorieAdjustmentLabel}</p>
                    <p className="font-mono font-semibold text-ink1 mt-[2px]">= {f.calorieTarget} kcal/day</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink3 mb-[4px]">{t('nutritionAlgoProteinHint')}</p>
                    <p className="font-mono">Protein = {f.weightKg}kg × {(f.proteinTarget / f.weightKg).toFixed(1)}g/kg</p>
                    <p className="font-mono font-semibold text-ink1 mt-[2px]">= {f.proteinTarget}g/day</p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-ink3 mb-3">{t('nutritionAlgoUpdateProfile')}</p>
            </>
          ) : (
            <div className="flex flex-col gap-3 mt-3">
              <p className="text-ink2 font-semibold text-[13px]">{t('nutritionAlgoDefault')}</p>
              <p className="text-ink3 text-[12px]">{t('nutritionAlgoDefaultSub')}</p>
              <button type="button" onClick={() => { onClose(); onOpenProfileChat() }} className="text-[13px] font-semibold text-orange focus:outline-none text-left">
                {t('nutritionAlgoCompleteProfile')}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 border border-border text-ink2 text-[13px] font-semibold py-3 rounded-full focus:outline-none"
          >
            {t('back')}
          </button>
        </div>
      </div>
    </>
  )
}

// ── V2: Analyser bottom sheet (AI + Manual) ───────────────────────────────────
function AnalyserSheet({
  open, onClose, defaultTab,
  aiText, setAiText, aiParsing, parsedFoods, parsedSuggestions, checkedFoods,
  aiError, addingToLog, onAiParse, onToggleFood, onAddToLog,
  manualName, setManualName, manualQty, setManualQty, manualUnit, setManualUnit,
  manualMealType, setManualMealType, manualSaving, manualError, onManualAdd,
  aiPlaceholder,
  disambigChips, onSelectChip,
  viewDate, t,
}) {
  const [tab, setTab] = useState(defaultTab ?? 'ai')
  useEffect(() => { if (open) setTab(defaultTab ?? 'ai') }, [open, defaultTab])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{ backdropFilter: 'blur(2px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[24px] shadow-2xl max-h-[90vh] overflow-y-auto md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:max-h-[85vh] md:rounded-[20px]"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-sand" />
        </div>
        {/* Tabs */}
        <div className="flex border-b border-border mx-5 mt-2">
          {[{ key: 'ai', labelKey: 'nutritionTabAI' }, { key: 'manual', labelKey: 'nutritionTabManual' }].map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                'flex-1 py-[11px] text-[13px] font-semibold transition-colors focus:outline-none',
                tab === key ? 'text-orange border-b-2 border-orange -mb-px bg-white' : 'text-ink3 hover:text-ink2',
              ].join(' ')}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div className="px-5 py-5">
          {tab === 'ai' ? (
            <>
              <div className="flex gap-2 flex-wrap mb-3">
                {MEAL_ORDER.map((mt) => (
                  <button key={mt} type="button" onClick={() => setManualMealType(mt)} aria-pressed={manualMealType === mt}
                    className={['px-[12px] py-[6px] rounded-pill text-[12px] font-medium transition-colors focus:outline-none', manualMealType === mt ? 'bg-orange text-white' : 'bg-sand text-ink2 hover:bg-orange/10'].join(' ')}>
                    {t(MEAL_LABEL_KEYS[mt])}
                  </button>
                ))}
              </div>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder={aiPlaceholder}
                rows={parsedFoods.length > 0 ? 2 : 5}
                disabled={aiParsing}
                className="w-full border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 resize-none focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white disabled:opacity-60"
              />
              <button
                type="button"
                onClick={onAiParse}
                disabled={aiParsing || !aiText.trim()}
                className="mt-3 w-full rounded-[10px] bg-orange text-white text-[13px] font-semibold py-[10px] hover:bg-orange-dk transition-colors disabled:opacity-60 focus:outline-none"
              >
                {aiParsing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-[14px] h-[14px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {t('nutritionAiParsing')}
                  </span>
                ) : t('nutritionAiAnalyse')}
              </button>
              {aiError && <p className="mt-2 text-[12px] text-[#E11D48]" role="alert">{aiError}</p>}
              {parsedFoods.length > 0 && (
                <div className="mt-4">
                  {disambigChips?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] text-ink3 mb-1.5">{t('nutritionDidYouMean')}</p>
                      <div className="flex gap-2 flex-wrap">
                        {disambigChips.map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => onSelectChip?.(chip)}
                            className="flex items-center gap-1.5 px-3 py-[6px] rounded-pill bg-white border border-orange/40 text-[12px] text-ink1 font-medium hover:bg-orange/5 hover:border-orange transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                          >
                            <span className="text-[10px] font-semibold text-orange uppercase">{chip.accuracyTier}</span>
                            {chip.displayName ?? chip.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[12px] font-medium text-ink2 mb-1">{t('nutritionAiParsed').replace('{n}', parsedFoods.length)}</p>
                  <div className="border border-border rounded-[10px] overflow-hidden">
                    {parsedFoods.map((food) => (
                      <ParsedFoodRow key={food.name} food={food} checked={checkedFoods.has(food.name)} onToggle={onToggleFood} />
                    ))}
                  </div>
                  {parsedSuggestions.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange shrink-0">
                          <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
                        </svg>
                        <p className="text-[12px] font-medium text-ink2">{t('nutritionChooseDrink')}</p>
                      </div>
                      <div className="border border-orange/30 rounded-[10px] overflow-hidden bg-orange/5">
                        {parsedSuggestions.map((food) => (
                          <ParsedFoodRow key={food.name} food={food} checked={checkedFoods.has(food.name)} onToggle={onToggleFood} />
                        ))}
                      </div>
                    </div>
                  )}
                  {checkedFoods.size > 0 && (() => {
                    const allParsed = [...parsedFoods, ...parsedSuggestions]
                    const sel = allParsed.filter(f => checkedFoods.has(f.name))
                    const tot = sel.reduce((a, f) => ({
                      kcal: a.kcal + (Number(f.nutrients?.calories ?? f.calories) || 0),
                      protein: a.protein + (Number(f.nutrients?.protein ?? f.protein) || 0),
                      carbs: a.carbs + (Number(f.nutrients?.carbs ?? f.carbs) || 0),
                      fat: a.fat + (Number(f.nutrients?.fat ?? f.fat) || 0),
                    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
                    return (
                      <div className="mt-3 rounded-[10px] bg-orange/8 border border-orange/20 px-4 py-3 flex items-center justify-between gap-3">
                        <span className="text-[12px] font-semibold text-orange shrink-0">{t('nutritionTotal') || 'Total'}</span>
                        <div className="flex gap-3 flex-wrap justify-end">
                          <span className="text-[12px] font-semibold text-ink1">{Math.round(tot.kcal)} kcal</span>
                          <span className="text-[12px] text-ink2">{Math.round(tot.protein)}g {t('nutritionProtein')}</span>
                          <span className="text-[12px] text-ink2">{Math.round(tot.carbs)}g {t('nutritionCarbs')}</span>
                          <span className="text-[12px] text-ink2">{Math.round(tot.fat)}g {t('nutritionFat')}</span>
                        </div>
                      </div>
                    )
                  })()}
                  <button
                    type="button"
                    onClick={onAddToLog}
                    disabled={addingToLog || checkedFoods.size === 0}
                    className="mt-3 w-full rounded-[10px] border border-orange text-orange text-[13px] font-semibold py-[10px] hover:bg-orange/5 transition-colors disabled:opacity-60 focus:outline-none"
                  >
                    {addingToLog ? t('nutritionAdding') : t('nutritionConfirm')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                {MEAL_ORDER.map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setManualMealType(mt)}
                    aria-pressed={manualMealType === mt}
                    className={[
                      'px-[12px] py-[6px] rounded-pill text-[12px] font-medium transition-colors focus:outline-none',
                      manualMealType === mt ? 'bg-orange text-white' : 'bg-sand text-ink2 hover:bg-orange/10',
                    ].join(' ')}
                  >
                    {t(MEAL_LABEL_KEYS[mt])}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onManualAdd()}
                placeholder={t('nutritionManualNamePlaceholder')}
                className="w-full border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  placeholder={t('nutritionManualQtyPlaceholder')}
                  min="0"
                  className="w-[80px] border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white"
                />
                <input
                  type="text"
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value)}
                  placeholder={t('nutritionManualUnitPlaceholder')}
                  className="flex-1 border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white"
                />
              </div>
              {manualError && <p className="text-[12px] text-[#E11D48]" role="alert">{manualError}</p>}
              <button
                type="button"
                onClick={onManualAdd}
                disabled={manualSaving || !manualName.trim()}
                className="w-full rounded-[10px] bg-orange text-white text-[13px] font-semibold py-[10px] hover:bg-orange-dk transition-colors disabled:opacity-60 focus:outline-none"
              >
                {manualSaving ? t('nutritionManualSaving') : t('nutritionManualAdd')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── V2 toggle button (remove after confirming new design) ────────────────────
function V2ToggleButton({ isV2, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed top-[60px] right-3 z-[999] flex items-center gap-[6px] bg-[#1C1C1E] text-white text-[11px] font-semibold px-3 py-[7px] rounded-full shadow-lg focus:outline-none"
      title="Toggle UI version"
    >
      <span className={`w-2 h-2 rounded-full ${isV2 ? 'bg-green-400' : 'bg-yellow-400'}`} />
      {isV2 ? 'New UI' : 'Old UI'}
    </button>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NutritionTracker() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { showUsage } = useAiUsage()
  const todayStr = todayISO()
  const [aiPlaceholder] = useState(() => getRandomAiPlaceholder(language))
  const [viewDate, setViewDate] = useState(todayStr)
  const isToday = viewDate === todayStr
  const dateLabel = isToday ? t('nutritionCalToday') : formatDateLabel(viewDate)

  // ── Feature flag ──────────────────────────────────────────────────────────
  const [useV2, setUseV2] = useState(() => getFlag('NUTRITION_V2'))

  function handleToggleV2() {
    const next = !useV2
    setUseV2(next)
    // eslint-disable-next-line no-undef
    try { localStorage.setItem('ff_NUTRITION_V2', String(next)) } catch {}
  }

  // ── V2 sheet states ───────────────────────────────────────────────────────
  const [algoSheetOpen, setAlgoSheetOpen] = useState(false)
  const [analyserSheetOpen, setAnalyserSheetOpen] = useState(false)
  const [analyserDefaultTab, setAnalyserDefaultTab] = useState('ai')

  function openAnalyser(tab = 'ai', mealType = null) {
    setAnalyserDefaultTab(tab)
    if (mealType) setManualMealType(mealType)
    setAnalyserSheetOpen(true)
  }

  function handlePrevDay() { setViewDate((d) => offsetDate(d, -1)) }
  function handleNextDay() {
    const next = offsetDate(viewDate, 1)
    if (next <= todayStr) setViewDate(next)
  }
  function handleGoToday() { setViewDate(todayStr) }

  // ── Category state ────────────────────────────────────────────────────────
  const [category, setCategory] = useState('gym')
  const [categoryLoading, setCategoryLoading] = useState(true)

  // ── Custom nutrient config ────────────────────────────────────────────────
  const [customConfig, setCustomConfig] = useState({ nutrients: ['calories', 'protein', 'carbs', 'fat'], goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }, aiSetupDone: false })
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [aiGoalSetupOpen, setAiGoalSetupOpen] = useState(false)

  // ── Profile onboarding chat ───────────────────────────────────────────────
  const [profileChatOpen, setProfileChatOpen] = useState(false)

  // ── Summary state ─────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  // ── Food log state ────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [entriesError, setEntriesError] = useState(null)

  // ── Analyser tab: 'ai' | 'manual' ────────────────────────────────────────
  const [analyserTab, setAnalyserTab] = useState('ai')

  // ── AI input state ────────────────────────────────────────────────────────
  const [aiText, setAiText] = useState('')
  const [aiParsing, setAiParsing] = useState(false)
  const [parsedFoods, setParsedFoods] = useState([])
  const [parsedSuggestions, setParsedSuggestions] = useState([])
  const [disambigChips, setDisambigChips] = useState([]) // FoodDB tier A/B matches
  const [checkedFoods, setCheckedFoods] = useState(new Set())
  const [aiError, setAiError] = useState(null)
  const [addingToLog, setAddingToLog] = useState(false)

  // ── Manual entry state ────────────────────────────────────────────────────
  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState('')
  const [manualUnit, setManualUnit] = useState('')
  const [manualMealType, setManualMealType] = useState(() => {
    const h = new Date().getHours()
    if (h >= 6 && h < 11) return 'breakfast'
    if (h >= 11 && h < 15) return 'lunch'
    if (h >= 17 && h < 22) return 'dinner'
    return 'snack'
  })
  const [manualSaving, setManualSaving] = useState(false)
  const [manualError, setManualError] = useState(null)

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

  // ── Batch delete state ────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  function handleEnterSelectMode() {
    setSelectMode(true)
    setSelectedIds(new Set())
  }

  function handleExitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setBatchDeleteOpen(false)
  }

  function handleToggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll(mealType, selectAll) {
    const mealEntries = mealGroups[mealType] ?? []
    setSelectedIds((prev) => {
      const next = new Set(prev)
      mealEntries.forEach((e) => {
        if (selectAll) next.add(e._id)
        else next.delete(e._id)
      })
      return next
    })
  }

  async function handleBatchDeleteConfirm() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBatchDeleting(true)
    try {
      await api.nutrition.removeBatch(ids)
      setBatchDeleteOpen(false)
      setSelectMode(false)
      setSelectedIds(new Set())
      await Promise.all([fetchEntries(), fetchSummary()])
      bumpCalendar()
    } catch {
      // non-fatal — let user retry
    } finally {
      setBatchDeleting(false)
    }
  }

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
    async function fetchCustomConfig() {
      try {
        const cfg = await api.nutrition.getCustomConfig()
        if (!cancelled && cfg?.data) setCustomConfig(cfg.data)
      } catch {
        // keep default config
      }
    }
    fetchCategory()
    fetchCustomConfig()
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

  // ── Supplement recommendations ────────────────────────────────────────────
  const [supplementRecs, setSupplementRecs] = useState(null)
  const [recLoading, setRecLoading] = useState(false)

  const fetchRecommendations = useCallback(async () => {
    setRecLoading(true)
    try {
      const res = await api.nutrition.recommendations(viewDate)
      setSupplementRecs(res?.data ?? res ?? null)
    } catch {
      setSupplementRecs(null)
    } finally {
      setRecLoading(false)
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
    fetchRecommendations()
  }, [fetchSummary, fetchEntries, fetchRecommendations])

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

  // ── Action sheet ─────────────────────────────────────────────────────────
  const [actionEntry, setActionEntry] = useState(null)
  function handleRequestAction(entry) { setActionEntry(entry) }
  function handleCloseAction() { setActionEntry(null) }

  // ── Change date handler ───────────────────────────────────────────────────
  async function handleChangeDate(entry, newDate) {
    // Optimistic: remove from current view (it's moving to a different date)
    setEntries((prev) => prev.filter((e) => e._id !== entry._id))
    try {
      await api.nutrition.update(entry._id, { date: newDate })
      fetchSummary().catch(() => {})
      bumpCalendar()
    } catch {
      // Revert on failure
      fetchEntries()
    }
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

  // ── Manual add handler ────────────────────────────────────────────────────
  async function handleManualAdd() {
    const name = manualName.trim()
    if (!name) return
    setManualSaving(true)
    setManualError(null)
    const food = { name, ...(manualQty ? { quantity: Number(manualQty) || manualQty } : {}), ...(manualUnit.trim() ? { unit: manualUnit.trim() } : {}), nutrients: {} }
    try {
      await api.nutrition.create({ date: viewDate, mealType: manualMealType, foods: [food], rawText: name })
      setManualName('')
      setManualQty('')
      setManualUnit('')
      await Promise.all([fetchEntries(), fetchSummary()])
      bumpCalendar()
    } catch (err) {
      setManualError(err?.message ?? 'Failed to save — please try again')
    } finally {
      setManualSaving(false)
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

    // Optimistic update — move entry immediately in local state
    const originalMealType = entry.mealType
    setEntries((prev) =>
      prev.map((e) => e._id === entry._id ? { ...e, mealType: newMealType } : e)
    )

    try {
      await api.nutrition.update(entry._id, { mealType: newMealType })
      // Refresh summary totals in background (no spinner needed)
      fetchSummary().catch(() => {})
    } catch {
      // Revert on failure
      setEntries((prev) =>
        prev.map((e) => e._id === entry._id ? { ...e, mealType: originalMealType } : e)
      )
    }
  }

  // ── AI parse handler ──────────────────────────────────────────────────────
  async function handleAiParse() {
    if (!aiText.trim()) return
    setAiParsing(true)
    setAiError(null)
    setParsedFoods([])
    setParsedSuggestions([])
    setDisambigChips([])
    setCheckedFoods(new Set())
    try {
      const res = await api.nutrition.aiParse(aiText.trim(), category)
      const foods = res?.data?.foods ?? res?.foods ?? []
      const suggestions = res?.data?.suggestions ?? []
      const foodList = Array.isArray(foods) ? foods : []
      const suggList = Array.isArray(suggestions) ? suggestions : []
      setParsedFoods(foodList)
      setParsedSuggestions(suggList)
      // Confirmed foods checked by default; suggestions unchecked
      setCheckedFoods(new Set(foodList.map((f) => f.name)))
      if (res?.aiUsage) showUsage(res.aiUsage, 'nutrition-parse', {
        input: aiText.trim(),
        output: foodList.map(f => f.name).join(', '),
      })
      // Fire parallel FoodDB search for disambiguation
      if (aiText.trim()) {
        api.nutrition.foodDb.search({ q: aiText.trim(), limit: 3 })
          .then((dbRes) => {
            const hits = (dbRes?.data?.results ?? []).filter(
              (r) => r.accuracyTier === 'A' || r.accuracyTier === 'B'
            )
            setDisambigChips(hits.slice(0, 3))
          })
          .catch(() => {})
      }
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

  // ── Select disambiguation chip ────────────────────────────────────────────
  function handleSelectChip(chip) {
    // Build a food entry from the FoodDB item, scaled to default serving
    const grams = chip.defaultServingGrams ?? 100
    const scale = grams / 100
    const round1 = (v) => Math.round(v * scale * 10) / 10
    const foodEntry = {
      name: chip.displayName ?? chip.name,
      quantity: grams,
      unit: chip.defaultServingUnit ?? 'g',
      nutrients: {
        calories: Math.round((chip.per100g?.calories ?? 0) * scale),
        protein: round1(chip.per100g?.protein ?? 0),
        carbs: round1(chip.per100g?.carbs ?? 0),
        fat: round1(chip.per100g?.fat ?? 0),
      },
      _foodDbId: chip.id,
    }
    // Replace AI estimate with verified FoodDB entry, clear chips
    setParsedFoods([foodEntry])
    setParsedSuggestions([])
    setCheckedFoods(new Set([foodEntry.name]))
    setDisambigChips([])
  }

  // ── Add to log ────────────────────────────────────────────────────────────
  async function handleAddToLog() {
    const allItems = [...parsedFoods, ...parsedSuggestions]
    const selected = allItems.filter((f) => checkedFoods.has(f.name))
    if (selected.length === 0) return
    setAddingToLog(true)
    try {
      await api.nutrition.create({
        date: viewDate,
        mealType: manualMealType,
        foods: selected,
        rawText: aiText.trim(),
      })
      setAiText('')
      setParsedFoods([])
      setParsedSuggestions([])
      setCheckedFoods(new Set())
      await Promise.all([fetchEntries(), fetchSummary(), fetchRecommendations()])
      bumpCalendar()
    } catch (err) {
      setAiError(err?.message ?? 'Failed to add to log — please try again')
    } finally {
      setAddingToLog(false)
    }
  }

  // ── Save custom nutrient config ───────────────────────────────────────────
  async function handleSaveCustomConfig(newConfig) {
    const res = await api.nutrition.setCustomConfig({ ...newConfig, aiSetupDone: true })
    if (res?.data) setCustomConfig(res.data)
    await fetchSummary()
  }

  // ── Handle AI goal setup completion ──────────────────────────────────────
  async function handleAiGoalComplete(aiConfig, openCustomise) {
    if (openCustomise) {
      // Pre-fill state with AI values so CustomiseModal shows them (null = skip, use existing config)
      if (aiConfig) {
        setCustomConfig(prev => ({ ...prev, nutrients: aiConfig.nutrients, goals: aiConfig.goals }))
      }
      setCustomizeOpen(true)
    } else {
      await handleSaveCustomConfig(aiConfig)
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

  const categoryLabel = (() => {
    const cat = CATEGORIES.find((c) => c.key === category)
    return cat ? t(cat.labelKey) : null
  })()

  // ── V2 layout ─────────────────────────────────────────────────────────────
  if (useV2) {
    return (
      <div className="min-h-screen bg-page pb-[80px] lg:pb-0">
        <V2ToggleButton isV2={true} onToggle={handleToggleV2} />
        {/* Mobile header */}
        <OrangeHeader title={t('nutritionTitle')} subtitle={calSub} />
        <div className="-mt-[40px] md:mt-0"><Wave /></div>

        {/* Desktop sticky header */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
          <div>
            <h1 className="text-[20px] font-semibold text-ink1">{t('nutritionTitle')}</h1>
            <p className="text-[13px] text-ink3 mt-[2px]">{calSub}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://recallth.vercel.app/nutrition"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-[6px] bg-[#1C1C1E] text-white text-[11px] font-semibold px-3 py-[7px] rounded-full shadow hover:opacity-80 transition-opacity"
            >
              <span className="w-2 h-2 rounded-full bg-green-400" />
              New UI
            </a>
            <button
              type="button"
              onClick={() => navigate('/nutrition/add', { state: { date: viewDate } })}
              className="flex items-center gap-2 bg-orange text-white text-[13px] font-semibold px-4 py-[9px] rounded-[10px] hover:bg-orange-dk transition-colors focus:outline-none"
            >
              + {t('nutritionAddTitle')}
            </button>
          </div>
        </div>

        {/* Week strip */}
        <WeekStrip viewDate={viewDate} onSelectDate={setViewDate} todayStr={todayStr} refreshKey={calendarRefreshKey} />

        {/* ── Main content: single col mobile, two col desktop ── */}
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 pt-4 pb-10 lg:grid lg:grid-cols-[360px_1fr] lg:gap-6 lg:items-start">

          {/* ── LEFT COLUMN: summary + mode selector (sticky on desktop) ── */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-[80px]">

            {/* Calorie ring + macro chips + goal mode pills */}
            <CalorieRingCard
              category={category}
              categories={CATEGORIES}
              onCategoryChange={handleSelectCategory}
              categoryLoading={categoryLoading}
              onOpenCustomise={() => customConfig?.aiSetupDone ? setCustomizeOpen(true) : setAiGoalSetupOpen(true)}
              loading={summaryLoading}
              summary={summary}
              t={t}
              onOpenAlgo={() => setAlgoSheetOpen(true)}
              onOpenProfileChat={() => setProfileChatOpen(true)}
              categoryLabel={categoryLabel}
            />

            {/* Disclaimer */}
            {showDisclaimer && (
              <div className="px-4 py-3 rounded-[12px] bg-[#FDE8DE]" role="note">
                <p className="text-[12px] text-ink2">{t('nutritionDisclaimer')}</p>
              </div>
            )}

            {/* Desktop-only: inline AI / Manual analyser card */}
            <div className="hidden lg:block rounded-[14px] border border-border bg-white shadow-sm overflow-hidden">
              <div className="flex border-b border-border">
                {[{ key: 'ai', labelKey: 'nutritionTabAI' }, { key: 'manual', labelKey: 'nutritionTabManual' }].map(({ key, labelKey }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAnalyserTab(key)}
                    className={[
                      'flex-1 py-[11px] text-[13px] font-semibold transition-colors focus:outline-none',
                      analyserTab === key ? 'text-orange border-b-2 border-orange -mb-px bg-white' : 'text-ink3 hover:text-ink2 bg-sand/30',
                    ].join(' ')}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
              <div className="px-5 py-5">
                {analyserTab === 'ai' ? (
                  <>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {MEAL_ORDER.map((mt) => (
                        <button key={mt} type="button" onClick={() => setManualMealType(mt)} aria-pressed={manualMealType === mt}
                          className={['px-[12px] py-[6px] rounded-pill text-[12px] font-medium transition-colors focus:outline-none', manualMealType === mt ? 'bg-orange text-white' : 'bg-sand text-ink2 hover:bg-orange/10'].join(' ')}>
                          {t(MEAL_LABEL_KEYS[mt])}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      placeholder={aiPlaceholder}
                      rows={parsedFoods.length > 0 ? 2 : 5}
                      disabled={aiParsing}
                      className="w-full border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 resize-none focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white disabled:opacity-60"
                    />
                    <button type="button" onClick={handleAiParse} disabled={aiParsing || !aiText.trim()}
                      className="mt-3 w-full rounded-[10px] bg-orange text-white text-[13px] font-semibold py-[10px] hover:bg-orange-dk transition-colors disabled:opacity-60 focus:outline-none">
                      {aiParsing ? <span className="flex items-center justify-center gap-2"><span className="w-[14px] h-[14px] border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('nutritionAiParsing')}</span> : t('nutritionAiAnalyse')}
                    </button>
                    {aiError && <p className="mt-2 text-[12px] text-[#E11D48]" role="alert">{aiError}</p>}
                    {parsedFoods.length > 0 && (
                      <div className="mt-4">
                        {disambigChips.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[11px] text-ink3 mb-1.5">{t('nutritionDidYouMean')}</p>
                            <div className="flex gap-2 flex-wrap">
                              {disambigChips.map((chip) => (
                                <button
                                  key={chip.id}
                                  type="button"
                                  onClick={() => handleSelectChip(chip)}
                                  className="flex items-center gap-1.5 px-3 py-[6px] rounded-pill bg-white border border-orange/40 text-[12px] text-ink1 font-medium hover:bg-orange/5 hover:border-orange transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                                >
                                  <span className="text-[10px] font-semibold text-orange uppercase">{chip.accuracyTier}</span>
                                  {chip.displayName ?? chip.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-[12px] font-medium text-ink2 mb-1">{t('nutritionAiParsed').replace('{n}', parsedFoods.length)}</p>
                        <div className="border border-border rounded-[10px] overflow-hidden">
                          {parsedFoods.map((food) => <ParsedFoodRow key={food.name} food={food} checked={checkedFoods.has(food.name)} onToggle={toggleFood} />)}
                        </div>
                        {parsedSuggestions.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2 mb-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange shrink-0"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                              <p className="text-[12px] font-medium text-ink2">{t('nutritionChooseDrink')}</p>
                            </div>
                            <div className="border border-orange/30 rounded-[10px] overflow-hidden bg-orange/5">
                              {parsedSuggestions.map((food) => <ParsedFoodRow key={food.name} food={food} checked={checkedFoods.has(food.name)} onToggle={toggleFood} />)}
                            </div>
                          </div>
                        )}
                        {checkedFoods.size > 0 && (() => {
                          const allParsed = [...parsedFoods, ...parsedSuggestions]
                          const sel = allParsed.filter(f => checkedFoods.has(f.name))
                          const tot = sel.reduce((a, f) => ({
                            kcal: a.kcal + (Number(f.nutrients?.calories ?? f.calories) || 0),
                            protein: a.protein + (Number(f.nutrients?.protein ?? f.protein) || 0),
                            carbs: a.carbs + (Number(f.nutrients?.carbs ?? f.carbs) || 0),
                            fat: a.fat + (Number(f.nutrients?.fat ?? f.fat) || 0),
                          }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
                          return (
                            <div className="mt-3 rounded-[10px] bg-orange/8 border border-orange/20 px-4 py-3 flex items-center justify-between gap-3">
                              <span className="text-[12px] font-semibold text-orange shrink-0">{t('nutritionTotal') || 'Total'}</span>
                              <div className="flex gap-3 flex-wrap justify-end">
                                <span className="text-[12px] font-semibold text-ink1">{Math.round(tot.kcal)} kcal</span>
                                <span className="text-[12px] text-ink2">{Math.round(tot.protein)}g {t('nutritionProtein')}</span>
                                <span className="text-[12px] text-ink2">{Math.round(tot.carbs)}g {t('nutritionCarbs')}</span>
                                <span className="text-[12px] text-ink2">{Math.round(tot.fat)}g {t('nutritionFat')}</span>
                              </div>
                            </div>
                          )
                        })()}
                        <button type="button" onClick={handleAddToLog} disabled={addingToLog || checkedFoods.size === 0}
                          className="mt-3 w-full rounded-[10px] border border-orange text-orange text-[13px] font-semibold py-[10px] hover:bg-orange/5 transition-colors disabled:opacity-60 focus:outline-none">
                          {addingToLog ? t('nutritionAdding') : t('nutritionConfirm')}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {MEAL_ORDER.map((mt) => (
                        <button key={mt} type="button" onClick={() => setManualMealType(mt)} aria-pressed={manualMealType === mt}
                          className={['px-[12px] py-[6px] rounded-pill text-[12px] font-medium transition-colors focus:outline-none', manualMealType === mt ? 'bg-orange text-white' : 'bg-sand text-ink2 hover:bg-orange/10'].join(' ')}>
                          {t(MEAL_LABEL_KEYS[mt])}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                      placeholder={t('nutritionManualNamePlaceholder')}
                      className="w-full border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white" />
                    <div className="flex gap-2">
                      <input type="number" value={manualQty} onChange={(e) => setManualQty(e.target.value)} placeholder={t('nutritionManualQtyPlaceholder')} min="0"
                        className="w-[80px] border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white" />
                      <input type="text" value={manualUnit} onChange={(e) => setManualUnit(e.target.value)} placeholder={t('nutritionManualUnitPlaceholder')}
                        className="flex-1 border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white" />
                    </div>
                    {manualError && <p className="text-[12px] text-[#E11D48]" role="alert">{manualError}</p>}
                    <button type="button" onClick={handleManualAdd} disabled={manualSaving || !manualName.trim()}
                      className="w-full rounded-[10px] bg-orange text-white text-[13px] font-semibold py-[10px] hover:bg-orange-dk transition-colors disabled:opacity-60 focus:outline-none">
                      {manualSaving ? t('nutritionManualSaving') : t('nutritionManualAdd')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: meal log ── */}
          <div className="flex flex-col gap-3 mt-3 lg:mt-0">
            {/* Date nav + metric row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {!selectMode && (
                  <>
                    <button type="button" onClick={handlePrevDay} aria-label="Previous day" className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-sand transition-colors focus:outline-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink2"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <span className="px-1 text-[14px] font-semibold text-ink1">{dateLabel}</span>
                    <button type="button" onClick={handleNextDay} disabled={isToday} aria-label="Next day" className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-sand transition-colors focus:outline-none disabled:opacity-30">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink2"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                  </>
                )}
                {selectMode && <span className="text-[14px] font-semibold text-ink1">{selectedIds.size > 0 ? `${selectedIds.size} selected` : t('nutritionSelectMode')}</span>}
              </div>
              <div className="flex items-center gap-2">
                {!selectMode && (
                  <div className="flex gap-1" role="group">
                    {LOG_METRICS.map((m) => (
                      <button key={m.key} type="button" onClick={() => handleLogMetricChange(m.key)} aria-pressed={logMetric === m.key}
                        className={['px-[10px] py-[4px] rounded-pill text-[11px] font-medium transition-colors focus:outline-none', logMetric === m.key ? 'bg-orange text-white' : 'bg-sand text-ink3 hover:bg-orange/10 hover:text-ink2'].join(' ')}>
                        {m.labelKey ? t(m.labelKey) : m.label}
                      </button>
                    ))}
                  </div>
                )}
                {Object.keys(mealGroups).length > 0 && (
                  <button type="button" onClick={selectMode ? handleExitSelectMode : handleEnterSelectMode}
                    className="px-[12px] py-[5px] rounded-pill text-[12px] font-semibold bg-sand text-ink2 hover:bg-orange/10 transition-colors focus:outline-none">
                    {selectMode ? t('nutritionSelectCancel') : t('nutritionSelectMode')}
                  </button>
                )}
              </div>
            </div>

            {entriesLoading ? (
              <div className="flex flex-col gap-3"><Skeleton className="h-[90px]" /><Skeleton className="h-[90px]" /></div>
            ) : entriesError ? (
              <p className="text-[13px] text-ink3 text-center py-6">{entriesError}</p>
            ) : selectMode ? (
              <div className="flex flex-col gap-3">
                {MEAL_ORDER.filter((mt) => mealGroups[mt]).map((mt) => (
                  <MealGroup key={mt} mealType={mt} entries={mealGroups[mt] ?? []} t={t}
                    onRequestDelete={handleRequestDelete} onRequestAction={handleRequestAction} logMetric={logMetric}
                    isDropTarget={false} selectMode={true}
                    selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} />
                ))}
              </div>
            ) : (
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                <div className="flex flex-col gap-3">
                  {MEAL_ORDER.map((mt) => (
                    <MealGroup key={mt} mealType={mt} entries={mealGroups[mt] ?? []} t={t}
                      onRequestDelete={handleRequestDelete} onRequestAction={handleRequestAction} logMetric={logMetric}
                      isDropTarget={overMealType === mt}
                      onAddFood={(mt) => openAnalyser('ai', mt)} />
                  ))}
                </div>
                <DragOverlay>
                  {activeEntryId ? (
                    <div className="rounded-[10px] bg-white border border-orange shadow-lg px-4 py-3 text-[13px] font-medium text-ink1 opacity-90">
                      {(() => { const e = entries.find((x) => x._id === activeEntryId); return e?.foods?.map((f) => f.name).join(', ') ?? e?.rawText ?? '…' })()}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* Supplement recommendations */}
            {(recLoading || (supplementRecs?.recommendations?.length ?? 0) > 0) && (
              <div className="rounded-[14px] border border-border bg-white shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[16px] leading-none">💊</span>
                  <p className="text-[13px] font-semibold text-ink1">{t('nutritionRecTitle')}</p>
                </div>
                {recLoading ? (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-[52px]" />
                    <Skeleton className="h-[52px]" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(supplementRecs?.recommendations ?? []).map((rec) => (
                      <div key={rec.supplement.id} className="flex items-start gap-3 p-3 rounded-[10px] bg-[#FDE8DE]">
                        <span className="text-[18px] shrink-0 leading-none">💊</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink1">{rec.supplement.name}</p>
                          {rec.supplement.dosage && (
                            <p className="text-[11px] text-ink2">{rec.supplement.dosage}</p>
                          )}
                          <p className="text-[12px] text-ink2 mt-0.5">{rec.reason}</p>
                        </div>
                      </div>
                    ))}
                    {supplementRecs?.allGapsFilled && (
                      <p className="text-[12px] text-ink3 text-center py-1">{t('nutritionRecAllGood')}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky action bar — mobile only */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border px-4 py-3 flex gap-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={() => openAnalyser('ai')}
            className="flex-1 bg-orange text-white text-[13px] font-semibold py-[13px] rounded-full shadow-sm flex items-center justify-center gap-2 focus:outline-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {t('nutritionTabAI')}
          </button>
          <button type="button" onClick={() => openAnalyser('manual')}
            className="flex-1 border border-border text-ink1 text-[13px] font-semibold py-[13px] rounded-full flex items-center justify-center gap-2 focus:outline-none hover:bg-sand transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            {t('nutritionTabManual')}
          </button>
        </div>

        {/* Algorithm bottom sheet */}
        <AlgorithmSheet
          open={algoSheetOpen}
          onClose={() => setAlgoSheetOpen(false)}
          summary={summary}
          onOpenProfileChat={() => setProfileChatOpen(true)}
          t={t}
        />

        {/* Analyser bottom sheet */}
        <AnalyserSheet
          open={analyserSheetOpen}
          onClose={() => setAnalyserSheetOpen(false)}
          defaultTab={analyserDefaultTab}
          aiText={aiText} setAiText={setAiText}
          aiParsing={aiParsing} parsedFoods={parsedFoods}
          parsedSuggestions={parsedSuggestions} checkedFoods={checkedFoods}
          aiError={aiError} addingToLog={addingToLog}
          onAiParse={handleAiParse} onToggleFood={toggleFood} onAddToLog={handleAddToLog}
          manualName={manualName} setManualName={setManualName}
          manualQty={manualQty} setManualQty={setManualQty}
          manualUnit={manualUnit} setManualUnit={setManualUnit}
          manualMealType={manualMealType} setManualMealType={setManualMealType}
          manualSaving={manualSaving} manualError={manualError}
          onManualAdd={handleManualAdd}
          aiPlaceholder={aiPlaceholder}
          disambigChips={disambigChips} onSelectChip={handleSelectChip}
          viewDate={viewDate} t={t}
        />

        {/* AI Goal Setup modal */}
        <AiGoalSetupModal open={aiGoalSetupOpen} onClose={() => setAiGoalSetupOpen(false)} onComplete={handleAiGoalComplete} />

        {/* Customise modal */}
        <CustomiseModal open={customizeOpen} onClose={() => setCustomizeOpen(false)} config={customConfig} onSave={handleSaveCustomConfig} t={t} />

        {/* Batch delete bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-40px)] max-w-[400px]">
            <button type="button" onClick={() => setBatchDeleteOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-red-500 hover:bg-red-600 text-white text-[14px] font-semibold py-[14px] shadow-xl transition-colors focus:outline-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              {t('nutritionBatchDelete').replace('{n}', selectedIds.size)}
            </button>
          </div>
        )}
        <BatchDeleteModal open={batchDeleteOpen} count={selectedIds.size} deleting={batchDeleting} t={t} onConfirm={handleBatchDeleteConfirm} onCancel={() => setBatchDeleteOpen(false)} />
        <ProfileOnboardingChat open={profileChatOpen} onClose={() => setProfileChatOpen(false)} onComplete={() => { fetchSummary() }} />

        {/* Undo toast */}
        <style>{`@keyframes drainBar { from { width: 100% } to { width: 0% } }`}</style>
        {pendingDelete && (
          <div role="status" aria-live="polite" className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-40px)] max-w-[400px] rounded-[12px] bg-[#1C1C1E] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-[13px]">
              <span className="text-[13px] font-medium text-white">{t('nutritionEntryDeleted')}</span>
              <button type="button" onClick={handleUndoDelete} className="text-[13px] font-semibold text-orange ml-4 focus:outline-none">{t('nutritionUndo')}</button>
            </div>
            <div className="h-[3px] bg-white/10">
              <div key={pendingDelete.entry._id} className="h-full bg-orange" style={{ animation: 'drainBar 5s linear forwards' }} />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Legacy layout (default) ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-page">
      <V2ToggleButton isV2={false} onToggle={handleToggleV2} />
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
        <div className="flex items-center gap-3">
          <a
            href="https://recallth.vercel.app/nutrition"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-[6px] bg-[#1C1C1E] text-white text-[11px] font-semibold px-3 py-[7px] rounded-full shadow hover:opacity-80 transition-opacity"
          >
            <span className="w-2 h-2 rounded-full bg-green-400" />
            New UI
          </a>
          <button
            type="button"
            onClick={() => navigate('/nutrition/add', { state: { date: viewDate } })}
            className="flex items-center gap-2 bg-orange text-white text-[13px] font-semibold px-4 py-[9px] rounded-[10px] hover:bg-orange-dk transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
          >
            + Add food
          </button>
        </div>
      </div>

      {/* ── Main content container ── */}
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 lg:px-8 pt-2 md:pt-6 pb-10 md:pb-14">

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
          {category === 'custom' && (
            <button
              type="button"
              onClick={() => customConfig?.aiSetupDone ? setCustomizeOpen(true) : setAiGoalSetupOpen(true)}
              className="mt-2 flex items-center gap-1.5 text-[12px] text-orange font-medium hover:underline"
            >
              <span>⚙</span> {t('nutritionCustomiseBtn')}
            </button>
          )}
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
              customConfig={customConfig}
            />
            <AlgorithmCard summary={summary} onOpenProfileChat={() => setProfileChatOpen(true)} />
          </div>

          {/* ── RIGHT: AI Analyser + Today's log ── */}
          <div className="flex flex-col gap-5">

            {/* AI / Manual analyser section */}
            <div className="rounded-[14px] border border-border bg-white shadow-sm overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-border">
                {[{ key: 'ai', labelKey: 'nutritionTabAI' }, { key: 'manual', labelKey: 'nutritionTabManual' }].map(({ key, labelKey }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAnalyserTab(key)}
                    className={[
                      'flex-1 py-[11px] text-[13px] font-semibold transition-colors focus:outline-none',
                      analyserTab === key
                        ? 'text-orange border-b-2 border-orange -mb-px bg-white'
                        : 'text-ink3 hover:text-ink2 bg-sand/30',
                    ].join(' ')}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>

              <div className="px-5 py-5 md:px-6 md:py-6">
                {analyserTab === 'ai' ? (
                  <>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {MEAL_ORDER.map((mt) => (
                        <button key={mt} type="button" onClick={() => setManualMealType(mt)} aria-pressed={manualMealType === mt}
                          className={['px-[12px] py-[6px] rounded-pill text-[12px] font-medium transition-colors focus:outline-none', manualMealType === mt ? 'bg-orange text-white' : 'bg-sand text-ink2 hover:bg-orange/10'].join(' ')}>
                          {t(MEAL_LABEL_KEYS[mt])}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      placeholder={aiPlaceholder}
                      rows={parsedFoods.length > 0 ? 2 : 5}
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
                        t('nutritionAiAnalyse')
                      )}
                    </button>
                    {aiError && (
                      <p className="mt-2 text-[12px] text-[#E11D48]" role="alert">{aiError}</p>
                    )}
                    {parsedFoods.length > 0 && (
                      <div className="mt-4">
                        {disambigChips.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[11px] text-ink3 mb-1.5">{t('nutritionDidYouMean')}</p>
                            <div className="flex gap-2 flex-wrap">
                              {disambigChips.map((chip) => (
                                <button
                                  key={chip.id}
                                  type="button"
                                  onClick={() => handleSelectChip(chip)}
                                  className="flex items-center gap-1.5 px-3 py-[6px] rounded-pill bg-white border border-orange/40 text-[12px] text-ink1 font-medium hover:bg-orange/5 hover:border-orange transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                                >
                                  <span className="text-[10px] font-semibold text-orange uppercase">{chip.accuracyTier}</span>
                                  {chip.displayName ?? chip.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
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

                        {/* Drink / add-on suggestions */}
                        {parsedSuggestions.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2 mb-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange shrink-0">
                                <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
                              </svg>
                              <p className="text-[12px] font-medium text-ink2">{t('nutritionChooseDrink')}</p>
                            </div>
                            <div className="border border-orange/30 rounded-[10px] overflow-hidden bg-orange/5">
                              {parsedSuggestions.map((food) => (
                                <ParsedFoodRow
                                  key={food.name}
                                  food={food}
                                  checked={checkedFoods.has(food.name)}
                                  onToggle={toggleFood}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {checkedFoods.size > 0 && (() => {
                          const allParsed = [...parsedFoods, ...parsedSuggestions]
                          const sel = allParsed.filter(f => checkedFoods.has(f.name))
                          const tot = sel.reduce((a, f) => ({
                            kcal: a.kcal + (Number(f.nutrients?.calories ?? f.calories) || 0),
                            protein: a.protein + (Number(f.nutrients?.protein ?? f.protein) || 0),
                            carbs: a.carbs + (Number(f.nutrients?.carbs ?? f.carbs) || 0),
                            fat: a.fat + (Number(f.nutrients?.fat ?? f.fat) || 0),
                          }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
                          return (
                            <div className="mt-3 rounded-[10px] bg-orange/8 border border-orange/20 px-4 py-3 flex items-center justify-between gap-3">
                              <span className="text-[12px] font-semibold text-orange shrink-0">{t('nutritionTotal') || 'Total'}</span>
                              <div className="flex gap-3 flex-wrap justify-end">
                                <span className="text-[12px] font-semibold text-ink1">{Math.round(tot.kcal)} kcal</span>
                                <span className="text-[12px] text-ink2">{Math.round(tot.protein)}g {t('nutritionProtein')}</span>
                                <span className="text-[12px] text-ink2">{Math.round(tot.carbs)}g {t('nutritionCarbs')}</span>
                                <span className="text-[12px] text-ink2">{Math.round(tot.fat)}g {t('nutritionFat')}</span>
                              </div>
                            </div>
                          )
                        })()}
                        <button
                          type="button"
                          onClick={handleAddToLog}
                          disabled={addingToLog || checkedFoods.size === 0}
                          className="mt-3 w-full rounded-[10px] border border-orange text-orange text-[13px] font-semibold py-[10px] hover:bg-orange/5 transition-colors disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                        >
                          {addingToLog ? t('nutritionAdding') : t('nutritionConfirm')}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* ── Manual entry form ── */
                  <div className="flex flex-col gap-3">
                    {/* Meal type pills */}
                    <div className="flex gap-2 flex-wrap">
                      {MEAL_ORDER.map((mt) => (
                        <button
                          key={mt}
                          type="button"
                          onClick={() => setManualMealType(mt)}
                          aria-pressed={manualMealType === mt}
                          className={[
                            'px-[12px] py-[6px] rounded-pill text-[12px] font-medium transition-colors focus:outline-none',
                            manualMealType === mt
                              ? 'bg-orange text-white'
                              : 'bg-sand text-ink2 hover:bg-orange/10',
                          ].join(' ')}
                        >
                          {t(MEAL_LABEL_KEYS[mt])}
                        </button>
                      ))}
                    </div>

                    {/* Food name */}
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                      placeholder={t('nutritionManualNamePlaceholder')}
                      className="w-full border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white"
                    />

                    {/* Quantity + unit */}
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={manualQty}
                        onChange={(e) => setManualQty(e.target.value)}
                        placeholder={t('nutritionManualQtyPlaceholder')}
                        min="0"
                        className="w-[80px] border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white"
                      />
                      <input
                        type="text"
                        value={manualUnit}
                        onChange={(e) => setManualUnit(e.target.value)}
                        placeholder={t('nutritionManualUnitPlaceholder')}
                        className="flex-1 border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white"
                      />
                    </div>

                    {manualError && (
                      <p className="text-[12px] text-[#E11D48]" role="alert">{manualError}</p>
                    )}

                    <button
                      type="button"
                      onClick={handleManualAdd}
                      disabled={manualSaving || !manualName.trim()}
                      className="w-full rounded-[10px] bg-orange text-white text-[13px] font-semibold py-[10px] hover:bg-orange-dk transition-colors disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                    >
                      {manualSaving ? t('nutritionManualSaving') : t('nutritionManualAdd')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Today's food log */}
            <div className={`pb-[100px] ${selectMode && selectedIds.size > 0 ? 'md:pb-28' : 'md:pb-8'}`}>
              {/* Date + metric row */}
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-1">
                  {!selectMode && (
                    <>
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
                    </>
                  )}
                  {selectMode && (
                    <span className="text-[14px] md:text-[15px] font-semibold text-ink1">
                      {selectedIds.size > 0
                        ? `${selectedIds.size} selected`
                        : t('nutritionSelectMode')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!selectMode && (
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
                          {m.labelKey ? t(m.labelKey) : m.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Select / Cancel button — only show when there are entries */}
                  {Object.keys(mealGroups).length > 0 && (
                    <button
                      type="button"
                      onClick={selectMode ? handleExitSelectMode : handleEnterSelectMode}
                      className={[
                        'px-[12px] py-[5px] rounded-pill text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange',
                        selectMode
                          ? 'bg-sand text-ink2 hover:bg-border'
                          : 'bg-sand text-ink2 hover:bg-orange/10',
                      ].join(' ')}
                    >
                      {selectMode ? t('nutritionSelectCancel') : t('nutritionSelectMode')}
                    </button>
                  )}
                </div>
              </div>

              {entriesLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-[90px]" />
                  <Skeleton className="h-[90px]" />
                </div>
              ) : entriesError ? (
                <p className="text-[13px] text-ink3 text-center py-6">{entriesError}</p>
              ) : selectMode ? (
                /* ── Select mode: plain list, no DnD ── */
                <div className="flex flex-col gap-3">
                  {MEAL_ORDER.filter((mt) => mealGroups[mt]).map((mt) => (
                    <MealGroup
                      key={mt}
                      mealType={mt}
                      entries={mealGroups[mt] ?? []}
                      t={t}
                      onRequestDelete={handleRequestDelete}
                      onRequestAction={handleRequestAction}
                      logMetric={logMetric}
                      isDropTarget={false}
                      selectMode={true}
                      selectedIds={selectedIds}
                      onToggleSelect={handleToggleSelect}
                      onSelectAll={handleSelectAll}
                    />
                  ))}
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex flex-col gap-3">
                    {MEAL_ORDER.map((mt) => (
                      <MealGroup
                        key={mt}
                        mealType={mt}
                        entries={mealGroups[mt] ?? []}
                        t={t}
                        onRequestDelete={handleRequestDelete}
                        onRequestAction={handleRequestAction}
                        logMetric={logMetric}
                        isDropTarget={overMealType === mt}
                        onAddFood={(mt) => openAnalyser('ai', mt)}
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

      {/* ── Analyser bottom sheet ── */}
      <AnalyserSheet
        open={analyserSheetOpen}
        onClose={() => setAnalyserSheetOpen(false)}
        defaultTab={analyserDefaultTab}
        aiText={aiText} setAiText={setAiText}
        aiParsing={aiParsing} parsedFoods={parsedFoods}
        parsedSuggestions={parsedSuggestions} checkedFoods={checkedFoods}
        aiError={aiError} addingToLog={addingToLog}
        onAiParse={handleAiParse} onToggleFood={toggleFood} onAddToLog={handleAddToLog}
        manualName={manualName} setManualName={setManualName}
        manualQty={manualQty} setManualQty={setManualQty}
        manualUnit={manualUnit} setManualUnit={setManualUnit}
        manualMealType={manualMealType} setManualMealType={setManualMealType}
        manualSaving={manualSaving} manualError={manualError}
        onManualAdd={handleManualAdd}
        aiPlaceholder={aiPlaceholder}
        disambigChips={disambigChips} onSelectChip={handleSelectChip}
        viewDate={viewDate} t={t}
      />

      {/* ── AI Goal Setup modal ── */}
      <AiGoalSetupModal open={aiGoalSetupOpen} onClose={() => setAiGoalSetupOpen(false)} onComplete={handleAiGoalComplete} />

      {/* ── Customise nutrients modal ── */}
      <CustomiseModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        config={customConfig}
        onSave={handleSaveCustomConfig}
        t={t}
      />

      {/* ── Batch delete floating bar ── */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-[80px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-40px)] max-w-[400px]">
          <button
            type="button"
            onClick={() => setBatchDeleteOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-red-500 hover:bg-red-600 text-white text-[14px] font-semibold py-[14px] shadow-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            {t('nutritionBatchDelete').replace('{n}', selectedIds.size)}
          </button>
        </div>
      )}

      {/* ── Batch delete confirm modal ── */}
      <BatchDeleteModal
        open={batchDeleteOpen}
        count={selectedIds.size}
        deleting={batchDeleting}
        t={t}
        onConfirm={handleBatchDeleteConfirm}
        onCancel={() => setBatchDeleteOpen(false)}
      />

      {/* ── Profile onboarding chat ── */}
      <ProfileOnboardingChat
        open={profileChatOpen}
        onClose={() => setProfileChatOpen(false)}
        onComplete={() => { fetchSummary() }}
      />

      {/* ── Food entry action sheet ── */}
      <EntryActionSheet
        entry={actionEntry}
        open={!!actionEntry}
        todayStr={todayStr}
        onClose={handleCloseAction}
        onRequestDelete={handleRequestDelete}
        onChangeDate={handleChangeDate}
        t={t}
      />

      {/* ── Undo delete toast ── */}
      <style>{`@keyframes drainBar { from { width: 100% } to { width: 0% } }`}</style>
      {pendingDelete && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[80px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-40px)] max-w-[400px] rounded-[12px] bg-[#1C1C1E] shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-[13px]">
            <span className="text-[13px] font-medium text-white">{t('nutritionEntryDeleted')}</span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="text-[13px] font-semibold text-orange ml-4 focus:outline-none focus-visible:underline"
            >
              {t('nutritionUndo')}
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
