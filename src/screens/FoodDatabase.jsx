import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function mealTypeFromTime() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'breakfast'
  if (h >= 11 && h < 14) return 'lunch'
  if (h >= 14 && h < 18) return 'snack'
  if (h >= 18 && h < 22) return 'dinner'
  return 'snack'
}

const COMMON_FOODS = [
  { name: '白飯', servingSize: '一碗', calories: 232, protein: 4, carbs: 51, fat: 0 },
  { name: '炒飯', servingSize: '一碗', calories: 345, protein: 8, carbs: 50, fat: 12 },
  { name: '即食麵', servingSize: '一包', calories: 350, protein: 8, carbs: 52, fat: 13 },
  { name: '雞蛋', servingSize: '一隻', calories: 78, protein: 6, carbs: 1, fat: 5 },
  { name: '雞胸肉', servingSize: '一塊 (100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
  { name: '港式奶茶', servingSize: '一杯 (250ml)', calories: 135, protein: 4, carbs: 14, fat: 7 },
  { name: '多士', servingSize: '兩片', calories: 160, protein: 5, carbs: 28, fat: 3 },
  { name: '香蕉', servingSize: '一隻', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: '蘋果', servingSize: '一個', calories: 95, protein: 0, carbs: 25, fat: 0 },
  { name: '牛奶', servingSize: '一杯 (240ml)', calories: 149, protein: 8, carbs: 12, fat: 8 },
  { name: '燕麥片', servingSize: '一碗 (40g)', calories: 148, protein: 5, carbs: 27, fat: 3 },
  { name: '腸粉', servingSize: '一份', calories: 260, protein: 8, carbs: 42, fat: 7 },
]

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']

function MacroPills({ protein, carbs, fat, t }) {
  const pills = [
    protein != null && { label: `P ${protein}g`, color: 'text-blue-500 bg-blue-50' },
    carbs != null && { label: `C ${carbs}g`, color: 'text-amber-600 bg-amber-50' },
    fat != null && { label: `F ${fat}g`, color: 'text-rose-500 bg-rose-50' },
  ].filter(Boolean)

  if (pills.length === 0) return null
  return (
    <div className="flex gap-1 flex-wrap mt-1">
      {pills.map((p) => (
        <span key={p.label} className={`text-[10px] font-medium rounded-full px-[7px] py-[2px] ${p.color}`}>{p.label}</span>
      ))}
    </div>
  )
}

function FoodCard({ food, onSelect, selected }) {
  const calories = food.calories ?? food.nutrients?.calories
  const protein = food.protein ?? food.nutrients?.protein
  const carbs = food.carbs ?? food.nutrients?.carbs
  const fat = food.fat ?? food.nutrients?.fat
  const { t } = useLanguage()

  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      className={`w-full text-left rounded-[14px] border px-4 py-3 transition-all focus:outline-none ${
        selected
          ? 'border-orange bg-orange/5 shadow-sm'
          : 'border-border bg-white hover:border-orange/50 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-ink1 leading-snug truncate">{food.name}</p>
          {food.brand ? <p className="text-[11px] text-ink3 truncate">{food.brand}</p> : null}
          {food.servingSize ? <p className="text-[11px] text-ink3">{food.servingSize}</p> : null}
          <MacroPills protein={protein} carbs={carbs} fat={fat} t={t} />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {calories != null && (
            <span className="text-[13px] font-bold text-ink1">{calories}</span>
          )}
          {calories != null && (
            <span className="text-[10px] text-ink3">kcal</span>
          )}
          {food.source === 'library' && (
            <span className="text-[9px] font-medium bg-orange/10 text-orange rounded-full px-2 py-0.5 mt-1">Saved</span>
          )}
        </div>
      </div>
    </button>
  )
}

function AddPanel({ food, date, onAdded, onClose, t }) {
  const [qty, setQty] = useState('1')
  const [mealType, setMealType] = useState(mealTypeFromTime())
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const calories = food.calories ?? food.nutrients?.calories
  const protein = food.protein ?? food.nutrients?.protein
  const carbs = food.carbs ?? food.nutrients?.carbs
  const fat = food.fat ?? food.nutrients?.fat

  async function handleAdd() {
    const qtyNum = parseFloat(qty)
    if (!qtyNum || qtyNum <= 0) return
    setSaving(true)
    try {
      const factor = qtyNum
      await api.nutrition.create({
        date,
        mealType,
        foods: [
          {
            name: food.name,
            brand: food.brand || undefined,
            quantity: qtyNum,
            unit: food.servingSize || 'serving',
            nutrients: {
              calories: calories != null ? Math.round(calories * factor) : undefined,
              protein: protein != null ? Math.round(protein * factor * 10) / 10 : undefined,
              carbs: carbs != null ? Math.round(carbs * factor * 10) / 10 : undefined,
              fat: fat != null ? Math.round(fat * factor * 10) / 10 : undefined,
            },
          },
        ],
      })
      setDone(true)
      setTimeout(() => onAdded(mealType), 800)
    } catch {
      setSaving(false)
    }
  }

  const mealKeys = {
    breakfast: t('nutritionMealBreakfast'),
    lunch: t('nutritionMealLunch'),
    dinner: t('nutritionMealDinner'),
    snack: t('nutritionMealSnack'),
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[20px] shadow-2xl border-t border-border px-5 pt-4 pb-[max(24px,env(safe-area-inset-bottom,24px))] animate-slide-up md:static md:rounded-[16px] md:shadow-md md:border md:animate-none">
      {/* Handle */}
      <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 md:hidden" />

      {/* Food name */}
      <p className="text-[15px] font-bold text-ink1 truncate">{food.name}</p>
      {food.servingSize && (
        <p className="text-[12px] text-ink3 mb-3">{food.servingSize}</p>
      )}

      {/* Meal type pills */}
      <div className="flex gap-2 flex-wrap mb-3">
        {MEAL_ORDER.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMealType(m)}
            className={`px-3 py-[6px] rounded-full text-[12px] font-medium transition-colors border ${
              mealType === m
                ? 'bg-orange text-white border-orange'
                : 'border-border text-ink2 hover:border-orange/50'
            }`}
          >
            {mealKeys[m]}
          </button>
        ))}
      </div>

      {/* Qty row */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-[13px] text-ink2 font-medium shrink-0">{t('foodDbQuantity')}</label>
        <input
          type="number"
          min="0.1"
          step="0.5"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-24 bg-page border-[1.5px] border-border rounded-[10px] px-3 py-[7px] text-[14px] text-ink1 outline-none focus:border-orange transition-colors text-center"
        />
        {food.servingSize && (
          <span className="text-[12px] text-ink3">{food.servingSize}</span>
        )}
      </div>

      {/* Calorie preview */}
      {calories != null && (
        <p className="text-[12px] text-ink3 mb-4">
          ≈ {Math.round(calories * (parseFloat(qty) || 1))} kcal
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 rounded-[12px] border border-border text-[14px] font-medium text-ink2 hover:bg-sand transition-colors"
        >
          {t('nutritionSelectCancel') || 'Cancel'}
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || done}
          className={`flex-1 py-3 rounded-[12px] text-[14px] font-semibold transition-colors ${
            done
              ? 'bg-green-500 text-white'
              : 'bg-orange text-white hover:bg-orange/90 disabled:opacity-60'
          }`}
        >
          {done ? t('foodDbAdded') : saving ? t('foodDbAdding') : t('foodDbAddToMeal')}
        </button>
      </div>
    </div>
  )
}

export default function FoodDatabase() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  const entryDate = location.state?.date ?? todayISO()
  const initialMealType = location.state?.mealType ?? null

  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = no search yet
  const [loading, setLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState(null)
  const debounceRef = useRef(null)

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.nutrition.search(q.trim())
      setResults(res.data?.products ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => doSearch(query), 500)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  function handleAdded(mealType) {
    navigate('/nutrition', { state: { date: entryDate, scrollToMeal: mealType } })
  }

  const displayList = results ?? (query.trim() ? [] : null)
  const showCommon = !query.trim() && results === null

  return (
    <div className="flex flex-col h-full bg-page">
      {/* ── Header ── */}
      <div className="bg-white border-b border-border px-5 pt-5 pb-3 md:px-8 md:pt-7">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sand transition-colors shrink-0"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-ink1 font-display">{t('foodDbTitle')}</h1>
        </div>

        {/* Search bar */}
        <div className="relative">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('foodDbSearchPlaceholder')}
            autoFocus
            className="w-full pl-10 pr-4 py-[10px] bg-sand rounded-[12px] text-[14px] text-ink1 placeholder:text-ink4 outline-none focus:ring-[1.5px] focus:ring-orange transition-all"
          />
          {loading && (
            <svg className="animate-spin w-4 h-4 text-orange absolute right-4 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 md:px-8 pb-[80px] md:pb-4">
        {/* Search hint */}
        {!query.trim() && (
          <p className="text-[12px] text-ink3 mb-4 text-center">{t('foodDbSearchHint')}</p>
        )}

        {/* Common foods */}
        {showCommon && (
          <>
            <h2 className="text-[12px] font-semibold text-ink3 uppercase tracking-wide mb-3">
              {t('foodDbCommonFoods')}
            </h2>
            <div className="flex flex-col gap-2">
              {COMMON_FOODS.map((food) => (
                <FoodCard
                  key={food.name}
                  food={food}
                  selected={selectedFood?.name === food.name}
                  onSelect={(f) => setSelectedFood(selectedFood?.name === f.name ? null : f)}
                />
              ))}
            </div>
          </>
        )}

        {/* Search results */}
        {query.trim() && !loading && results !== null && (
          <>
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink4">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p className="text-[13px] text-ink3">{t('foodDbNoResults')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {results.map((food, i) => (
                  <FoodCard
                    key={food.id ?? i}
                    food={food}
                    selected={selectedFood?.name === food.name}
                    onSelect={(f) => setSelectedFood(selectedFood?.name === f.name ? null : f)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Panel ── */}
      {selectedFood && (
        <>
          {/* Backdrop (mobile) */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setSelectedFood(null)}
          />
          <AddPanel
            food={selectedFood}
            date={entryDate}
            onAdded={handleAdded}
            onClose={() => setSelectedFood(null)}
            t={t}
          />
        </>
      )}
    </div>
  )
}
