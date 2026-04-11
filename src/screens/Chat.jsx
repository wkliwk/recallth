import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FloatingChat from '../components/FloatingChat'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import BottomNav from '../components/BottomNav'
import Chip from '../components/Chip'
import ChatBubble from '../components/ChatBubble'
import InputPill from '../components/InputPill'
import { chatService } from '../services/chat'

const suggestions = [
  'My stack today',
  'Interactions?',
  'Best timing',
  'Add supplement',
  'Side effects',
  "What's new?",
]

const pastelColors = ['#D4ECD8', '#FAE8D0', '#DAE8F8', '#FDE8DE']

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-orange-lt border border-orange-md rounded-[16px_16px_16px_4px] px-[14px] py-[11px] flex items-center gap-1">
        <span
          className="w-[5px] h-[5px] rounded-full"
          style={{ background: '#DDD8CE' }}
        />
        <span
          className="w-[5px] h-[5px] rounded-full"
          style={{ background: '#DDD8CE' }}
        />
        <span
          className="w-[5px] h-[5px] rounded-full"
          style={{ background: '#DDD8CE' }}
        />
      </div>
    </div>
  )
}

export default function Chat() {
  const [searchParams] = useSearchParams()
  const { email } = useAuth()
  const displayName = email ? email.split('@')[0] : 'there'
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)
  const autoSentRef = useRef(false)

  const active = messages.length > 0 || isTyping

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Handle ?id= param — load existing conversation on mount
  useEffect(() => {
    const id = searchParams.get('id')
    if (!id) return
    chatService
      .getConversation(id)
      .then((res) => {
        if (res.success && res.data) {
          setConversationId(res.data._id)
          const mapped = res.data.messages.map((m) => ({
            type: m.role === 'assistant' ? 'ai' : 'user',
            text: m.content,
          }))
          setMessages(mapped)
        }
      })
      .catch(() => {
        // silently ignore — start fresh on load error
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ?q= param — auto-send message after mount
  useEffect(() => {
    const q = searchParams.get('q')
    if (!q || autoSentRef.current) return
    autoSentRef.current = true
    sendMessage(q)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return

    // Capture current conversationId in closure before any async
    setMessages((prev) => [...prev, { type: 'user', text: trimmed }])
    setIsTyping(true)

    try {
      const res = await chatService.send(trimmed, conversationId)
      if (res.success && res.data) {
        setConversationId(res.data.conversationId)
        setMessages((prev) => [
          ...prev,
          { type: 'ai', text: res.data.reply },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { type: 'ai', text: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setIsTyping(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-page">
      {/* Header */}
      {active ? (
        <OrangeHeader
          subtitle="Stack review"
          title="Today's plan"
          pill="New chat"
          onPillClick={handleNewChat}
        />
      ) : (
        <OrangeHeader
          title={`${displayName} 👋`}
          subtitle="Good morning"
          pill="New chat"
          onPillClick={handleNewChat}
        />
      )}

      {/* Wave separator — sits on top of page bg, overlapping the orange */}
      <div className="-mt-[40px]">
        <Wave />
      </div>

      {/* Content area */}
      {active ? (
        /* ---- Active state: chat messages ---- */
        <div className="flex-1 flex flex-col gap-2 px-5 py-4 overflow-y-auto">
          {messages.map((msg, i) => (
            <ChatBubble key={i} type={msg.type}>
              {msg.text}
            </ChatBubble>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      ) : (
        /* ---- Empty state: chips + illustration ---- */
        <div className="flex-1 flex flex-col">
          {/* Chip row */}
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {suggestions.map((label) => (
              <Chip key={label} onClick={() => sendMessage(label)}>
                {label}
              </Chip>
            ))}
          </div>

          {/* Empty illustration */}
          <div className="flex-1 flex flex-col items-center justify-center px-[60px]">
            <div className="grid grid-cols-2 gap-3">
              {pastelColors.map((color) => (
                <div
                  key={color}
                  className="w-10 h-10 rounded-full"
                  style={{ background: color }}
                />
              ))}
            </div>
            <p className="text-ink3 text-[13px] text-center mt-4">
              Tap a suggestion or ask anything...
            </p>
          </div>
        </div>
      )}

      {/* Sticky input above BottomNav */}
      <div className="sticky bottom-[60px] px-5 py-3 bg-page z-40">
        <InputPill onSend={sendMessage} />
      </div>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
