import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const STEPS = ['height', 'weight', 'age', 'sex', 'activity', 'done']

// Parse height input → cm, or null if invalid
// Accepts: 170, 170cm, 5'9, 5ft9, 5ft9in, 5 9, 5.75ft
function parseHeightToCm(val) {
  const s = val.trim().toLowerCase()

  // feet-inches: 5'9, 5'9", 5ft9, 5ft9in (feet unit required to avoid ambiguity with plain cm numbers)
  const feetInches = s.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|'|′)\s*(\d+(?:\.\d+)?)\s*(?:in|inches|"|″)?$/)
  if (feetInches) {
    const cm = parseFloat(feetInches[1]) * 30.48 + parseFloat(feetInches[2]) * 2.54
    return Math.round(cm)
  }

  // feet only: 5.9ft, 5ft
  const feetOnly = s.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|'|′)$/)
  if (feetOnly) {
    return Math.round(parseFloat(feetOnly[1]) * 30.48)
  }

  // plain number: infer unit from value range
  // 100–250 → cm; 4–8 → feet (no inches)
  const plain = s.match(/^(\d+(?:\.\d+)?)\s*(?:cm)?$/)
  if (plain) {
    const n = parseFloat(plain[1])
    if (n >= 100) return n                       // clearly cm
    if (n >= 4 && n <= 8) return Math.round(n * 30.48)  // clearly feet
    return null
  }

  return null
}

// Parse weight input → kg, or null if invalid
// Accepts: 68, 68kg, 150lbs, 150 lbs, 150lb
function parseWeightToKg(val) {
  const s = val.trim().toLowerCase()

  const lbs = s.match(/^(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)$/)
  if (lbs) return Math.round(parseFloat(lbs[1]) * 0.453592 * 10) / 10

  const plain = s.match(/^(\d+(?:\.\d+)?)\s*(?:kg)?$/)
  if (plain) return parseFloat(plain[1])

  return null
}

function SparkleIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="w-6 h-6 rounded-[8px] bg-orange-lt flex items-center justify-center shrink-0 mr-2 mt-1">
        <SparkleIcon size={12} color="#E07B4A" />
      </div>
      <div className="bg-sand rounded-[16px] rounded-bl-[4px] px-4 py-[10px] flex items-center gap-1">
        <span className="w-[5px] h-[5px] rounded-full bg-ink3" />
        <span className="w-[5px] h-[5px] rounded-full bg-ink3" />
        <span className="w-[5px] h-[5px] rounded-full bg-ink3" />
      </div>
    </div>
  )
}

