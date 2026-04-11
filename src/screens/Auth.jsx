import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Wave from '../components/Wave'

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`

function InputField({ label, type = 'text', placeholder, value, onChange }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-medium text-ink2">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="border border-border rounded-[14px] px-4 py-[13px] text-[15px] text-ink1 placeholder:text-ink4 outline-none focus:border-orange transition-colors bg-white"
      />
    </div>
  )
}

export default function Auth() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialMode = searchParams.get('mode') === 'login' ? 'login' : 'signup'
  const [mode, setMode] = useState(initialMode)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const isLogin = mode === 'login'

  const handleSubmit = (e) => {
    e.preventDefault()
    // Navigate to chat as placeholder for real auth
    navigate('/chat')
  }

  return (
    <div className="min-h-screen flex flex-col bg-page">
      {/* Orange hero header */}
      <div
        className="relative bg-orange px-6 pt-16 pb-0 overflow-hidden"
        style={{ minHeight: 200 }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_SVG, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }}
        />

        {/* Back link */}
        <a
          href="/"
          className="relative z-10 flex items-center gap-2 text-white/70 text-[13px] mb-8 hover:text-white transition-colors no-underline w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </a>

        <div className="relative z-10 text-center pb-12">
          <span className="text-white/80 text-[13px] font-medium tracking-[0.1em] uppercase block mb-3">
            recallth
          </span>
          <h1 className="font-display text-white text-[32px] leading-tight">
            {isLogin ? 'Welcome back' : 'Get started'}
          </h1>
          <p className="text-white/60 text-[14px] mt-2 font-light">
            {isLogin ? 'Sign in to your account' : 'Create your free account'}
          </p>
        </div>

        <div className="absolute -bottom-[2px] left-0 right-0">
          <Wave />
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 flex flex-col items-center px-5 pt-6 pb-10">
        <div className="w-full max-w-[440px]">
          {/* Mode tabs */}
          <div className="flex rounded-[16px] bg-sand p-1 mb-6">
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-[12px] py-[10px] text-[14px] font-medium transition-all ${
                !isLogin ? 'bg-white text-ink1 shadow-sm' : 'text-ink3'
              }`}
            >
              Sign up
            </button>
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-[12px] py-[10px] text-[14px] font-medium transition-all ${
                isLogin ? 'bg-white text-ink1 shadow-sm' : 'text-ink3'
              }`}
            >
              Log in
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <InputField
                label="Name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <InputField
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
              label="Password"
              type="password"
              placeholder={isLogin ? 'Your password' : 'Create a password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              className="mt-2 rounded-pill bg-orange text-white text-[15px] font-medium py-[15px] hover:bg-orange-dk transition-colors cursor-pointer"
            >
              {isLogin ? 'Log in' : 'Create account'}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-[13px] text-ink3 mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(isLogin ? 'signup' : 'login')}
              className="text-orange font-medium cursor-pointer"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
