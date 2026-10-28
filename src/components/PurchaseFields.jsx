import { useLanguage } from '../context/LanguageContext'
import { CURRENCIES } from '../utils/purchase'

const inputClass =
  'w-full bg-page border-[1.5px] border-border rounded-[12px] px-4 py-[10px] text-[14px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors'

/**
 * Optional purchase price (+ currency) and purchase date, for reference.
 * Controlled via the parent form: `form.purchasePrice`, `form.purchaseCurrency`, `form.purchaseDate`.
 */
export default function PurchaseFields({ form, onChange, error }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-4" data-testid="purchase-fields">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-ink2" htmlFor="purchase-price">{t('fieldPurchasePrice')}</label>
        <div className="flex gap-2">
          <input
            id="purchase-price"
            className={inputClass}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.purchasePrice ?? ''}
            onChange={(e) => onChange('purchasePrice', e.target.value)}
            placeholder="0.00"
            data-testid="purchase-price"
          />
          <select
            className={`${inputClass} !w-[96px] shrink-0 cursor-pointer`}
            value={form.purchaseCurrency || 'HKD'}
            onChange={(e) => onChange('purchaseCurrency', e.target.value)}
            aria-label={t('fieldPurchaseCurrency')}
            data-testid="purchase-currency"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {error && <p className="text-[11px] text-[#C05A28]" data-testid="purchase-price-error">{error}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-ink2" htmlFor="purchase-date">{t('fieldPurchaseDate')}</label>
        <input
          id="purchase-date"
          className={inputClass}
          type="date"
          value={form.purchaseDate ?? ''}
          onChange={(e) => onChange('purchaseDate', e.target.value)}
          data-testid="purchase-date"
        />
      </div>
    </div>
  )
}
