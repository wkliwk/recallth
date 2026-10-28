import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import SuppCard from '../components/SuppCard'
import FAB from '../components/FAB'
import BatchScanModal from '../components/BatchScanModal'
import { limitFiles } from '../utils/batchScan'
import { toggleId, selectAllIds, pruneSelection, allSelected, summarizeNames } from '../utils/selection'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

/* ------------------------------------------------------------------ */
/*  Evidence badge                                                     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Skeleton card                                                      */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-card border border-border overflow-hidden animate-pulse">
      <div className="w-full aspect-[4/3] bg-sand" />
      <div className="px-3 py-3 flex flex-col gap-2">
        <div className="h-[13px] w-3/4 bg-sand rounded-pill" />
        <div className="h-[11px] w-1/2 bg-sand rounded-pill" />
        <div className="h-[18px] w-[48px] bg-sand rounded-pill mt-1" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Letter avatar color helper                                         */
/* ------------------------------------------------------------------ */
const LETTER_PALETTE = [
  { bg: '#D4ECD8', text: '#2C5A38' },
  { bg: '#FAE8D0', text: '#7A4A1A' },
  { bg: '#DAE8F8', text: '#1A3A6A' },
  { bg: '#E8F4D8', text: '#3A5A1A' },
  { bg: '#FDE8DE', text: '#7A2A1A' },
  { bg: '#EDE8F8', text: '#3A1A7A' },
]

function getLetterColors(name) {
  if (!name) return LETTER_PALETTE[0]
  const idx = name.charCodeAt(0) % LETTER_PALETTE.length
  return LETTER_PALETTE[idx]
}

