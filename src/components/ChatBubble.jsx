export default function ChatBubble({ type = 'ai', image, children }) {
  const isAi = type === 'ai'

  return (
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[82%] px-[14px] py-[11px] text-[13px] ${
          isAi
            ? 'bg-orange-lt border border-orange-md text-ink1 rounded-[16px_16px_16px_4px]'
            : 'bg-orange text-white rounded-[16px_16px_4px_16px]'
        }`}
      >
        {image && (
          <img src={image} alt="Attached" className="w-full max-w-[200px] rounded-[8px] mb-2" />
        )}
        {children}
      </div>
    </div>
  )
}
