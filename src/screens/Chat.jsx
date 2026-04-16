import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import ChatBubble from '../components/ChatBubble'
import InputPill from '../components/InputPill'
import { chatService } from '../services/chat'
import { api } from '../services/api'

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2">
        <div className="w-7 h-7 rounded-full bg-orange flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
          </svg>
        </div>
        <div className="bg-sand rounded-[16px] rounded-bl-[4px] px-4 py-3 flex items-center gap-[6px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[6px] h-[6px] rounded-full bg-ink3"
              style={{ animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Relative time ────────────────────────────────────────────────────────────
function useRelativeTime(t) {
  return useCallback((dateStr) => {
    const diffMin = Math.floor((Date.now() - new Date(dateStr)) / 60000)
    if (diffMin < 1) return t('chatJustNow')
    if (diffMin < 60) return `${diffMin}m`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h`
    const diffDay = Math.floor(diffHr / 24)
    return diffDay === 1 ? t('chatYesterday') : `${diffDay}d`
  }, [t])
}

// ── History sidebar ──────────────────────────────────────────────────────────
function HistoryDrawer({ open, onClose, conversations, loading, onSelect, onDelete, activeId, t }) {
  const [search, setSearch] = useState('')
  const relativeTime = useRelativeTime(t)
  const filtered = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-ink1/20"
          onClick={onClose}
        />
      )}
      <div
        className="fixed top-0 left-0 bottom-0 z-[80] w-[300px] bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <h2 className="text-[15px] font-semibold text-ink1">{t('chatConversations')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sand transition-colors text-ink3 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-3 py-3 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('chatSearch')}
              className="w-full bg-page border border-border rounded-[10px] py-[8px] pr-3 pl-9 text-[12px] text-ink1 placeholder:text-ink4 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-2 px-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-[10px] bg-sand h-14" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-ink3">
                {conversations.length === 0 ? t('chatNoConvos') : t('chatNoMatches')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 px-2">
              {filtered.map((c) => (
                <div
                  key={c._id}
                  className={`group flex items-center gap-2 rounded-[10px] px-3 py-[10px] cursor-pointer transition-colors ${
                    c._id === activeId ? 'bg-orange/10' : 'hover:bg-sand'
                  }`}
                  onClick={() => { onSelect(c._id); onClose() }}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium truncate ${c._id === activeId ? 'text-orange' : 'text-ink1'}`}>
                      {c.title || t('conversationFallback')}
                    </p>
                    <p className="text-[11px] text-ink3">
                      {c.createdAt ? relativeTime(c.createdAt) : ''}
                      {c.messageCount != null ? ` · ${c.messageCount} msgs` : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(c._id) }}
                    className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-sand text-ink3 hover:text-[#C05A28] transition-all cursor-pointer shrink-0"
                    aria-label="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/>
                      <path d="M14 11v6"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main Chat component ──────────────────────────────────────────────────────
export default function Chat() {
  const [searchParams] = useSearchParams()
  const { email } = useAuth()
  const { t } = useLanguage()
  const displayName = email ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) : 'there'
  const relativeTime = useRelativeTime(t)

  const SUGGESTIONS = [
    { icon: '💊', label: t('chatSugg1') },
    { icon: '⚡', label: t('chatSugg2') },
    { icon: '🕐', label: t('chatSugg3') },
    { icon: '🏋️', label: t('chatSugg4') },
    { icon: '😴', label: t('chatSugg5') },
    { icon: '🔬', label: t('chatSugg6') },
  ]

  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [conversationTitle, setConversationTitle] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [appliedActions, setAppliedActions] = useState(new Set())

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const bottomRef = useRef(null)
  const autoSentRef = useRef(false)

  const active = messages.length > 0 || isTyping

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await chatService.history()
      const convos = res?.data?.conversations ?? res?.data ?? []
      setHistory(Array.isArray(convos) ? convos : [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const loadConversation = useCallback(async (id) => {
    try {
      const res = await chatService.getConversation(id)
      if (res.success && res.data) {
        setConversationId(res.data._id)
        setConversationTitle(res.data.title || '')
        const mapped = res.data.messages.map((m) => ({
          type: m.role === 'assistant' ? 'ai' : 'user',
          text: m.content,
          actions: m.actions || [],
        }))
        // Restore applied state from persisted actions
        const applied = new Set()
        res.data.messages.forEach((m, mi) => {
          (m.actions || []).forEach((a, ai) => {
            if (a.applied) applied.add(`${mi}-${ai}`)
          })
        })
        setAppliedActions(applied)
        setMessages(mapped)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) loadConversation(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = searchParams.get('q')
    if (!q || autoSentRef.current) return
    autoSentRef.current = true
    sendMessage(q)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (text, imageData) => {
    const trimmed = typeof text === 'string' ? text.trim() : ''
    if (!trimmed && !imageData) return

    const userMsg = {
      type: 'user',
      text: trimmed || t('chatSentImage'),
      image: imageData?.image ? `data:${imageData.imageMimeType};base64,${imageData.image}` : null,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const res = await chatService.send(trimmed || t('chatImagePrompt'), conversationId, imageData)
      if (res.success && res.data) {
        setConversationId(res.data.conversationId)
        setMessages((prev) => [
          ...prev,
          {
            type: 'ai',
            text: res.data.message?.content ?? t('chatNoResponse'),
            actions: res.data.actions || [],
          },
        ])
        if (!conversationId) fetchHistory()
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { type: 'ai', text: t('chatError') },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleApplyAction = async (action, actionKey, messageIndex, actionIndex) => {
    if (appliedActions.has(actionKey)) return
    try {
      const res = await chatService.applyAction(action.type, action.data, {
        conversationId,
        messageIndex,
        actionIndex,
      })
      if (res.success) {
        setAppliedActions((prev) => new Set([...prev, actionKey]))
      }
    } catch {
      // ignore
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setConversationTitle('')
    setIsTyping(false)
  }

  const handleDelete = async (id) => {
    try {
      await api.chat.delete(id)
      setHistory((prev) => prev.filter((c) => c._id !== id))
      if (conversationId === id) handleNewChat()
    } catch {
      // ignore
    }
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  const header = (
    <div className="bg-white border-b border-border px-4 py-3 shrink-0">
      <div className="flex items-center justify-between max-w-[960px] mx-auto">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer text-ink2 hover:bg-sand transition-colors"
          aria-label={t('chatConversations')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-orange flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
            </svg>
          </div>
          <div className="flex-1 mx-2 text-center min-w-0">
            {active && conversationTitle ? (
              <p className="text-[14px] font-semibold text-ink1 truncate">{conversationTitle}</p>
            ) : active ? (
              <p className="text-[14px] font-semibold text-ink1">{t('chatHeaderActive')}</p>
            ) : (
              <p className="text-[14px] font-semibold text-ink1">{t('chatTitle')}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleNewChat}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer text-ink2 hover:bg-sand transition-colors"
          aria-label={t('newChat')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  )

  // ── Empty state ────────────────────────────────────────────────────────────
  const emptyState = (
    <div className="flex-1 flex flex-col px-5">
      <div className="pt-2 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-orange flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-[17px] font-semibold text-ink1">{t('chatGreeting', displayName)}</h2>
            <p className="text-[13px] text-ink2">{t('chatHowCanHelp')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => sendMessage(s.label)}
              className="flex items-center gap-2 bg-white border border-border rounded-[12px] px-3 py-[11px] text-left cursor-pointer hover:border-orange/40 hover:bg-orange/[0.03] transition-colors"
            >
              <span className="text-[16px]">{s.icon}</span>
              <span className="text-[13px] text-ink1 font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-ink2 uppercase tracking-wide">{t('chatRecent')}</p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-[12px] text-orange font-medium cursor-pointer hover:underline"
            >
              {t('chatViewAll')}
            </button>
          </div>
          <div className="flex flex-col gap-[6px]">
            {history.slice(0, 3).map((c) => (
              <button
                key={c._id}
                onClick={() => loadConversation(c._id)}
                className="flex items-center gap-3 bg-white border border-border rounded-[12px] px-3 py-[10px] cursor-pointer hover:border-orange/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-[10px] bg-orange/10 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E07B4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink1 truncate">{c.title || t('conversationFallback')}</p>
                  <p className="text-[11px] text-ink3">{c.createdAt ? relativeTime(c.createdAt) : ''}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink4 shrink-0">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── Active chat messages ───────────────────────────────────────────────────
  const chatMessages = (
    <div className="flex-1 flex flex-col gap-3 px-4 py-4 overflow-y-auto">
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
          {msg.type === 'ai' && (
            <div className="w-7 h-7 rounded-full bg-orange flex items-center justify-center shrink-0 mr-2 mt-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
              </svg>
            </div>
          )}
          <div
            className={`max-w-[78%] rounded-[16px] px-4 py-[10px] text-[13px] leading-[1.6] ${
              msg.type === 'user'
                ? 'bg-orange text-white rounded-br-[4px]'
                : 'bg-white border border-border text-ink1 rounded-bl-[4px]'
            }`}
          >
            {msg.image && (
              <img src={msg.image} alt="Attached" className="w-full max-w-[200px] rounded-[8px] mb-2" />
            )}
            <span className="whitespace-pre-wrap">{msg.text}</span>
            {msg.actions?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-[6px]">
                <span className="text-[11px] font-semibold text-ink2 uppercase tracking-wide">
                  {t('chatQuickActions') || 'Quick actions'}
                </span>
                {msg.actions.map((action, ai) => {
                  const actionKey = `${i}-${ai}`
                  const applied = appliedActions.has(actionKey)
                  return (
                    <button
                      key={ai}
                      onClick={() => handleApplyAction(action, actionKey, i, ai)}
                      disabled={applied}
                      className={`flex items-center gap-2 text-left text-[12px] rounded-[10px] px-3 py-[8px] transition-all cursor-pointer ${
                        applied
                          ? 'bg-[#D4ECD8] text-[#2C5A38] border border-[#2C5A38]/20'
                          : 'bg-orange/10 text-orange border border-orange/20 hover:bg-orange/20'
                      }`}
                    >
                      {applied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      )}
                      <span>{applied ? `${action.label} ✓` : action.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-page">
      {header}

      <div className="flex-1 flex flex-col overflow-hidden">
        {active ? chatMessages : emptyState}
      </div>

      <div className="sticky bottom-[60px] px-4 py-3 bg-page border-t border-border z-40">
        <InputPill
          placeholder={active ? t('chatFollowUp') : t('chatAskAnything')}
          onSend={sendMessage}
        />
      </div>

      <HistoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversations={history}
        loading={historyLoading}
        onSelect={loadConversation}
        onDelete={handleDelete}
        activeId={conversationId}
        t={t}
      />

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
