import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { useAiUsage } from '../context/AiUsageContext'
import { imageFileToBase64, scanResultToForm } from '../utils/labelScan'
import {
  MAX_BATCH,
  isDuplicate,
  rowErrors,
  buildCreatePayload,
  runPool,
} from '../utils/batchScan'

const TYPE_OPTIONS = ['supplement', 'medication', 'vitamin']

const inputClass =
  'w-full bg-page border-[1.5px] border-border rounded-[10px] px-3 py-[7px] text-[13px] text-ink1 outline-none focus:border-orange transition-colors'
const errorInputClass = 'border-[#C05A28] bg-[#FDF1EA]'

/**
 * Batch label scan. `files` is already limited to MAX_BATCH by the caller.
 * `existingNames` are the names currently in the cabinet (for duplicate marking).
 */
export default function BatchScanModal({ files, truncated, existingNames, onClose, onSaved }) {
  const { t } = useLanguage()
  const { showUsage } = useAiUsage()
  const [rows, setRows] = useState(() =>
    files.map((file, i) => ({
      id: i,
      file,
      scanStatus: 'scanning', // scanning | done | failed
      scanError: '',
      form: { name: '', type: 'supplement', dosage: '', brand: '', ingredients: '' },
      include: false,
      dup: false,
      saveStatus: 'idle', // idle | saving | saved | error
      saveError: '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const startedRef = useRef(false)

  function patchRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function scanOne(row) {
    patchRow(row.id, { scanStatus: 'scanning', scanError: '' })
    try {
      const { imageBase64, mimeType } = await imageFileToBase64(row.file)
      const res = await api.cabinet.scan(imageBase64, mimeType)
      if (!res.success || !res.data) throw new Error(res.error || t('scanLabelError'))
      const form = { ingredients: '', ...scanResultToForm(res.data) }
      const dup = isDuplicate(form.name, existingNames)
      patchRow(row.id, {
        scanStatus: 'done',
        form,
        dup,
        include: !dup,
      })
      if (res.aiUsage) showUsage(res.aiUsage, 'label-scan', { input: row.file.name, output: form.name })
    } catch (err) {
      patchRow(row.id, { scanStatus: 'failed', scanError: err.message || t('scanLabelError') })
    }
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
        return { ...r, form, dup: field === 'name' ? isDuplicate(value, existingNames) : r.dup }
      })
    )
  }

  const scanning = rows.some((r) => r.scanStatus === 'scanning')
  const pending = rows.filter((r) => r.scanStatus === 'done' && r.include && r.saveStatus !== 'saved')
  const hasInvalid = pending.some((r) => Object.keys(rowErrors(r.form)).length > 0)
  const savedCount = rows.filter((r) => r.saveStatus === 'saved').length
  const allSettled = !scanning && pending.length === 0
  const canSave = !scanning && !saving && pending.length > 0 && !hasInvalid

  async function handleSaveAll() {
    setSaving(true)
    for (const row of pending) {
      patchRow(row.id, { saveStatus: 'saving', saveError: '' })
      try {
        await api.cabinet.create(buildCreatePayload(row.form))
        patchRow(row.id, { saveStatus: 'saved' })
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
      <div className="bg-white w-full md:max-w-[720px] max-h-[92vh] rounded-t-[20px] md:rounded-[20px] flex flex-col">
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

          {rows.map((row, i) => {
            const errs = row.scanStatus === 'done' ? rowErrors(row.form) : {}
            const locked = row.saveStatus === 'saved' || row.saveStatus === 'saving'
            return (
              <div key={row.id} className="rounded-card border border-border p-3 flex flex-col gap-2" data-testid="batch-row">
                <div className="flex items-center gap-2 text-[12px] text-ink3">
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
                  {row.saveStatus === 'saved' && <span className="text-[#2E7D32]">{t('batchScanSaved')}</span>}
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
                      {row.dup && (
                        <span className="rounded-pill px-[8px] py-[2px] text-[10px] font-medium bg-sand text-ink2">
                          {t('batchScanDuplicate')}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className={`${inputClass} ${row.include && errs.name ? errorInputClass : ''}`}
                        value={row.form.name}
                        disabled={locked}
                        placeholder={t('fieldName')}
                        onChange={(e) => updateForm(row.id, 'name', e.target.value)}
                        data-testid="batch-name"
                      />
                      <input
                        className={`${inputClass} ${row.include && errs.dosage ? errorInputClass : ''}`}
                        value={row.form.dosage}
                        disabled={locked}
                        placeholder={t('fieldDosage')}
                        onChange={(e) => updateForm(row.id, 'dosage', e.target.value)}
                        data-testid="batch-dosage"
                      />
                      <input
                        className={inputClass}
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
                    {row.include && Object.keys(errs).length > 0 && (
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
                  : t('batchScanAddAll').replace('{n}', pending.length)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
