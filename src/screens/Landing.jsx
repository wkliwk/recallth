import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import WordmarkCanvas from '../components/WordmarkCanvas'
import Wave from '../components/Wave'
import StatStrip from '../components/StatStrip'
import ChatBubble from '../components/ChatBubble'
import SuppCard from '../components/SuppCard'

/* ------------------------------------------------------------------ */
/*  SVG grain texture (data URI)                                       */
/* ------------------------------------------------------------------ */
const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`

/* ------------------------------------------------------------------ */
/*  Scroll-reveal observer hook                                        */
/* ------------------------------------------------------------------ */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15 },
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

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
    <div className="reveal bg-white border border-border rounded-[24px] p-7">
      <div className="w-[44px] h-[44px] bg-orange-lt rounded-[14px] flex items-center justify-center text-[20px] mb-4">
        {emoji}
      </div>
      <h3 className="text-[17px] font-medium text-ink1 mb-2">{title}</h3>
      <p className="text-[14px] font-light text-ink2 leading-relaxed">{desc}</p>
    </div>
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
/*  Buttons (shared between hero & CTA)                                */
/* ------------------------------------------------------------------ */
function HeroButtons() {
  return (
    <div className="flex gap-3 justify-center">
      <button className="rounded-pill bg-white text-orange-dk text-[15px] font-medium px-8 py-[14px] hover:bg-white/90 transition-colors cursor-pointer">
        Start free
      </button>
      <button
        className="rounded-pill text-white text-[15px] font-medium px-8 py-[14px] cursor-pointer transition-colors hover:bg-white/25"
        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}
      >
        Learn more
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Landing component                                             */
/* ------------------------------------------------------------------ */
export default function Landing() {
  const [heroReady, setHeroReady] = useState(false)
  const heroRef = useRef(null)

  useScrollReveal()

  /* Framer variants for staggered hero copy */
  const fadeUp = {
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
      <section className="relative min-h-screen bg-orange flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Grain overlay */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_SVG, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }}
        />

        {/* Wordmark animation */}
        <div className="w-full max-w-[640px] mb-10 z-10">
          <WordmarkCanvas onComplete={() => setHeroReady(true)} />
        </div>

        {/* Hero copy — fades in after wordmark completes */}
        <div ref={heroRef} className="text-center max-w-[520px] z-10">
          <motion.h1
            className="font-display leading-[1.1] text-white mb-5"
            style={{ fontSize: 'clamp(36px, 6vw, 56px)' }}
            initial="hidden"
            animate={heroReady ? 'visible' : 'hidden'}
            variants={fadeUp}
            custom={0}
          >
            Your stack, <em className="opacity-65">finally</em> clear.
          </motion.h1>

          <motion.p
            className="text-white/65 font-light mb-8 whitespace-pre-line"
            style={{ fontSize: 'clamp(14px, 2vw, 17px)' }}
            initial="hidden"
            animate={heroReady ? 'visible' : 'hidden'}
            variants={fadeUp}
            custom={0.3}
          >
            {'Supplement tracking that thinks alongside you.\nAI-powered memory for serious athletes.'}
          </motion.p>

          <motion.div
            initial="hidden"
            animate={heroReady ? 'visible' : 'hidden'}
            variants={fadeUp}
            custom={0.5}
          >
            <HeroButtons />
          </motion.div>

          <motion.div
            className="mt-12 max-w-[340px] mx-auto"
            initial="hidden"
            animate={heroReady ? 'visible' : 'hidden'}
            variants={fadeUp}
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

        {/* Wave at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <Wave />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES                                                     */}
      {/* ============================================================ */}
      <section id="features" className="bg-page py-[100px] px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14 reveal">
            <Badge>Why recallth</Badge>
            <h2
              className="font-display text-ink1 mb-3"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
            >
              Everything your stack needs
            </h2>
            <p className="text-[16px] text-ink2 max-w-[480px] mx-auto">
              Built for athletes and biohackers who want clarity, not clutter.
            </p>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
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
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CHAT PREVIEW                                                 */}
      {/* ============================================================ */}
      <section id="chat" className="bg-sand py-[100px] px-6">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[60px] items-center">
          {/* Left column */}
          <div className="reveal">
            <Badge>AI Chat</Badge>
            <h2
              className="font-display text-ink1 mb-3 whitespace-pre-line"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
            >
              {'Ask anything\nabout your stack'}
            </h2>
            <p className="text-[16px] text-ink2 mb-6 max-w-[400px]">
              From timing to interactions, get instant answers powered by your personal supplement data.
            </p>
            <button className="rounded-pill bg-orange text-white text-[15px] font-medium px-7 py-[14px] cursor-pointer hover:bg-orange-dk transition-colors">
              Try it free
            </button>
          </div>

          {/* Right column — chat mockup */}
          <div className="reveal">
            <div className="bg-white rounded-[24px] border border-border overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
              {/* Header */}
              <div className="bg-orange px-5 py-4">
                <p className="text-white text-[15px] font-medium">Chat</p>
                <p className="text-white/65 text-[12px]">Good morning, Ricky 👋</p>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col gap-3 min-h-[260px]">
                <ChatBubble type="user">Can I take creatine and HMB together?</ChatBubble>
                <ChatBubble type="ai">
                  Yes! Creatine and HMB complement each other well. Creatine boosts ATP recycling while HMB reduces muscle protein breakdown. No known interactions — safe to stack.
                </ChatBubble>
                <ChatBubble type="user">Best time to take them?</ChatBubble>
                <ChatBubble type="ai">
                  Take creatine post-workout with carbs for better uptake. HMB is best 30-60 min before training. On rest days, take both with breakfast.
                </ChatBubble>
              </div>

              {/* Input bar */}
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
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CABINET PREVIEW                                              */}
      {/* ============================================================ */}
      <section id="cabinet" className="bg-page py-[100px] px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-10 reveal">
            <Badge>Cabinet</Badge>
            <h2
              className="font-display text-ink1 mb-3 whitespace-pre-line"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
            >
              {'Your full stack,\nin one place'}
            </h2>
            <p className="text-[16px] text-ink2 max-w-[440px] mx-auto">
              Every supplement tracked, timed, and checked for conflicts automatically.
            </p>
          </div>

          <div className="reveal max-w-[480px] mx-auto flex flex-col gap-3">
            <SuppCard letter="C" name="Purple K Creatine" meta="Pre-workout" dose="3 g" />
            <SuppCard letter="H" name="Ballistic HMB 3.0" meta="Post-workout" dose="1.5 g" />
            <SuppCard letter="E" name="EPA Concentrate" meta="With meals" dose="2 g" />
            <SuppCard letter="S" name="All-In Superfood" meta="Morning" dose="1 scoop" />
            <SuppCard letter="W" name="ISO Whey Gold" meta="Post-workout" dose="30 g" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA                                                          */}
      {/* ============================================================ */}
      <section id="cta" className="relative bg-orange py-[100px] px-6 overflow-hidden">
        {/* Grain overlay */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_SVG, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }}
        />

        <div className="relative z-10 text-center max-w-[600px] mx-auto">
          <h2
            className="font-display text-white mb-4"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}
          >
            Ready to take control of your stack?
          </h2>
          <p className="text-white/65 text-[16px] font-light mb-8 max-w-[440px] mx-auto">
            Join athletes who track smarter, not harder. AI-powered supplement intelligence, free to start.
          </p>
          <HeroButtons />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="bg-ink1 px-10 py-10 flex items-center justify-between flex-wrap gap-4">
        <span className="text-white/60 text-[14px] font-medium uppercase tracking-[0.1em]">
          recallth
        </span>
        <span className="text-white/30 text-[12px]">
          &copy; {new Date().getFullYear()} recallth. All rights reserved.
        </span>
      </footer>

      {/* ============================================================ */}
      {/*  Scroll-reveal styles                                         */}
      {/* ============================================================ */}
      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </>
  )
}
