import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Flame, Upload, Copy, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/* ── Roast score gauge ─────────────────────────────────────────── */
function RoastGauge({ score }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120)
    return () => clearTimeout(t)
  }, [score])

  const radius      = 64
  const sw          = 10
  const size        = (radius + sw) * 2
  const circ        = 2 * Math.PI * radius
  const offset      = circ - (score / 100) * circ
  const c1 = score >= 55 ? '#f97316' : '#ef4444'
  const c2 = score >= 55 ? '#f59e0b' : '#b91c1c'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="roastRingGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" strokeWidth={sw} stroke="rgba(255,255,255,0.06)" />
        {/* Arc */}
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" strokeWidth={sw}
          stroke="url(#roastRingGrad)"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animated ? offset : circ}
          style={{
            transition: 'stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1)',
            filter: `drop-shadow(0 0 8px ${c1}80)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black leading-none" style={{ color: c1 }}>{score}</span>
        <span className="text-xs text-gray-600 mt-1">/ 100</span>
      </div>
    </div>
  )
}

/* ── Animated score bar ────────────────────────────────────────── */
function ScoreBar({ score, delay = 0 }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(score), 80 + delay)
    return () => clearTimeout(t)
  }, [score, delay])
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${w}%`,
          background: 'linear-gradient(90deg, #f97316, #ef4444)',
          transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 8px rgba(249,115,22,0.4)',
        }}
      />
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function RoastPage() {
  const { t }    = useTranslation()
  const fileRef  = useRef(null)

  const LOADING_MSGS = [
    t('roast.loadMsg1'),
    t('roast.loadMsg2'),
    t('roast.loadMsg3'),
  ]

  const TAGLINE = (s) =>
    s >= 90 ? 'Suspiciously good.'       :
    s >= 75 ? 'Could be worse. Barely.'  :
    s >= 60 ? 'Forgettable.'             :
    s >= 40 ? 'Why did you submit this?' :
              'Start over.'

  // ── existing state (unchanged) ──
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [result,  setResult]  = useState(null)
  const [copied,  setCopied]  = useState(false)

  // ── new UI-only state ──
  const [dragging, setDragging] = useState(false)
  const [msgIdx,   setMsgIdx]   = useState(0)

  // cycle loading messages
  useEffect(() => {
    if (!loading) { setMsgIdx(0); return }
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MSGS.length), 2000)
    return () => clearInterval(id)
  }, [loading])

  // ── existing handlers (unchanged) ──
  const handleFile = async (file) => {
    if (!file?.name.endsWith('.pdf')) { setError(t('upload.pdfOnly')); return }
    setLoading(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`${BASE}/roast/cv`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error' }))
        throw new Error(err.detail)
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    const text = `My CV Score: ${result.overall_score}/100\n\n${result.brutal_feedback}\n\nAnalyzed by HireLens`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      className="min-h-screen px-4 py-12 relative"
      style={{
        background: '#0a0a0a',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* Ambient glow behind hero */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto animate-page">

        {/* ── Hero ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-5">
            <Flame
              size={52}
              style={{
                color: '#f97316',
                animation: 'roastPulse 2s ease-in-out infinite',
              }}
            />
          </div>

          <h1
            className="text-5xl font-black mb-3 leading-tight"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('roast.title')}
          </h1>
          <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Get brutally honest AI feedback on your CV. No login required. Rated 🔥 by people who want the truth.</p>

          {/* Rate-limit badge */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.25)',
              color: 'rgb(253,186,116)',
            }}
          >
            {t('roast.rateLimit')}
          </span>
        </div>

        {/* ── Drop zone ── */}
        {!result && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
            onDrop={onDrop}
            onClick={() => !loading && fileRef.current?.click()}
            className="rounded-2xl flex flex-col items-center justify-center gap-5 transition-all duration-300 mb-5"
            style={{
              minHeight: '260px',
              cursor: loading ? 'default' : 'pointer',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              background: dragging ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.03)',
              border: dragging
                ? '2px solid rgba(249,115,22,0.7)'
                : '2px dashed rgba(249,115,22,0.3)',
              boxShadow: dragging ? '0 0 32px rgba(249,115,22,0.1) inset' : 'none',
            }}
            onMouseEnter={(e) => {
              if (loading || dragging) return
              e.currentTarget.style.borderColor = 'rgba(249,115,22,0.55)'
              e.currentTarget.style.background   = 'rgba(249,115,22,0.04)'
            }}
            onMouseLeave={(e) => {
              if (loading || dragging) return
              e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'
              e.currentTarget.style.background   = 'rgba(255,255,255,0.03)'
            }}
          >
            {loading ? (
              /* Loading state */
              <div className="flex flex-col items-center gap-5 px-8">
                <Flame
                  size={44}
                  style={{
                    color: '#f97316',
                    animation: 'roastPulse 1s ease-in-out infinite',
                  }}
                />
                <p
                  key={msgIdx}
                  className="text-sm font-medium text-orange-300/80"
                  style={{ animation: 'msgFade 2s ease both' }}
                >
                  {LOADING_MSGS[msgIdx]}
                </p>
              </div>
            ) : (
              /* Idle state */
              <>
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(249,115,22,0.1)',
                    border: '1px solid rgba(249,115,22,0.25)',
                    boxShadow: '0 0 28px rgba(249,115,22,0.15)',
                    animation: 'iconFloat 2.8s ease-in-out infinite',
                  }}
                >
                  <Upload size={32} style={{ color: '#f97316' }} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-100 text-base">{t('roast.dropToRoast')}</p>
                  <p className="text-sm text-gray-600 mt-1">{t('roast.pdfLimit')}</p>
                </div>
              </>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {/* ── Error ── */}
        {error && (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
          >
            <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 flex-1">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-xs text-red-500 hover:text-red-300 transition-colors font-medium"
            >
              {t('roast.dismiss')}
            </button>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="space-y-5">

            {/* Score hero */}
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(249,115,22,0.2)',
                boxShadow: '0 0 48px rgba(249,115,22,0.06) inset',
              }}
            >
              <RoastGauge score={result.overall_score} />
              <p
                className="mt-3 text-base font-bold italic"
                style={{ color: result.overall_score >= 55 ? '#fb923c' : '#f87171' }}
              >
                "{TAGLINE(result.overall_score)}"
              </p>
            </div>

            {/* Category breakdown */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <h3 className="font-bold text-gray-200 mb-5 flex items-center gap-2">
                <span
                  className="w-1 h-4 rounded-full inline-block"
                  style={{ background: 'linear-gradient(180deg,#f97316,#ef4444)' }}
                />
                {t('roast.categoryBreakdown')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {result.breakdown.map((b, i) => (
                  <div
                    key={b.category}
                    className="rounded-xl p-4 relative overflow-hidden stagger-item"
                    style={{
                      '--delay': `${i * 0.06}s`,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderLeft: '3px solid rgba(249,115,22,0.6)',
                    }}
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-300 truncate pr-2">{b.category}</span>
                      <span
                        className="text-sm font-black shrink-0"
                        style={{ color: b.score >= 55 ? '#fb923c' : '#f87171' }}
                      >
                        {b.score}
                      </span>
                    </div>
                    <ScoreBar score={b.score} delay={i * 60} />
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-2">{b.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* One good thing */}
            <div
              className="rounded-2xl p-5 flex gap-4"
              style={{
                background: 'rgba(16,185,129,0.06)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(16,185,129,0.25)',
                boxShadow: '0 0 24px rgba(16,185,129,0.05) inset',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                <CheckCircle size={15} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-400 mb-1">{t('roast.oneGoodThing')}</p>
                <p className="text-sm text-green-300/80 leading-relaxed">{result.positive}</p>
              </div>
            </div>

            {/* Brutal verdict */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(239,68,68,0.06)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(239,68,68,0.22)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Flame size={14} className="text-red-400" />
                <p className="text-sm font-bold text-red-400">{t('roast.brutalVerdict')}</p>
              </div>
              <p className="text-sm text-red-300/80 leading-relaxed">{result.brutal_feedback}</p>
            </div>

            {/* Share card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(239,68,68,0.1) 100%)',
                border: '1px solid rgba(249,115,22,0.3)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-200 mb-0.5">{t('roast.shareRoast')}</p>
                  <p className="text-xs text-gray-500">{t('roast.shareDesc')}</p>
                </div>
                <div
                  className="text-3xl font-black"
                  style={{ color: result.overall_score >= 55 ? '#fb923c' : '#f87171' }}
                >
                  {result.overall_score}
                  <span className="text-sm font-normal text-gray-600">/100</span>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)', boxShadow: '0 2px 12px rgba(249,115,22,0.35)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(249,115,22,0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(249,115,22,0.35)'
                  }}
                >
                  <Copy size={13} />
                  {copied ? t('common.copied') : t('roast.copyClipboard')}
                </button>
                <button
                  onClick={() => { setResult(null); setError('') }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <RotateCcw size={13} />
                  {t('roast.tryAnother')}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
