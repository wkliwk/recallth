import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { useAiUsage } from '../context/AiUsageContext'
import { imageFileToBase64, scanResultToForm } from '../utils/labelScan'
import {
  MAX_BATCH,
  findMatch,
  similarity,
  itemFingerprint,
  buildUpdatePayload,
  rowErrors,
  buildCreatePayload,
  runPool,
  createLimiter,
  hasMissing,
  mergeFound,
} from '../utils/batchScan'
import { lookupMissingDetails, lookupFromUrl } from '../utils/dosageLookup'
import PasteLinkFill from './PasteLinkFill'
import DoseInput from './DoseInput'
import { isStructured, applyDose } from '../utils/dose'

const TYPE_OPTIONS = ['supplement', 'medication', 'vitamin']

const inputClass =
  'w-full bg-page border-[1.5px] border-border rounded-[10px] px-3 py-[7px] text-[13px] text-ink1 outline-none focus:border-orange transition-colors'
// Swap (not stack) the base bg/border so state colours actually apply.
const errorInputClass = inputClass.replace('bg-page', 'bg-[#FDF1EA]').replace('border-border', 'border-[#C05A28]')
const webClass = inputClass.replace('bg-page', 'bg-[#EEF4FC]').replace('border-border', 'border-[#7BA3D6]')

/**
 * Batch label scan. `files` is already limited to MAX_BATCH by the caller.
 * `existingItems` are the items currently in the cabinet (for duplicate marking and overwrite).
 */
