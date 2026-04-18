import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Wave from '../components/Wave'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

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
  const { setAuth } = useAuth()
  const { t } = useLanguage()

  const initialMode = searchParams.get('mode') === 'login' ? 'login' : 'signup'
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'

  const googleBtnRef = useRef(null)
  const [googleReady, setGoogleReady] = useState(false)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const handleGoogleCredential = useCallback(async ({ credential }) => {
    setError('')
    setLoading(true)
    try {
      const res = await api.auth.googleSignIn(credential)
      setAuth(res.data.token, res.data.email)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [setAuth, navigate])

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return

    const renderBtn = () => {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        size: 'large',
        text: 'continue_with',
        width: googleBtnRef.current.offsetWidth || 400,
      })
      setGoogleReady(true)
    }

    if (window.google?.accounts?.id) {
      renderBtn()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = renderBtn
      document.head.appendChild(script)
    }
  }, [googleClientId, handleGoogleCredential])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = isLogin
        ? await api.auth.login(email, password)
        : await api.auth.register(name, email, password)
      setAuth(res.data.token, res.data.email, !isLogin)
      navigate(isLogin ? '/home' : '/onboarding')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
          <span className="text-white/80 text-[13px] font-medium tracking-[0.1em] uppercase block mb-3">recallth</span>
          <h1 className="font-display text-white text-[32px] leading-tight">
            {isLogin ? t('authWelcome') : t('authGetStarted')}
          </h1>
          <p className="text-white/60 text-[14px] mt-2 font-light">
            {isLogin ? t('authSignInSub') : t('authCreateSub')}
          </p>
        </div>

        <div className="absolute -bottom-[2px] left-0 right-0">
          <Wave />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-center px-5 pt-6 pb-10">
        <div className="w-full max-w-[440px]">
          {/* Mode tabs */}
          <div className="flex rounded-[16px] bg-sand p-1 mb-6">
            <button
              onClick={() => { setMode('signup'); setError('') }}
              className={`flex-1 rounded-[12px] py-[10px] text-[14px] font-medium transition-all ${!isLogin ? 'bg-white text-ink1 shadow-sm' : 'text-ink3'}`}
            >
              {t('authSignUp')}
            </button>
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 rounded-[12px] py-[10px] text-[14px] font-medium transition-all ${isLogin ? 'bg-white text-ink1 shadow-sm' : 'text-ink3'}`}
            >
              {t('authLogIn')}
            </button>
          </div>

          {/* Google SSO */}
          {googleClientId ? (
            <div
              ref={googleBtnRef}
              className={`w-full mb-5 flex justify-center min-h-[44px] ${!googleReady ? 'animate-pulse bg-sand rounded-[14px]' : ''}`}
            />
          ) : (
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 border border-border rounded-[14px] py-[13px] bg-white text-[15px] font-medium text-ink1 mb-5 disabled:opacity-60"
              title={t('authComingSoon')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {t('authContinueGoogle')}
            </button>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[12px] text-ink4 font-medium">{t('authOr')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <InputField label={t('authName')} placeholder={t('authNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <InputField label={t('authEmail')} type="email" placeholder={t('authEmailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
            <InputField
              label={t('authPassword')}
              type="password"
              placeholder={isLogin ? t('authPasswordPlaceholderLogin') : t('authPasswordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p className="text-[13px] text-[#C05A28] bg-[#FDE8DE] border border-[#E8C4B0] rounded-[10px] px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-pill bg-orange text-white text-[15px] font-medium py-[15px] hover:bg-orange-dk transition-colors cursor-pointer disabled:opacity-60"
            >
              {loading ? t('authPleaseWait') : isLogin ? t('authLogIn') : t('authCreateAccount')}
            </button>
          </form>

          <p className="text-center text-[13px] text-ink3 mt-6">
            {isLogin ? t('authNoAccount') : t('authHaveAccount')}
            <button
              onClick={() => { setMode(isLogin ? 'signup' : 'login'); setError('') }}
              className="text-orange font-medium cursor-pointer"
            >
              {isLogin ? t('authSignUp') : t('authLogIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
