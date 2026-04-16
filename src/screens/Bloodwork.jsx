import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { useAiUsage } from '../context/AiUsageContext'

const COMMON_MARKERS = [
  { name: 'Vitamin D', unit: 'ng/mL', refLow: 30, refHigh: 100 },
  { name: 'Vitamin B12', unit: 'pg/mL', refLow: 200, refHigh: 900 },
  { name: 'Iron', unit: 'mcg/dL', refLow: 60, refHigh: 170 },
  { name: 'Ferritin', unit: 'ng/mL', refLow: 12, refHigh: 150 },
  { name: 'TSH', unit: 'mIU/L', refLow: 0.4, refHigh: 4.0 },
  { name: 'Fasting Glucose', unit: 'mg/dL', refLow: 70, refHigh: 99 },
  { name: 'HbA1c', unit: '%', refLow: 4.0, refHigh: 5.6 },
  { name: 'Total Cholesterol', unit: 'mg/dL', refLow: 0, refHigh: 200 },
  { name: 'LDL', unit: 'mg/dL', refLow: 0, refHigh: 100 },
  { name: 'HDL', unit: 'mg/dL', refLow: 40, refHigh: 200 },
  { name: 'Triglycerides', unit: 'mg/dL', refLow: 0, refHigh: 150 },
  { name: 'CRP', unit: 'mg/L', refLow: 0, refHigh: 1.0 },
  { name: 'Magnesium', unit: 'mg/dL', refLow: 1.7, refHigh: 2.2 },
  { name: 'Zinc', unit: 'mcg/dL', refLow: 60, refHigh: 120 },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getStatus(value, refLow, refHigh) {
  if (value === '' || value === null || value === undefined) return 'unknown'
  const v = parseFloat(value)
  if (isNaN(v)) return 'unknown'
  if (refLow != null && v < refLow) return 'low'
  if (refHigh != null && v > refHigh) return 'high'
  return 'normal'
}

function StatusBadge({ status }) {
  const { t } = useLanguage()
  if (status === 'normal') return (
    <span className="px-2 py-[2px] rounded-full text-[10px] font-medium bg-[#E8F0E8] text-[#3D6B3D]">{t('bloodworkInRange')}</span>
  )
  if (status === 'low') return (
    <span className="px-2 py-[2px] rounded-full text-[10px] font-medium bg-[#FDE8DE] text-[#C05A28]">{t('bloodworkBelow')}</span>
  )
  if (status === 'high') return (
    <span className="px-2 py-[2px] rounded-full text-[10px] font-medium bg-[#FDE8DE] text-[#C05A28]">{t('bloodworkAbove')}</span>
  )
  return null
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-[10px] bg-sand ${className}`} aria-hidden />
}

export default function Bloodwork() {
  const { t } = useLanguage()
  const { showUsage } = useAiUsage()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [interpretation, setInterpretation] = useState(null)
  const [interpreting, setInterpreting] = useState(false)

  // Form state
  const [formDate, setFormDate] = useState(todayStr())
  const [pendingMarkers, setPendingMarkers] = useState([])
  const [customMarker, setCustomMarker] = useState('')
  const [customUnit, setCustomUnit] = useState('')
  const [customValue, setCustomValue] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.bloodwork.list()
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
    load()
    return () => { cancelled = true }
  }, [])

  function addCommonMarker(m) {
    if (pendingMarkers.find((p) => p.name === m.name)) return
    setPendingMarkers((prev) => [...prev, { ...m, value: '' }])
  }

  function addCustomMarker() {
    const name = customMarker.trim()
    const unit = customUnit.trim()
    if (!name || !unit) return
    if (pendingMarkers.find((p) => p.name === name)) return
    setPendingMarkers((prev) => [...prev, { name, unit, value: '', refLow: null, refHigh: null }])
    setCustomMarker('')
    setCustomUnit('')
  }

  function updatePending(name, value) {
    setPendingMarkers((prev) =>
      prev.map((p) => (p.name === name ? { ...p, value } : p))
    )
  }

  function removePending(name) {
    setPendingMarkers((prev) => prev.filter((p) => p.name !== name))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const toLog = pendingMarkers.filter((p) => p.value !== '' && !isNaN(parseFloat(p.value)))
    if (toLog.length === 0) return

    setSubmitting(true)
    try {
      const results = []
      for (const m of toLog) {
        const body = {
          date: formDate,
          marker: m.name,
          value: parseFloat(m.value),
          unit: m.unit,
          ...(m.refLow != null ? { refLow: m.refLow } : {}),
          ...(m.refHigh != null ? { refHigh: m.refHigh } : {}),
        }
        const res = await api.bloodwork.create(body)
        const created = res?.data ?? res
        results.push(created)
      }
      setEntries((prev) => [...results, ...prev])
      setPendingMarkers([])
    } catch {
      // silently degrade
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInterpret() {
    setInterpreting(true)
    setInterpretation(null)
    try {
      const res = await api.bloodwork.interpret({})
      const d = res?.data ?? res
      setInterpretation(d)
      if (d?.aiUsage) showUsage(d.aiUsage, 'bloodwork-interpret')
    } catch {
      setInterpretation({ error: true })
    } finally {
      setInterpreting(false)
    }
  }

  // Group entries by date
  const grouped = entries.reduce((acc, e) => {
    const d = e.date || e.createdAt?.slice(0, 10) || '—'
    if (!acc[d]) acc[d] = []
    acc[d].push(e)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="px-5 py-6 md:px-8 md:py-7 max-w-[760px]">

      {/* Header */}
      <h1 className="font-display text-[28px] text-ink1 mb-1">{t('bloodworkTitle')}</h1>
      <p className="text-[14px] text-ink3 mb-7">{t('bloodworkSub')}</p>

      {/* ── Log form ── */}
      <div className="rounded-[14px] border border-border bg-white px-5 py-5 mb-5">
        <p className="text-[14px] font-semibold text-ink1 mb-4">{t('bloodworkLogNew')}</p>

        {/* Date */}
        <div className="mb-4">
          <label className="block text-[12px] font-medium text-ink3 mb-1">{t('bloodworkTestDate')}</label>
          <input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            className="border border-border rounded-[8px] px-3 py-[8px] text-[13px] text-ink1 focus:outline-none focus:ring-2 focus:ring-orange/50"
          />
        </div>

        {/* Common markers */}
        <div className="mb-4">
          <p className="text-[12px] font-medium text-ink3 mb-2">{t('bloodworkQuickAdd')}</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_MARKERS.map((m) => {
              const added = pendingMarkers.some((p) => p.name === m.name)
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => addCommonMarker(m)}
                  className={`px-3 py-[6px] rounded-full text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
                    added
                      ? 'bg-orange text-white'
                      : 'bg-sand text-ink2 hover:bg-orange/10 hover:text-orange'
                  }`}
                >
                  {m.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom marker */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={customMarker}
            onChange={(e) => setCustomMarker(e.target.value)}
            placeholder={t('bloodworkCustomMarker')}
            className="flex-1 border border-border rounded-[8px] px-3 py-[8px] text-[13px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50"
          />
          <input
            type="text"
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            placeholder={t('bloodworkUnit')}
            className="w-[80px] border border-border rounded-[8px] px-3 py-[8px] text-[13px] text-ink1 placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-orange/50"
          />
          <button
            type="button"
            onClick={addCustomMarker}
            className="px-3 py-[8px] rounded-[8px] bg-sand text-ink2 text-[13px] font-medium hover:bg-orange/10 hover:text-orange transition-colors focus:outline-none"
          >
            {t('bloodworkAdd')}
          </button>
        </div>

        {/* Pending markers — value inputs */}
        {pendingMarkers.length > 0 && (
          <form onSubmit={handleSubmit}>
            <div className="border border-border rounded-[10px] overflow-hidden mb-4">
              {pendingMarkers.map((m, i) => (
                <div
                  key={m.name}
                  className={`flex items-center gap-3 px-4 py-3 ${i < pendingMarkers.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink1 truncate">{m.name}</p>
                    <p className="text-[11px] text-ink3">{m.unit}</p>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={m.value}
                    onChange={(e) => updatePending(m.name, e.target.value)}
                    placeholder={t('bloodworkValue')}
                    className="w-[90px] border border-border rounded-[8px] px-3 py-[6px] text-[13px] text-ink1 text-right focus:outline-none focus:ring-2 focus:ring-orange/50"
                  />
                  {m.value !== '' && (
                    <StatusBadge status={getStatus(m.value, m.refLow, m.refHigh)} />
                  )}
                  <button
                    type="button"
                    onClick={() => removePending(m.name)}
                    aria-label={`Remove ${m.name}`}
                    className="w-7 h-7 flex items-center justify-center rounded-[6px] text-ink3 hover:bg-[#FDE8DE] hover:text-[#C05A28] transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={submitting || pendingMarkers.every((p) => p.value === '')}
              className="px-5 py-[9px] rounded-[10px] bg-orange text-white text-[13px] font-medium hover:bg-orange/90 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
            >
              {submitting ? t('bloodworkSaving') : t('bloodworkLogResults')}
            </button>
          </form>
        )}
      </div>

      {/* ── AI interpretation ── */}
      {entries.length > 0 && (
        <div className="mb-5">
          <button
            onClick={handleInterpret}
            disabled={interpreting}
            className="flex items-center gap-2 px-4 py-[9px] rounded-[10px] border border-orange text-orange text-[13px] font-medium hover:bg-orange/5 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            {interpreting ? t('bloodworkAnalysing') : t('bloodworkGetAI')}
          </button>

          {interpretation && !interpretation.error && (
            <div className="mt-3 rounded-[14px] border border-orange/20 bg-orange/5 px-5 py-4">
              {interpretation.overall_summary && (
                <p className="text-[14px] text-ink1 mb-3">{interpretation.overall_summary}</p>
              )}
              {Array.isArray(interpretation.interpretations) && interpretation.interpretations.map((item, i) => (
                <div key={i} className={`${i < interpretation.interpretations.length - 1 ? 'mb-3 pb-3 border-b border-orange/10' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-ink1">{item.marker}</span>
                    {item.status && (
                      <span className={`px-2 py-[2px] rounded-full text-[10px] font-medium ${
                        item.status === 'normal' ? 'bg-[#E8F0E8] text-[#3D6B3D]' :
                        item.status === 'low' ? 'bg-[#FDE8DE] text-[#C05A28]' :
                        'bg-[#FDE8DE] text-[#C05A28]'
                      }`}>{item.status}</span>
                    )}
                  </div>
                  {item.note && <p className="text-[13px] text-ink2">{item.note}</p>}
                  {item.supplement_note && <p className="text-[12px] text-ink3 mt-1">{item.supplement_note}</p>}
                </div>
              ))}
            </div>
          )}
          {interpretation?.error && (
            <p className="mt-2 text-[13px] text-[#C05A28]">{t('bloodworkInterpretFailed')}</p>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <>
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[15px] text-ink2 font-medium mb-1">{t('bloodworkEmpty')}</p>
            <p className="text-[13px] text-ink3">{t('bloodworkEmptySub')}</p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="rounded-[14px] border border-border bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-sand">
                <p className="text-[13px] font-semibold text-ink1">{date}</p>
                <p className="text-[11px] text-ink3">{grouped[date].length} {grouped[date].length !== 1 ? t('bloodworkMarkers') : t('bloodworkMarker')}</p>
              </div>
              <div className="divide-y divide-border">
                {grouped[date].map((entry) => {
                  const status = getStatus(entry.value, entry.refLow, entry.refHigh)
                  return (
                    <div key={entry._id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink1">{entry.marker}</p>
                        <p className="text-[12px] text-ink3">
                          {entry.value} {entry.unit}
                          {entry.refLow != null && entry.refHigh != null && (
                            <span className="ml-1">(ref: {entry.refLow}–{entry.refHigh})</span>
                          )}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
