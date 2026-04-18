import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

function mealTypeFromTime() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'breakfast'
  if (h >= 11 && h < 14) return 'lunch'
  if (h >= 14 && h < 18) return 'snack'
  if (h >= 18 && h < 22) return 'dinner'
  return 'snack'
}

function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const COMMON_HK_FOODS = [
  { name: '叉燒飯', nameEn: 'Char Siu Rice', brand: 'Cha Chaan Teng', servingSize: '1 plate (400g)', emoji: '🍖', nutrients: { calories: 640, protein: 28, carbs: 86, fat: 18 } },
  { name: '雞蛋炒飯', nameEn: 'Egg Fried Rice', brand: 'Cha Chaan Teng', servingSize: '1 plate (350g)', emoji: '🍳', nutrients: { calories: 520, protein: 16, carbs: 78, fat: 16 } },
  { name: '皮蛋瘦肉粥', nameEn: 'Century Egg & Pork Congee', brand: 'Cha Chaan Teng', servingSize: '1 bowl (400g)', emoji: '🍲', nutrients: { calories: 210, protein: 15, carbs: 30, fat: 4 } },
  { name: '港式蛋撻', nameEn: 'HK Egg Tart', brand: 'Bakery', servingSize: '1 piece (80g)', emoji: '🥧', nutrients: { calories: 235, protein: 5, carbs: 27, fat: 12 } },
  { name: '菠蘿包', nameEn: 'Pineapple Bun', brand: 'Bakery', servingSize: '1 piece (90g)', emoji: '🍞', nutrients: { calories: 290, protein: 6, carbs: 45, fat: 10 } },
  { name: '腸粉 (鮮蝦)', nameEn: 'Shrimp Rice Noodle Roll', brand: 'Dim Sum', servingSize: '2 rolls (150g)', emoji: '🍱', nutrients: { calories: 190, protein: 9, carbs: 30, fat: 4 } },
  { name: '蝦餃', nameEn: 'Har Gow', brand: 'Dim Sum', servingSize: '3 pieces (90g)', emoji: '🥟', nutrients: { calories: 160, protein: 8, carbs: 22, fat: 4 } },
  { name: '豬扒包', nameEn: 'Pork Chop Bun', brand: 'Cha Chaan Teng', servingSize: '1 bun (200g)', emoji: '🥩', nutrients: { calories: 520, protein: 24, carbs: 48, fat: 24 } },
  { name: '港式奶茶', nameEn: 'HK Milk Tea', brand: 'Cha Chaan Teng', servingSize: '1 cup (300ml)', emoji: '🧋', nutrients: { calories: 120, protein: 4, carbs: 18, fat: 4 } },
  { name: '雞翼 (炸)', nameEn: 'Fried Chicken Wing', brand: 'Street Food', servingSize: '2 pieces (110g)', emoji: '🍗', nutrients: { calories: 310, protein: 22, carbs: 8, fat: 22 } },
  { name: '乾炒牛河', nameEn: 'Dry-Fried Beef Ho Fun', brand: 'Cha Chaan Teng', servingSize: '1 plate (400g)', emoji: '🍜', nutrients: { calories: 720, protein: 30, carbs: 88, fat: 26 } },
  { name: '西多士', nameEn: 'HK French Toast', brand: 'Cha Chaan Teng', servingSize: '2 slices (130g)', emoji: '🥞', nutrients: { calories: 420, protein: 10, carbs: 45, fat: 22 } },
]

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
    </svg>
  )
}

function FoodImage({ imageUrl, emoji, className }) {
  const [imgError, setImgError] = useState(false)
  const displayEmoji = emoji ?? '🍽️'
  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${className} object-cover`}
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div className={`${className} flex items-center justify-center bg-[#FDF4EB]`}>
      <span className="text-2xl leading-none select-none">{displayEmoji}</span>
    </div>
  )
}

