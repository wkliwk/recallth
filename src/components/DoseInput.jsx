import { useLanguage } from '../context/LanguageContext'
import { UNIT_FORMS, composeDosage, parseServingUnits } from '../utils/dose'

const baseInput =
  'bg-page border-[1.5px] border-border rounded-[10px] px-3 py-[7px] text-[13px] text-ink1 outline-none focus:border-orange transition-colors'
const invalidInput = baseInput.replace('bg-page', 'bg-[#FDF1EA]').replace('border-border', 'border-[#C05A28]')
const webInput = baseInput.replace('bg-page', 'bg-[#EEF4FC]').replace('border-border', 'border-[#7BA3D6]')

/**
 * "Dosage" = how many units to take per dose, shown next to the strength per unit from the label.
 * The count is never assumed: it stays empty until the label states it, the web search finds it, or the user enters it.
 * `form` carries strength / unitForm / servingUnits; `onChange(patch)` receives partial updates.
 */
export default function DoseInput({ form, onChange, invalid = false, disabled = false, webFilled = false, directions = '' }) {
  const { t } = useLanguage()
  const units = String(form.servingUnits ?? '')
  const n = Number(units)
  const composed = composeDosage(form)

  const step = (delta) => {
    const cur = Number.isFinite(n) && n > 0 ? n : 0
    const next = Math.max(1, cur + delta)
    onChange({ servingUnits: parseServingUnits(next) })
  }

  return (
    <div className="rounded-[12px] border border-border p-3 flex flex-col gap-2" data-testid="dose-input">
      <p className="text-[12px] text-ink3" data-testid="dose-strength">
        {t('doseStrengthLabel')}: <span className="font-medium text-ink1">{form.strength || '—'}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-ink2 shrink-0">{t('dosePerDose')}</span>
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || !(n > 1)}
          aria-label="-"
          className="w-[30px] h-[30px] rounded-full border border-border text-ink2 cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >−</button>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          value={units}
          disabled={disabled}
          placeholder="?"
          onChange={(e) => onChange({ servingUnits: e.target.value === '' ? '' : parseServingUnits(e.target.value) || units })}
          className={`${invalid ? invalidInput : webFilled ? webInput : baseInput} w-[64px] text-center`}
          data-testid="dose-count"
        />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={disabled || n >= 50}
          aria-label="+"
          className="w-[30px] h-[30px] rounded-full border border-border text-ink2 cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >+</button>
        <select
          value={UNIT_FORMS.includes(form.unitForm) ? form.unitForm : ''}
          disabled={disabled}
          onChange={(e) => onChange({ unitForm: e.target.value })}
          className={`${baseInput} flex-1 min-w-0 cursor-pointer`}
          aria-label={t('doseUnit')}
          data-testid="dose-unit"
        >
          <option value="">{t('doseUnit')}</option>
          {UNIT_FORMS.map((u) => <option key={u} value={u}>{t(`doseUnit_${u}`)}</option>)}
        </select>
      </div>
      {composed
        ? <p className="text-[12px] text-ink2" data-testid="dose-composed">→ {composed}</p>
        : <p className={`text-[11px] ${invalid ? 'text-[#C05A28]' : 'text-ink3'}`} data-testid="dose-need">{t('doseNeedCount')}</p>}
      {webFilled && directions && (
        <p className="text-[11px] text-[#1A3A6A]" data-testid="dose-directions">{t('doseFromDirections')}: “{directions}”</p>
      )}
      <button
        type="button"
        onClick={() => onChange({ dosageFreeText: true })}
        disabled={disabled}
        className="self-start text-[11px] text-ink3 hover:text-orange hover:underline cursor-pointer"
        data-testid="dose-edit-text"
      >
        {t('doseEditAsText')}
      </button>
    </div>
  )
}
