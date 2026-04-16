import { useState, useRef, useEffect } from 'react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

// ── Icons ─────────────────────────────────────────────────────────────────────
function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function SparkleIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#E07B4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  )
}

// ── Step config ───────────────────────────────────────────────────────────────
// Steps: height → weight → age → sex → activity → done
const STEP_HEIGHT   = 0
const STEP_WEIGHT   = 1
const STEP_AGE      = 2
const STEP_SEX      = 3
const STEP_ACTIVITY = 4
const STEP_DONE     = 5

const SEX_OPTIONS = [
  { value: 'male',   labelKey: 'profileChatSexMale' },
  { value: 'female', labelKey: 'profileChatSexFemale' },
  { value: 'other',  labelKey: 'profileChatSexOther' },
]

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',   labelKey: 'profileChatActivitySedentary' },
  { value: 'light',       labelKey: 'profileChatActivityLight' },
  { value: 'moderate',    labelKey: 'profileChatActivityModerate' },
  { value: 'active',      labelKey: 'profileChatActivityActive' },
  { value: 'very_active', labelKey: 'profileChatActivityVeryActive' },
]

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start items-end gap-2">
      <div className="w-6 h-6 rounded-[8px] bg-orange-lt flex items-center justify-center shrink-0">
        <SparkleIcon size={12} />
      </div>
      <div className="bg-sand rounded-[16px] rounded-bl-[4px] px-4 py-[10px] flex items-center gap-1">
        <span className="w-[5px] h-[5px] rounded-full bg-ink3 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-[5px] h-[5px] rounded-full bg-ink3 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-[5px] h-[5px] rounded-full bg-ink3 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

// ── Quick-reply chip row ──────────────────────────────────────────────────────
function QuickReplies({ options, onSelect, t }) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value, t(opt.labelKey))}
          className="text-[12px] font-medium text-orange border border-orange/40 rounded-pill px-4 py-[7px] bg-white hover:bg-orange/5 transition-colors cursor-pointer"
        >
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileOnboardingChat({ onClose, onComplete }) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState(STEP_HEIGHT)
  const [isTyping, setIsTyping] = useState(false)
  const [collected, setCollected] = useState({ height: '', weight: '', age: '', sex: '', activityLevel: '' })
  const [inputDisabled, setInputDisabled] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Initial greeting on mount
  useEffect(() => {
    const greet = t('profileChatGreet')
    const askHeight = t('profileChatAskHeight')
    setMessages([
      { type: 'bot', text: greet },
      { type: 'bot', text: askHeight },
    ])
    inputRef.current?.focus()
  }, []) // eslint-disable-line

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function addBotMessage(text) {
    setMessages((m) => [...m, { type: 'bot', text }])
  }

  function addUserMessage(text) {
    setMessages((m) => [...m, { type: 'user', text }])
  }

  function botReply(text, delay = 600) {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      addBotMessage(text)
    }, delay)
  }

  function botReplyMulti(texts, delay = 600) {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      texts.forEach((text, i) => {
        setTimeout(() => addBotMessage(text), i * 400)
      })
    }, delay)
  }

  // ── Validate and advance step ─────────────────────────────────────────────
  function handleSubmit() {
    const val = input.trim()
    if (!val || inputDisabled) return
    setInput('')
    addUserMessage(val)

    if (step === STEP_HEIGHT) {
      const num = parseFloat(val)
      if (isNaN(num) || num < 50 || num > 300) {
        botReply(t('profileChatInvalidHeight'))
        return
      }
      setCollected((c) => ({ ...c, height: `${Math.round(num)} cm` }))
      setStep(STEP_WEIGHT)
      botReply(t('profileChatAskWeight'))

    } else if (step === STEP_WEIGHT) {
      const num = parseFloat(val)
      if (isNaN(num) || num < 10 || num > 500) {
        botReply(t('profileChatInvalidWeight'))
        return
      }
      setCollected((c) => ({ ...c, weight: `${Math.round(num)} kg` }))
      setStep(STEP_AGE)
      botReply(t('profileChatAskAge'))

    } else if (step === STEP_AGE) {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 1 || num > 120) {
        botReply(t('profileChatInvalidAge'))
        return
      }
      setCollected((c) => ({ ...c, age: String(num) }))
      setStep(STEP_SEX)
      setInputDisabled(true)
      botReply(t('profileChatAskSex'))
    }
  }

  function handleSexSelect(value, label) {
    addUserMessage(label)
    setCollected((c) => ({ ...c, sex: value }))
    setStep(STEP_ACTIVITY)
    botReplyMulti([t('profileChatAskActivity')])
  }

  function handleActivitySelect(value, label) {
    addUserMessage(label)
    const finalCollected = { ...collected, activityLevel: value }
    setCollected(finalCollected)
    setStep(STEP_DONE)
    setInputDisabled(true)
    saveProfile(finalCollected)
  }

  async function saveProfile(data) {
    setIsTyping(true)
    try {
      await api.profile.update({ body: data })
      setIsTyping(false)
      addBotMessage(t('profileChatSaved'))
      if (onComplete) onComplete()
      // Auto-close after 2 seconds
      setTimeout(() => onClose(), 2000)
    } catch {
      setIsTyping(false)
      addBotMessage(t('profileChatError'))
    }
  }

  const showSexChips     = step === STEP_SEX && !isTyping
  const showActivityChips = step === STEP_ACTIVITY && !isTyping
  const showInput        = step < STEP_SEX && !inputDisabled

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end"
      style={{ background: 'rgba(42,34,26,0.25)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full md:w-[420px] h-full bg-white flex flex-col shadow-2xl"
        style={{ animation: 'slideIn 0.22s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-orange flex items-center justify-center shrink-0">
              <PersonIcon />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ink1">{t('profileChatTitle')}</p>
              <p className="text-[11px] text-ink3">{t('profileChatSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sand transition-colors text-ink3 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {msg.type === 'bot' && (
                <div className="w-6 h-6 rounded-[8px] bg-orange-lt flex items-center justify-center shrink-0 mb-[1px]">
                  <SparkleIcon size={12} />
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-[16px] px-4 py-[10px] text-[13px] leading-[1.55] ${
                  msg.type === 'user'
                    ? 'bg-orange text-white rounded-br-[4px]'
                    : 'bg-sand text-ink1 rounded-bl-[4px]'
                }`}
              >
                <span className="whitespace-pre-wrap">{msg.text}</span>
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        {showSexChips && (
          <QuickReplies options={SEX_OPTIONS} onSelect={handleSexSelect} t={t} />
        )}
        {showActivityChips && (
          <QuickReplies options={ACTIVITY_OPTIONS} onSelect={handleActivitySelect} t={t} />
        )}

        {/* Text input */}
        {showInput && (
          <div className="px-4 py-4 border-t border-border shrink-0">
            <div className="flex items-center gap-2 border border-border rounded-pill px-4 py-[10px] bg-page focus-within:border-orange transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={t('profileChatInputPlaceholder')}
                className="flex-1 text-[13px] text-ink1 placeholder:text-ink4 outline-none bg-transparent"
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-full bg-orange flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-opacity hover:bg-orange-dk"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