function normaliseFoodData(food) {
  return {
    name: food.name ?? food.product_name ?? '',
    brand: food.brand ?? food.brands ?? food.nameEn ?? '',
    servingSize: food.servingSize ?? food.serving_size ?? food.quantity ?? food.serving ?? '',
    imageUrl: food.imageUrl ?? null,
    emoji: food.emoji ?? null,
    nutrients: {
      calories: food.nutrients?.calories ?? food.calories ?? food.nutriments?.energy_value ?? undefined,
      protein: food.nutrients?.protein ?? food.protein ?? food.nutriments?.proteins ?? undefined,
      carbs: food.nutrients?.carbs ?? food.carbs ?? food.nutriments?.carbohydrates ?? undefined,
      fat: food.nutrients?.fat ?? food.fat ?? food.nutriments?.fat ?? undefined,
    },
  }
}

function scaledNutrients(nutrients, qty) {
  const s = parseFloat(qty) || 1
  const round1 = (v) => Math.round(v * s * 10) / 10
  return {
    calories: nutrients.calories !== undefined ? Math.round(nutrients.calories * s) : undefined,
    protein: nutrients.protein !== undefined ? round1(nutrients.protein) : undefined,
    carbs: nutrients.carbs !== undefined ? round1(nutrients.carbs) : undefined,
    fat: nutrients.fat !== undefined ? round1(nutrients.fat) : undefined,
  }
}

