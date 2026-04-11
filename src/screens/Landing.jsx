import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import WordmarkCanvas from '../components/WordmarkCanvas'
import Wave from '../components/Wave'
import StatStrip from '../components/StatStrip'
import ChatBubble from '../components/ChatBubble'
import SuppCard from '../components/SuppCard'

/* ------------------------------------------------------------------ */
/*  SVG grain texture                                                  */
/* ------------------------------------------------------------------ */
const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`

/* ------------------------------------------------------------------ */
/*  Shared animation variants                                          */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

const fadeLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
}

const fadeRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
}

const scaleUp = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0 },
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}

const staggerContainerSlow = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

const VP = { once: true, amount: 0.2 }

/* ------------------------------------------------------------------ */
/*  Section badge                                                      */
/* ------------------------------------------------------------------ */
function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill bg-orange-lt text-orange-dk text-[12px] font-medium px-3 py-[5px] mb-4">
      <span className="w-[6px] h-[6px] rounded-full bg-orange" />
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature card                                                       */
/* ------------------------------------------------------------------ */
function FeatureCard({ emoji, title, desc }) {
  return (
    <motion.div
      className="bg-white border border-border rounded-[24px] p-7 hover:shadow-[0_16px_48px_rgba(224,123,74,0.1)] hover:-translate-y-1 transition-all duration-300"
      variants={scaleUp}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="w-[44px] h-[44px] bg-orange-lt rounded-[14px] flex items-center justify-center text-[20px] mb-4">
        {emoji}
      </div>
      <h3 className="text-[17px] font-medium text-ink1 mb-2">{title}</h3>
      <p className="text-[14px] font-light text-ink2 leading-relaxed">{desc}</p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Nav bar                                                            */
/* ------------------------------------------------------------------ */
function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-100 hidden md:flex items-center justify-between px-8 py-4 bg-orange/95 backdrop-blur-sm">
      <span className="text-white/80 text-[14px] font-medium tracking-[0.08em] uppercase select-none">
        recallth
      </span>
      <div className="flex items-center gap-6">
        <a href="#features" className="text-white/70 text-[14px] hover:text-white transition-colors">Features</a>
        <a href="#chat" className="text-white/70 text-[14px] hover:text-white transition-colors">Chat</a>
        <a href="#cabinet" className="text-white/70 text-[14px] hover:text-white transition-colors">Cabinet</a>
        <a
          href="#cta"
          className="rounded-pill bg-white text-orange-dk text-[14px] font-medium px-5 py-[8px] hover:bg-white/90 transition-colors"
        >
          Get started
        </a>
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Landing component                                             */
/* ------------------------------------------------------------------ */
export default function Landing() {
  const [heroReady, setHeroReady] = useState(false)
  const heroRef = useRef(null)

  const heroFadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (delay) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut', delay },
    }),
  }

  return (
    <>
      <NavBar />

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section className="relative min-h-screen bg-orange flex flex-col items-center justify-center px-6 overflow-hidden" style={{ padding: '80px 24px 120px' }}>
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_SVG, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }}
        />

        <div className="w-full max-w-[640px] mb-10 z-10">
          <WordmarkCanvas onComplete={() => setHeroReady(true)} />
        </div>

        <div ref={heroRef} className="text-center max-w-[520px] z-10">
          <motion.h1
            className="font-display leading-[1.1] text-white mb-5"
            style={{ fontSize: 'clamp(36px, 6vw, 56px)' }}
            initial="hidden"
            animate={heroReady ? 'visible' : 'hidden'}
            variants={heroFadeUp}
            custom={0}
          >
            Your stack, <em className="opacity-65">finally</em> clear.
          </motion.h1>

          <motion.p
            className="text-white/65 font-light mb-8 whitespace-pre-line"
            style={{ fontSize: 'clamp(14px, 2vw, 17px)' }}
            initial="hidden"
            animate={heroReady ? 'visible' : 'hidden'}
            variants={heroFadeUp}
            custom={0.3}
          >
            {'Supplement tracking that thinks alongside you.\nAI-powered memory for serious athletes.'}
          </motion.p>

          <motion.div
            initial="hidden"
            animate={heroReady ? 'visible' : 'hidden'}
            variants={heroFadeUp}
            custom={0.5}
          >
            <div className="flex gap-3 justify-center flex-wrap">
              <a href="#cta" className="rounded-pill bg-white text-orange-dk text-[15px] font-medium px-8 py-[14px] no-underline inline-block hover:-translate-y-[2px] hover:opacity-90 transition-all cursor-pointer">
                Get started
              </a>
              <a
                href="#features"
                className="rounded-pill text-white text-[15px] px-8 py-[14px] no-underline inline-block hover:-translate-y-[2px] transition-all cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                Learn more
              </a>
            </div>
          </motion.div>

          <motion.div
            className="mt-12 max-w-[340px] mx-auto"
            initial="hidden"
            animate={heroReady ? 'visible' : 'hidden'}
            variants={heroFadeUp}
            custom={0.7}
          >
            <StatStrip
              stats={[
                { value: '5', label: 'Supps' },
                { value: '0', label: 'Conflicts' },
                { value: 'AI', label: 'Powered' },
                { value: '14d', label: 'Streak' },
              ]}
            />
          </motion.div>
        </div>

        <div className="absolute -bottom-[2px] left-0 right-0 z-10">
          <Wave />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES                                                     */}
      {/* ============================================================ */}
      <section id="features" className="bg-page py-[100px] px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            className="mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            variants={fadeLeft}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <Badge>Why recallth</Badge>
            <h2
              className="font-display text-ink1 mb-3"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
            >
              Everything your stack needs
            </h2>
            <p className="text-[16px] text-ink2 font-light leading-[1.7] max-w-[480px]">
              From tracking to timing to conflict-checking — all in one place, always ready to answer.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            variants={staggerContainer}
          >
            <FeatureCard
              emoji="&#x1F9E0;"
              title="AI-powered chat"
              desc="Ask anything about your stack. Timing, interactions, doses — get instant, evidence-backed answers."
            />
            <FeatureCard
              emoji="&#x1F48A;"
              title="Smart cabinet"
              desc="Your supplements, organised and tracked. One glance to see what you take, when, and why."
            />
            <FeatureCard
              emoji="&#x26A1;"
              title="Conflict detection"
              desc="Automatically checks your full stack for harmful interactions before you take anything."
            />
            <FeatureCard
              emoji="&#x1F4C5;"
              title="Daily schedule"
              desc="A personalised protocol built around your routine. Morning, pre-workout, night — all mapped out."
            />
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CHAT PREVIEW                                                 */}
      {/* ============================================================ */}
      <section id="chat" className="bg-sand py-[100px] px-6">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[60px] items-center">
          {/* Left column — slides in from left */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            variants={fadeLeft}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <Badge>AI Chat</Badge>
            <h2
              className="font-display text-ink1 mb-3 whitespace-pre-line"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
            >
              {'Ask anything\nabout your stack'}
            </h2>
            <p className="text-[16px] text-ink2 font-light leading-[1.7] mb-8 max-w-[480px]">
              Your personal supplement expert, available any time. No more guessing — just ask.
            </p>
            <button className="rounded-pill bg-orange text-white text-[15px] font-medium px-7 py-[14px] cursor-pointer hover:bg-orange-dk transition-colors">
              Try it free
            </button>
          </motion.div>

          {/* Right column — slides in from right */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            variants={fadeRight}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
          >
            <div className="bg-white rounded-[24px] border border-border overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
              <div className="bg-orange px-5 py-4">
                <p className="text-white text-[15px] font-medium">Chat</p>
                <p className="text-white/65 text-[12px]">Good morning, Ricky 👋</p>
              </div>

              <motion.div
                className="p-4 flex flex-col gap-3 min-h-[260px]"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={staggerContainerSlow}
              >
                <motion.div variants={fadeUp} transition={{ duration: 0.4 }}>
                  <ChatBubble type="user">Can I take creatine and HMB together?</ChatBubble>
                </motion.div>
                <motion.div variants={fadeUp} transition={{ duration: 0.4 }}>
                  <ChatBubble type="ai">
                    Yes! Creatine and HMB complement each other well. Creatine boosts ATP recycling while HMB reduces muscle protein breakdown. No known interactions — safe to stack.
                  </ChatBubble>
                </motion.div>
                <motion.div variants={fadeUp} transition={{ duration: 0.4 }}>
                  <ChatBubble type="user">Best time to take them?</ChatBubble>
                </motion.div>
                <motion.div variants={fadeUp} transition={{ duration: 0.4 }}>
                  <ChatBubble type="ai">
                    Take creatine post-workout with carbs for better uptake. HMB is best 30-60 min before training. On rest days, take both with breakfast.
                  </ChatBubble>
                </motion.div>
              </motion.div>

              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 border border-border rounded-pill px-4 py-[10px]">
                  <span className="flex-1 text-[13px] text-ink3">Ask about your stack...</span>
                  <div className="w-[32px] h-[32px] rounded-full bg-orange flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CABINET PREVIEW                                              */}
      {/* ============================================================ */}
      <section id="cabinet" className="bg-page py-[100px] px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            className="mb-10"
            style={{ maxWidth: 560 }}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            variants={fadeLeft}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <Badge>Cabinet</Badge>
            <h2
              className="font-display text-ink1 mb-3 whitespace-pre-line"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
            >
              {'Your full stack,\nin one place'}
            </h2>
            <p className="text-[16px] text-ink2 font-light leading-[1.7] max-w-[480px]">
              Every supplement tracked with dose and timing. No spreadsheets, no guesswork.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col gap-[10px] mt-12"
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            variants={staggerContainer}
          >
            {[
              { letter: 'C', name: 'Purple K Creatine', meta: 'Pre-workout', dose: '3 g' },
              { letter: 'H', name: 'Ballistic HMB 3.0', meta: 'Post-workout', dose: '1.5 g' },
              { letter: 'E', name: 'EPA Concentrate', meta: 'With meals', dose: '2 g' },
              { letter: 'S', name: 'All-In Superfood', meta: 'Morning', dose: '1 scoop' },
              { letter: 'W', name: 'ISO Whey Gold', meta: 'Post-workout', dose: '30 g' },
            ].map((s) => (
              <motion.div
                key={s.letter}
                variants={fadeUp}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <SuppCard {...s} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA                                                          */}
      {/* ============================================================ */}
      <section id="cta" className="relative bg-orange py-[100px] px-6 overflow-hidden">
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_SVG, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }}
        />

        <motion.div
          className="relative z-10 text-center max-w-[600px] mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={VP}
          variants={staggerContainer}
        >
          <motion.h2
            className="font-display text-white mb-4 whitespace-pre-line"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {'Ready to know\nyour stack?'}
          </motion.h2>
          <motion.p
            className="text-white/65 text-[16px] font-light mb-8 max-w-[440px] mx-auto"
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            Join athletes who never guess about their supplements again.
          </motion.p>
          <motion.div
            className="flex gap-3 justify-center flex-wrap"
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <a href="#" className="rounded-pill bg-white text-orange-dk text-[15px] font-medium px-8 py-[14px] no-underline inline-block hover:-translate-y-[2px] hover:opacity-90 transition-all cursor-pointer">
              Get started — it's free
            </a>
            <a
              href="#"
              className="rounded-pill text-white text-[15px] px-8 py-[14px] no-underline inline-block hover:-translate-y-[2px] transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              Log in
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <motion.footer
        className="bg-ink1 px-10 py-10 flex items-center justify-between flex-wrap gap-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-white/60 text-[14px] font-medium uppercase tracking-[0.1em]">
          recallth
        </span>
        <span className="text-white/30 text-[12px]">
          &copy; {new Date().getFullYear()} recallth. All rights reserved.
        </span>
      </motion.footer>
    </>
  )
}
