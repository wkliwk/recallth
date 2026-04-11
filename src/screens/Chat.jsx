import { useState } from 'react'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import BottomNav from '../components/BottomNav'
import Chip from '../components/Chip'
import ChatBubble from '../components/ChatBubble'
import InputPill from '../components/InputPill'

const suggestions = [
  'My stack today',
  'Interactions?',
  'Best timing',
  'Add supplement',
  'Side effects',
  "What's new?",
]

const sampleMessages = [
  {
    type: 'ai',
    text: "Here's your stack for today \u2014 Creatine pre-workout, HMB post, EPA with meals, Superfood in the morning.",
  },
  {
    type: 'user',
    text: 'Should I move HMB to before bed?',
  },
  {
    type: 'ai',
    text: 'Great call \u2014 HMB at night supports overnight muscle repair. Try it for a week and track how recovery feels.',
  },
  {
    type: 'user',
    text: 'Any interactions I should know about?',
  },
  {
    type: 'ai',
    text: 'Your stack looks clean. EPA and Creatine actually work well together \u2014 no conflicts detected.',
  },
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
  const [active, setActive] = useState(false)

  const handleChipClick = () => {
    setActive(true)
  }

  const handleSend = () => {
    setActive(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-page">
      {/* Header */}
      {active ? (
        <OrangeHeader subtitle="Stack review" title="Today's plan" />
      ) : (
        <OrangeHeader
          title="Ricky 👋"
          subtitle="Good morning"
          pill="New chat"
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
          {sampleMessages.map((msg, i) => (
            <ChatBubble key={i} type={msg.type}>
              {msg.text}
            </ChatBubble>
          ))}
          <TypingIndicator />
        </div>
      ) : (
        /* ---- Empty state: chips + illustration ---- */
        <div className="flex-1 flex flex-col">
          {/* Chip row */}
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {suggestions.map((label) => (
              <Chip key={label} onClick={handleChipClick}>
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
        <InputPill onSend={handleSend} />
      </div>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
