import { useState, useEffect, useCallback } from 'react'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import { api } from '../services/api'

// ── Skeleton row ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-[10px]">
      <div className="animate-pulse rounded-[10px] bg-gray-100 w-5 h-5 shrink-0" aria-hidden="true" />
      <div className="animate-pulse rounded-[10px] bg-gray-100 h-4 flex-1" aria-hidden="true" />
    </div>
  )
}

// ── Dots loading indicator ──────────────────────────────────────────────────
function DotsIndicator() {
  return (
    <div className="flex items-center gap-1" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[6px] h-[6px] rounded-full bg-orange"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  )
}

// ── Copy icon ───────────────────────────────────────────────────────────────
function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 0 2 2v1" />
    </svg>
  )
}

// ── Topic icons ─────────────────────────────────────────────────────────────
const TOPIC_ICONS = {
  supplements: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  interactions: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <path d="M11 18H8a2 2 0 0 1-2-2V9" />
    </svg>
  ),
  symptoms: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  goals: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
}

// ── Question row ────────────────────────────────────────────────────────────
function QuestionRow({ question, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start gap-3 py-[10px] w-full text-left cursor-pointer group"
      aria-pressed={checked}
    >
      <div
        className={`w-5 h-5 rounded-[5px] border-2 shrink-0 mt-[1px] flex items-center justify-center transition-colors ${
          checked ? 'bg-orange border-orange' : 'border-border bg-white group-hover:border-orange'
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="2 6 5 9 10 3" />
          </svg>
        )}
      </div>
      <span
        className={`text-[14px] leading-[1.45] transition-colors ${
          checked ? 'line-through text-ink3' : 'text-ink1'
        }`}
      >
        {question}
      </span>
    </button>
  )
}

// ── Question group ──────────────────────────────────────────────────────────
function QuestionGroup({ group, checkedIds, onToggle }) {
  const icon = TOPIC_ICONS[group.topic] ?? TOPIC_ICONS.supplements
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-orange">{icon}</span>
        <h2 className="font-display text-[15px] font-semibold text-ink1">{group.title}</h2>
      </div>
      <div className="h-px bg-border mb-1" />
      <div className="divide-y divide-border/50">
        {group.questions.map((q, idx) => {
          const id = `${group.topic}-${idx}`
          return (
            <QuestionRow
              key={id}
              question={q}
              checked={checkedIds.has(id)}
              onToggle={() => onToggle(id)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Build prompt ────────────────────────────────────────────────────────────
function buildDoctorPrepPrompt(profile, cabinet, interactions) {
  const cabinetSummary = cabinet
    .map((item) => `${item.name}${item.dose ? ` (${item.dose})` : ''}`)
    .join(', ')

  const interactionSummary =
    interactions && interactions.length > 0
      ? interactions
          .map((ix) => `${ix.supplement1} + ${ix.supplement2}: ${ix.severity ?? 'unknown severity'}`)
          .join('; ')
      : 'none detected'

  const profileSummary = profile
    ? [
        profile.body
          ? `Body: age ${profile.body.age ?? '?'}, gender ${profile.body.gender ?? '?'}`
          : null,
        profile.goals && profile.goals.length
          ? `Goals: ${Array.isArray(profile.goals) ? profile.goals.join(', ') : profile.goals}`
          : null,
        profile.diet ? `Diet: ${JSON.stringify(profile.diet)}` : null,
        profile.sleep ? `Sleep: ${JSON.stringify(profile.sleep)}` : null,
      ]
        .filter(Boolean)
        .join('. ')
    : 'No profile data available.'

  return `You are a health AI assistant helping a user prepare questions for their doctor appointment.

USER PROFILE: ${profileSummary}
SUPPLEMENTS: ${cabinetSummary || 'none'}
INTERACTIONS: ${interactionSummary}

Generate a JSON object with smart, personalised questions grouped by topic. Return ONLY valid JSON — no markdown, no code fences.

Required format:
{
  "groups": [
    { "title": "About Your Supplements", "topic": "supplements", "questions": ["..."] },
    { "title": "Interactions to Discuss", "topic": "interactions", "questions": ["..."] },
    { "title": "Symptoms & Side Effects", "topic": "symptoms", "questions": ["..."] },
    { "title": "Health Goals", "topic": "goals", "questions": ["..."] }
  ]
}

Rules: 3-5 questions per group, specific to this user's data, plain language, return only JSON.`
}

// ── Parse AI response ───────────────────────────────────────────────────────
function parseAIResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (parsed.groups && Array.isArray(parsed.groups)) return parsed
  } catch {
    // fall through
  }
  return null
}

