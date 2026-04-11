import { useLanguage } from '../context/LanguageContext'

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage()

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'zh-HK', label: '廣東話' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <label className="text-[13px] font-medium text-ink2">{t('language')}</label>
      <div className="flex gap-2">
        {languages.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => setLanguage(code)}
            className={`px-3 py-[10px] rounded-pill text-[13px] font-medium transition-colors ${
              language === code
                ? 'bg-orange text-white'
                : 'bg-sand text-ink2 hover:bg-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
