export const CURRENCIES = ['HKD', 'CAD', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD']
export const DEFAULT_CURRENCY = 'HKD'

// App language -> Intl locale. English uses en-GB so dates read unambiguously (20 Oct 2026).
export function intlLocale(language) {
  return { en: 'en-GB', 'zh-TW': 'zh-TW', 'zh-HK': 'zh-HK' }[language] || 'en-GB'
}

// '' -> null (nothing entered). Otherwise a finite number >= 0.
export function parsePriceInput(raw) {
  const s = String(raw ?? '').trim()
  if (s === '') return { ok: true, value: null }
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: 'invalid' }
  return { ok: true, value: n }
}

// ISO date from the API -> 'YYYY-MM-DD' for <input type="date"> (dates are stored as UTC midnight).
export function toDateInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export function formatPrice(price, currency = DEFAULT_CURRENCY, locale = 'en-GB') {
  if (price === null || price === undefined || price === '') return ''
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'symbol' }).format(price)
  } catch {
    return `${currency} ${Number(price).toFixed(2)}`
  }
}

export function formatPurchaseDate(iso, locale = 'en-GB') {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d)
}

// One line for the detail page, e.g. "HK$128.50 · 20 Oct 2026". Empty when neither is set.
export function formatPurchase(price, currency, iso, locale = 'en-GB') {
  return [formatPrice(price, currency || DEFAULT_CURRENCY, locale), formatPurchaseDate(iso, locale)]
    .filter(Boolean)
    .join(' · ')
}
