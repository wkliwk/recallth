import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TIMEZONES = [
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Asia/Taipei',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Vancouver',
  'America/Toronto',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'UTC',
]

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-gray-100 ${className}`}
      aria-hidden="true"
    />
  )
}

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-[160px]" />
      <Skeleton className="h-[120px]" />
      <Skeleton className="h-[90px]" />
    </div>
  )
}

// ── Trash icon ────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
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

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, id }) {
  return (
    <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
      <input
        id={id}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-checked={checked}
      />
      <div
        className={`w-10 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-orange' : 'bg-gray-200'
        }`}
      />
      <div
        className={`absolute left-[3px] top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </label>
  )
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children }) {
  return (
    <div className="rounded-[14px] border border-border bg-white overflow-hidden">
      {children}
    </div>
  )
}

function CardHeader({ title, saved }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <h2 className="text-[14px] font-semibold text-ink1">{title}</h2>
      {saved && (
        <span className="text-[12px] text-[#059669] font-medium" role="status" aria-live="polite">
          Saved
        </span>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Notifications() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Settings state
  const [reminderTimes, setReminderTimes] = useState([])
  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestDay, setDigestDay] = useState('Monday')
  const [timezone, setTimezone] = useState('Asia/Hong_Kong')

  // "Saved" flash state per section
  const [savedReminders, setSavedReminders] = useState(false)
  const [savedDigest, setSavedDigest] = useState(false)
  const [savedTimezone, setSavedTimezone] = useState(false)

  // Debounce timer refs
  const reminderTimerRef = useRef(null)
  const digestTimerRef = useRef(null)
  const timezoneTimerRef = useRef(null)

  // ── Load settings on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchSettings() {
      try {
        const res = await api.settings.get()
        if (cancelled) return
        const data = res?.data ?? res ?? {}
        setReminderTimes(Array.isArray(data.reminderTimes) ? data.reminderTimes : [])
        setDigestEnabled(data.digestEnabled ?? false)
        setDigestDay(data.digestDay ?? 'Monday')
        setTimezone(data.timezone ?? 'Asia/Hong_Kong')
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSettings()
    return () => { cancelled = true }
  }, [])

  // ── Debounced save helpers ──────────────────────────────────────────────────

  function flashSaved(setFn) {
    setFn(true)
    setTimeout(() => setFn(false), 2000)
  }

  const scheduleSaveReminders = useCallback((times) => {
    clearTimeout(reminderTimerRef.current)
    reminderTimerRef.current = setTimeout(async () => {
      try {
        await api.settings.update({ reminderTimes: times })
        flashSaved(setSavedReminders)
      } catch {
        // silently degrade — user can refresh
      }
    }, 800)
  }, [])

  const scheduleSaveDigest = useCallback((enabled, day) => {
    clearTimeout(digestTimerRef.current)
    digestTimerRef.current = setTimeout(async () => {
      try {
        await api.settings.update({ digestEnabled: enabled, digestDay: day })
        flashSaved(setSavedDigest)
      } catch {
        // silently degrade
      }
    }, 800)
  }, [])

  const scheduleSaveTimezone = useCallback((tz) => {
    clearTimeout(timezoneTimerRef.current)
    timezoneTimerRef.current = setTimeout(async () => {
      try {
        await api.settings.update({ timezone: tz })
        flashSaved(setSavedTimezone)
      } catch {
        // silently degrade
      }
    }, 800)
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(reminderTimerRef.current)
      clearTimeout(digestTimerRef.current)
      clearTimeout(timezoneTimerRef.current)
    }
  }, [])

  // ── Reminder handlers ───────────────────────────────────────────────────────

  function handleTimeChange(index, value) {
    const updated = reminderTimes.map((t, i) => (i === index ? value : t))
    setReminderTimes(updated)
    scheduleSaveReminders(updated)
  }

  function handleAddReminder() {
    if (reminderTimes.length >= 5) return
    const updated = [...reminderTimes, '08:00']
    setReminderTimes(updated)
    scheduleSaveReminders(updated)
  }

  function handleRemoveReminder(index) {
    const updated = reminderTimes.filter((_, i) => i !== index)
    setReminderTimes(updated)
    scheduleSaveReminders(updated)
  }

  // ── Digest handlers ─────────────────────────────────────────────────────────

  function handleDigestToggle(enabled) {
    setDigestEnabled(enabled)
    scheduleSaveDigest(enabled, digestDay)
  }

  function handleDigestDayChange(day) {
    setDigestDay(day)
    scheduleSaveDigest(digestEnabled, day)
  }

  // ── Timezone handler ────────────────────────────────────────────────────────

  function handleTimezoneChange(e) {
    const tz = e.target.value
    setTimezone(tz)
    scheduleSaveTimezone(tz)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[760px]">
      <h1 className="font-display text-[28px] text-ink1 mb-1">Notifications</h1>
      <p className="text-[14px] text-ink2 mb-7">Manage reminders, digests and your timezone.</p>

      {loading ? (
        <SkeletonCards />
      ) : error ? (
        <div className="rounded-[14px] border border-border bg-white px-6 py-8 text-center">
          <p className="text-[14px] text-ink2">Could not load settings — try refreshing</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">

          {/* ── Section 1: Daily supplement reminders ── */}
          <Card>
            <CardHeader title="Daily supplement reminders" saved={savedReminders} />
            <div className="px-5 py-4 flex flex-col gap-3">
              {reminderTimes.length === 0 && (
                <p className="text-[13px] text-ink3">No reminders set. Add one below.</p>
              )}
              {reminderTimes.map((time, index) => (
                <div key={index} className="flex items-center gap-3">
                  <label className="sr-only" htmlFor={`reminder-time-${index}`}>
                    Reminder {index + 1}
                  </label>
                  <input
                    id={`reminder-time-${index}`}
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(index, e.target.value)}
                    className="flex-1 rounded-[10px] border border-border bg-page px-3 py-[9px] text-[14px] text-ink1 focus:outline-none focus:ring-2 focus:ring-orange/30"
                  />
                  <button
                    onClick={() => handleRemoveReminder(index)}
                    className="w-9 h-9 flex items-center justify-center rounded-[10px] text-ink3 hover:text-[#E11D48] hover:bg-red-50 transition-colors cursor-pointer"
                    aria-label={`Remove reminder ${index + 1}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}

              {reminderTimes.length < 5 && (
                <button
                  onClick={handleAddReminder}
                  className="mt-1 inline-flex items-center gap-2 text-[13px] font-medium text-orange hover:text-orange/80 transition-colors cursor-pointer"
                  aria-label="Add reminder time"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add reminder
                </button>
              )}
            </div>
          </Card>

          {/* ── Section 2: Weekly digest ── */}
          <Card>
            <CardHeader title="Weekly digest email" saved={savedDigest} />
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] text-ink1 font-medium">Email digest</p>
                  <p className="text-[12px] text-ink3">Receive a weekly summary of your supplement activity</p>
                </div>
                <Toggle
                  id="digest-toggle"
                  checked={digestEnabled}
                  onChange={handleDigestToggle}
                />
              </div>

              {digestEnabled && (
                <div>
                  <p className="text-[12px] font-medium text-ink2 mb-2">Send on</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Select digest day">
                    {DAYS.map((day, i) => (
                      <button
                        key={day}
                        onClick={() => handleDigestDayChange(day)}
                        className={`px-3 py-[7px] rounded-[8px] text-[12px] font-medium border transition-colors cursor-pointer ${
                          digestDay === day
                            ? 'bg-orange text-white border-orange'
                            : 'bg-page text-ink2 border-border hover:border-orange/50 hover:text-orange'
                        }`}
                        aria-pressed={digestDay === day}
                      >
                        {DAY_LABELS[i]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* ── Section 3: Timezone ── */}
          <Card>
            <CardHeader title="Timezone" saved={savedTimezone} />
            <div className="px-5 py-4">
              <label htmlFor="timezone-select" className="sr-only">
                Select timezone
              </label>
              <select
                id="timezone-select"
                value={timezone}
                onChange={handleTimezoneChange}
                className="w-full rounded-[10px] border border-border bg-page px-3 py-[9px] text-[14px] text-ink1 focus:outline-none focus:ring-2 focus:ring-orange/30 cursor-pointer"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </Card>

        </div>
      )}
    </div>
  )
}