export default function ProfileOnboardingChat({ open, onClose, onComplete }) {
  const { language } = useLanguage()
  const isZh = language === 'zh-HK' || language === 'zh-TW'

  const [messages, setMessages] = useState([])
  const [step, setStep] = useState(0)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [done, setDone] = useState(false)
  const [updateMode, setUpdateMode] = useState(false) // true when re-opening with existing profile

  // Use a ref to track collected data synchronously — avoids calling API
  // inside a state setter (which React StrictMode calls twice)
  const collectedRef = useRef({})

  const bottomRef = useRef(null)

  const strings = isZh
    ? {
        title: '設定個人資料',
        subtitle: '幾個問題就完成',
        height: '你好！我幫你設定個人化營養目標。首先，請問你的身高？（例：170、5\'9、5ft9）',
        weight: '好！你的體重係幾多？（例：65、65kg、150lbs）',
        age: '多謝！你幾歲？（可以直接輸入歲數或出生年份）',
        sex: '你的性別係？',
        activity: '最後一題！你的日常活動量係？',
        saving: '儲存中...',
        done: '完成！🎉 你的卡路里目標已根據個人資料計算。',
        errorHeight: '請輸入有效身高，例：170、5\'9、5ft9',
        errorWeight: '請輸入有效體重，例：65、65kg、150lbs',
        errorAge: '請輸入有效年齡（10–120）',
        errorSave: '儲存失敗，請重試。',
        close: '關閉',
        placeholderHeight: '例：170 / 5\'9 / 5ft9',
        placeholderWeight: '例：65 / 65kg / 150lbs',
        placeholderAge: '例：30 或 1995',
        sex_male: '男',
        sex_female: '女',
        sex_other: '其他',
        act_sedentary: '很少運動',
        act_light: '輕量（1–3次/週）',
        act_moderate: '中量（3–5次/週）',
        act_active: '高強度（6–7次/週）',
        act_very_active: '非常高強度（每日多次）',
        updateSummary: (h, w, a, s, act) => `你的資料已設定完成 ✓\n身高：${h}cm　體重：${w}kg　年齡：${a}\n性別：${s}　活動量：${act}\n\n想更新哪個資料？`,
        updateHeight: '更新身高',
        updateWeight: '更新體重',
        updateAge: '更新年齡',
        updateSex: '更新性別',
        updateActivity: '更新活動量',
        updateDone: '不更新，關閉',
        updateHeightQ: '請輸入新的身高（例：170、5\'9）',
        updateWeightQ: '請輸入新的體重（例：65、65kg、150lbs）',
        updateAgeQ: '請輸入新的年齡或出生年份',
        updateSexQ: '請選擇性別',
        updateActivityQ: '請選擇活動量',
        updateSaved: '已更新！目標已重新計算。',
      }
    : {
        title: 'Set Up Your Profile',
        subtitle: 'A few quick questions',
        height: "Hi! Let me help personalise your nutrition targets. What's your height? (e.g. 170, 5'9, 5ft9)",
        weight: "Great! What's your weight? (e.g. 65, 65kg, 150lbs)",
        age: 'Thanks! How old are you? (age or birth year both work)',
        sex: 'What is your sex?',
        activity: 'Last one! How active are you?',
        saving: 'Saving your profile...',
        done: '🎉 Done! Your calorie target has been calculated based on your profile.',
        errorHeight: "Please enter a valid height, e.g. 170, 5'9, or 5ft9",
        errorWeight: 'Please enter a valid weight, e.g. 65, 65kg, or 150lbs',
        errorAge: 'Please enter a valid age (10–120)',
        errorSave: 'Failed to save. Please try again.',
        close: 'Close',
        placeholderHeight: "e.g. 170 / 5'9 / 5ft9",
        placeholderWeight: 'e.g. 65 / 65kg / 150lbs',
        placeholderAge: 'e.g. 30 or 1995',
        sex_male: 'Male',
        sex_female: 'Female',
        sex_other: 'Other',
        act_sedentary: 'Sedentary (little/no exercise)',
        act_light: 'Lightly active (1–3x/week)',
        act_moderate: 'Moderately active (3–5x/week)',
        act_active: 'Active (6–7x/week)',
        act_very_active: 'Very active (2x/day)',
        updateSummary: (h, w, a, s, act) => `Your profile is complete ✓\nHeight: ${h}cm  Weight: ${w}kg  Age: ${a}\nSex: ${s}  Activity: ${act}\n\nWhat would you like to update?`,
        updateHeight: 'Update height',
        updateWeight: 'Update weight',
        updateAge: 'Update age',
        updateSex: 'Update sex',
        updateActivity: 'Update activity',
        updateDone: 'Nothing, close',
        updateHeightQ: "Enter your new height (e.g. 170, 5'9)",
        updateWeightQ: 'Enter your new weight (e.g. 65, 65kg, 150lbs)',
        updateAgeQ: 'Enter your new age or birth year',
        updateSexQ: 'Select your sex',
        updateActivityQ: 'Select your activity level',
        updateSaved: 'Updated! Your targets have been recalculated.',
      }

  const sexOptions = [
    { value: 'male', label: strings.sex_male },
    { value: 'female', label: strings.sex_female },
    { value: 'other', label: strings.sex_other },
  ]

  const activityOptions = [
    { value: 'sedentary', label: strings.act_sedentary },
    { value: 'light', label: strings.act_light },
    { value: 'moderate', label: strings.act_moderate },
    { value: 'active', label: strings.act_active },
    { value: 'very_active', label: strings.act_very_active },
  ]

  // Load existing profile and start conversation when opened
  useEffect(() => {
    if (!open) return
    setMessages([])
    setInput('')
    setDone(false)
    setUpdateMode(false)
    setIsTyping(true)
    collectedRef.current = {}

    api.profile.get().then((res) => {
      const body = res?.data?.body ?? {}
      const h = body.height
      const w = body.weight
      const a = body.age
      const s = body.sex
      const act = body.activityLevel

      // Pre-populate existing values
      if (h) collectedRef.current.height = h
      if (w) collectedRef.current.weight = w
      if (a) collectedRef.current.age = a
      if (s) collectedRef.current.sex = s
      if (act) collectedRef.current.activityLevel = act

      const allFilled = h && w && a && s && act

      if (allFilled) {
        // Profile complete — show summary + offer update
        const sexLabel = s === 'male' ? strings.sex_male : s === 'female' ? strings.sex_female : strings.sex_other
        const actLabel = activityOptions.find((o) => o.value === act)?.label ?? act
        const summaryMsg = strings.updateSummary(h, w, a, sexLabel, actLabel)
        setUpdateMode(true)
        setStep(5) // done step, won't show any input
        setTimeout(() => {
          setIsTyping(false)
          setMessages([{ type: 'ai', text: summaryMsg }])
        }, 400)
      } else {
        // Find first missing field and start there
        const firstMissing = !h ? 0 : !w ? 1 : !a ? 2 : !s ? 3 : 4
        setStep(firstMissing)
        const stepMsgs = [strings.height, strings.weight, strings.age, strings.sex, strings.activity]
        setTimeout(() => {
          setIsTyping(false)
          setMessages([{ type: 'ai', text: stepMsgs[firstMissing] }])
        }, 400)
      }
    }).catch(() => {
      // Fetch failed — start fresh
      setStep(0)
      setTimeout(() => {
        setIsTyping(false)
        setMessages([{ type: 'ai', text: strings.height }])
      }, 400)
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function addAiMessage(text) {
    return new Promise((resolve) => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages((m) => [...m, { type: 'ai', text }])
        resolve()
      }, 700)
    })
  }

  async function handleTextSubmit() {
    const val = input.trim()
    if (!val) return
    const currentStep = STEPS[step]

    setMessages((m) => [...m, { type: 'user', text: val }])
    setInput('')

    if (currentStep === 'height') {
      const cm = parseHeightToCm(val)
      if (cm === null || cm < 100 || cm > 250) {
        await addAiMessage(strings.errorHeight)
        return
      }
      collectedRef.current = { ...collectedRef.current, height: cm }
      if (updateMode) { await saveUpdate(); return }
      setStep(1)
      await addAiMessage(strings.weight)
    } else if (currentStep === 'weight') {
      const kg = parseWeightToKg(val)
      if (kg === null || kg < 20 || kg > 300) {
        await addAiMessage(strings.errorWeight)
        return
      }
      collectedRef.current = { ...collectedRef.current, weight: kg }
      if (updateMode) { await saveUpdate(); return }
      setStep(2)
      await addAiMessage(strings.age)
    } else if (currentStep === 'age') {
      let n = parseInt(val, 10)
      if (!isNaN(n) && n >= 1900 && n <= new Date().getFullYear() - 10) {
        n = new Date().getFullYear() - n
      }
      if (isNaN(n) || n < 10 || n > 120) {
        await addAiMessage(strings.errorAge)
        return
      }
      collectedRef.current = { ...collectedRef.current, age: n }
      if (updateMode) { await saveUpdate(); return }
      setStep(3)
      await addAiMessage(strings.sex)
    }
  }

  async function handleSexSelect(value, label) {
    collectedRef.current = { ...collectedRef.current, sex: value }
    setMessages((m) => [...m, { type: 'user', text: label }])
    if (updateMode) {
      await saveUpdate()
    } else {
      setStep(4)
      await addAiMessage(strings.activity)
    }
  }

  async function handleActivitySelect(value, label) {
    const finalCollected = { ...collectedRef.current, activityLevel: value }
    collectedRef.current = finalCollected
    setMessages((m) => [...m, { type: 'user', text: label }])
    if (updateMode) {
      await saveUpdate()
    } else {
      setStep(5)
      await addAiMessage(strings.saving)
      try {
        await api.profile.update({ body: finalCollected })
        setMessages((m) => { const u = [...m]; u[u.length - 1] = { type: 'ai', text: strings.done }; return u })
        setDone(true)
        onComplete?.()
      } catch {
        setMessages((m) => [...m, { type: 'ai', text: strings.errorSave }])
      }
    }
  }

  // Save a single-field update and show confirmation
  async function saveUpdate() {
    setStep(5)
    await addAiMessage(strings.saving)
    try {
      await api.profile.update({ body: collectedRef.current })
      setMessages((m) => { const u = [...m]; u[u.length - 1] = { type: 'ai', text: strings.updateSaved }; return u })
      setDone(true)
      onComplete?.()
    } catch {
      setMessages((m) => [...m, { type: 'ai', text: strings.errorSave }])
    }
  }

  // Update-mode: user picks which field to change
  async function handleUpdateField(field) {
    const qMap = { height: strings.updateHeightQ, weight: strings.updateWeightQ, age: strings.updateAgeQ, sex: strings.updateSexQ, activity: strings.updateActivityQ }
    const stepMap = { height: 0, weight: 1, age: 2, sex: 3, activity: 4 }
    setMessages((m) => [...m, { type: 'user', text: strings['update' + field.charAt(0).toUpperCase() + field.slice(1)] }])
    setStep(stepMap[field])
    await addAiMessage(qMap[field])
  }

  if (!open) return null

  const currentStep = STEPS[step]
  const showTextInput = ['height', 'weight', 'age'].includes(currentStep) && !isTyping && !(updateMode && step === 5)
  const showSexButtons = currentStep === 'sex' && !isTyping
  const showActivityButtons = currentStep === 'activity' && !isTyping
  const showUpdateButtons = updateMode && step === 5 && !isTyping && !done

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
              <SparkleIcon size={16} color="white" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ink1">{strings.title}</p>
              <p className="text-[11px] text-ink3">{strings.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sand transition-colors text-ink3 cursor-pointer"
            aria-label="Close"
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
            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'ai' && (
                <div className="w-6 h-6 rounded-[8px] bg-orange-lt flex items-center justify-center shrink-0 mr-2 mt-1">
                  <SparkleIcon size={12} color="#E07B4A" />
                </div>
              )}
              <div className={`max-w-[78%] rounded-[16px] px-4 py-[10px] text-[13px] leading-[1.55] whitespace-pre-wrap ${
                msg.type === 'user'
                  ? 'bg-orange text-white rounded-br-[4px]'
                  : 'bg-sand text-ink1 rounded-bl-[4px]'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && <TypingIndicator />}

          {/* Sex quick-reply buttons */}
          {showSexButtons && (
            <div className="flex gap-2 flex-wrap pl-8">
              {sexOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSexSelect(opt.value, opt.label)}
                  className="px-4 py-[8px] rounded-pill border border-orange text-orange text-[13px] font-medium hover:bg-orange hover:text-white transition-colors cursor-pointer"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Activity quick-reply buttons */}
          {showActivityButtons && (
            <div className="flex flex-col gap-2 pl-8">
              {activityOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleActivitySelect(opt.value, opt.label)}
                  className="w-full px-4 py-[9px] rounded-[10px] border border-orange text-orange text-[13px] font-medium hover:bg-orange hover:text-white transition-colors cursor-pointer text-left"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Update-mode field selector buttons */}
          {showUpdateButtons && (
            <div className="flex flex-col gap-2 pl-8">
              {[
                { field: 'height', label: strings.updateHeight },
                { field: 'weight', label: strings.updateWeight },
                { field: 'age', label: strings.updateAge },
                { field: 'sex', label: strings.updateSex },
                { field: 'activity', label: strings.updateActivity },
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => handleUpdateField(field)}
                  className="w-full px-4 py-[9px] rounded-[10px] border border-orange text-orange text-[13px] font-medium hover:bg-orange hover:text-white transition-colors cursor-pointer text-left"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={onClose}
                className="w-full px-4 py-[9px] rounded-[10px] border border-border text-ink3 text-[13px] font-medium hover:bg-sand transition-colors cursor-pointer text-left"
              >
                {strings.updateDone}
              </button>
            </div>
          )}

          {/* Done close button */}
          {done && (
            <div className="pl-8">
              <button
                onClick={onClose}
                className="w-full bg-orange text-white text-[13px] font-semibold rounded-[10px] py-[10px] hover:opacity-90 transition-opacity cursor-pointer mt-2"
              >
                {strings.close}
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Text input — height, weight, age only */}
        {showTextInput && (
          <div className="px-4 py-4 border-t border-border shrink-0">
            <div className="flex items-center gap-2 border border-border rounded-pill px-4 py-[10px] bg-page focus-within:border-orange transition-colors">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder={
                  currentStep === 'height' ? strings.placeholderHeight
                  : currentStep === 'weight' ? strings.placeholderWeight
                  : strings.placeholderAge
                }
                className="flex-1 text-[13px] text-ink1 placeholder:text-ink4 outline-none bg-transparent"
                type={currentStep === 'age' ? 'number' : 'text'}
                inputMode={currentStep === 'age' ? 'numeric' : 'text'}
                autoFocus
              />
              <button
                onClick={handleTextSubmit}
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
