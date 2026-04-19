import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

// ── Skeleton primitive ───────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-sand ${className}`}
      aria-hidden="true"
    />
  )
}

// ── Trash icon ───────────────────────────────────────────────────────────────
function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

// ── Target / bullseye icon ───────────────────────────────────────────────────
function TargetIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

// ── Loading spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Goals() {
  const { t } = useLanguage()

  // ── Profile / goals state ────────────────────────────────────────────
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  // ── AI input state ───────────────────────────────────────────────────
  const [inputText, setInputText] = useState('')
  const [interpreting, setInterpreting] = useState(false)
  const [interpretError, setInterpretError] = useState('')
  const [interpretedGoals, setInterpretedGoals] = useState(null) // array of { emoji, name }

  // ── Save state ───────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // ── Note editing state ───────────────────────────────────────────────
  const [editingGoal, setEditingGoal] = useState(null) // name of goal being edited
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // ── Insights state ───────────────────────────────────────────────────
  const [insightsCache, setInsightsCache] = useState({}) // { [goalName]: { supporting, missing, summary } }
  const [loadingInsights, setLoadingInsights] = useState(null) // goalName currently loading
  const [insightsOpen, setInsightsOpen] = useState(null) // goalName currently expanded

  // ── Success fade timer ───────────────────────────────────────────────
  const successTimerRef = useRef(null)

  // ── Fetch profile on mount ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchProfile() {
      try {
        const res = await api.profile.get()
        if (!cancelled) {
          const primary = res?.data?.goals?.primary ?? res?.goals?.primary ?? []
          setGoals(Array.isArray(primary) ? primary : [])
        }
      } catch {
        if (!cancelled) setGoals([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProfile()
    return () => { cancelled = true }
  }, [])

  // ── Cleanup timers on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  // ── Interpret handler ────────────────────────────────────────────────
  async function handleInterpret(e) {
    e.preventDefault()
    const text = inputText.trim()
    if (!text) return

    setInterpreting(true)
    setInterpretError('')
    setInterpretedGoals(null)

    try {
      const res = await api.goals.interpret(text)
      // Expected response shape: { data: { goals: [{ emoji, name }] } }
      const extracted = res?.data?.goals ?? res?.goals ?? []
      setInterpretedGoals(Array.isArray(extracted) ? extracted : [])
    } catch (err) {
      setInterpretError(err.message ?? t('goalsSaveError'))
    } finally {
      setInterpreting(false)
    }
  }

  // ── Confirm save handler ─────────────────────────────────────────────
  async function handleConfirmSave() {
    if (!interpretedGoals || interpretedGoals.length === 0) return

    setSaving(true)
    setSaveError('')

    try {
      const existingNames = goals.map((g) => (typeof g === 'string' ? g : g.name))
      const newGoalObjects = interpretedGoals
        .filter((g) => !existingNames.includes(g.name))
        .map((g) => ({ name: g.name, emoji: g.emoji ?? '🎯', notes: '' }))
      const existingObjects = goals.map((g) => normaliseGoal(g))
      const merged = [...existingObjects, ...newGoalObjects]

      await api.profile.update({ goals: { primary: merged } })

      setGoals(merged)
      setInputText('')
      setInterpretedGoals(null)
      setSaveSuccess(true)

      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err.message ?? t('goalsSaveError'))
    } finally {
      setSaving(false)
    }
  }

  // ── Delete handler ───────────────────────────────────────────────────
  async function handleDeleteGoal(nameToRemove) {
    setDeleteError('')
    const updated = goals
      .filter((g) => {
        const n = typeof g === 'string' ? g : g.name
        return n !== nameToRemove
      })
      .map((g) => normaliseGoal(g))
    setGoals(updated)

    try {
      await api.profile.update({ goals: { primary: updated } })
    } catch (err) {
      // Rollback on failure
      setGoals(goals)
      setDeleteError(err.message ?? t('goalsDeleteError'))
    }
  }

  // ── Save note handler ────────────────────────────────────────────────
  async function handleSaveNote(goalName) {
    setSavingNote(true)
    const updatedGoals = goals.map((g) => {
      const norm = normaliseGoal(g)
      if (norm.name === goalName) return { ...norm, notes: noteDraft }
      return norm
    })

    try {
      await api.profile.update({ goals: { primary: updatedGoals } })
      setGoals(updatedGoals)
      setEditingGoal(null)
      setNoteDraft('')
    } catch (err) {
      setDeleteError(err.message ?? t('goalsSaveError'))
    } finally {
      setSavingNote(false)
    }
  }

  // ── Insights handler ─────────────────────────────────────────────────
  async function handleViewInsights(goalName, goalNotes) {
    if (insightsOpen === goalName) { setInsightsOpen(null); return }
    setInsightsOpen(goalName)
    if (insightsCache[goalName]) return
    setLoadingInsights(goalName)
    try {
      const res = await api.goals.insights({ goalName, goalNotes })
      const data = res?.data ?? res
      setInsightsCache(prev => ({ ...prev, [goalName]: data }))
    } catch {
      setInsightsCache(prev => ({ ...prev, [goalName]: { error: true } }))
    } finally {
      setLoadingInsights(null)
    }
  }

  // ── Normalise goal entry to { emoji, name, notes } ──────────────────
  function normaliseGoal(g) {
    if (typeof g === 'string') return { emoji: '🎯', name: g, notes: '' }
    return { emoji: g.emoji ?? '🎯', name: g.name ?? String(g), notes: g.notes ?? '' }
  }

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[760px] mx-auto">

      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] text-ink1 leading-none mb-1">
          {t('goalsPageTitle')}
        </h1>
        <p className="text-[13px] text-ink2">{t('goalsPageSubtitle')}</p>
      </div>

      {/* ── Current goals list ── */}
      {loading ? (
        <div className="flex flex-col gap-3 mb-6">
          <Skeleton className="h-[52px]" />
          <Skeleton className="h-[52px]" />
        </div>
      ) : goals.length === 0 ? (
        <div
          className="rounded-[14px] border border-[var(--color-border)] bg-white px-6 py-10 flex flex-col items-center text-center mb-6"
          role="status"
        >
          <div className="text-ink3 mb-3">
            <TargetIcon />
          </div>
          <p className="text-[14px] font-semibold text-ink1 mb-1">
            {t('goalsNoGoals')}
          </p>
          <p className="text-[13px] text-ink2 max-w-[280px]">
            {t('goalsNoGoalsHint')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {goals.map((raw) => {
            const { emoji, name, notes } = normaliseGoal(raw)
            const isEditing = editingGoal === name
            return (
              <div
                key={name}
                className="rounded-[14px] border border-[var(--color-border)] bg-white px-4 py-3"
              >
                {/* Name row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[20px] leading-none" aria-hidden="true">
                      {emoji}
                    </span>
                    <span className="text-[14px] font-semibold text-ink1">{name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(name)}
                    aria-label={`Remove goal: ${name}`}
                    className="text-ink3 hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
                  >
                    <TrashIcon />
                  </button>
                </div>

                {/* Notes section */}
                {isEditing ? (
                  <div className="mt-2 ml-[35px]">
                    <textarea
                      rows={2}
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder={t('goalsNotePlaceholder')}
                      className="w-full border border-[var(--color-border)] rounded-[10px] px-3 py-[10px] text-[13px] text-ink1 placeholder:text-ink3 outline-none focus:border-orange transition-colors bg-white resize-none mb-2"
                      autoFocus
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveNote(name)}
                        disabled={savingNote}
                        className="flex items-center gap-1.5 bg-orange text-white text-[12px] font-semibold rounded-[8px] px-3 py-[6px] hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
                      >
                        {savingNote && <Spinner />}
                        {savingNote ? t('goalsSavingNote') : t('goalsSaveNote')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingGoal(null); setNoteDraft('') }}
                        className="text-[12px] text-ink2 hover:text-ink1 transition-colors cursor-pointer"
                      >
                        {t('goalsCancelNote')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 ml-[35px]">
                    {notes ? (
                      <button
                        type="button"
                        onClick={() => { setEditingGoal(name); setNoteDraft(notes) }}
                        className="text-[13px] text-ink2 text-left hover:text-ink1 transition-colors cursor-pointer w-full"
                      >
                        {notes}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingGoal(name); setNoteDraft('') }}
                        className="text-[13px] text-ink3 hover:text-orange transition-colors cursor-pointer"
                      >
                        + {t('goalsAddNote')}
                      </button>
                    )}
                  </div>
                )}

                {/* See supplement insights trigger */}
                <div className="mt-2 ml-[35px]">
                  <button
                    type="button"
                    onClick={() => handleViewInsights(name, notes)}
                    className="text-[12px] text-orange hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-0 p-0"
                    aria-expanded={insightsOpen === name}
                    aria-controls={`insights-${name}`}
                  >
                    {t('goalsSeeInsights')} {insightsOpen === name ? '▴' : '▾'}
                  </button>
                </div>

                {/* Insights panel */}
                {insightsOpen === name && (
                  <div
                    id={`insights-${name}`}
                    className="border-t border-[var(--color-border)] mt-3 pt-3 ml-[35px]"
                  >
                    {loadingInsights === name ? (
                      <div>
                        <Skeleton className="h-[14px] w-3/4 mb-2" />
                        <Skeleton className="h-[14px] w-1/2 mb-2" />
                        <p className="text-[12px] text-ink3 mt-1">{t('goalsInsightsLoading')}</p>
                      </div>
                    ) : insightsCache[name]?.error ? (
                      <p className="text-[12px] text-[#C05A28]" role="alert">
                        {t('goalsInsightsError')}
                      </p>
                    ) : insightsCache[name] ? (
                      <div className="flex flex-col gap-3">
                        {/* Supporting supplements */}
                        <div>
                          <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-1.5">
                            {t('goalsInsightsSupporting')}
                          </p>
                          {insightsCache[name].supporting?.length > 0 ? (
                            <ul className="flex flex-col gap-1">
                              {insightsCache[name].supporting.map((item) => (
                                <li key={item.name} className="flex items-start gap-1.5">
                                  <span className="text-[12px] leading-[1.5]" aria-hidden="true">✅</span>
                                  <span className="text-[12px] font-medium text-ink1 leading-[1.5]">{item.name}</span>
                                  {item.reason && (
                                    <span className="text-[12px] text-ink2 leading-[1.5]">{item.reason}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[12px] text-ink2">{t('goalsInsightsNoneSupporting')}</p>
                          )}
                        </div>

                        {/* Consider adding */}
                        {insightsCache[name].missing?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-1.5">
                              {t('goalsInsightsMissing')}
                            </p>
                            <ul className="flex flex-col gap-1">
                              {insightsCache[name].missing.map((item) => (
                                <li key={item.name} className="flex items-start gap-1.5 flex-wrap">
                                  <span className="text-[12px] leading-[1.5]" aria-hidden="true">➕</span>
                                  <span className="text-[12px] font-medium text-ink1 leading-[1.5]">{item.name}</span>
                                  {item.reason && (
                                    <span className="text-[12px] text-ink2 leading-[1.5]">{item.reason}</span>
                                  )}
                                  <Link
                                    to="/cabinet"
                                    className="text-[12px] text-orange hover:opacity-80 transition-opacity leading-[1.5]"
                                  >
                                    {t('goalsAddToCabinet')}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* AI summary */}
                        {insightsCache[name].summary && (
                          <div>
                            <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-1">
                              {t('goalsInsightsSummary')}
                            </p>
                            <p className="text-[13px] text-ink2 italic leading-relaxed">
                              {insightsCache[name].summary}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Delete error ── */}
      {deleteError && (
        <p className="text-[12px] text-[#C05A28] mb-3" role="alert">
          {deleteError}
        </p>
      )}

      {/* ── Success toast ── */}
      {saveSuccess && (
        <p
          className="text-[13px] text-[#3D6B3D] font-semibold mb-4"
          role="status"
          aria-live="polite"
        >
          Goals saved successfully.
        </p>
      )}

      {/* ── Add a goal section ── */}
      <div className="mb-6">
        <p className="text-[13px] font-semibold text-ink2 uppercase tracking-wide mb-3">
          {t('goalsAddSectionHeader')}
        </p>

        <form onSubmit={handleInterpret}>
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('goalsInputPlaceholder')}
            className="w-full border border-[var(--color-border)] rounded-[10px] px-3 py-[10px] text-[13px] text-ink1 placeholder:text-ink3 outline-none focus:border-orange transition-colors bg-white resize-none mb-3"
          />

          {/* Interpret error */}
          {interpretError && (
            <p className="text-[12px] text-[#C05A28] mb-3" role="alert">
              {interpretError}
            </p>
          )}

          <button
            type="submit"
            disabled={interpreting || !inputText.trim()}
            className="flex items-center gap-2 bg-orange text-white text-[13px] font-semibold rounded-[10px] px-4 py-[10px] hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
          >
            {interpreting && <Spinner />}
            {interpreting ? t('goalsInterpreting') : t('goalsInterpretBtn')}
          </button>
        </form>
      </div>

      {/* ── AI interpretation result ── */}
      {interpretedGoals !== null && (
        <div className="rounded-[14px] border border-[#C5D8C5] bg-[#F0F7F0] px-5 py-4 mb-6">
          <p className="text-[13px] font-semibold text-[#3D6B3D] mb-3">
            {t('goalsInterpretedTitle')}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {interpretedGoals.length === 0 ? (
              <p className="text-[13px] text-ink2">No goals could be extracted. Try rephrasing.</p>
            ) : (
              interpretedGoals.map((g) => (
                <span
                  key={g.name}
                  className="inline-flex items-center gap-1.5 bg-white border border-[var(--color-border)] rounded-full px-3 py-1 text-[13px] font-medium text-ink1"
                >
                  <span aria-hidden="true">{g.emoji}</span>
                  {g.name}
                </span>
              ))
            )}
          </div>

          {/* Save error */}
          {saveError && (
            <p className="text-[12px] text-[#C05A28] mb-3" role="alert">
              {saveError}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={saving || interpretedGoals.length === 0}
              className="flex items-center gap-2 bg-orange text-white text-[13px] font-semibold rounded-[10px] px-4 py-[9px] hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
            >
              {saving && <Spinner />}
              {saving ? t('goalsSaving') : t('goalsConfirmBtn')}
            </button>

            <button
              type="button"
              onClick={() => {
                setInterpretedGoals(null)
                setInterpretError('')
                setSaveError('')
              }}
              className="text-[13px] font-semibold text-ink2 hover:text-ink1 transition-colors cursor-pointer"
            >
              {t('goalsTryAgainBtn')}
            </button>
          </div>
        </div>
      )}

      {/* ── Recommendations CTA (only when goals exist) ── */}
      {goals.length > 0 && (
        <Link
          to="/stack-builder"
          className="block rounded-[14px] border border-[var(--color-border)] bg-white px-4 py-3 text-[13px] font-medium text-orange hover:opacity-80 transition-opacity"
        >
          {t('goalsRecommendationsCta')}
        </Link>
      )}

    </div>
  )
}
