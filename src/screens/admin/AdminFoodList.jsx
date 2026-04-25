import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

const CATEGORIES = [
  'rice_noodles', 'protein', 'dim_sum', 'soup', 'bread_pastry',
  'drinks', 'desserts', 'snacks', 'fast_food', 'whole_food', 'packaged',
]

const STATUSES = ['active', 'deprecated', 'merged']

export default function AdminFoodList() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [grabbing, setGrabbing] = useState({}) // { [id]: true }
  const [grabError, setGrabError] = useState(null)

  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 50

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.admin.foodDb.list({ q: q.trim() || undefined, category: category || undefined, status: status || undefined, page, limit: LIMIT })
      setItems(res.data)
      setTotal(res.total)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [q, category, status, page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id, name) => {
    if (!confirm(`Deprecate "${name}"?`)) return
    try {
      await api.admin.foodDb.remove(id)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleGrabImage = async (id) => {
    setGrabbing(g => ({ ...g, [id]: true }))
    setGrabError(null)
    try {
      const res = await api.admin.foodDb.grabImage(id)
      setItems(prev => prev.map(item =>
        item._id === id ? { ...item, dishImageUrl: res.data.dishImageUrl } : item
      ))
    } catch (e) {
      setGrabError(`Failed to grab image: ${e.message}`)
      setTimeout(() => setGrabError(null), 4000)
    } finally {
      setGrabbing(g => { const n = { ...g }; delete n[id]; return n })
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Admin Panel</p>
            <h1 className="text-2xl font-semibold text-gray-900">Food Database</h1>
          </div>
          <button
            onClick={() => navigate('/admin/food-db/new')}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Food
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            placeholder="Search name, alias..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Exclude merged</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-sm text-gray-400 self-center">{total} items</span>
        </div>

        {/* Table */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {grabError && (
          <p className="text-red-500 text-sm mb-4">{grabError}</p>
        )}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-3 w-12" />
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Logs</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No items found</td></tr>
              ) : items.map(item => (
                <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50">
                  {/* Image thumbnail */}
                  <td className="px-3 py-2 w-12">
                    {item.dishImageUrl ? (
                      <img
                        src={item.dishImageUrl}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.displayName}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-gray-500 text-right">{item.logCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      item.status === 'active' ? 'bg-green-100 text-green-700' :
                      item.status === 'deprecated' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => handleGrabImage(item._id)}
                      disabled={!!grabbing[item._id]}
                      title="Grab image"
                      className="text-gray-400 hover:text-blue-500 disabled:opacity-40 transition-colors inline-flex items-center"
                    >
                      {grabbing[item._id] ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/admin/food-db/${item._id}`)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Edit
                    </button>
                    {item.status !== 'deprecated' && (
                      <button
                        onClick={() => handleDelete(item._id, item.name)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Deprecate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-sm px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