export default function BatchScanModal({ files, truncated, existingItems = [], onClose, onSaved }) {
  const { t } = useLanguage()
  const { showUsage } = useAiUsage()
  const [rows, setRows] = useState(() =>
    files.map((file, i) => ({
      id: i,
      file,
      scanStatus: 'scanning', // scanning | done | failed
      scanError: '',
      form: { name: '', type: 'supplement', dosage: '', brand: '', ingredients: '', imageUrl: '' },
      photoThumb: '', // small data-URL thumbnail of the user's own photo
      include: false,
      dup: false,
      lookupStatus: 'idle', // idle | looking | none | failed
      webFields: {}, // fields filled from the web, shown highlighted
      webDirections: '', // directions text a web-found per-dose count came from
      webSource: '', // page the directions came from (photo-based lookup)
      photo: null, // { imageBase64, mimeType } of this label, for the photo-based lookup
      linkBusy: false,
      saveStatus: 'idle', // idle | saving | saved | error
      saveError: '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(null) // { choices: { [rowId]: 'new' | 'overwrite' } } | null
  const startedRef = useRef(false)
  const lookupLimiter = useRef(createLimiter(2))

  function patchRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function scanOne(row) {
    patchRow(row.id, { scanStatus: 'scanning', scanError: '' })
    try {
      const { imageBase64, mimeType, thumbnail } = await imageFileToBase64(row.file)
      const res = await api.cabinet.scan(imageBase64, mimeType)
      if (!res.success || !res.data) throw new Error(res.error || t('scanLabelError'))
      const form = { ingredients: '', imageUrl: '', ...scanResultToForm(res.data) }
      const dup = Boolean(findMatch(form, existingItems))
      patchRow(row.id, {
        scanStatus: 'done',
        photoThumb: thumbnail || '',
        photo: { imageBase64, mimeType },
        form,
        dup,
        include: !dup,
      })
      if (res.aiUsage) showUsage(res.aiUsage, 'label-scan', { input: row.file.name, output: form.name })
    } catch (err) {
      patchRow(row.id, { scanStatus: 'failed', scanError: err.message || t('scanLabelError') })
    }
  }

  // Search online for fields the label scan could not read. Only empty fields are filled.
  async function fillMissing(rowId, form) {
    patchRow(rowId, { lookupStatus: 'looking' })
    try {
      const photo = rows.find((r) => r.id === rowId)?.photo
      const found = await lookupLimiter.current(() => lookupMissingDetails(form, showUsage, photo))
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r
          const { form: merged, filled, directions, source } = mergeFound(r.form, found)
          const webFields = { ...r.webFields }
          filled.forEach((f) => { webFields[f] = true })
          if (filled.includes('servingUnits')) webFields.dosage = true
          return { ...r, form: merged, webFields, webDirections: directions || r.webDirections, webSource: directions ? source || '' : r.webSource, lookupStatus: found ? (filled.length > 0 ? 'idle' : 'nothing') : 'none' }
        })
      )
    } catch {
      patchRow(rowId, { lookupStatus: 'failed' })
    }
  }

  // Fallback: fill empty fields from a product page the user pasted. Throws on failure.
  async function fillFromLink(rowId, url) {
    const current = rows.find((r) => r.id === rowId)
    const found = await lookupLimiter.current(() => lookupFromUrl(url, showUsage, current.form))
    const willFill = mergeFound(current.form, found).filled
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        const { form: merged, filled, directions } = mergeFound(r.form, found)
        const webFields = { ...r.webFields }
        filled.forEach((f) => { webFields[f] = true })
        if (filled.includes('servingUnits')) webFields.dosage = true
        return { ...r, form: merged, webFields, webDirections: directions || r.webDirections, lookupStatus: filled.length ? 'idle' : r.lookupStatus }
      })
    )
    return willFill.length ? 'filled' : 'nothing'
  }

  function fillAllMissing() {
    rows
      .filter((r) => r.scanStatus === 'done' && r.saveStatus !== 'saved' && r.lookupStatus !== 'looking' && r.form.name.trim() && hasMissing(r.form))
      .forEach((r) => fillMissing(r.id, r.form))
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    runPool(rows, scanOne)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateForm(id, field, value) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const form = { ...r.form, [field]: value }
        return {
          ...r,
          form,
          webFields: { ...r.webFields, [field]: false },
        }
      })
    )
  }

  // Structured dosage: patch strength/unit/count and recompute the Dosage string.
  function updateDose(id, patch) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const form = applyDose({ ...r.form, ...patch })
        const edited = 'servingUnits' in patch || 'unitForm' in patch
        return {
          ...r,
          form,
          webFields: edited ? { ...r.webFields, servingUnits: false, dosage: false } : r.webFields,
          webDirections: edited ? '' : r.webDirections,
          webSource: edited ? '' : r.webSource,
        }
      })
    )
  }

  const scanning = rows.some((r) => r.scanStatus === 'scanning')
  const looking = rows.some((r) => r.lookupStatus === 'looking' || r.linkBusy)
  const fillableCount = rows.filter(
    (r) => r.scanStatus === 'done' && r.saveStatus !== 'saved' && r.lookupStatus !== 'looking' && r.form.name.trim() && hasMissing(r.form)
  ).length
  const pending = rows.filter((r) => r.scanStatus === 'done' && r.include && r.saveStatus !== 'saved')
  const hasInvalid = pending.some((r) => Object.keys(rowErrors(r.form)).length > 0)
  const savedCount = rows.filter((r) => r.saveStatus === 'saved').length
  const allSettled = !scanning && pending.length === 0
  const canSave = !scanning && !looking && !saving && pending.length > 0 && !hasInvalid

  // Duplicate info for a row, derived live (so name edits re-evaluate it):
  //  - 'existing': exact/similar match with a saved item
  //  - 'batch': repeat of an earlier row in this same batch
  function matchInfo(row, index) {
    if (row.scanStatus !== 'done' || !row.form.name.trim()) return null
    const found = findMatch(row.form, existingItems)
    if (found) return { source: 'existing', kind: found.kind, item: found.item }
    for (let j = 0; j < index; j++) {
      const other = rows[j]
      if (other.scanStatus !== 'done' || !other.form.name.trim()) continue
      const kind = similarity(itemFingerprint(row.form), itemFingerprint(other.form))
      if (kind) return { source: 'batch', kind, other: j + 1 }
    }
    return null
  }

  // A repeat within the batch is unchecked the first time it is detected (never again, so a later tick sticks).
  const flaggedRef = useRef(new Set())
  useEffect(() => {
    rows.forEach((r, i) => {
      if (flaggedRef.current.has(r.id)) return
      const info = matchInfo(r, i)
      if (!info) return
      flaggedRef.current.add(r.id)
      if (info.source === 'batch') patchRow(r.id, { include: false })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  // Pressing "Add N": if an included row matches an item already in the cabinet, ask first.
  function handleSaveAll() {
    const dups = pending.filter((r) => matchInfo(r, rows.indexOf(r))?.source === 'existing')
    if (dups.length > 0) {
      setConfirming({ choices: Object.fromEntries(dups.map((r) => [r.id, 'new'])) }) // default: non-destructive
      return
    }
    saveRows({})
  }

  async function saveRows(choices) {
    setConfirming(null)
    setSaving(true)
    for (const row of pending) {
      patchRow(row.id, { saveStatus: 'saving', saveError: '' })
      try {
        const existing = choices[row.id] === 'overwrite' ? findMatch(row.form, existingItems)?.item : null
        if (existing) {
          await api.cabinet.update(existing._id, buildUpdatePayload(row.form, row.photoThumb, existing))
          patchRow(row.id, { saveStatus: 'saved', savedAs: 'updated' })
        } else {
          await api.cabinet.create(buildCreatePayload(row.form, row.photoThumb))
          patchRow(row.id, { saveStatus: 'saved', savedAs: 'created' })
        }
      } catch (err) {
        patchRow(row.id, { saveStatus: 'error', saveError: err.message || t('batchScanSaveFailed') })
      }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center"
      data-testid="batch-scan-modal"
    >
      <div className="relative bg-white w-full md:max-w-[720px] max-h-[92vh] rounded-t-[20px] md:rounded-[20px] flex flex-col">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border">
          <h2 className="font-display text-[20px] text-ink1">{t('batchScanTitle')}</h2>
          <button type="button" onClick={onClose} className="text-ink3 hover:text-ink1 cursor-pointer text-[13px]">
            {t('batchScanClose')}
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-3">
          {truncated && (
            <p className="text-[12px] text-[#C05A28]" data-testid="batch-truncated">
              {t('batchScanLimit').replace('{n}', MAX_BATCH)}
            </p>
          )}

          {fillableCount > 0 && (
            <button
              type="button"
              onClick={fillAllMissing}
              data-testid="batch-fill-all"
              className="self-start rounded-full border border-orange text-orange text-[12px] font-medium px-4 py-[6px] cursor-pointer hover:bg-orange-lt transition-colors"
            >
              {t('batchScanFillAll').replace('{n}', fillableCount)}
            </button>
          )}

          {rows.map((row, i) => {
            const errs = row.scanStatus === 'done' ? rowErrors(row.form) : {}
            const locked = row.saveStatus === 'saved' || row.saveStatus === 'saving'
            return (
              <div key={row.id} className="rounded-card border border-border p-3 flex flex-col gap-2" data-testid="batch-row">
                <div className="flex items-center gap-2 text-[12px] text-ink3">
                  {row.scanStatus === 'done' && (row.form.imageUrl || row.photoThumb) && (
                    <img
                      src={row.form.imageUrl || row.photoThumb}
                      alt=""
                      width="36"
                      height="36"
                      className="w-[36px] h-[36px] rounded-[8px] object-cover border border-border shrink-0"
                      data-testid="batch-preview"
                      data-source={row.form.imageUrl ? 'web' : 'photo'}
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                    />
                  )}
                  <span className="font-medium text-ink2">#{i + 1}</span>
                  <span className="truncate flex-1">{row.file.name}</span>
                  {row.scanStatus === 'scanning' && <span>{t('batchScanScanning')}</span>}
                  {row.scanStatus === 'failed' && (
                    <button
                      type="button"
                      onClick={() => scanOne(row)}
                      className="text-orange hover:underline cursor-pointer"
                    >
                      {t('batchScanRetry')}
                    </button>
                  )}
                  {row.scanStatus === 'done' && row.form.imageUrl && row.photoThumb && row.saveStatus !== 'saved' && (
                    <button
                      type="button"
                      onClick={() => updateForm(row.id, 'imageUrl', '')}
                      className="text-orange hover:underline cursor-pointer whitespace-nowrap"
                      data-testid="batch-use-my-photo"
                    >
                      {t('batchScanUseMyPhoto')}
                    </button>
                  )}
                  {row.saveStatus === 'saved' && <span className="text-[#2E7D32]">{row.savedAs === 'updated' ? t('batchScanUpdated') : t('batchScanSaved')}</span>}
                  {row.saveStatus === 'saving' && <span>{t('batchScanSaving')}</span>}
                </div>

                {row.scanStatus === 'failed' && (
                  <p className="text-[12px] text-[#C05A28]">{row.scanError}</p>
                )}

                {row.scanStatus === 'done' && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.include}
                        disabled={locked}
                        onChange={(e) => patchRow(row.id, { include: e.target.checked })}
                        aria-label={t('batchScanInclude')}
                      />
                      <span className="text-[12px] text-ink2">{t('batchScanInclude')}</span>
                      {(() => {
                        const info = matchInfo(row, i)
                        if (!info) return null
                        const label = info.source === 'batch'
                          ? t('batchScanSameBatch').replace('{n}', info.other)
                          : info.kind === 'exact'
                            ? t('batchScanDuplicate')
                            : `${t('batchScanSimilar')}: ${info.item.name}`
                        return (
                          <span
                            className="rounded-pill px-[8px] py-[2px] text-[10px] font-medium bg-sand text-ink2"
                            data-testid="batch-dup-badge"
                            data-kind={`${info.source}-${info.kind}`}
                          >
                            {label}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className={`${row.include && errs.name ? errorInputClass : row.webFields.name ? webClass : inputClass}${isStructured(row.form) ? ' col-span-2' : ''}`}
                        value={row.form.name}
                        disabled={locked}
                        placeholder={t('fieldName')}
                        onChange={(e) => updateForm(row.id, 'name', e.target.value)}
                        data-testid="batch-name"
                      />
                      {!isStructured(row.form) && (
                        <input
                          className={row.include && errs.dosage ? errorInputClass : row.webFields.dosage ? webClass : inputClass}
                          value={row.form.dosage}
                          disabled={locked}
                          placeholder={t('fieldDosage')}
                          onChange={(e) => updateForm(row.id, 'dosage', e.target.value)}
                          data-testid="batch-dosage"
                        />
                      )}
                      <input
                        className={row.webFields.brand ? webClass : inputClass}
                        value={row.form.brand}
                        disabled={locked}
                        placeholder={t('fieldBrand')}
                        onChange={(e) => updateForm(row.id, 'brand', e.target.value)}
                      />
                      <select
                        className={inputClass}
                        value={row.form.type}
                        disabled={locked}
                        onChange={(e) => updateForm(row.id, 'type', e.target.value)}
                      >
                        {TYPE_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    {isStructured(row.form) && (
                      <DoseInput
                        form={row.form}
                        onChange={(patch) => (patch.dosageFreeText ? updateForm(row.id, 'dosageFreeText', true) : updateDose(row.id, patch))}
                        invalid={row.include && Boolean(errs.dosage)}
                        disabled={locked}
                        webFilled={Boolean(row.webFields.servingUnits)}
                        directions={row.webDirections}
                        source={row.webSource}
                      />
                    )}
                    {hasMissing(row.form) && row.form.name.trim() && !locked && (
                      <button
                        type="button"
                        onClick={() => fillMissing(row.id, row.form)}
                        disabled={row.lookupStatus === 'looking'}
                        data-testid="batch-fill-row"
                        className="self-start text-[12px] font-medium text-orange hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-default"
                      >
                        {row.lookupStatus === 'looking' ? t('batchScanLooking') : t('batchScanFillRow')}
                      </button>
                    )}
                    {row.lookupStatus === 'none' && (
                      <p className="text-[11px] text-ink3" data-testid="batch-no-match">{t('batchScanNoMatch')}</p>
                    )}
                    {row.lookupStatus === 'nothing' && (
                      <p className="text-[11px] text-ink3" data-testid="batch-nothing-new">{t('batchScanFoundNothing')}</p>
                    )}
                    {row.lookupStatus === 'failed' && (
                      <p className="text-[11px] text-[#C05A28]">{t('batchScanLookupFailed')}</p>
                    )}
                    {hasMissing(row.form) && row.form.name.trim() && !locked && (
                      <PasteLinkFill
                        forceOpen={row.lookupStatus === 'none' || row.lookupStatus === 'failed' || row.lookupStatus === 'nothing'}
                        onSubmit={(url) => fillFromLink(row.id, url)}
                        onBusyChange={(busy) => patchRow(row.id, { linkBusy: busy })}
                      />
                    )}
                    {Object.values(row.webFields).some(Boolean) && (
                      <p className="text-[11px] text-[#1A3A6A]" data-testid="batch-web-note">{t('batchScanWebSuggested')}</p>
                    )}
                    {row.include && row.lookupStatus !== 'looking' && Object.keys(errs).length > 0 && !(isStructured(row.form) && !errs.name) && (
                      <p className="text-[11px] text-[#C05A28]">{t('batchScanNeedFields')}</p>
                    )}
                    {row.saveStatus === 'error' && (
                      <p className="text-[11px] text-[#C05A28]">{row.saveError}</p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center gap-3">
          {allSettled && savedCount > 0 ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-orange text-white text-[14px] font-semibold py-[11px] cursor-pointer hover:opacity-90"
            >
              {t('batchScanDone').replace('{n}', savedCount)}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!canSave}
              data-testid="batch-save-all"
              className="w-full rounded-full bg-orange text-white text-[14px] font-semibold py-[11px] cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? t('batchScanSaving')
                : scanning
                  ? t('batchScanScanning')
                  : looking
                    ? t('batchScanLooking')
                    : t('batchScanAddAll').replace('{n}', pending.length)}
            </button>
          )}
        </div>
      </div>
        {confirming && (
          <div className="absolute inset-0 z-10 bg-white rounded-t-[20px] md:rounded-[20px] flex flex-col" data-testid="dup-confirm">
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <h3 className="font-display text-[18px] text-ink1">{t('batchScanDupTitle')}</h3>
              <p className="text-[12px] text-ink3 mt-1">{t('batchScanDupBody')}</p>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex flex-col gap-3">
              {pending
                .filter((r) => r.id in confirming.choices)
                .map((r) => {
                  const found = findMatch(r.form, existingItems)
                  const existing = found?.item
                  const choice = confirming.choices[r.id]
                  const setChoice = (v) => setConfirming((c) => ({ ...c, choices: { ...c.choices, [r.id]: v } }))
                  return (
                    <div key={r.id} className="rounded-card border border-border p-3 flex flex-col gap-2" data-testid="dup-item">
                      <p className="text-[14px] font-medium text-ink1">{existing?.name || r.form.name}</p>
                      {found?.kind === 'similar' && (
                        <p className="text-[11px] text-ink3" data-testid="dup-similar-note">{t('batchScanDupSimilarNote').replace('{name}', r.form.name)}</p>
                      )}
                      <p className="text-[12px] text-ink3">
                        {t('batchScanDupCurrent')}: <span className="text-ink1">{existing?.dosage || '—'}</span>
                        {' → '}
                        {t('batchScanDupNew')}: <span className="text-ink1">{r.form.dosage || '—'}</span>
                      </p>
                      <label className="flex items-center gap-2 text-[13px] text-ink1 cursor-pointer">
                        <input type="radio" name={`dup-${r.id}`} checked={choice === 'new'} onChange={() => setChoice('new')} data-testid="dup-keep-both" />
                        {t('batchScanDupKeepBoth')}
                      </label>
                      <label className="flex items-center gap-2 text-[13px] text-ink1 cursor-pointer">
                        <input type="radio" name={`dup-${r.id}`} checked={choice === 'overwrite'} onChange={() => setChoice('overwrite')} data-testid="dup-overwrite" />
                        {t('batchScanDupOverwrite')}
                      </label>
                    </div>
                  )
                })}
            </div>
            <div className="mt-auto px-5 py-4 border-t border-border flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                data-testid="dup-back"
                className="flex-1 rounded-full border-[1.5px] border-border text-ink2 text-[14px] font-medium py-[11px] cursor-pointer"
              >
                {t('batchScanDupBack')}
              </button>
              <button
                type="button"
                onClick={() => saveRows(confirming.choices)}
                data-testid="dup-continue"
                className="flex-1 rounded-full bg-orange text-white text-[14px] font-semibold py-[11px] cursor-pointer hover:opacity-90"
              >
                {t('batchScanDupContinue')}
              </button>
            </div>
          </div>
        )}
    </div>
  )
}
