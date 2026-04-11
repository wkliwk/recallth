import { useState } from 'react'

export default function InputPill({ placeholder = 'Ask anything...', onSend }) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    if (value.trim() && onSend) {
      onSend(value.trim())
      setValue('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-center bg-white border-[1.5px] border-border-md rounded-pill px-4 py-2 gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-[13px] text-ink1 placeholder:text-ink4"
      />
      <button
        onClick={handleSend}
        className="w-6 h-6 rounded-full bg-orange flex items-center justify-center shrink-0 cursor-pointer"
        aria-label="Send message"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 6h9M7 3l3 3-3 3"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
