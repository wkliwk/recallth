import { useState } from 'react'

export default function AccordionSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`rounded-[16px] px-[18px] py-[14px] cursor-pointer transition-colors ${
        open ? 'bg-orange-lt' : 'bg-white'
      }`}
      onClick={() => setOpen((prev) => !prev)}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span
          className={`w-[5px] h-[5px] rounded-full shrink-0 ${
            open ? 'bg-orange-md' : 'bg-ink3'
          }`}
        />
        <span
          className={`text-[13px] font-medium ${
            open ? 'text-orange-dk' : 'text-ink2'
          }`}
        >
          {title}
        </span>
      </div>

      {/* Content */}
      {open && children && (
        <div className="mt-2 pl-[13px]" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  )
}
