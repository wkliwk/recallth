import { useState, useRef, useCallback } from 'react'

function processFile(file, setImagePreview) {
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
}

export default function InputPill({ placeholder = 'Ask anything...', onSend }) {
  const [value, setValue] = useState('')
  const [imagePreview, setImagePreview] = useState(null) // { base64, mimeType, url }
  const fileRef = useRef(null)

  const handleSend = () => {
    if ((!value.trim() && !imagePreview) || !onSend) return
    onSend(value.trim(), imagePreview ? { image: imagePreview.base64, imageMimeType: imagePreview.mimeType } : undefined)
    setValue('')
    setImagePreview(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        processFile(item.getAsFile(), setImagePreview)
        return
      }
    }
  }, [])

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    processFile(file, setImagePreview)
    e.target.value = ''
  }

  return (
    <div>
      {/* Image preview */}
      {imagePreview && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="relative">
            <img src={imagePreview.url} alt="Attached" className="w-14 h-14 rounded-[10px] object-cover border border-border" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ink1 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer"
            >
              &times;
            </button>
          </div>
          <span className="text-[12px] text-ink3">Image attached</span>
        </div>
      )}
      <div className="flex items-center bg-white border-[1.5px] border-border-md rounded-pill px-4 py-2 gap-2">
        {/* Image upload button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer text-ink3 hover:text-orange transition-colors"
          aria-label="Attach image"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={imagePreview ? 'Ask about this supplement...' : placeholder}
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
    </div>
  )
}