function SelectionPanel({ food, quantity, setQuantity, mealType, setMealType, saving, saveError, onSave, onCancel, t }) {
  const qty = parseFloat(quantity) || 1
  const scaled = scaledNutrients(food.nutrients, qty)

  function adjustQty(delta) {
    const next = Math.max(0.5, Math.round((qty + delta) * 2) / 2)
    setQuantity(String(next))
  }

  function mealLabel(mt) {
    const key = `nutritionMeal${mt.charAt(0).toUpperCase() + mt.slice(1)}`
    return t(key)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Food name */}
      <div>
        <p className="text-[15px] font-semibold text-ink1">{food.name}</p>
        {food.brand ? <p className="text-[12px] text-ink2 mt-0.5">{food.brand}</p> : null}
        {food.servingSize ? (
          <p className="text-[12px] text-ink3 mt-0.5">{t('foodDbPerServing')}: {food.servingSize}</p>
        ) : null}
      </div>

      {/* Quantity stepper */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-ink2">{t('foodDbServings')}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => adjustQty(-0.5)}
            className="w-9 h-9 rounded-full bg-sand text-ink1 text-[18px] flex items-center justify-center hover:bg-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
            aria-label="Decrease"
          >
            −
          </button>
          <input
            type="number"
            value={quantity}
            min="0.5"
            step="0.5"
            onChange={(e) => setQuantity(e.target.value)}
            className="w-16 text-center bg-page border-[1.5px] border-border rounded-[10px] py-[7px] text-[14px] font-semibold text-ink1 outline-none focus:border-orange transition-colors"
          />
          <button
            type="button"
            onClick={() => adjustQty(0.5)}
            className="w-9 h-9 rounded-full bg-sand text-ink1 text-[18px] flex items-center justify-center hover:bg-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
            aria-label="Increase"
          >
            +
          </button>
          {scaled.calories !== undefined && (
            <span className="text-[14px] font-semibold text-orange ml-1">{scaled.calories} kcal</span>
          )}
        </div>
        {(scaled.protein !== undefined || scaled.carbs !== undefined || scaled.fat !== undefined) && (
          <div className="flex gap-2 flex-wrap mt-0.5">
            {scaled.protein !== undefined && (
              <span className="text-[11px] text-ink3 bg-sand rounded-pill px-2 py-0.5">P {scaled.protein}g</span>
            )}
            {scaled.carbs !== undefined && (
              <span className="text-[11px] text-ink3 bg-sand rounded-pill px-2 py-0.5">C {scaled.carbs}g</span>
            )}
            {scaled.fat !== undefined && (
              <span className="text-[11px] text-ink3 bg-sand rounded-pill px-2 py-0.5">F {scaled.fat}g</span>
            )}
          </div>
        )}
      </div>

      {/* Meal type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-ink2">{t('nutritionFieldMeal')}</label>
        <div className="flex gap-2 flex-wrap">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              type="button"
              onClick={() => setMealType(mt)}
              className={`rounded-pill px-3 py-[6px] text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
                mealType === mt ? 'bg-orange text-white' : 'bg-sand text-ink2 hover:bg-border'
              }`}
            >
              {mealLabel(mt)}
            </button>
          ))}
        </div>
      </div>

      {saveError && <p className="text-[12px] text-red-500">{saveError}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-[12px] border border-border py-[10px] text-[13px] font-medium text-ink2 hover:bg-sand transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        >
          {t('nutritionSelectCancel')}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 rounded-[12px] bg-orange text-white py-[10px] text-[13px] font-medium hover:bg-orange-dk transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-orange flex items-center justify-center gap-2"
        >
          {saving ? <Spinner /> : null}
          {saving ? t('nutritionAdding') : t('foodDbAdd')}
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

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState(null) // null = not searched yet
  const [searchError, setSearchError] = useState(null)
  const [selectedFood, setSelectedFood] = useState(null)
  const [mealType, setMealType] = useState(mealTypeFromTime())
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'grid'
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      setSearchError(null)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(query.trim())
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function doSearch(q) {
    setSearching(true)
    setSearchError(null)
    setSelectedFood(null)
    try {
      const res = await api.nutrition.search(q)
      const products = res?.data?.products ?? res?.products ?? []
      setResults(products)
    } catch (err) {
      setSearchError(err.message || 'Search failed — please try again.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function selectFood(food) {
    setSelectedFood((prev) => (prev === food ? null : food))
    setSaveError(null)
    setQuantity('1')
  }

  async function handleSave() {
    if (!selectedFood) return
    setSaving(true)
    setSaveError(null)
    const food = normaliseFoodData(selectedFood)
    const scaled = scaledNutrients(food.nutrients, quantity)
    const qty = parseFloat(quantity) || 1
    const unit = qty === 1 ? 'serving' : `${qty} servings`
    try {
      await api.nutrition.create({
        date: entryDate,
        mealType,
        foods: [{
          name: food.name,
          brand: food.brand || undefined,
          quantity: 1,
          unit: food.servingSize ? `${qty === 1 ? '' : qty + ' × '}${food.servingSize}`.trim() : unit,
          nutrients: {
            calories: scaled.calories,
            protein: scaled.protein,
            carbs: scaled.carbs,
            fat: scaled.fat,
          },
        }],
      })
      // Save to personal library silently
      try {
        await api.nutrition.library.save({
          name: food.name,
          brand: food.brand || undefined,
          servingSize: food.servingSize || undefined,
          calories: food.nutrients.calories ?? null,
          protein: food.nutrients.protein ?? null,
          carbs: food.nutrients.carbs ?? null,
          fat: food.nutrients.fat ?? null,
        })
      } catch { /* silent */ }
      navigate('/nutrition', { state: { date: entryDate } })
    } catch (err) {
      setSaveError(err.message || 'Failed to save — please try again.')
      setSaving(false)
    }
  }

  const displayList = results !== null ? results : COMMON_HK_FOODS

  return (
    <div className="min-h-screen bg-page">
      <OrangeHeader
        title={t('foodDbTitle')}
        onBack={() => navigate(-1)}
      />
      <div className="-mt-[40px] md:mt-0">
        <Wave />
      </div>

      <div className="px-5 pt-2 pb-[120px] flex flex-col gap-4">

        {/* Search bar + view toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('foodDbSearchPlaceholder')}
              className="w-full bg-white border-[1.5px] border-border rounded-[12px] pl-10 pr-10 py-[10px] text-[14px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-orange">
                <Spinner />
              </div>
            )}
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-white border border-border rounded-[10px] p-[3px] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-[6px] rounded-[7px] transition-colors ${viewMode === 'list' ? 'bg-orange text-white' : 'text-ink3 hover:text-ink1'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-[6px] rounded-[7px] transition-colors ${viewMode === 'grid' ? 'bg-orange text-white' : 'text-ink3 hover:text-ink1'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Section label */}
        <p className="text-[12px] font-medium text-ink2 -mb-2">
          {results === null
            ? t('foodDbCommonFoods')
            : results.length > 0
              ? t('foodDbResultsCount').replace('{n}', results.length)
              : null}
        </p>

        {/* Search error */}
        {searchError && (
          <p className="text-[12px] text-red-500 -mt-1">{searchError}</p>
        )}

        {/* Empty state */}
        {results !== null && results.length === 0 && !searching && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink4">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-[14px] font-medium text-ink2">{t('foodDbEmpty')}</p>
            <p className="text-[12px] text-ink4">{t('foodDbEmptySub')}</p>
          </div>
        )}

        {/* Food list / grid */}
        {displayList.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
              {displayList.map((food, idx) => {
                const fd = normaliseFoodData(food)
                const isSelected = selectedFood === food
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectFood(food)}
                    aria-expanded={isSelected}
                    className={`text-left rounded-[10px] border overflow-hidden transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
                      isSelected ? 'border-orange bg-orange/5' : 'border-border bg-white hover:border-orange/40'
                    }`}
                  >
                    <FoodImage imageUrl={fd.imageUrl} emoji={fd.emoji} className="w-full aspect-square" />
                    <div className="px-2 pt-1.5 pb-2">
                      <p className="text-[12px] font-semibold text-ink1 leading-tight line-clamp-2">{fd.name}</p>
                      {fd.nutrients.calories !== undefined && (
                        <p className="text-[10px] text-orange font-medium mt-0.5">{fd.nutrients.calories} kcal</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {displayList.map((food, idx) => {
                const fd = normaliseFoodData(food)
                const isSelected = selectedFood === food
                return (
                  <div key={idx}>
                    <button
                      type="button"
                      onClick={() => selectFood(food)}
                      aria-expanded={isSelected}
                      className={`w-full text-left rounded-[12px] border px-3 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
                        isSelected
                          ? 'border-orange bg-orange/5'
                          : 'border-border bg-white hover:border-orange/40'
                      }`}
                    >
                      <div className="flex gap-3">
                        <FoodImage imageUrl={fd.imageUrl} emoji={fd.emoji} className="w-14 h-14 shrink-0 rounded-[8px]" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[14px] font-semibold text-ink1 leading-tight">{fd.name}</span>
                            {fd.nutrients.calories !== undefined && (
                              <span className="text-[12px] text-ink3 shrink-0">{fd.nutrients.calories} kcal</span>
                            )}
                          </div>
                          {fd.brand ? <p className="text-[12px] text-ink2 mt-0.5">{fd.brand}</p> : null}
                          {fd.servingSize ? <p className="text-[12px] text-ink3">{fd.servingSize}</p> : null}
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {fd.nutrients.protein !== undefined && (
                              <span className="text-[11px] text-ink3 bg-sand rounded-pill px-2 py-0.5">P {fd.nutrients.protein}g</span>
                            )}
                            {fd.nutrients.carbs !== undefined && (
                              <span className="text-[11px] text-ink3 bg-sand rounded-pill px-2 py-0.5">C {fd.nutrients.carbs}g</span>
                            )}
                            {fd.nutrients.fat !== undefined && (
                              <span className="text-[11px] text-ink3 bg-sand rounded-pill px-2 py-0.5">F {fd.nutrients.fat}g</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Desktop: inline panel below card */}
                    {isSelected && (
                      <div className="hidden md:block mt-2 bg-white rounded-[12px] border border-orange/30 px-5 py-4">
                        <SelectionPanel
                          food={fd}
                          quantity={quantity}
                          setQuantity={setQuantity}
                          mealType={mealType}
                          setMealType={setMealType}
                          saving={saving}
                          saveError={saveError}
                          onSave={handleSave}
                          onCancel={() => setSelectedFood(null)}
                          t={t}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Mobile: bottom sheet */}
      {selectedFood && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setSelectedFood(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-page rounded-t-[20px] px-5 pt-4 pb-8 animate-slide-up"
            style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <SelectionPanel
              food={normaliseFoodData(selectedFood)}
              quantity={quantity}
              setQuantity={setQuantity}
              mealType={mealType}
              setMealType={setMealType}
              saving={saving}
              saveError={saveError}
              onSave={handleSave}
              onCancel={() => setSelectedFood(null)}
              t={t}
            />
          </div>
        </div>
      )}
    </div>
  )
}
