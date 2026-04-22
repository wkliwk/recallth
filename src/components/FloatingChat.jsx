import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { chatService } from '../services/chat'
import { useLanguage } from '../context/LanguageContext'
import { useAiUsage } from '../context/AiUsageContext'
import { useChatPage } from '../context/ChatPageContext'
import { renderMarkdown } from '../utils/renderMarkdown'

function SparkleIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/>
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

function formatRelativeDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Map backend message format → frontend display format
function mapBackendMessages(messages) {
  return (messages || []).map(msg => ({
    type: msg.role === 'user' ? 'user' : 'ai',
    text: msg.content || '',
    actions: msg.actions || [],
  }))
}

function HistoryView({ onBack, onSelect, onNewChat, t }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await chatService.history()
        setConversations(res?.data?.conversations || [])
      } catch {
        setConversations([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sand transition-colors text-ink2 cursor-pointer"
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <p className="text-[14px] font-semibold text-ink1">{t('chatHistory')}</p>
        <div className="w-8 h-8" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col gap-2 px-4 pt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-[12px] bg-sand animate-pulse" />
            ))}
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <p className="text-[13px] text-ink3 text-center mt-12 px-4">{t('chatNoHistory')}</p>
        )}
        {!loading && conversations.map((conv) => (
          <button
            key={conv._id}
            onClick={() => onSelect(conv._id)}
            className="w-full text-left px-4 py-3 flex flex-col gap-[3px] hover:bg-sand transition-colors border-b border-border last:border-0 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-ink1 truncate flex-1">
                {conv.title || t('chatUntitled')}
              </p>
              <p className="text-[11px] text-ink4 shrink-0">{formatRelativeDate(conv.createdAt)}</p>
            </div>
            {conv.summary && (
              <p className="text-[12px] text-ink3 line-clamp-1">{conv.summary}</p>
            )}
            <p className="text-[11px] text-ink4">{conv.messageCount} {conv.messageCount === 1 ? 'message' : 'messages'}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function ChatPanel({
  onClose, pageContext,
  conversationId, setConversationId,
  messages, setMessages,
  appliedActions, setAppliedActions,
  contextInjected, setContextInjected,
}) {
  const { t } = useLanguage()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [view, setView] = useState('chat') // 'chat' | 'history'
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('recallth_chat_width')
    return saved ? Math.max(320, Math.min(720, parseInt(saved))) : 420
  })
  const { showUsage } = useAiUsage()
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  function handleResizePointerDown(e) {
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const startX = e.clientX
    const startWidth = panelWidth
    const onMove = (ev) => {
      setPanelWidth(Math.max(320, Math.min(720, startWidth + (startX - ev.clientX))))
    }
    const onUp = (ev) => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      const final = Math.max(320, Math.min(720, startWidth + (startX - ev.clientX)))
      localStorage.setItem('recallth_chat_width', String(final))
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  const panelStyle = {
    width: window.innerWidth >= 768 ? panelWidth : '100%',
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const processFile = useCallback((file) => {
    if (!file || file.size > 5 * 1024 * 1024) return
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const base64 = dataUrl.split(',')[1]
      setImagePreview({ base64, mimeType: file.type, url: dataUrl })
    }
    reader.readAsDataURL(file)
  }, [])

  const handleImageSelect = (e) => {
    processFile(e.target.files?.[0])
    e.target.value = ''
  }

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        processFile(item.getAsFile())
        return
      }
    }
  }, [processFile])

  const send = async () => {
    const text = input.trim()
    if (!text && !imagePreview) return
    const imgData = imagePreview ? { image: imagePreview.base64, imageMimeType: imagePreview.mimeType } : undefined
    const userMsg = { type: 'user', text: text || t('chatSentImage'), image: imagePreview?.url }
    setInput('')
    setImagePreview(null)
    setMessages((m) => [...m, userMsg])
    setIsTyping(true)

    // Prepend page context as hidden system block on first message of a new session
    let messageText = text || t('chatImagePrompt')
    if (pageContext?.systemPrompt && !contextInjected && !conversationId) {
      messageText = `${pageContext.systemPrompt}\n\n---\n\nUser: ${messageText}`
      setContextInjected(true)
    }

    try {
      const res = await chatService.send(messageText, conversationId, imgData)
      if (res.success && res.data) {
        setConversationId(res.data.conversationId)
        setMessages((m) => [...m, {
          type: 'ai',
          text: res.data.message?.content ?? t('chatNoResponse'),
          actions: res.data.actions || [],
        }])
        if (res.data.aiUsage) showUsage(res.data.aiUsage, 'chat', {
          input: text || t('chatImagePrompt'),
          output: res.data.message?.content,
        })
      }
    } catch {
      setMessages((m) => [...m, { type: 'ai', text: t('chatError') }])
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
        pageContext?.onActionApplied?.({ type: action.type, data: res.data })
      }
    } catch { /* ignore */ }
  }

  async function handleSelectConversation(id) {
    setLoadingConversation(true)
    try {
      const res = await chatService.getConversation(id)
      const conv = res?.data ?? res
      setConversationId(conv._id)
      setMessages(mapBackendMessages(conv.messages))
      setContextInjected(true) // don't re-inject page context when resuming
      setAppliedActions(new Set(
        (conv.messages || []).flatMap((msg, mi) =>
          (msg.actions || [])
            .map((a, ai) => (a.applied ? `${mi}-${ai}` : null))
            .filter(Boolean)
        )
      ))
    } catch { /* ignore */ } finally {
      setLoadingConversation(false)
      setView('chat')
    }
  }

  function handleNewChat() {
    setConversationId(null)
    setMessages([])
    setAppliedActions(new Set())
    setContextInjected(false)
    setView('chat')
  }

  function handleStartEdit(index, text) {
    setEditingIndex(index)
    setEditingText(text)
  }

  function handleCancelEdit() {
    setEditingIndex(null)
    setEditingText('')
  }

  async function handleConfirmEdit() {
    const trimmed = editingText.trim()
    if (!trimmed) return
    const prior = messages.slice(0, editingIndex)
    const userMsg = { type: 'user', text: trimmed }
    setEditingIndex(null)
    setEditingText('')
    setMessages([...prior, userMsg])
    setConversationId(null)
    setContextInjected(false)
    setAppliedActions(new Set())
    setIsTyping(true)

    let messageText = trimmed
    if (pageContext?.systemPrompt) {
      messageText = `${pageContext.systemPrompt}\n\n---\n\nUser: ${messageText}`
    }

    try {
      const res = await chatService.send(messageText, null)
      if (res.success && res.data) {
        setConversationId(res.data.conversationId)
        setMessages(m => [...m, {
          type: 'ai',
          text: res.data.message?.content ?? t('chatNoResponse'),
          actions: res.data.actions || [],
        }])
        if (res.data.aiUsage) showUsage(res.data.aiUsage, 'chat', { input: trimmed, output: res.data.message?.content })
      }
    } catch {
      setMessages(m => [...m, { type: 'ai', text: t('chatError') }])
    } finally {
      setIsTyping(false)
    }
  }

  // History view
  if (view === 'history') {
    return (
      <div
        className="fixed inset-0 z-[60] flex justify-end"
        style={{ background: 'rgba(42,34,26,0.25)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="h-full bg-white flex flex-col shadow-2xl relative"
          style={{ animation: 'slideIn 0.22s ease-out', ...panelStyle }}
        >
          {/* Resize handle — desktop only */}
          <div
            className="hidden md:block absolute left-0 top-0 bottom-0 w-2 cursor-col-resize group z-10 select-none"
            onPointerDown={handleResizePointerDown}
          >
            <div className="absolute left-[3px] top-1/2 -translate-y-1/2 w-[3px] h-10 rounded-full bg-ink4/20 group-hover:bg-orange/50 transition-colors" />
          </div>
          <HistoryView
            onBack={() => setView('chat')}
            onSelect={handleSelectConversation}
            onNewChat={handleNewChat}
            t={t}
          />
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

  // Chat view
  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end"
      style={{ background: 'rgba(42,34,26,0.25)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="h-full bg-white flex flex-col shadow-2xl relative"
        style={{ animation: 'slideIn 0.22s ease-out', ...panelStyle }}
      >
        {/* Resize handle — desktop only */}
        <div
          className="hidden md:block absolute left-0 top-0 bottom-0 w-2 cursor-col-resize group z-10 select-none"
          onPointerDown={handleResizePointerDown}
        >
          <div className="absolute left-[3px] top-1/2 -translate-y-1/2 w-[3px] h-10 rounded-full bg-ink4/20 group-hover:bg-orange/50 transition-colors" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-orange flex items-center justify-center shrink-0">
              <SparkleIcon size={16} color="white" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ink1">{t('askAI')}</p>
              <p className="text-[11px] text-ink3">
                {pageContext?.title ? pageContext.title : t('askAISubtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* New chat button */}
            <button
              onClick={handleNewChat}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sand transition-colors text-ink3 cursor-pointer"
              aria-label="New chat"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            {/* History button */}
            <button
              onClick={() => setView('history')}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sand transition-colors text-ink3 cursor-pointer"
              aria-label="Conversation history"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <polyline points="12 7 12 12 15 15"/>
              </svg>
            </button>
            {/* Close button */}
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
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {loadingConversation && (
            <div className="flex flex-col gap-2 mt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-10 rounded-[12px] bg-sand animate-pulse ${i % 2 === 0 ? 'ml-12' : 'mr-12'}`} />
              ))}
            </div>
          )}
          {!loadingConversation && messages.length === 0 && !isTyping && (
            <p className="text-[13px] text-ink3 text-center mt-8">
              {pageContext?.placeholder || t('chatAskAnything')}
            </p>
          )}
          {!loadingConversation && messages.map((msg, i) => (
            <div key={i} className={`flex items-end gap-1 ${msg.type === 'user' ? 'justify-end' : 'justify-start'} group`}>
              {msg.type === 'ai' && (
                <div className="w-6 h-6 rounded-[8px] bg-orange-lt flex items-center justify-center shrink-0 mr-1 mb-1">
                  <SparkleIcon size={12} color="#E07B4A" />
                </div>
              )}
              {msg.type === 'user' && editingIndex === i ? (
                <div className="max-w-[85%] flex flex-col gap-2 w-full">
                  <textarea
                    autoFocus
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConfirmEdit() }
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    rows={Math.max(2, editingText.split('\n').length)}
                    className="w-full rounded-[16px] rounded-br-[4px] px-4 py-[10px] text-[13px] leading-[1.55] bg-orange/10 text-ink1 border border-orange/40 outline-none resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={handleCancelEdit} className="px-3 py-1.5 text-[12px] text-ink3 hover:text-ink1 transition-colors cursor-pointer">
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmEdit}
                      disabled={!editingText.trim()}
                      className="px-3 py-1.5 text-[12px] bg-orange text-white rounded-[8px] disabled:opacity-40 cursor-pointer hover:bg-orange-dk transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {msg.type === 'user' && (
                    <button
                      onClick={() => handleStartEdit(i, msg.text)}
                      className="opacity-40 md:opacity-0 md:group-hover:opacity-100 mb-1 w-5 h-5 rounded-full flex items-center justify-center text-ink4 hover:text-ink2 transition-all cursor-pointer shrink-0"
                      aria-label="Edit message"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                  <div
                    className={`max-w-[78%] rounded-[16px] px-4 py-[10px] text-[13px] leading-[1.55] ${
                      msg.type === 'user'
                        ? 'bg-orange text-white rounded-br-[4px]'
                        : 'bg-sand text-ink1 rounded-bl-[4px]'
                    }`}
                  >
                    {msg.image && (
                      <img src={msg.image} alt="Attached" className="w-full max-w-[160px] rounded-[8px] mb-2" />
                    )}
                    {msg.type === 'ai'
                      ? renderMarkdown(msg.text)
                      : <span className="whitespace-pre-wrap">{msg.text}</span>
                    }
                    {msg.actions?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-ink1/10 flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-ink2 uppercase tracking-wide">{t('chatQuickActions')}</span>
                        {msg.actions.map((action, ai) => {
                          const actionKey = `${i}-${ai}`
                          const applied = appliedActions.has(actionKey)
                          return (
                            <button
                              key={ai}
                              onClick={() => handleApplyAction(action, actionKey, i, ai)}
                              disabled={applied}
                              className={`flex items-center gap-1.5 text-left text-[11px] rounded-[8px] px-2 py-[6px] transition-all cursor-pointer ${
                                applied
                                  ? 'bg-[#D4ECD8] text-[#2C5A38]'
                                  : 'bg-orange/10 text-orange hover:bg-orange/20'
                              }`}
                            >
                              {applied ? '✓' : '+'}
                              <span>{action.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-border shrink-0">
          {imagePreview && (
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <img src={imagePreview.url} alt="Attached" className="w-12 h-12 rounded-[8px] object-cover border border-border" />
                <button
                  onClick={() => setImagePreview(null)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-ink1 text-white rounded-full flex items-center justify-center text-[9px] cursor-pointer"
                >
                  &times;
                </button>
              </div>
              <span className="text-[11px] text-ink3">{t('imageAttached')}</span>
            </div>
          )}
          <div className="flex items-center gap-2 border border-border rounded-pill px-4 py-[10px] bg-page focus-within:border-orange transition-colors">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer text-ink3 hover:text-orange transition-colors"
              aria-label="Attach image"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              onPaste={handlePaste}
              placeholder={pageContext?.placeholder || t('chatAskAnything')}
              className="flex-1 text-[13px] text-ink1 placeholder:text-ink4 outline-none bg-transparent"
              autoFocus
            />
            <button
              onClick={send}
              disabled={!input.trim() && !imagePreview}
              className="w-8 h-8 rounded-full bg-orange flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-opacity hover:bg-orange-dk"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        </div>
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

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { pageContext } = useChatPage()
  const [pos, setPos] = useState(() => {
    const saved = localStorage.getItem('recallth_fab_pos')
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 68, y: window.innerHeight - 140 }
  })
  const dragRef = useRef(null)

  // Conversation state lives here so it survives ChatPanel open/close
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [appliedActions, setAppliedActions] = useState(new Set())
  const [contextInjected, setContextInjected] = useState(false)

  // Clear conversation state when page context changes (navigated to different page)
  useEffect(() => {
    setConversationId(null)
    setMessages([])
    setAppliedActions(new Set())
    setContextInjected(false)
  }, [location.pathname])

  // Hide on /chat page (has its own chat UI)
  if (location.pathname === '/chat') return null

  const handlePointerDown = (e) => {
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const startX = e.clientX - pos.x
    const startY = e.clientY - pos.y
    let moved = false

    const onMove = (ev) => {
      const dx = Math.abs(ev.clientX - (startX + pos.x))
      const dy = Math.abs(ev.clientY - (startY + pos.y))
      if (dx > 4 || dy > 4) moved = true

      const size = 48
      const nx = Math.max(0, Math.min(window.innerWidth - size, ev.clientX - startX))
      const ny = Math.max(0, Math.min(window.innerHeight - size, ev.clientY - startY))
      setPos({ x: nx, y: ny })
    }

    const onUp = () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      setPos((prev) => {
        const size = 48
        const sx = prev.x + size / 2 < window.innerWidth / 2 ? 16 : window.innerWidth - size - 16
        const sy = Math.max(16, Math.min(window.innerHeight - size - 16, prev.y))
        const final = { x: sx, y: sy }
        localStorage.setItem('recallth_fab_pos', JSON.stringify(final))
        return final
      })
      if (!moved) setOpen(true)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  return (
    <>
      {!open && (
        <div
          ref={dragRef}
          onPointerDown={handlePointerDown}
          className="fixed z-[999] w-[48px] h-[48px] rounded-full bg-ink1 shadow-[0_6px_20px_rgba(42,34,26,0.3)] flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition-[transform,box-shadow] select-none touch-none"
          style={{ left: pos.x, top: pos.y }}
          aria-label="Open AI chat — drag to move"
        >
          <SparkleIcon size={18} color="white" />
        </div>
      )}
      {open && (
        <ChatPanel
          onClose={() => setOpen(false)}
          pageContext={pageContext}
          conversationId={conversationId}
          setConversationId={setConversationId}
          messages={messages}
          setMessages={setMessages}
          appliedActions={appliedActions}
          setAppliedActions={setAppliedActions}
          contextInjected={contextInjected}
          setContextInjected={setContextInjected}
        />
      )}
    </>
  )
}
