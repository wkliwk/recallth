import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const MOODS = [
  { value: 1, emoji: '😞' },
  { value: 2, emoji: '😟' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😄' },
]

function relativeTime(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin || 1} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  return `${diffDay} days ago`
}

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-gray-100 ${className}`}
      aria-hidden="true"
    />
  )
}

function EnergyDots({ value, onChange }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Energy level">
      {[1, 2, 3, 4, 5].map((dot) => (
        <button
          key={dot}
          type="button"
          onClick={() => onChange && onChange(dot)}
          aria-label={`Energy ${dot}`}
          className={`w-4 h-4 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
            dot <= value ? 'bg-orange' : 'bg-gray-200'
          } ${onChange ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        />
      ))}
    </div>
  )
}

function EntryForm({ initial, submitting, onSubmit, onCancel, submitLabel }) {
  const [mood, setMood] = useState(initial?.mood ?? 3)
  const [energy, setEnergy] = useState(initial?.energy ?? 3)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ mood, energy, notes })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Mood */}
      <div>
        <p className="text-[13px] font-medium text-ink2 mb-2">Mood</p>
        <div className="flex items-center gap-3" role="group" aria-label="Mood">
          {MOODS.map(({ value, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMood(value)}
              aria-label={`Mood ${value}`}
              aria-pressed={mood === value}
              className={`text-[24px] w-10 h-10 flex items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
                mood === value
                  ? 'ring-2 ring-orange bg-orange/10'
                  : 'hover:bg-sand'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div>
        <p className="text-[13px] font-medium text-ink2 mb-2">Energy</p>
        <EnergyDots value={energy} onChange={setEnergy} />
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="How are you feeling?"
        rows={3}
        className="w-full border border-border rounded-[10px] px-3 py-[10px] text-[14px] text-ink1 placeholder:text-ink3 resize-none focus:outline-none focus:ring-2 focus:ring-orange/50"
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-[9px] rounded-[10px] bg-orange text-white text-[13px] font-medium hover:bg-orange/90 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-[9px] rounded-[10px] border border-border text-ink2 text-[13px] font-medium hover:bg-sand transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default function Journal() {
  const { t } = useLanguage()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchEntries() {
      try {
        const res = await api.journal.list()
        if (!cancelled) {
          const data = res?.data ?? res ?? []
          setEntries(Array.isArray(data) ? data : [])
        }
      } catch {
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchEntries()
    return () => { cancelled = true }
  }, [])

  async function handleCreate(formData) {
    setSubmitting(true)
    try {
      const res = await api.journal.create(formData)
      const created = res?.data ?? res
      setEntries((prev) => [created, ...prev])
    } catch {
      // silently degrade — could add toast here
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(entry) {
    setEditingId(entry._id)
    setEditDraft({ mood: entry.mood, energy: entry.energy, notes: entry.notes ?? '' })
  }

  async function handleUpdate(id, formData) {
    setSubmitting(true)
    try {
      const res = await api.journal.update(id, formData)
      const updated = res?.data ?? res
      setEntries((prev) =>
        prev.map((e) => (e._id === id ? { ...e, ...updated } : e))
      )
      setEditingId(null)
    } catch {
      // silently degrade
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    try {
      await api.journal.remove(id)
      setEntries((prev) => prev.filter((e) => e._id !== id))
    } catch {
      // silently degrade
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const moodEmoji = (value) => MOODS.find((m) => m.value === value)?.emoji ?? '😐'

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[760px]">

      {/* ── Page header ── */}
      <h1 className="font-display text-[28px] text-ink1 mb-1">Journal</h1>
      <p className="text-[14px] text-ink3 mb-7">Track how you feel each day</p>

      {/* ── Log-today form ── */}
      <div className="rounded-[14px] border border-border bg-white px-5 py-5 mb-7">
        <p className="text-[14px] font-semibold text-ink1 mb-4">Log today</p>
        <EntryForm
          initial={null}
          submitting={submitting}
          onSubmit={handleCreate}
          submitLabel="Log Entry"
        />
      </div>

      {/* ── Entry list ── */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <>
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
          </>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[15px] text-ink2 font-medium mb-1">No entries yet</p>
            <p className="text-[13px] text-ink3">Log your first entry above to get started</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry._id} className="rounded-[14px] border border-border bg-white px-5 py-4">
              {editingId === entry._id ? (
                <div>
                  <p className="text-[12px] text-ink3 mb-3">{relativeTime(entry.createdAt)}</p>
                  <EntryForm
                    initial={editDraft}
                    submitting={submitting}
                    onSubmit={(data) => handleUpdate(entry._id, data)}
                    onCancel={() => setEditingId(null)}
                    submitLabel="Save"
                  />
                </div>
              ) : (
                <div>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[24px]" aria-label={`Mood: ${entry.mood}`}>{moodEmoji(entry.mood)}</span>
                      <div>
                        <p className="text-[12px] text-ink3">{relativeTime(entry.createdAt)}</p>
                        <div className="mt-1">
                          <EnergyDots value={entry.energy ?? 0} onChange={null} />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(entry)}
                        aria-label="Edit entry"
                        className="w-8 h-8 flex items-center justify-center rounded-[8px] text-ink3 hover:bg-sand hover:text-ink1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(entry._id)}
                        aria-label="Delete entry"
                        className="w-8 h-8 flex items-center justify-center rounded-[8px] text-ink3 hover:bg-red-50 hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  {entry.notes && (
                    <p className="text-[13px] text-ink2 line-clamp-2">{entry.notes}</p>
                  )}

                  {/* Inline delete confirm */}
                  {confirmDeleteId === entry._id && (
                    <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border">
                      <p className="text-[13px] text-ink2 flex-1">Delete this entry?</p>
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="px-4 py-[6px] rounded-[8px] bg-red-500 text-white text-[12px] font-medium hover:bg-red-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-4 py-[6px] rounded-[8px] border border-border text-ink2 text-[12px] font-medium hover:bg-sand transition-colors focus:outline-none"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  )
}
