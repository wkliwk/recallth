export default function FAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-[80px] right-5 w-[42px] h-[42px] rounded-full bg-orange flex items-center justify-center cursor-pointer shadow-lg z-50"
      aria-label="AI assistant"
    >
      <span className="w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center text-[8px] font-semibold text-orange">
        AI
      </span>
    </button>
  )
}
