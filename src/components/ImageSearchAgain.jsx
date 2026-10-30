import { useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { searchProductImage } from '../utils/dosageLookup'
import { originalImageUrl, photoFromDataUrl } from '../utils/batchScan'

/**
 * Saved item: search the web for a better product picture. Uses the item's reference links (or name + brand) and,
 * when the current picture is the user's own photo, that photo for comparison. The result is shown for the user
 * to confirm ("Use this picture" / "Keep current") — nothing is saved until they accept.
 */
export default function ImageSearchAgain({ supp, onApply, className = '' }) {
  const { t } = useLanguage()
  const [status, setStatus] = useState('idle') // idle | searching | none | found
  const [candidate, setCandidate] = useState('')
  const [saving, setSaving] = useState(false)
  const tried = useRef(new Set())

  async function search() {
    if (status === 'searching') return
    setStatus('searching')
    const current = originalImageUrl(supp.imageUrl)
    if (current) tried.current.add(current)
    const url = await searchProductImage({
      photo: photoFromDataUrl(supp.imageUrl),
      pageUrls: (supp.references || []).map((r) => r.url),
      name: supp.name,
      brand: supp.brand,
      exclude: [...tried.current],
    })
    if (!url) { setStatus('none'); return }
    tried.current.add(originalImageUrl(url))
    setCandidate(url)
    setStatus('found')
  }

  async function use() {
    setSaving(true)
    try {
      await onApply(candidate)
      setCandidate('')
      setStatus('idle')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`} data-testid="detail-image-search">
      <button
        type="button"
        onClick={search}
        disabled={status === 'searching'}
        className="text-[12px] text-orange font-medium cursor-pointer hover:text-orange-dk transition-colors disabled:opacity-50"
        data-testid="detail-search-image"
      >
        {status === 'searching' ? t('searchingPicture') : status === 'none' ? t('noOtherPicture') : t('searchPictureAgain')}
      </button>
      {status === 'found' && candidate && (
        <div className="flex flex-col items-center gap-2" data-testid="detail-image-candidate">
          <img src={candidate} alt="" className="w-[120px] h-[120px] rounded-[10px] object-contain bg-white border border-border" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
          <div className="flex gap-3 text-[12px]">
            <button type="button" onClick={use} disabled={saving} className="text-orange font-medium cursor-pointer hover:underline disabled:opacity-50" data-testid="detail-image-use">{t('useThisPicture')}</button>
            <button type="button" onClick={() => { setCandidate(''); setStatus('idle') }} className="text-ink3 cursor-pointer hover:underline" data-testid="detail-image-keep">{t('keepCurrentPicture')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
