import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { isHttpUrl } from '../utils/batchScan'

/**
 * Fallback when online search finds nothing: the user pastes a product page link.
 * `onSubmit(url)` resolves 'filled' | 'nothing' or throws (message shown to the user).
 */
export default function PasteLinkFill({ forceOpen = false, disabled = false, onSubmit, onBusyChange }) {
  const { t } = useLanguage()
  const [opened, setOpened] = useState(false)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const open = opened || forceOpen

  async function handleSubmit() {
    if (busy) return
    if (!isHttpUrl(url)) {
      setMessage(t('batchScanLinkInvalid'))
      return
    }
    setMessage('')
    setBusy(true)
    onBusyChange?.(true)
    try {
      const result = await onSubmit(url.trim())
      if (result === 'nothing') setMessage(t('batchScanLinkNothing'))
      else setUrl('')
    } catch (err) {
      setMessage(err.message || t('batchScanLinkFailed'))
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpened(true)}
        data-testid="link-toggle"
        className="self-start text-[12px] text-ink3 hover:text-orange hover:underline cursor-pointer"
      >
        {t('batchScanLinkToggle')}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1" data-testid="link-fill">
      <div className="flex gap-2">
        <input
          type="url"
          inputMode="url"
          value={url}
          disabled={disabled || busy}
          onChange={(e) => { setUrl(e.target.value); if (message) setMessage('') }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSubmit())}
          placeholder={t('batchScanLinkPlaceholder')}
          data-testid="link-input"
          className="flex-1 min-w-0 bg-page border-[1.5px] border-border rounded-[10px] px-3 py-[7px] text-[13px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || busy || !url.trim()}
          data-testid="link-submit"
          className="shrink-0 rounded-full bg-orange text-white text-[12px] font-medium px-4 py-[7px] cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? t('batchScanLooking') : t('batchScanLinkButton')}
        </button>
      </div>
      {message && <p className="text-[11px] text-[#C05A28]" data-testid="link-message">{message}</p>}
    </div>
  )
}
