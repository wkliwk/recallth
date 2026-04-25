import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../services/api'

const CATEGORIES = [
  'rice_noodles', 'protein', 'dim_sum', 'soup', 'bread_pastry',
  'drinks', 'desserts', 'snacks', 'fast_food', 'whole_food', 'packaged',
]
const VENUES = ['chain', 'cha_chaan_teng', 'dai_pai_dong', 'home_cooked', 'supermarket', 'generic']
const SOURCES = ['official', 'openfoodfacts', 'community', 'reference', 'ai_estimated']
const TIERS = ['A', 'B', 'C']
const LANGS = ['zh-HK', 'en']
const STATUSES = ['active', 'deprecated']

const EMPTY = {
  name: '', displayName: '', aliases: '', lang: 'zh-HK', category: 'rice_noodles',
  brand: '', venue: '', dishImageUrl: '', labelImageUrl: '', dataSourceUrl: '',
  defaultServingGrams: 100, defaultServingUnit: 'g',
  source: 'ai_estimated', accuracyTier: 'C', status: 'active',
  per100g: { calories: '', protein: '', carbs: '', fat: '', sugar: '', fiber: '', sodium: '' },
}

function toForm(item) {
  return {
    name: item.name ?? '',
    displayName: item.displayName ?? '',
    aliases: (item.aliases ?? []).join(', '),
    lang: item.lang ?? 'zh-HK',
    category: item.category ?? 'rice_noodles',
    brand: item.brand ?? '',
    venue: item.venue ?? '',
    dishImageUrl: item.dishImageUrl ?? '',
    labelImageUrl: item.labelImageUrl ?? '',
    dataSourceUrl: item.dataSourceUrl ?? '',
    defaultServingGrams: item.defaultServingGrams ?? 100,
    defaultServingUnit: item.defaultServingUnit ?? 'g',
    source: item.source ?? 'ai_estimated',
    accuracyTier: item.accuracyTier ?? 'C',
    status: item.status ?? 'active',
    per100g: {
      calories: item.per100g?.calories ?? '',
      protein: item.per100g?.protein ?? '',
      carbs: item.per100g?.carbs ?? '',
      fat: item.per100g?.fat ?? '',
      sugar: item.per100g?.sugar ?? '',
      fiber: item.per100g?.fiber ?? '',
      sodium: item.per100g?.sodium ?? '',
    },
  }
}

function toPayload(form) {
  const per100g = {
    calories: Number(form.per100g.calories),
    protein: Number(form.per100g.protein),
    carbs: Number(form.per100g.carbs),
    fat: Number(form.per100g.fat),
  }
  if (form.per100g.sugar !== '') per100g.sugar = Number(form.per100g.sugar)
  if (form.per100g.fiber !== '') per100g.fiber = Number(form.per100g.fiber)
  if (form.per100g.sodium !== '') per100g.sodium = Number(form.per100g.sodium)

  return {
    name: form.name.trim(),
    displayName: form.displayName.trim(),
    aliases: form.aliases.split(',').map(s => s.trim()).filter(Boolean),
    lang: form.lang,
    category: form.category,
    brand: form.brand.trim() || undefined,
    venue: form.venue || undefined,
    dishImageUrl: form.dishImageUrl.trim() || undefined,
    labelImageUrl: form.labelImageUrl.trim() || undefined,
    dataSourceUrl: form.dataSourceUrl.trim() || undefined,
    defaultServingGrams: Number(form.defaultServingGrams),
    defaultServingUnit: form.defaultServingUnit.trim() || 'g',
    source: form.source,
    accuracyTier: form.accuracyTier,
    status: form.status,
    per100g,
  }
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const selectCls = inputCls

export default function AdminFoodForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    api.admin.foodDb.get(id)
      .then(res => setForm(toForm(res.data)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const setNutr = (field, value) => setForm(f => ({ ...f, per100g: { ...f.per100g, [field]: value } }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = toPayload(form)
      if (isEdit) await api.admin.foodDb.update(id, payload)
      else await api.admin.foodDb.create(payload)
      navigate('/admin/food-db')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/admin/food-db')} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to list
          </button>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Admin Panel / Food Database</p>
            <h1 className="text-2xl font-semibold text-gray-900">{isEdit ? 'Edit Food Item' : 'Add Food Item'}</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Basic Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name (internal)" required>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required />
              </Field>
              <Field label="Display Name" required>
                <input className={inputCls} value={form.displayName} onChange={e => set('displayName', e.target.value)} required />
              </Field>
            </div>
            <Field label="Aliases (comma-separated)">
              <input className={inputCls} value={form.aliases} onChange={e => set('aliases', e.target.value)} placeholder="e.g. 炒飯, fried rice" />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Language">
                <select className={selectCls} value={form.lang} onChange={e => set('lang', e.target.value)}>
                  {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Category" required>
                <select className={selectCls} value={form.category} onChange={e => set('category', e.target.value)} required>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Venue">
                <select className={selectCls} value={form.venue} onChange={e => set('venue', e.target.value)}>
                  <option value="">None</option>
                  {VENUES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Brand">
                <input className={inputCls} value={form.brand} onChange={e => set('brand', e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Nutrition */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Nutrition per 100g</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { key: 'calories', label: 'Calories (kcal)', required: true },
                { key: 'protein', label: 'Protein (g)', required: true },
                { key: 'carbs', label: 'Carbs (g)', required: true },
                { key: 'fat', label: 'Fat (g)', required: true },
                { key: 'sugar', label: 'Sugar (g)' },
                { key: 'fiber', label: 'Fiber (g)' },
                { key: 'sodium', label: 'Sodium (mg)' },
              ].map(({ key, label, required }) => (
                <Field key={key} label={label} required={required}>
                  <input
                    type="number" step="0.1" min="0"
                    className={inputCls}
                    value={form.per100g[key]}
                    onChange={e => setNutr(key, e.target.value)}
                    required={required}
                  />
                </Field>
              ))}
            </div>
          </div>

          {/* Serving */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Serving</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Default Serving (grams)" required>
                <input type="number" min="1" className={inputCls} value={form.defaultServingGrams} onChange={e => set('defaultServingGrams', e.target.value)} required />
              </Field>
              <Field label="Serving Unit">
                <input className={inputCls} value={form.defaultServingUnit} onChange={e => set('defaultServingUnit', e.target.value)} placeholder="g" />
              </Field>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Metadata & Images</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Source">
                <select className={selectCls} value={form.source} onChange={e => set('source', e.target.value)}>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Accuracy Tier">
                <select className={selectCls} value={form.accuracyTier} onChange={e => set('accuracyTier', e.target.value)}>
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Dish Image URL">
              <input className={inputCls} value={form.dishImageUrl} onChange={e => set('dishImageUrl', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Label Image URL">
              <input className={inputCls} value={form.labelImageUrl} onChange={e => set('labelImageUrl', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Data Source URL">
              <input className={inputCls} value={form.dataSourceUrl} onChange={e => set('dataSourceUrl', e.target.value)} placeholder="https://..." />
            </Field>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate('/admin/food-db')}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Food Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
