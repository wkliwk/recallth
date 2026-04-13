import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { chatService } from '../services/chat'

// ── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[10px] bg-gray-100 h-[90px]" aria-hidden="true" />
  )
}

// ── "In your stack" badge ────────────────────────────────────────────────────
function InStackBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-[10px] py-[3px] text-[11px] font-semibold text-green-700 shrink-0">
      In your stack
    </span>
  )
}

// ── Recommendation card ──────────────────────────────────────────────────────
function RecommendCard({ item, cabinetNames, onAdd }) {
  const [addState, setAddState] = useState('idle') // idle | adding | added

  const inCabinet = cabinetNames.has(item.name.toLowerCase())

  async function handleAdd() {
    setAddState('adding')
    try {
      await onAdd(item.name, item.dose)
      setAddState('added')
    } catch {
      setAddState('idle')
    }
  }

  return (
    <div className="bg-white rounded-[14px] border border-border px-4 py-[14px] flex flex-col gap-[6px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] font-semibold text-ink1 leading-snug">{item.name}</p>
        {inCabinet ? (
          <InStackBadge />
        ) : addState === 'added' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-[10px] py-[3px] text-[11px] font-semibold text-green-700 shrink-0">
            Added
          </span>
        ) : (
          <button
            onClick={handleAdd}
            disabled={addState === 'adding'}
            className="rounded-full bg-orange px-[12px] py-[4px] text-[12px] font-semibold text-white shrink-0 disabled:opacity-50 active:opacity-80 transition-opacity"
            aria-label={`Add ${item.name} to stack`}
          >
            {addState === 'adding' ? 'Adding…' : 'Add to stack'}
          </button>
        )}
      </div>
      {item.rationale && (
        <p className="text-[13px] text-ink2 leading-[1.45]">{item.rationale}</p>
      )}
      {item.dose && (
        <p className="text-[11px] text-ink3">{item.dose}</p>
      )}
    </div>
  )
}

// ── Tier section ─────────────────────────────────────────────────────────────
const TIER_STYLES = {
  essential: {
    label: 'Essential',
    headerClass: 'bg-orange/10 border border-orange/20',
    dotClass: 'bg-orange',
    textClass: 'text-orange',
  },
  beneficial: {
    label: 'Beneficial',
    headerClass: 'bg-[#FFFBEB] border border-[#FEF3C7]',
    dotClass: 'bg-[#D97706]',
    textClass: 'text-[#92400E]',
  },
  optional: {
    label: 'Optional',
    headerClass: 'bg-gray-50 border border-gray-100',
    dotClass: 'bg-gray-400',
    textClass: 'text-ink3',
  },
}

function TierSection({ tier, items, cabinetNames, onAdd }) {
  const style = TIER_STYLES[tier]
  if (!items || items.length === 0) return null

  return (
    <section aria-label={`${style.label} supplements`}>
      <div className={`flex items-center gap-2 rounded-[10px] px-4 py-[10px] mb-3 ${style.headerClass}`}>
        <span className={`w-[8px] h-[8px] rounded-full shrink-0 ${style.dotClass}`} />
        <h2 className={`text-[13px] font-semibold ${style.textClass}`}>{style.label}</h2>
        <span className="ml-auto text-[11px] text-ink3">{items.length} supplement{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <RecommendCard
            key={item.name}
            item={item}
            cabinetNames={cabinetNames}
            onAdd={onAdd}
          />
        ))}
      </div>
    </section>
  )
}

// ── Parse AI response ────────────────────────────────────────────────────────
function parseStackResponse(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed.essential || parsed.beneficial || parsed.optional) {
      return parsed
    }
  } catch {
    // fall through to extraction
  }

  // Try to extract JSON object from text
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (parsed.essential || parsed.beneficial || parsed.optional) {
        return parsed
      }
    } catch {
      // fall through
    }
  }

  return null
}

