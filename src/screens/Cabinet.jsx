import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import SuppCard from '../components/SuppCard'
import FAB from '../components/FAB'
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
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('name') // 'name' | 'brand' | 'type' | 'recent'
  const [stockFilter, setStockFilter] = useState('all') // 'all' | 'out'
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const aiDebounceRef = useRef(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [suppRes, interactRes, evidenceRes] = await Promise.allSettled([
          api.cabinet.list(),
          api.cabinet.interactions(),
          api.cabinet.evidenceScores(),
        ])

        if (suppRes.status === 'fulfilled') {
          setSupplements(suppRes.value.data || [])
        } else {
          setError('Failed to load supplements')
        }

        if (interactRes.status === 'fulfilled') {
          const ixData = interactRes.value.data
          setInteractions(Array.isArray(ixData) ? ixData : ixData?.interactions ?? [])
        }

        if (evidenceRes.status === 'fulfilled') {
          const scoresData = evidenceRes.value.data
          const scores = Array.isArray(scoresData) ? scoresData : scoresData?.scores ?? []
          const map = {}
          scores.forEach((s) => {
            if (s.name) map[s.name] = s
          })
          setEvidenceMap(map)
        }
      } catch (err) {
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const outOfStockCount = supplements.filter((s) => s.outOfStock).length

  const filtered = supplements
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
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
      <div className="hidden md:block px-8 pt-7 pb-2 max-w-[960px]">
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
      {interactions.length > 0 && (
        <div
          className="mx-5 md:mx-8 mb-3 px-4 py-3 rounded-card flex items-start gap-3 max-w-[960px]"
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
        <div className="hidden md:flex items-center justify-between px-8 py-4 max-w-[960px]">
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
                用完 {outOfStockCount}
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
                用完 {outOfStockCount}
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
      <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'flex flex-col'} gap-3 px-5 md:px-8 pb-[100px] md:pb-10 max-w-[960px]`}>
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

            return (
              <div
                key={supp._id}
                className="cursor-pointer"
                onClick={() => navigate(`/cabinet/${supp._id}`)}
              >
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
              </div>
            )
          })
        )}
      </div>

      {/* FAB — navigates to add */}
      <FAB onClick={() => navigate('/cabinet/add')} />
    </div>
  )
}
