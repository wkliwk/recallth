import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en')

  useEffect(() => {
    // Load language from localStorage on mount
    const saved = localStorage.getItem('recallth_language')
    if (saved) {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = (lang) => {
    if (['en', 'zh-TW', 'zh-HK'].includes(lang)) {
      setLanguageState(lang)
      localStorage.setItem('recallth_language', lang)
    }
  }

  const getDisplayName = () => {
    const names = {
      'en': 'English',
      'zh-TW': '繁體中文',
      'zh-HK': '廣東話',
    }
    return names[language] || 'English'
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, getDisplayName }}>
      {children}
    </LanguageContext.Provider>
  )
}