function buildFlatFallback(text) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((l) => l.length > 10 && l.includes('?'))
  return [
    {
      title: 'Questions for Your Doctor',
      topic: 'supplements',
      questions:
        lines.length > 0
          ? lines
          : ['What supplements do you recommend for my health goals?'],
    },
  ]
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function DoctorPrep() {
  const [status, setStatus] = useState('loading')
  const [groups, setGroups] = useState([])
  const [checkedIds, setCheckedIds] = useState(new Set())
  const [copied, setCopied] = useState(false)

  const generate = useCallback(async () => {
    setStatus('loading')
    setCheckedIds(new Set())

    try {
      const [profile, cabinet, interactionsRes] = await Promise.all([
        api.profile.get().catch(() => null),
        api.cabinet.list().catch(() => []),
        api.cabinet.interactions().catch(() => []),
      ])

      const cabinetItems = Array.isArray(cabinet) ? cabinet : (cabinet?.items ?? [])
      const interactions = Array.isArray(interactionsRes)
        ? interactionsRes
        : (interactionsRes?.interactions ?? [])

      const prompt = buildDoctorPrepPrompt(profile, cabinetItems, interactions)
      const chatRes = await api.doctorPrep.generate(prompt)

      const aiText =
        typeof chatRes === 'string'
          ? chatRes
          : chatRes?.data?.message ?? chatRes?.message ?? JSON.stringify(chatRes)

      const parsed = parseAIResponse(aiText)
      setGroups(parsed ? parsed.groups : buildFlatFallback(aiText))
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    generate()
  }, [generate])

  const handleToggle = useCallback((id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleCopyAll = useCallback(() => {
    const lines = []
    for (const group of groups) {
      lines.push(group.title.toUpperCase())
      for (const q of group.questions) lines.push(`- ${q}`)
      lines.push('')
    }
    navigator.clipboard.writeText(lines.join('\n').trim()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [groups])

  const totalQuestions = groups.reduce((sum, g) => sum + g.questions.length, 0)

  return (
    <>
      <OrangeHeader
        title="Doctor Prep"
        subtitle="Questions to ask at your next appointment"
      />
      <Wave />

      <div className="px-5 py-6 md:px-8 md:py-7 max-w-[760px]">
        {status === 'loading' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <DotsIndicator />
              <span className="text-[14px] text-ink2">Generating your questions…</span>
            </div>
            {[1, 2, 3, 4].map((g) => (
              <div key={g} className="mb-6">
                <div className="animate-pulse rounded-[10px] bg-gray-100 h-4 w-40 mb-3" aria-hidden="true" />
                <div className="h-px bg-border mb-1" />
                {[1, 2, 3].map((r) => <SkeletonRow key={r} />)}
              </div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
              style={{ background: '#FFF1F2' }}
              aria-hidden="true"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-ink1">Couldn't generate questions</p>
            <p className="text-[13px] text-ink3 max-w-[280px]">
              Make sure your cabinet and profile have some data, then try again.
            </p>
            <button
              type="button"
              onClick={generate}
              className="mt-1 px-5 py-[10px] rounded-full bg-orange text-white text-[13px] font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] text-ink3">
                {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} ready
              </p>
              <button
                type="button"
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-[7px] rounded-full border border-border text-ink2 text-[12px] font-medium hover:bg-sand transition-colors cursor-pointer"
                aria-label="Copy all questions to clipboard"
              >
                <CopyIcon />
                {copied ? 'Copied!' : 'Copy all'}
              </button>
            </div>
            {groups.map((group) => (
              <QuestionGroup
                key={group.topic}
                group={group}
                checkedIds={checkedIds}
                onToggle={handleToggle}
              />
            ))}
          </>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}