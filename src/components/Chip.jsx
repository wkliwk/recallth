export default function Chip({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-orange-lt border border-orange-md text-orange-dk rounded-pill px-[14px] py-[6px] text-[12px] cursor-pointer"
    >
      {children}
    </button>
  )
}
