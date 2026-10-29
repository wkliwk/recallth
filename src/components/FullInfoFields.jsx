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
      </div>
    </details>
  )
}
