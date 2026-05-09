import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shield, Upload, ChevronDown, ChevronUp, AlertTriangle, RotateCcw, ArrowRight, Wrench } from 'lucide-react'
import { api } from '../lib/api'

const GRADE_COLOR = {
  A: { hex: '#4ade80', rgb: '74,222,128' },
  B: { hex: '#60a5fa', rgb: '96,165,250' },
  C: { hex: '#facc15', rgb: '250,204,21' },
  D: { hex: '#fb923c', rgb: '251,146,60' },
  F: { hex: '#f87171', rgb: '248,113,113' },
}

const STATUS_STYLE = {
  pass:    { hex: '#4ade80', bg: 'rgba(74,222,128,0.07)',   border: 'rgba(74,222,128,0.22)' },
  warning: { hex: '#facc15', bg: 'rgba(250,204,21,0.07)',   border: 'rgba(250,204,21,0.22)' },
  fail:    { hex: '#f87171', bg: 'rgba(248,113,113,0.07)',  border: 'rgba(248,113,113,0.25)' },
}

const SEVERITY_BADGE = {
  critical: { bg: 'rgba(248,113,113,0.14)', color: '#f87171', border: 'rgba(248,113,113,0.3)' },
  warning:  { bg: 'rgba(250,204,21,0.11)',  color: '#facc15', border: 'rgba(250,204,21,0.28)' },
  info:     { bg: 'rgba(148,163,184,0.11)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)' },
}

