import { useState, useRef, useEffect } from 'react'
import { chatService } from '../services/chat'

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

function ChatPanel({ onClose }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((m) => [...m, { type: 'user', text }])
    setIsTyping(true)

    try {
      const res = await chatService.send(text, conversationId)
      if (res.success && res.data) {
        setConversationId(res.data.conversationId)
        setMessages((m) => [...m, { type: 'ai', text: res.data.reply }])
      }
    } catch {
      setMessages((m) => [
        ...m,
        { type: 'ai', text: 'Something went wrong. Try again.' },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
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
              <p className="text-[14px] font-semibold text-ink1">Ask Recallth AI</p>
              <p className="text-[11px] text-ink3">I remember your full health profile</p>
            </div>
          </div>
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && !isTyping && (
            <p className="text-[13px] text-ink3 text-center mt-8">
              Ask anything about your supplement stack...
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'ai' && (
                <div className="w-6 h-6 rounded-[8px] bg-orange-lt flex items-center justify-center shrink-0 mr-2 mt-1">
                  <SparkleIcon size={12} color="#E07B4A" />
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-[16px] px-4 py-[10px] text-[13px] leading-[1.55] ${
                  msg.type === 'user'
                    ? 'bg-orange text-white rounded-br-[4px]'
                    : 'bg-sand text-ink1 rounded-bl-[4px]'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-border shrink-0">
          <div className="flex items-center gap-2 border border-border rounded-pill px-4 py-[10px] bg-page focus-within:border-orange transition-colors">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask anything about your stack…"
              className="flex-1 text-[13px] text-ink1 placeholder:text-ink4 outline-none bg-transparent"
              autoFocus
            />
            <button
              onClick={send}
              disabled={!input.trim()}
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

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-5 z-40 w-[56px] h-[56px] rounded-full bg-orange shadow-[0_8px_24px_rgba(224,123,74,0.45)] flex items-center justify-center cursor-pointer hover:bg-orange-dk hover:scale-105 transition-all"
          aria-label="Open AI chat"
        >
          <SparkleIcon size={22} color="white" />
        </button>
      )}
      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  )
}
