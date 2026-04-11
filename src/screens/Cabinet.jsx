import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import BottomNav from '../components/BottomNav'
import SuppCard from '../components/SuppCard'
import FAB from '../components/FAB'
import { api } from '../services/api'

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
  const [supplements, setSupplements] = useState([])
  const [interactions, setInteractions] = useState([])
  const [evidenceMap, setEvidenceMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

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
        title="Cabinet"
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
            {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} detected in your cabinet
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
          <div className="text-center py-12">
            {supplements.length === 0 ? (
              <>
                <div className="w-[56px] h-[56px] rounded-full bg-orange-lt flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#E07B4A"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                </div>
                <p className="text-ink2 text-[14px] font-medium">Your cabinet is empty.</p>
                <p className="text-ink3 text-[13px] mt-1">Add your first supplement.</p>
              </>
            ) : (
              <p className="text-ink3 text-[14px]">No supplements match your search.</p>
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

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
