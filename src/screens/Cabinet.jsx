import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import BottomNav from '../components/BottomNav'
import SuppCard from '../components/SuppCard'
import FAB from '../components/FAB'

const supplements = [
  { letter: 'C', name: 'Purple K Creatine', meta: 'Pre-workout', dose: '3 g' },
  { letter: 'H', name: 'Ballistic HMB 3.0', meta: 'Post-workout', dose: '1.5 g' },
  { letter: 'E', name: 'EPA Concentrate', meta: 'With meals', dose: '2 g' },
  { letter: 'S', name: 'All-In Superfood', meta: 'Morning', dose: '1 scoop' },
  { letter: 'W', name: 'ISO Whey Gold', meta: 'Post-workout', dose: '30 g' },
]

const stats = [
  { value: '5', label: 'Active' },
  { value: '0', label: 'Conflicts' },
  { value: '14d', label: 'Streak' },
]

export default function Cabinet() {
  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <OrangeHeader
        title="Cabinet"
        subtitle="5 supplements · all active"
        pill="+ Add"
        hasStats={true}
        stats={stats}
      />

      {/* Wave separator */}
      <div className="-mt-[40px]">
        <Wave />
      </div>

      {/* Search input */}
      <div className="px-5 py-4">
        <div className="relative">
          {/* Search icon */}
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-ink3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>

          <input
            type="text"
            placeholder="Search supplements..."
            className="w-full bg-white border-[1.5px] border-border-md rounded-pill py-[10px] pr-4 pl-10 text-[11px] text-ink1 placeholder:text-ink4 outline-none"
          />
        </div>
      </div>

      {/* Supplement card list */}
      <div className="flex flex-col gap-3 px-5 pb-[100px]">
        {supplements.map((supp) => (
          <SuppCard
            key={supp.letter}
            letter={supp.letter}
            name={supp.name}
            meta={supp.meta}
            dose={supp.dose}
          />
        ))}
      </div>

      {/* FAB */}
      <FAB />

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