/* ------------------------------------------------------------------ */
/*  Cabinet screen                                                     */
/* ------------------------------------------------------------------ */
export default function Cabinet() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [supplements, setSupplements] = useState([])
  const [interactions, setInteractions] = useState([])
  const [evidenceMap, setEvidenceMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('name') // 'name' | 'brand' | 'type' | 'recent'
  const [stockFilter, setStockFilter] = useState('all') // 'all' | 'out'
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const aiDebounceRef = useRef(null)

  // Select mode: tick items, delete several at once (soft delete, same as the detail page), then offer Undo.
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null) // { ids, count, message?, undoing? } | null
  const toastTimerRef = useRef(null)
  const batchInputRef = useRef(null)
  const [batch, setBatch] = useState(null) // { files, truncated } | null

  function handleBatchFiles(e) {
    const picked = limitFiles(e.target.files)
    e.target.value = ''
    if (picked.files.length > 0) setBatch(picked)
  }

  async function handleBatchSaved() {
    try { sessionStorage.removeItem('recallth_evidence_scores') } catch { /* ignore */ }
    try {
      const res = await api.cabinet.list()
      setSupplements(res.data || [])
    } catch { /* list refresh is best-effort */ }
  }

  useEffect(() => {
    // Step 1: load the list immediately
    async function fetchList() {
      setLoading(true)
      setError(null)
      try {
        const suppRes = await api.cabinet.list()
        setSupplements(suppRes.data || [])
      } catch (err) {
        setError(err.message || 'Failed to load supplements')
      } finally {
        setLoading(false)
      }
    }

    // Step 2: load AI data in background after list is shown
    async function fetchAiData() {
      const CACHE_KEY = 'recallth_evidence_scores'
      const CACHE_TTL = 3600 * 1000 // 1 hour

      setAiLoading(true)
      try {
        // Check sessionStorage cache for evidence scores
        let cachedScores = null
        try {
          const cached = sessionStorage.getItem(CACHE_KEY)
          if (cached) {
            const { data, timestamp } = JSON.parse(cached)
            if (Date.now() - timestamp < CACHE_TTL) {
              cachedScores = data
            } else {
              sessionStorage.removeItem(CACHE_KEY)
            }
          }
        } catch {
          // sessionStorage unavailable or corrupted — ignore
        }

        const [interactRes, evidenceRes] = await Promise.allSettled([
          api.cabinet.interactions(),
          cachedScores ? Promise.resolve({ data: cachedScores }) : api.cabinet.evidenceScores(),
        ])

        if (interactRes.status === 'fulfilled') {
          const ixData = interactRes.value.data
          setInteractions(Array.isArray(ixData) ? ixData : ixData?.interactions ?? [])
        }

        if (evidenceRes.status === 'fulfilled') {
          const scoresData = evidenceRes.value.data
          const scores = Array.isArray(scoresData) ? scoresData : scoresData?.scores ?? []
          const map = {}
          scores.forEach((s) => { if (s.name) map[s.name] = s })
          setEvidenceMap(map)

          // Store fetched data in sessionStorage if it wasn't already cached
          if (!cachedScores) {
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: scoresData, timestamp: Date.now() }))
            } catch {
              // sessionStorage write failed (quota exceeded etc.) — ignore
            }
          }
        }
      } finally {
        setAiLoading(false)
      }
    }

    fetchList().then(() => fetchAiData())
  }, [])

  const outOfStockCount = supplements.filter((s) => s.outOfStock).length

  // #446 — also search through ingredients list
  function matchesSearch(s) {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    if (s.name.toLowerCase().includes(q)) return true
    // ingredients can be an array of strings or a single comma-separated string
    if (Array.isArray(s.ingredients)) {
      return s.ingredients.some((ing) => String(ing).toLowerCase().includes(q))
    }
    if (typeof s.ingredients === 'string' && s.ingredients) {
      return s.ingredients.toLowerCase().includes(q)
    }
    return false
  }

  // Determine what field matched (for display note)
  function matchedIngredient(s) {
    if (!search.trim()) return null
    if (s.name.toLowerCase().includes(search.toLowerCase())) return null
    const q = search.toLowerCase()
    if (Array.isArray(s.ingredients)) {
      return s.ingredients.find((ing) => String(ing).toLowerCase().includes(q)) || null
    }
    if (typeof s.ingredients === 'string') {
      return s.ingredients.split(',').map((x) => x.trim()).find((x) => x.toLowerCase().includes(q)) || null
    }
    return null
  }

  function clearToastTimer() {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = null
  }

  function showToast(next, ms = 8000) {
    clearToastTimer()
    setToast(next)
    toastTimerRef.current = setTimeout(() => setToast(null), ms)
  }

  function exitSelect() {
    setSelecting(false)
    setSelected([])
    setConfirmDelete(false)
  }

  async function handleConfirmDelete(ids) {
    setDeleting(true)
    const byId = new Map(supplements.map((x) => [x._id, x]))
    const deleted = []
    const failed = []
    for (const id of ids) {
      try {
        await api.cabinet.remove(id)
        deleted.push(id)
      } catch {
        failed.push(byId.get(id)?.name || id)
      }
    }
    try { sessionStorage.removeItem('recallth_evidence_scores') } catch { /* ignore */ }
    if (deleted.length > 0) setSupplements((prev) => prev.filter((x) => !deleted.includes(x._id)))
    setDeleting(false)
    setConfirmDelete(false)
    if (failed.length === 0) exitSelect()
    else setSelected((prev) => prev.filter((id) => !deleted.includes(id))) // failed ones stay selected
    if (deleted.length > 0 || failed.length > 0) {
      showToast({ ids: deleted, count: deleted.length, failed }, 8000)
    }
  }

  async function handleUndo() {
    if (!toast || toast.ids.length === 0) return
    clearToastTimer()
    setToast((t0) => ({ ...t0, undoing: true }))
    let failedCount = 0
    for (const id of toast.ids) {
      try {
        await api.cabinet.update(id, { active: true, endDate: null })
      } catch {
        failedCount += 1
      }
    }
    try {
      const res = await api.cabinet.list()
      setSupplements(res.data || [])
    } catch { /* list refresh is best-effort */ }
    try { sessionStorage.removeItem('recallth_evidence_scores') } catch { /* ignore */ }
    showToast({ ids: [], count: 0, restored: toast.ids.length - failedCount, undoFailed: failedCount }, 4000)
  }

  const filtered = supplements
    .filter(matchesSearch)
    .filter((s) => stockFilter === 'out' ? s.outOfStock : true)
    .sort((a, b) => {
      if (sortBy === 'brand') return (a.brand || '').localeCompare(b.brand || '')
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '')
      if (sortBy === 'recent') return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
      // Always sort out-of-stock items to the bottom
      if (a.outOfStock && !b.outOfStock) return 1
      if (!a.outOfStock && b.outOfStock) return -1
      return a.name.localeCompare(b.name)
    })

  // Selection is limited to what is visible (a search/filter change drops hidden ids, so Delete never acts on them).
  const visibleIds = filtered.map((x) => x._id)
  const selectedVisible = pruneSelection(selected, visibleIds)
  const nameOf = (id) => supplements.find((x) => x._id === id)?.name || ''

  const SORT_OPTIONS = [
    { key: 'name', label: 'A-Z' },
    { key: 'brand', label: t('fieldBrand') || 'Brand' },
    { key: 'type', label: t('fieldType') || 'Type' },
    { key: 'recent', label: t('recent') || 'Recent' },
  ]
  // Debounced AI lookup when search has no cabinet match
  useEffect(() => {
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    setAiSuggestion(null)
    if (!search.trim()) return
    const query = search.trim()
    aiDebounceRef.current = setTimeout(async () => {
      setAiSuggesting(true)
      try {
        const res = await api.cabinet.aiLookup(query)
        if (res.success && res.data) {
          const results = Array.isArray(res.data) ? res.data : [res.data]
          setAiSuggestion(results[0] || null)
        }
      } catch {
        setAiSuggestion(null)
      } finally {
        setAiSuggesting(false)
      }
    }, 700)
    return () => { if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current) }
  }, [search])

  const stats = [
    { value: String(supplements.length), label: t('active') },
    { value: String(interactions.length), label: t('conflicts') },
  ]

  return (
    <div className="min-h-screen bg-page">
      {/* Mobile header */}
      <OrangeHeader
        title={t('cabinetTitle')}
        subtitle={`${supplements.length} ${t('statsSupplements').toLowerCase()}`}
        hasStats={!loading}
        stats={stats}
      />

      {/* Wave separator */}
      <div className="-mt-[40px] md:mt-0">
        <Wave />
      </div>

      {/* Desktop header */}
      <div className="hidden md:block px-8 pt-7 pb-2 max-w-[960px] mx-auto">
        <h1 className="font-display text-[28px] text-ink1">{t('cabinetTitle')}</h1>
        <p className="text-[14px] text-ink3 mt-1">{supplements.length} {t('statsSupplements').toLowerCase()}</p>
        {!loading && (
          <div className="flex gap-4 mt-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-white border border-border rounded-[14px] px-6 py-3 flex flex-col items-center">
                <span className="text-[22px] font-bold text-orange">{s.value}</span>
                <span className="text-[11px] text-ink3 mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interaction warning banner */}
      {aiLoading && (
        <div className="mx-5 mb-3 h-10 rounded-card bg-sand animate-pulse md:max-w-[960px] md:mx-auto md:px-8" />
      )}
      {!aiLoading && interactions.length > 0 && (
        <div
          className="mx-5 mb-3 px-4 py-3 rounded-card flex items-start gap-3 md:max-w-[960px] md:mx-auto"
          style={{ background: '#FDE8DE', border: '1px solid #E8C4B0' }}
        >
          <svg
            className="w-[18px] h-[18px] shrink-0 mt-[1px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#C05A28"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-[13px] font-medium" style={{ color: '#C05A28' }}>
            {t('interactionWarning', interactions.length)}
          </p>
        </div>
      )}

      {/* Desktop toolbar (search + sort in one row) */}
      {!loading && supplements.length > 0 && (
        <div className="hidden md:flex items-center justify-between px-8 py-4 max-w-[960px] mx-auto">
          <div className="flex items-center gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`rounded-pill px-3 py-[5px] text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  sortBy === opt.key
                    ? 'bg-orange text-white'
                    : 'bg-white border border-border text-ink3 hover:border-ink3/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {outOfStockCount > 0 && (
              <button
                onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
                className={`rounded-pill px-3 py-[5px] text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  stockFilter === 'out'
                    ? 'bg-[#888] text-white'
                    : 'bg-white border border-border text-ink3 hover:border-ink3/40'
                }`}
              >
                {t('cabinetFilterOutOfStock')} {outOfStockCount}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="bg-white border-[1.5px] border-border-md rounded-[12px] py-[9px] px-4 text-[13px] text-ink1 placeholder:text-ink4 outline-none w-[260px]"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-[8px] cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-orange/10 text-orange' : 'text-ink3 hover:text-ink2'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-[8px] cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-orange/10 text-orange' : 'text-ink3 hover:text-ink2'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select mode controls */}
      {!loading && supplements.length > 0 && (
        <div className="px-5 md:px-8 pt-3 flex items-center justify-between gap-3 max-w-[960px] md:mx-auto w-full" data-testid="select-bar">
          {selecting ? (
            <>
              <span className="text-[13px] text-ink2" data-testid="selected-count">{t('cabinetSelectedCount').replace('{n}', selectedVisible.length)}</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSelected(allSelected(selectedVisible, visibleIds) ? [] : selectAllIds(visibleIds))}
                  className="text-[13px] font-medium text-orange cursor-pointer"
                  data-testid="select-all"
                >
                  {t('cabinetSelectAll')}
                </button>
                <button type="button" onClick={exitSelect} className="text-[13px] text-ink3 hover:text-ink1 cursor-pointer" data-testid="select-cancel">
                  {t('cabinetSelectCancel')}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSelecting(true)}
              className="text-[13px] font-medium text-ink2 hover:text-orange cursor-pointer"
              data-testid="select-start"
            >
              {t('cabinetSelect')}
            </button>
          )}
        </div>
      )}

      {/* Batch scan */}
      <div className={`px-5 md:px-8 pt-3 flex justify-end ${selecting ? 'hidden' : ''}`}>
        <input
          ref={batchInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleBatchFiles}
          className="hidden"
          data-testid="batch-scan-input"
        />
        <button
          type="button"
          onClick={() => batchInputRef.current?.click()}
          className="flex items-center gap-2 text-[13px] font-medium text-orange hover:text-orange-dk cursor-pointer transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          {t('batchScanButton')}
        </button>
      </div>

      {/* Mobile search input */}
      <div className="md:hidden px-5 py-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-ink3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-white border-[1.5px] border-border-md rounded-pill py-[10px] pr-4 pl-10 text-[11px] text-ink1 placeholder:text-ink4 outline-none"
          />
        </div>
      </div>

      {/* Mobile sort + view toggle */}
      {!loading && supplements.length > 0 && (
        <div className="md:hidden px-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`rounded-pill px-3 py-[5px] text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  sortBy === opt.key
                    ? 'bg-orange text-white'
                    : 'bg-white border border-border text-ink3 hover:border-ink3/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {outOfStockCount > 0 && (
              <button
                onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
                className={`rounded-pill px-3 py-[5px] text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  stockFilter === 'out'
                    ? 'bg-[#888] text-white'
                    : 'bg-white border border-border text-ink3 hover:border-ink3/40'
                }`}
              >
                {t('cabinetFilterOutOfStock')} {outOfStockCount}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[8px] cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-orange/10 text-orange' : 'text-ink3 hover:text-ink2'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[8px] cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-orange/10 text-orange' : 'text-ink3 hover:text-ink2'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Supplement card grid/list */}
      <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'flex flex-col'} gap-3 px-5 md:px-8 pb-[100px] md:pb-10 max-w-[960px] md:mx-auto w-full`}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !loading && supplements.length === 0 && !error ? (
          <div className="col-span-2 md:col-span-3 lg:col-span-4 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-[64px] h-[64px] rounded-full bg-orange-lt flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E07B4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-ink1 mb-1">{t('cabinetEmpty')}</p>
            <p className="text-[13px] text-ink3 mb-5">{t('cabinetEmptySub')}</p>
            <button
              type="button"
              onClick={() => navigate('/cabinet/add')}
              className="rounded-full bg-orange text-white text-[13px] font-semibold px-6 py-[10px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              {t('addSupplement')}
            </button>
          </div>
        ) : error ? (
          <div className="text-center py-12 col-span-2">
            <p className="text-ink3 text-[14px]">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={supplements.length > 0 && search.trim() ? 'col-span-2 pt-1 pb-8' : 'col-span-2 text-center py-12'}>
            {supplements.length === 0 ? (
              <div className="text-center">
                <div className="w-[56px] h-[56px] rounded-full bg-orange-lt flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E07B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                </div>
                <p className="text-ink2 text-[14px] font-medium">{t('cabinetEmpty')}</p>
                <p className="text-ink3 text-[13px] mt-1">{t('cabinetEmptySub')}</p>
              </div>
            ) : search.trim() ? (
              <div className="bg-white rounded-card border border-border overflow-hidden">
                <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E07B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
                  </svg>
                  <span className="text-[12px] font-medium text-ink2">{t('cabinetNotInCabinet')}</span>
                </div>
                {aiSuggesting ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-orange animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-orange animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-[12px] text-ink3">{t('aiLookupSearching')}</p>
                  </div>
                ) : aiSuggestion ? (
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[13px] font-semibold text-ink1">{t('isThisTheOne')}</p>
                    <div className="rounded-[12px] border border-border bg-page flex gap-3 p-3 items-center">
                      {aiSuggestion.imageUrl ? (
                        <img src={aiSuggestion.imageUrl} alt={aiSuggestion.name || ''} className="w-[56px] h-[56px] object-contain rounded-[8px] shrink-0 bg-sand"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                      ) : null}
                      <div className="w-[56px] h-[56px] rounded-[8px] bg-sand items-center justify-center text-[20px] font-semibold text-ink3/40 shrink-0"
                        style={{ display: aiSuggestion.imageUrl ? 'none' : 'flex' }}>
                        {(aiSuggestion.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-ink1 leading-snug truncate">{aiSuggestion.name}</p>
                        {aiSuggestion.brand && <p className="text-[11px] text-ink3 mt-[1px]">{aiSuggestion.brand}</p>}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {aiSuggestion.dosage && <span className="rounded-pill px-[7px] py-[2px] text-[10px] font-medium bg-orange/10 text-orange">{aiSuggestion.dosage}</span>}
                          {aiSuggestion.timing && <span className="rounded-pill px-[7px] py-[2px] text-[10px] font-medium bg-sand text-ink2">{aiSuggestion.timing}</span>}
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => navigate('/cabinet/add', { state: { aiResult: aiSuggestion } })}
                      className="w-full rounded-pill bg-orange text-white text-[14px] font-medium py-[11px] cursor-pointer hover:bg-orange-dk transition-colors">
                      {t('addButton')}
                    </button>
                    <button type="button" onClick={() => navigate('/cabinet/add')}
                      className="text-[12px] text-ink3 hover:text-ink2 cursor-pointer text-center">
                      {t('notThisOne')}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center flex flex-col items-center gap-3">
                    <p className="text-[13px] text-ink3">{t('aiLookupNoMatch')}</p>
                    <button type="button" onClick={() => navigate('/cabinet/add')}
                      className="rounded-pill border border-orange text-orange text-[13px] font-medium px-5 py-[9px] cursor-pointer hover:bg-orange/5 transition-colors">
                      {t('addButton')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-ink3 text-[14px]">{t('noResults')}</p>
              </div>
            )}
          </div>
        ) : (
          filtered.map((supp) => {
            const letter = supp.name?.[0]?.toUpperCase() || '?'
            const colors = getLetterColors(supp.name)
            const evidenceScore = evidenceMap[supp.name] || supp.evidenceScore
            const evidenceLevel = evidenceScore?.level
            const ingMatch = matchedIngredient(supp)

            return (
              <div
                key={supp._id}
                className={`cursor-pointer relative ${selecting && selectedVisible.includes(supp._id) ? 'ring-2 ring-orange rounded-card' : ''}`}
                data-testid="cabinet-card"
                data-selected={selecting && selectedVisible.includes(supp._id) ? 'true' : 'false'}
                onClick={() => (selecting ? setSelected((prev) => toggleId(prev, supp._id)) : navigate(`/cabinet/${supp._id}`))}
              >
                {selecting && (
                  <span
                    className="absolute top-2 left-2 z-10 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center bg-white"
                    style={{ borderColor: selectedVisible.includes(supp._id) ? '#E07B4A' : '#C9C2B8' }}
                    aria-hidden="true"
                  >
                    {selectedVisible.includes(supp._id) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E07B4A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </span>
                )}
                <SuppCard
                  letter={letter}
                  name={supp.name}
                  brand={supp.brand}
                  meta={supp.timing || supp.frequency}
                  dose={supp.dosage}
                  colors={colors}
                  evidenceLevel={evidenceLevel}
                  imageUrl={supp.imageUrl}
                  variant={viewMode}
                  outOfStock={!!supp.outOfStock}
                />
                {ingMatch && (
                  <p className="text-[10px] text-ink3 mt-1 px-1 truncate">
                    matched ingredient: <span className="font-medium text-orange">{ingMatch}</span>
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* FAB — navigates to add */}
      {!selecting && <FAB onClick={() => navigate('/cabinet/add')} />}

      {selecting && (
        <div className="fixed left-0 right-0 bottom-[64px] md:bottom-4 z-30 pl-5 pr-[84px] md:px-5 flex justify-center pointer-events-none">
          <button
            type="button"
            disabled={selectedVisible.length === 0}
            onClick={() => setConfirmDelete(true)}
            data-testid="delete-selected"
            className="pointer-events-auto w-full md:w-auto md:px-10 rounded-full bg-[#C05A28] text-white text-[15px] font-semibold py-[13px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {t('cabinetDeleteN').replace('{n}', selectedVisible.length)}
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center" data-testid="delete-confirm">
          <div className="bg-white w-full md:max-w-[440px] rounded-t-[20px] md:rounded-[20px] p-5 flex flex-col gap-3">
            <h3 className="font-display text-[18px] text-ink1">{t('cabinetDeleteConfirmTitle').replace('{n}', selectedVisible.length)}</h3>
            <p className="text-[12px] text-ink3">{t('cabinetDeleteConfirmBody')}</p>
            {(() => {
              const { shown, more } = summarizeNames(selectedVisible.map(nameOf), 5)
              return (
                <ul className="text-[13px] text-ink1 list-disc pl-5" data-testid="delete-confirm-names">
                  {shown.map((n, i) => <li key={`${n}-${i}`}>{n}</li>)}
                  {more > 0 && <li className="text-ink3 list-none -ml-5">{t('cabinetDeleteAndMore').replace('{n}', more)}</li>}
                </ul>
              )
            })()}
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                data-testid="delete-cancel"
                className="flex-1 rounded-full border-[1.5px] border-border text-ink2 text-[14px] font-medium py-[11px] cursor-pointer"
              >
                {t('cabinetSelectCancel')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(selectedVisible)}
                disabled={deleting}
                data-testid="delete-confirm-button"
                className="flex-1 rounded-full bg-[#C05A28] text-white text-[14px] font-semibold py-[11px] cursor-pointer disabled:opacity-60"
              >
                {deleting ? t('cabinetDeleting') : t('cabinetDeleteN').replace('{n}', selectedVisible.length)}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed left-0 right-0 bottom-[84px] md:bottom-6 z-[60] px-5 flex justify-center pointer-events-none"
          data-testid="toast"
        >
          <div className="pointer-events-auto bg-[#2B2520] text-white text-[13px] rounded-full pl-5 pr-3 py-[10px] flex items-center gap-3 shadow-lg max-w-[560px]">
            <span>
              {toast.restored !== undefined
                ? `${t('cabinetRestored').replace('{n}', toast.restored)}${toast.undoFailed ? ` · ${t('cabinetUndoFailed')}` : ''}`
                : [
                    toast.count > 0 ? t('cabinetDeleted').replace('{n}', toast.count) : '',
                    toast.failed?.length ? t('cabinetDeleteFailed').replace('{names}', toast.failed.join(', ')) : '',
                  ].filter(Boolean).join(' · ')}
            </span>
            {toast.restored === undefined && toast.count > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={toast.undoing}
                data-testid="toast-undo"
                className="text-[#F5B58F] font-semibold px-2 py-1 cursor-pointer disabled:opacity-60"
              >
                {toast.undoing ? '…' : t('cabinetUndo')}
              </button>
            )}
          </div>
        </div>
      )}

      {batch && (
        <BatchScanModal
          files={batch.files}
          truncated={batch.truncated}
          existingItems={supplements}
          onClose={() => setBatch(null)}
          onSaved={handleBatchSaved}
        />
      )}
    </div>
  )
}
