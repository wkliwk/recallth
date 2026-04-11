import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import BottomNav from '../components/BottomNav'
import AccordionSection from '../components/AccordionSection'

const stats = [
  { value: '5', label: 'Supps' },
  { value: '0', label: 'Conflicts' },
  { value: '14d', label: 'Streak' },
]

const quickActions = ['History', 'Schedule', 'Settings']

export default function Profile() {
  return (
    <div className="min-h-screen bg-page pb-24">
      <OrangeHeader
        avatar={true}
        title="Ricky"
        subtitle="ricky@recallth.com"
        pill="Edit"
        hasStats={true}
        stats={stats}
      />

      <Wave />

      {/* Quick action pills */}
      <div className="flex gap-3 px-5 py-4">
        {quickActions.map((label) => (
          <button
            key={label}
            className="flex-1 bg-white border-[1.5px] border-border-md rounded-pill py-[10px] text-center text-[12px] font-medium text-ink2"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Accordion sections */}
      <div className="flex flex-col gap-3 px-5">
        <AccordionSection title="About me" defaultOpen={true}>
          <div className="flex flex-col gap-2 text-[12px] text-ink2">
            <p>Goals: muscle gain, performance</p>
            <p>Training: 6x / week — gym, basketball, skiing</p>
            <p>Diet: high protein, low vegetable intake</p>
          </div>
        </AccordionSection>

        <AccordionSection title="Health data">
          <p className="text-[12px] text-ink2">
            Blood work, vitals, and health metrics
          </p>
        </AccordionSection>

        <AccordionSection title="Advanced">
          <p className="text-[12px] text-ink2">
            Data export, account settings, and preferences
          </p>
        </AccordionSection>
      </div>

      <BottomNav />
    </div>
  )
}
