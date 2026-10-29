import { useLanguage } from '../context/LanguageContext'

const base =
  'w-full bg-page border-[1.5px] border-border rounded-[10px] px-3 py-[8px] text-[12px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors resize-y'
const webClass = base.replace('bg-page', 'bg-[#EEF4FC]').replace('border-border', 'border-[#7BA3D6]')

/**
 * Full ingredients + description: shown and editable so web-found text can be checked and corrected before it is saved.
 * `form.ingredients` / `form.description`; `onChange(field, value)`; `webFields` marks web-filled fields.
 */
export default function FullInfoFields({ form, onChange, webFields = {}, disabled = false }) {
  const { t } = useLanguage()
  const ing = String(form.ingredients || '')
  const desc = String(form.description || '')
  const web = Boolean(webFields.ingredients || webFields.description)
  const count = ing.length + desc.length
  const refs = Array.isArray(form.references) ? form.references : []

  return (
    <details className="rounded-[12px] border border-border" data-testid="full-info">
      <summary className="cursor-pointer select-none px-3 py-2 text-[12px] text-ink2 flex items-center justify-between gap-2">
        <span>{t('fullInfoTitle')}</span>
        <span className="text-[11px] text-ink3" data-testid="full-info-summary">
          {count > 0 ? `${count}` : '—'}
          {web ? ` · ${t('batchScanWebSuggested')}` : ''}
        </span>
      </summary>
      <div className="px-3 pb-3 flex flex-col gap-2">
        <label className="text-[11px] font-medium text-ink2" htmlFor="full-ingredients">{t('fieldIngredients')}</label>
        <textarea
          id="full-ingredients"
          className={webFields.ingredients ? webClass : base}
          rows={5}
          value={ing}
          disabled={disabled}
          onChange={(e) => onChange('ingredients', e.target.value)}
          data-testid="full-ingredients"
        />
        <label className="text-[11px] font-medium text-ink2" htmlFor="full-description">{t('fieldDescription')}</label>
        <textarea
          id="full-description"
          className={webFields.description ? webClass : base}
          rows={3}
          value={desc}
          disabled={disabled}
          onChange={(e) => onChange('description', e.target.value)}
          data-testid="full-description"
        />
        {refs.length > 0 && (
          <div className="flex flex-col gap-1" data-testid="full-references">
            <span className="text-[11px] font-medium text-ink2">{t('fullInfoReferences')}</span>
            {refs.map((r) => (
              <div key={r.url} className="flex items-center gap-2 text-[12px]">
                <span className="shrink-0 rounded-full bg-[#EEF4FC] px-2 py-[1px] text-[10px] text-[#1A3A6A]" data-testid="reference-kind">{t(`refKind_${r.kind}`)}</span>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-orange hover:underline truncate flex-1" title={r.url}>{r.title}</a>
                {!disabled && (
                  <button type="button" onClick={() => onChange('references', refs.filter((x) => x.url !== r.url))} className="text-ink3 hover:text-ink1 cursor-pointer" aria-label={t('fullInfoRemoveRef')} data-testid="reference-remove">×</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  )
}
