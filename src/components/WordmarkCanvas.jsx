import { useRef, useEffect, useCallback } from 'react'

const OP_RECALL = 0.70
const OP_HEAL   = 0.70
const OP_TH     = 1.00
const CROSS_S   = 2200
const CROSS_E   = 2900
const TOTAL     = 3800

const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)
const easeInOut    = (t) => t < 0.5 ? 8*t*t*t*t : 1 - Math.pow(-2*t+2, 4)/2
const smoothstep   = (t) => t*t*(3 - 2*t)
const lerp         = (a, b, t) => a + (b - a) * t
const win          = (e, s, en) => Math.min(Math.max((e - s) / (en - s), 0), 1)

export default function WordmarkCanvas({ onComplete }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef({
    raf: null,
    t0:  null,
    FS:   0,
    FONT: '',
    W: 0, H: 0,
    X_right: 0, X_recall: 0, X_th: 0, X_health: 0, X_heal: 0, BY: 0,
    W_recallth: 0, W_recall: 0, W_th: 0, W_health: 0,
  })
  const completeFiredRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const setup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s   = stateRef.current

    const dpr  = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    s.W = rect.width
    s.H = rect.height
    canvas.width  = s.W * dpr
    canvas.height = s.H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.save()
    ctx.font = '600 80px "DM Sans", sans-serif'
    const tw = ctx.measureText('recallth').width
    s.FS = Math.floor(80 * (s.W * 0.68) / tw)
    s.FS = Math.min(Math.max(s.FS, 32), 110)
    s.FONT = `600 ${s.FS}px "DM Sans", sans-serif`
    ctx.font = s.FONT
    s.W_recallth = ctx.measureText('recallth').width
    s.W_recall   = ctx.measureText('recall').width
    s.W_th       = ctx.measureText('th').width
    s.W_health   = ctx.measureText('health').width
    ctx.restore()

    s.X_right  = s.W / 2 + s.W_recallth / 2
    s.X_recall = s.X_right - s.W_recallth
    s.X_th     = s.X_right - s.W_th
    s.X_health = s.X_right - s.W_health
    s.X_heal   = s.X_right - s.W_health
    s.BY       = s.H * 0.62
  }, [])

  const draw = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s   = stateRef.current

    ctx.clearRect(0, 0, s.W, s.H)
    ctx.font = s.FONT
    ctx.textBaseline = 'alphabetic'

    const hIn      = easeOutQuart(win(e, 0, 900))
    const hOut     = 1 - smoothstep(win(e, 800, 1700))
    const healthOp = hIn * hOut

    const healAppear = easeOutQuart(win(e, 800, 1400))
    const sinkT      = easeInOut(win(e, 1100, 2200))
    const crossT     = easeInOut(win(e, CROSS_S, CROSS_E))

    const healOp = Math.max(0, healAppear * OP_HEAL * (1 - crossT))
    const wipeX  = s.X_recall + s.W_recall * crossT

    // 1. heal shadow
    if (healOp > 0.003) {
      ctx.save()
      const skewX  = lerp(0, -0.36, smoothstep(sinkT))
      const scaleY = lerp(1, 0.38,  smoothstep(sinkT))
      ctx.translate(s.X_heal, s.BY)
      ctx.transform(1, 0, skewX, scaleY, 0, 0)
      ctx.globalAlpha = healOp
      ctx.fillStyle = 'white'
      ctx.fillText('heal', 0, 0)
      ctx.restore()
    }

    // 2. recall wipe
    if (crossT > 0.003) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(s.X_recall, s.BY - s.FS, wipeX - s.X_recall, s.FS * 1.4)
      ctx.clip()
      ctx.globalAlpha = OP_RECALL
      ctx.fillStyle = 'white'
      ctx.fillText('recall', s.X_recall, s.BY)
      ctx.restore()
    }

    // 3. th — always full
    ctx.globalAlpha = OP_TH
    ctx.fillStyle = 'white'
    ctx.fillText('th', s.X_th, s.BY)

    // 4. health clipped
    if (healthOp > 0.003) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, s.X_th, s.H)
      ctx.clip()
      ctx.globalAlpha = healthOp
      ctx.fillStyle = 'white'
      ctx.fillText('health', s.X_health, s.BY)
      ctx.restore()
    }

    ctx.globalAlpha = 1
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const s = stateRef.current

    let cancelled = false

    const startAnim = () => {
      if (s.raf) cancelAnimationFrame(s.raf)
      s.t0 = null
      completeFiredRef.current = false
      setup()
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, s.W, s.H)

      const delayId = setTimeout(() => {
        if (cancelled) return

        const frame = (ts) => {
          if (cancelled) return
          if (!s.t0) s.t0 = ts
          const e = ts - s.t0
          draw(Math.min(e, TOTAL))

          if (e < TOTAL) {
            s.raf = requestAnimationFrame(frame)
          } else {
            draw(TOTAL)
            s.raf = null
            if (!completeFiredRef.current) {
              completeFiredRef.current = true
              onCompleteRef.current?.()
            }
          }
        }

        s.raf = requestAnimationFrame(frame)
      }, 400)

      return delayId
    }

    let delayId = null

    document.fonts.ready.then(() => {
      if (cancelled) return
      delayId = startAnim()
    })

    const handleResize = () => {
      if (s.raf) {
        cancelAnimationFrame(s.raf)
        s.raf = null
      }
      setup()
      draw(TOTAL)
      if (!completeFiredRef.current) {
        completeFiredRef.current = true
        onCompleteRef.current?.()
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelled = true
      if (delayId != null) clearTimeout(delayId)
      if (s.raf) {
        cancelAnimationFrame(s.raf)
        s.raf = null
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [setup, draw])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '120px' }}
    />
  )
}