/* ── Score gauge ring ────────────────────────────────────────────────────── */
function ATSGauge({ score, grade }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120)
    return () => clearTimeout(t)
  }, [score])

  const gc     = GRADE_COLOR[grade] || GRADE_COLOR.F
  const radius = 70
  const sw     = 10
  const size   = (radius + sw) * 2
  const circ   = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="atsRingGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={gc.hex} />
            <stop offset="100%" stopColor={gc.hex} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" strokeWidth={sw} stroke="var(--progress-track)" />
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" strokeWidth={sw}
          stroke="url(#atsRingGrad)"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animated ? offset : circ}
          style={{
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)',
            filter: `drop-shadow(0 0 10px ${gc.hex}80)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black leading-none" style={{ color: gc.hex }}>{grade}</span>
        <span className="text-xl font-bold mt-0.5" style={{ color: gc.hex }}>{score}</span>
        <span className="text-xs text-gray-600 mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

/* ── Progress bar ────────────────────────────────────────────────────────── */
function ProgressBar({ active }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (active) {
      setWidth(0)
      const t = setTimeout(() => setWidth(88), 30)
      return () => clearTimeout(t)
    }
    setWidth(0)
  }, [active])
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--progress-track)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          transition: active ? 'width 4s cubic-bezier(0.4,0,0.2,1)' : 'none',
          boxShadow: '0 0 8px rgba(59,130,246,0.5)',
        }}
      />
    </div>
  )
}

/* ── Rule card ───────────────────────────────────────────────────────────── */
function RuleCard({ rule, index }) {
  const ss = STATUS_STYLE[rule.status] || STATUS_STYLE.warning
  const sb = SEVERITY_BADGE[rule.severity] || SEVERITY_BADGE.info
  const passed = rule.status === 'pass'

  return (
    <div
      className="relative overflow-hidden rounded-xl stagger-item"
      style={{ '--delay': `${index * 0.04}s`, background: ss.bg, border: `1px solid ${ss.border}` }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: ss.hex }} />

      <div className="pl-4 pr-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="font-semibold text-sm text-gray-100 leading-snug">{rule.name}</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}
          >
            {rule.severity}
          </span>
        </div>

        {/* Message */}
        <p className="text-xs text-gray-500 leading-relaxed">{rule.message}</p>

        {/* Fix box */}
        {!passed && rule.fix && (
          <div
            className="mt-2.5 rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}
          >
            <span className="font-semibold text-orange-400">Fix: </span>
            <span className="text-orange-300/80">{rule.fix}</span>
          </div>
        )}

        {/* Example box */}
        {!passed && rule.example && (
          <div
            className="mt-1.5 rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <span className="font-semibold text-blue-400">Example: </span>
            <span className="text-blue-300/70 font-mono">{rule.example}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Category section ────────────────────────────────────────────────────── */
function CategorySection({ category, rules }) {
  const [open, setOpen] = useState(true)

  const passed   = rules.filter(r => r.status === 'pass').length
  const warned   = rules.filter(r => r.status === 'warning').length
  const failed   = rules.filter(r => r.status === 'fail').length
  const avgScore = Math.round(rules.reduce((s, r) => s + r.score, 0) / rules.length)
  const scoreColor = avgScore >= 80 ? '#4ade80' : avgScore >= 60 ? '#facc15' : '#f87171'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-4 transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-subtle)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-gray-200 text-sm">{category}</span>
          <div className="flex items-center gap-1.5">
            {passed > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(74,222,128,0.14)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.28)' }}>
                {passed} pass
              </span>
            )}
            {warned > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(250,204,21,0.12)', color: '#facc15', border: '1px solid rgba(250,204,21,0.28)' }}>
                {warned} warn
              </span>
            )}
            {failed > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.28)' }}>
                {failed} fail
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-black" style={{ color: scoreColor }}>{avgScore}</span>
          {open
            ? <ChevronUp  size={14} className="text-gray-500" />
            : <ChevronDown size={14} className="text-gray-500" />
          }
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {rules.map((rule, i) => (
            <RuleCard key={rule.id} rule={rule} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function ATSCheckerPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const fileRef  = useRef(null)

  const LOADING_MSGS = [
    t('ats.loadMsg1'),
    t('ats.loadMsg2'),
    t('ats.loadMsg3'),
    t('ats.loadMsg4'),
  ]

  const [file,     setFile]     = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')
  const [msgIdx,   setMsgIdx]   = useState(0)

  // Cycle loading messages every 1.5 s
  useEffect(() => {
    if (!loading) { setMsgIdx(0); return }
    const id = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 1500)
    return () => clearInterval(id)
  }, [loading])

  const handleFile = (f) => {
    if (!f?.name.toLowerCase().endsWith('.pdf')) {
      setError(t('ats.pdfOnly'))
      return
    }
    setError('')
    setFile(f)
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    const form = new FormData()
    form.append('cv', file)
    try {
      const data = await api.upload('/ats/deep-check', form)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setError('')
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Group rules by category (preserve insertion order)
  const groupedRules = result
    ? result.rules.reduce((acc, r) => {
        if (!acc[r.category]) acc[r.category] = []
        acc[r.category].push(r)
        return acc
      }, {})
    : {}
  const categories = Object.keys(groupedRules)

  const gc = result ? (GRADE_COLOR[result.grade] || GRADE_COLOR.F) : null

  return (
    <div
      className="p-8 max-w-3xl mx-auto animate-page"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* ── Header ── */}
      <div className="mb-7">
        <h1
          className="text-2xl font-black"
          style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {t('ats.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Upload your CV and get a 20-rule ATS compatibility audit — no job posting required. Find out what automated scanners reject.</p>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-xs text-red-500 hover:text-red-300 transition-colors font-medium"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex flex-col items-center gap-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.25)',
                animation: 'pulseGlow 1.5s ease-in-out infinite',
              }}
            >
              <Shield size={30} style={{ color: '#60a5fa' }} />
            </div>

            <p
              key={msgIdx}
              className="text-sm font-medium text-blue-300/80"
              style={{ animation: 'msgFade 1.5s ease both' }}
            >
              {LOADING_MSGS[msgIdx]}
            </p>

            <div className="w-full max-w-xs">
              <ProgressBar active={loading} />
            </div>
          </div>
        </div>
      )}

      {/* ── Upload state ── */}
      {!loading && !result && (
        <>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl flex flex-col items-center justify-center gap-5 transition-all duration-300 mb-4 cursor-pointer"
            style={{
              minHeight: '240px',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              background: dragging
                ? 'rgba(59,130,246,0.07)'
                : file
                ? 'rgba(74,222,128,0.04)'
                : 'var(--bg-card)',
              border: dragging
                ? '2px solid rgba(59,130,246,0.7)'
                : file
                ? '2px solid rgba(74,222,128,0.5)'
                : '2px dashed rgba(59,130,246,0.3)',
              boxShadow: dragging ? '0 0 32px rgba(59,130,246,0.1) inset' : 'none',
            }}
            onMouseEnter={(e) => {
              if (dragging) return
              e.currentTarget.style.borderColor = file ? 'rgba(74,222,128,0.65)' : 'rgba(59,130,246,0.55)'
              e.currentTarget.style.background   = file ? 'rgba(74,222,128,0.06)' : 'rgba(59,130,246,0.05)'
            }}
            onMouseLeave={(e) => {
              if (dragging) return
              e.currentTarget.style.borderColor = file ? 'rgba(74,222,128,0.5)' : 'rgba(59,130,246,0.3)'
              e.currentTarget.style.background   = file ? 'rgba(74,222,128,0.04)' : 'var(--bg-card)'
            }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: file ? 'rgba(74,222,128,0.12)' : 'rgba(59,130,246,0.1)',
                border:     `1px solid ${file ? 'rgba(74,222,128,0.3)' : 'rgba(59,130,246,0.25)'}`,
                boxShadow:  `0 0 28px ${file ? 'rgba(74,222,128,0.12)' : 'rgba(59,130,246,0.12)'}`,
                animation:  'iconFloat 2.8s ease-in-out infinite',
              }}
            >
              {file
                ? <span style={{ color: '#4ade80' }}>✓</span>
                : <Upload size={32} style={{ color: '#60a5fa' }} />
              }
            </div>

            <div className="text-center">
              {file ? (
                <>
                  <p className="font-bold text-green-400 text-base">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{t('ats.changeFile')}</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-gray-100 text-base">{t('ats.dropHere')}</p>
                  <p className="text-sm text-gray-600 mt-1">{t('ats.pdfLimit')}</p>
                </>
              )}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {/* What we check */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs text-gray-600">{t('ats.whatWeCheck')}</span>
            {[t('ats.cat1'), t('ats.cat2'), t('ats.cat3'), t('ats.cat4')].map(label => (
              <span
                key={label}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  color: 'rgb(147,197,253)',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={!file}
            className="btn-primary w-full py-3 text-base font-bold flex items-center justify-center gap-2"
          >
            <Shield size={16} />
            {t('ats.analyzeBtn')}
          </button>
        </>
      )}

      {/* ── Results state ── */}
      {result && !loading && (
        <div className="space-y-5">

          {/* Score hero */}
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: `rgba(${gc.rgb},0.04)`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid rgba(${gc.rgb},0.2)`,
              boxShadow: `0 0 48px rgba(${gc.rgb},0.05) inset`,
            }}
          >
            <ATSGauge score={result.overall_score} grade={result.grade} />
            <p className="mt-5 text-sm text-gray-400 leading-relaxed max-w-md mx-auto">
              {result.summary}
            </p>
          </div>

          {/* Top Fixes */}
          {result.top_fixes?.length > 0 && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(249,115,22,0.05)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(249,115,22,0.22)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
                >
                  <Wrench size={13} style={{ color: '#fb923c' }} />
                </div>
                <h3 className="font-bold text-sm" style={{ color: '#fb923c' }}>{t('ats.topFixes')}</h3>
              </div>

              <ol className="space-y-3.5">
                {result.top_fixes.slice(0, 3).map((fix, i) => (
                  <li key={fix.id} className="flex gap-3 items-start">
                    <span
                      className="w-5 h-5 rounded-full text-xs font-black flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(249,115,22,0.18)', color: '#fb923c' }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-200">{fix.name}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(253,186,116,0.75)' }}>
                        {fix.fix}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Category sections */}
          {categories.map(cat => (
            <CategorySection key={cat} category={cat} rules={groupedRules[cat]} />
          ))}

          {/* Bottom CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {result.overall_score < 75 && (
              <button
                onClick={reset}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-input)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)' }}
              >
                <RotateCcw size={14} />
                {t('ats.recheck')}
              </button>
            )}
            <button
              onClick={() => navigate('/jobs')}
              className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
            >
              {t('ats.fullAnalysis')}
              <ArrowRight size={14} />
            </button>
          </div>

          <button
            onClick={reset}
            className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors py-2"
          >
            {t('ats.checkAnother')}
          </button>
        </div>
      )}
    </div>
  )
}