// ── Stack Builder prompt ─────────────────────────────────────────────────────
function buildPrompt(goal, profile, cabinetItems) {
  const profileSummary = profile
    ? {
        body: profile.body,
        diet: profile.diet,
        exercise: profile.exercise,
        goals: profile.goals,
        health: profile.health,
      }
    : null

  const cabinetSummary = cabinetItems.map((i) => ({
    name: i.name,
    type: i.type,
    dosage: i.dosage,
  }))

  return `You are an expert supplement advisor. The user has set this goal: "${goal}".

USER PROFILE:
${JSON.stringify(profileSummary, null, 2)}

CURRENT SUPPLEMENT CABINET:
${JSON.stringify(cabinetSummary, null, 2)}

Based on the goal, profile, and existing cabinet, recommend a personalised supplement stack in 3 tiers:
- Essential: core supplements with strong evidence for this goal
- Beneficial: supplements that meaningfully support this goal
- Optional: supplements with modest or indirect benefit

For each supplement include: name, a 1-sentence rationale, and a suggested dose.
Do NOT recommend supplements already in the cabinet as new additions — but you may include them if they are critical.

Return ONLY valid JSON (no markdown, no extra text) in this exact structure:
{
  "essential": [{ "name": "...", "rationale": "...", "dose": "..." }],
  "beneficial": [{ "name": "...", "rationale": "...", "dose": "..." }],
  "optional": [{ "name": "...", "rationale": "...", "dose": "..." }]
}`
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function StackBuilder() {
  const [goal, setGoal] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [tiers, setTiers] = useState(null)
  const [cabinetNames, setCabinetNames] = useState(new Set())
  const [cabinetItems, setCabinetItems] = useState([])
  const [profile, setProfile] = useState(null)

  // Fetch cabinet + profile once on mount
  useEffect(() => {
    async function loadContext() {
      try {
        const [cabinetRes, profileRes] = await Promise.all([
          api.cabinet.list(),
          api.profile.get(),
        ])
        const items = cabinetRes.data ?? cabinetRes ?? []
        setCabinetItems(items)
        setCabinetNames(new Set(items.map((i) => (i.name ?? '').toLowerCase())))
        setProfile(profileRes.data ?? profileRes)
      } catch {
        // Non-fatal — proceed with empty context
      }
    }
    loadContext()
  }, [])

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault()
      if (!goal.trim()) return

      setStatus('loading')
      setTiers(null)

      try {
        const message = buildPrompt(goal.trim(), profile, cabinetItems)
        const res = await chatService.send(message)
        const text = res?.data?.message ?? ''
        const parsed = parseStackResponse(text)

        if (!parsed) {
          setStatus('error')
          return
        }

        setTiers(parsed)
        setStatus('success')
      } catch {
        setStatus('error')
      }
    },
    [goal, profile, cabinetItems]
  )

  const handleAddToStack = useCallback(
    async (name, dose) => {
      await api.cabinet.create({ name, dosage: dose })
      setCabinetNames((prev) => new Set([...prev, name.toLowerCase()]))
    },
    []
  )

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[960px]">
      {/* Page header */}
      <h1 className="font-display text-[28px] text-ink1 mb-1">Stack Builder</h1>
      <p className="text-[14px] text-ink3 mb-6">
        Enter a health goal and get personalised supplement recommendations in seconds.
      </p>

      {/* Goal input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. better sleep, muscle building…"
          className="flex-1 rounded-[12px] border border-border bg-white px-4 py-[11px] text-[14px] text-ink1 placeholder-ink4 outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 transition-colors"
          aria-label="Health goal"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={!goal.trim() || status === 'loading'}
          className="rounded-[12px] bg-orange px-5 py-[11px] text-[14px] font-semibold text-white disabled:opacity-40 active:opacity-80 transition-opacity"
          aria-label="Generate stack recommendations"
        >
          {status === 'loading' ? 'Generating…' : 'Build Stack'}
        </button>
      </form>

      {/* Empty state */}
      {status === 'idle' && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="w-[52px] h-[52px] rounded-full bg-orange/10 flex items-center justify-center mb-1">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-ink1">Build your personalised stack</p>
          <p className="text-[13px] text-ink3 max-w-[280px]">
            Type a health goal above — sleep, energy, performance, immunity — and we'll recommend the right supplements for you.
          </p>
        </div>
      )}

      {/* Loading state */}
      {status === 'loading' && (
        <div aria-live="polite" aria-label="Generating recommendations">
          <p className="text-[14px] text-ink3 mb-4">Generating your stack…</p>
          <div className="flex flex-col gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
          <p className="text-[14px] font-medium text-ink1">Couldn't generate recommendations — try again</p>
          <button
            onClick={handleSubmit}
            className="rounded-[12px] border border-border bg-white px-5 py-[10px] text-[13px] font-semibold text-ink1 active:bg-sand transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {status === 'success' && tiers && (
        <div className="flex flex-col gap-6" aria-live="polite">
          <TierSection
            tier="essential"
            items={tiers.essential}
            cabinetNames={cabinetNames}
            onAdd={handleAddToStack}
          />
          <TierSection
            tier="beneficial"
            items={tiers.beneficial}
            cabinetNames={cabinetNames}
            onAdd={handleAddToStack}
          />
          <TierSection
            tier="optional"
            items={tiers.optional}
            cabinetNames={cabinetNames}
            onAdd={handleAddToStack}
          />
        </div>
      )}
    </div>
  )
}
