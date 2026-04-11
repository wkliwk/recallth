import { createContext, useContext, useState, useEffect } from 'react'

const TRANSLATIONS = {
  en: {
    // Nav
    home: 'Home',
    chat: 'Chat',
    cabinet: 'Cabinet',
    profile: 'Profile',
    // Home screen
    goodMorning: 'Good morning',
    todaySchedule: "Today's schedule",
    askAI: 'Ask Recallth AI',
    // Cabinet screen
    cabinetTitle: 'Cabinet',
    addSupplement: 'Add supplement',
    searchPlaceholder: 'Search supplements...',
    cabinetEmpty: 'Your cabinet is empty.',
    cabinetEmptySub: 'Add your first supplement.',
    noResults: 'No supplements match your search.',
    interactionWarning: (n) => `${n} interaction${n !== 1 ? 's' : ''} detected in your cabinet`,
    // Cabinet Add
    addTitle: 'Add Supplement',
    addSubtitle: 'Track a new item',
    addButton: 'Add to cabinet',
    adding: 'Adding...',
    // Cabinet Detail
    editButton: 'Edit',
    saveButton: 'Save',
    saving: 'Saving...',
    cancelButton: 'Cancel',
    deleteButton: 'Delete supplement',
    deleting: 'Deleting...',
    confirmDelete: 'Delete this supplement?',
    cannotUndo: 'This action cannot be undone.',
    // Chat
    chatGreeting: (name) => `${name} 👋`,
    goodMorningGreet: 'Good morning',
    newChat: 'New chat',
    tapSuggestion: 'Tap a suggestion or ask anything...',
    stackReview: 'Stack review',
    todayPlan: "Today's plan",
    // Profile
    language: 'Language',
    logOut: 'Log out',
    // Common
    back: 'Back',
  },
  'zh-TW': {
    home: '主頁',
    chat: '對話',
    cabinet: '藥箱',
    profile: '個人',
    goodMorning: '早安',
    todaySchedule: '今日排程',
    askAI: '詢問 Recallth AI',
    cabinetTitle: '藥箱',
    addSupplement: '新增補充品',
    searchPlaceholder: '搜尋補充品...',
    cabinetEmpty: '藥箱是空的。',
    cabinetEmptySub: '新增您的第一個補充品。',
    noResults: '找不到符合的補充品。',
    interactionWarning: (n) => `您的藥箱中偵測到 ${n} 個交互作用`,
    addTitle: '新增補充品',
    addSubtitle: '追蹤新項目',
    addButton: '加入藥箱',
    adding: '新增中...',
    editButton: '編輯',
    saveButton: '儲存',
    saving: '儲存中...',
    cancelButton: '取消',
    deleteButton: '刪除補充品',
    deleting: '刪除中...',
    confirmDelete: '確定要刪除此補充品？',
    cannotUndo: '此操作無法復原。',
    chatGreeting: (name) => `${name} 👋`,
    goodMorningGreet: '早安',
    newChat: '新對話',
    tapSuggestion: '點選建議或輸入問題...',
    stackReview: '堆疊審查',
    todayPlan: '今日計劃',
    language: '語言',
    logOut: '登出',
    back: '返回',
  },
  'zh-HK': {
    home: '主頁',
    chat: '對話',
    cabinet: '藥箱',
    profile: '個人',
    goodMorning: '早晨',
    todaySchedule: '今日時間表',
    askAI: '問 Recallth AI',
    cabinetTitle: '藥箱',
    addSupplement: '加補充品',
    searchPlaceholder: '搵補充品...',
    cabinetEmpty: '藥箱係空㗎。',
    cabinetEmptySub: '加你第一個補充品。',
    noResults: '搵唔到符合嘅補充品。',
    interactionWarning: (n) => `你嘅藥箱有 ${n} 個交互作用`,
    addTitle: '加補充品',
    addSubtitle: '追蹤新項目',
    addButton: '加入藥箱',
    adding: '加緊...',
    editButton: '編輯',
    saveButton: '儲存',
    saving: '儲存緊...',
    cancelButton: '取消',
    deleteButton: '刪除補充品',
    deleting: '刪緊...',
    confirmDelete: '確定要刪除呢個補充品？',
    cannotUndo: '呢個操作係冇得返轉頭㗎。',
    chatGreeting: (name) => `${name} 👋`,
    goodMorningGreet: '早晨',
    newChat: '新對話',
    tapSuggestion: '撳建議或者問任何野...',
    stackReview: '堆疊審查',
    todayPlan: '今日計劃',
    language: '語言',
    logOut: '登出',
    back: '返回',
  },
}

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
    const saved = localStorage.getItem('recallth_language')
    if (saved && TRANSLATIONS[saved]) {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = (lang) => {
    if (TRANSLATIONS[lang]) {
      setLanguageState(lang)
      localStorage.setItem('recallth_language', lang)
    }
  }

  const t = (key, ...args) => {
    const strings = TRANSLATIONS[language] || TRANSLATIONS.en
    const value = strings[key] ?? TRANSLATIONS.en[key] ?? key
    return typeof value === 'function' ? value(...args) : value
  }

  const getDisplayName = () => {
    const names = { en: 'English', 'zh-TW': '繁體中文', 'zh-HK': '廣東話' }
    return names[language] || 'English'
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, getDisplayName, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
