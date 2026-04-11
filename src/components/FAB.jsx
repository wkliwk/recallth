export default function FAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-[80px] right-5 w-[42px] h-[42px] rounded-full bg-orange flex items-center justify-center cursor-pointer shadow-lg z-50"
      aria-label="AI assistant"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  )
}
