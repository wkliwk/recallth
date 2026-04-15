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
const EVIDENCE_COLORS = {
  A: { bg: '#D4ECD8', text: '#2C5A38' },
  B: { bg: '#DAE8F8', text: '#1A3A6A' },
  C: { bg: '#FAE8D0', text: '#7A4A1A' },
  D: { bg: '#FDE8DE', text: '#7A2A1A' },
}

function EvidenceBadge({ level }) {
  const colors = EVIDENCE_COLORS[level] || EVIDENCE_COLORS.C
  return (
    <span
      className="rounded-pill px-[8px] py-[2px] text-[10px] font-semibold shrink-0"
      style={{ background: colors.bg, color: colors.text }}
    >
      {level}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton card                                                      */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-card border border-border px-5 py-[14px] flex items-center gap-[14px] animate-pulse">
      <div className="w-[40px] h-[40px] rounded-full bg-sand shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="h-[14px] w-3/4 bg-sand rounded-pill" />
        <div className="h-[12px] w-1/2 bg-sand rounded-pill" />
      </div>
      <div className="h-[24px] w-[48px] bg-sand rounded-pill shrink-0" />
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
          setInteractions(interactRes.value.data || [])
        }

        if (evidenceRes.status === 'fulfilled') {
          const scores = evidenceRes.value.data || []
          const map = {}
          scores.forEach((s) => {
            if (s.name) map[s.name] = s.evidenceScore
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

  const filtered = supplements.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const stats = [
    { value: String(supplements.length), label: 'Active' },
    { value: String(interactions.length), label: 'Conflicts' },
  ]

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <OrangeHeader
        title={t('cabinetTitle')}
        subtitle={`${supplements.length} supplement${supplements.length !== 1 ? 's' : ''}`}
        hasStats={!loading}
        stats={stats}
      />

      {/* Wave separator */}
      <div className="-mt-[40px]">
        <Wave />
      </div>

      {/* Interaction warning banner */}
      {interactions.length > 0 && (
        <div
          className="mx-5 mb-3 px-4 py-3 rounded-card flex items-start gap-3"
          style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}
        >
          <svg
            className="w-[18px] h-[18px] shrink-0 mt-[1px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D97706"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-[13px] font-medium" style={{ color: '#92400E' }}>
            {t('interactionWarning', interactions.length)}
          </p>
        </div>
      )}

      {/* Search input */}
      <div className="px-5 py-4">
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
            placeholder="Search supplements..."
            className="w-full bg-white border-[1.5px] border-border-md rounded-pill py-[10px] pr-4 pl-10 text-[11px] text-ink1 placeholder:text-ink4 outline-none"
          />
        </div>
      </div>

      {/* Supplement card list */}
      <div className="flex flex-col gap-3 px-5 pb-[100px]">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-ink3 text-[14px]">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={supplements.length > 0 && search.trim() ? 'pt-1 pb-8' : 'text-center py-12'}>
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
                className="relative cursor-pointer"
                onClick={() => navigate(`/cabinet/${supp._id}`)}
              >
                <SuppCard
                  letter={letter}
                  name={supp.name}
                  meta={supp.timing || supp.frequency}
                  dose={supp.dosage}
                  colors={colors}
                />
                {evidenceLevel && (
                  <div className="absolute right-[60px] top-1/2 -translate-y-1/2 pointer-events-none">
                    <EvidenceBadge level={evidenceLevel} />
                  </div>
                )}
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
