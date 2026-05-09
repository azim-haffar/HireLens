import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import ScoreGauge from '../components/ScoreGauge'
import { Upload, Briefcase, TrendingUp, FileText, BarChart2, ArrowRight } from 'lucide-react'

/* ── Count-up hook ──────────────────────────────────────────────── */
function useCountUp(target, duration = 800, enabled = true) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled || typeof target !== 'number' || target === 0) {
      setCount(target ?? 0)
      return
    }
    let startTs = null
    const tick = (ts) => {
      if (!startTs) startTs = ts
      const p = Math.min((ts - startTs) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setCount(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, enabled])
  return count
}

/* ── Stat card ──────────────────────────────────────────────────── */
function StatCard({ value, label, icon: Icon, accentColor, accentGlow, delay, isScore, ready }) {
  const [hovered, setHovered] = useState(false)
  const isNumeric = typeof value === 'number'
  const animated  = useCountUp(isNumeric ? value : 0, 800, ready && isNumeric)
  const display   = isNumeric ? animated : value

  return (
    <div
      className="stagger-item relative overflow-hidden rounded-2xl p-5 transition-all duration-300 cursor-default"
      style={{
        '--delay': delay,
        background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
        borderTop: `2px solid ${accentColor}`,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 12px 32px rgba(0,0,0,0.4), 0 0 20px ${accentGlow}` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Accent glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at top left, ${accentGlow.replace('0.25', '0.06')}, transparent 70%)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      <div className="relative flex flex-col items-start gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: accentGlow.replace('0.25', '0.15'), border: `1px solid ${accentGlow.replace('0.25', '0.3')}` }}
        >
          <Icon size={15} style={{ color: accentColor }} />
        </div>

        {isScore && isNumeric ? (
          <div className="mt-1">
            <ScoreGauge score={value} size="md" />
          </div>
        ) : (
          <div className="text-3xl font-black mt-1" style={{ color: 'var(--text-input)' }}>{display}</div>
        )}

        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  )
}

/* ── Quick action card ──────────────────────────────────────────── */
function QuickCard({ to, icon: Icon, title, desc, delay }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      to={to}
      className="stagger-item relative overflow-hidden rounded-2xl p-6 block transition-all duration-300"
      style={{
        '--delay': delay,
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${hovered ? 'rgba(59,130,246,0.45)' : 'var(--border-subtle)'}`,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 28px rgba(59,130,246,0.15)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300"
          style={{
            background: hovered ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
            border: `1px solid ${hovered ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.2)'}`,
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <Icon size={20} className="text-blue-400" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-semibold text-gray-100">{title}</span>
            {hovered && (
              <ArrowRight
                size={14}
                className="text-blue-400"
                style={{ animation: 'arrowSlide 0.2s ease both' }}
              />
            )}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{desc}</div>
        </div>
      </div>
    </Link>
  )
}

/* ── Score badge ────────────────────────────────────────────────── */
function ScoreBadge({ score }) {
  if (score == null) return <span className="text-xs text-gray-500">—</span>
  const isGreen  = score >= 70
  const isYellow = score >= 50 && score < 70
  const bg    = isGreen ? 'rgba(74,222,128,0.12)'  : isYellow ? 'rgba(250,204,21,0.12)'  : 'rgba(248,113,113,0.12)'
  const border= isGreen ? 'rgba(74,222,128,0.3)'   : isYellow ? 'rgba(250,204,21,0.3)'   : 'rgba(248,113,113,0.3)'
  const color = isGreen ? 'rgb(74,222,128)'        : isYellow ? 'rgb(250,204,21)'        : 'rgb(248,113,113)'
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, border: `1px solid ${border}`, color }}
    >
      {score}
    </span>
  )
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState([])
  const [cvs, setCvs]           = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/history/analyses').catch(() => []),
      api.get('/cv/versions').catch(() => []),
    ]).then(([a, c]) => {
      setAnalyses(a)
      setCvs(c)
      setLoading(false)
    })
  }, [])

  const isFirstTime = !loading && cvs.length === 0
  const username    = user?.email ? user.email.split('@')[0] : ''
  const avgScore    = analyses.length > 0
    ? Math.round(analyses.reduce((s, a) => s + (a.match_score || 0), 0) / analyses.length)
    : null
  const recent = analyses.slice(0, 3)

  const STAT_CARDS = [
    {
      value: cvs.length,
      label: t('dashboard.cvVersions'),
      icon: FileText,
      accentColor: '#60a5fa',
      accentGlow: 'rgba(59,130,246,0.25)',
      isScore: false,
    },
    {
      value: analyses.length,
      label: t('dashboard.analysesRun'),
      icon: BarChart2,
      accentColor: '#a78bfa',
      accentGlow: 'rgba(139,92,246,0.25)',
      isScore: false,
    },
    {
      value: avgScore ?? '—',
      label: t('dashboard.avgMatchScore'),
      icon: TrendingUp,
      accentColor: avgScore >= 70 ? '#4ade80' : avgScore >= 50 ? '#facc15' : '#f87171',
      accentGlow: avgScore >= 70 ? 'rgba(74,222,128,0.25)' : avgScore >= 50 ? 'rgba(250,204,21,0.25)' : 'rgba(248,113,113,0.25)',
      isScore: true,
    },
  ]

  return (
    <div
      className="p-8 max-w-4xl mx-auto animate-page"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--dot-pattern) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* ── Hero ── */}
      <div className="relative mb-6 p-8 rounded-2xl overflow-hidden">
        {/* Animated gradient layer */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'var(--hero-gradient)',
            backgroundSize: '300% 300%',
            animation: 'gradientShift 8s ease infinite',
            border: '1px solid var(--hero-border)',
          }}
        />

        {/* Mesh blobs */}
        {[
          { top: '10%',  left: '5%',  size: 140, color: 'rgba(59,130,246,0.18)',  anim: 'floatA 7s ease-in-out infinite' },
          { top: '50%',  left: '65%', size: 180, color: 'rgba(139,92,246,0.14)', anim: 'floatB 9s ease-in-out infinite' },
          { top: '70%',  left: '20%', size: 100, color: 'rgba(59,130,246,0.1)',   anim: 'floatA 11s ease-in-out infinite 1s' },
          { top: '-10%', left: '80%', size: 120, color: 'rgba(167,139,250,0.12)', anim: 'floatB 8s ease-in-out infinite 2s' },
        ].map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: b.top, left: b.left,
              width: b.size, height: b.size,
              background: b.color,
              filter: 'blur(48px)',
              animation: b.anim,
            }}
          />
        ))}

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-2">{t('dashboard.title')}</p>
          <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--text-input)' }}>
            {t('dashboard.welcomeBack')}{username ? ', ' : ''}
            {username && <span className="gradient-text">{username}</span>}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-placeholder)' }}>Your job application command center — track progress, scores, and activity at a glance.</p>
        </div>
      </div>

      {/* ── Onboarding ── */}
      {isFirstTime && (
        <div
          className="mb-6 rounded-2xl p-6"
          style={{
            background: 'rgba(59,130,246,0.07)',
            border: '1px solid rgba(59,130,246,0.25)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <h2 className="text-base font-semibold mb-2 text-blue-300">{t('dashboard.getStarted')}</h2>
          <ol className="space-y-1.5 text-sm text-blue-400/80 list-decimal list-inside mb-4">
            <li>{t('dashboard.step1')}</li>
            <li>{t('dashboard.step2')}</li>
            <li>{t('dashboard.step3')}</li>
          </ol>
          <Link to="/upload" className="btn-primary px-4 py-2 text-sm">
            {t('dashboard.uploadFirst')}
          </Link>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {STAT_CARDS.map(({ value, label, icon, accentColor, accentGlow, isScore }, i) => (
          <StatCard
            key={label}
            value={value}
            label={label}
            icon={icon}
            accentColor={accentColor}
            accentGlow={accentGlow}
            isScore={isScore}
            ready={!loading}
            delay={`${i * 0.08}s`}
          />
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {[
          { to: '/upload',  icon: Upload,     title: t('dashboard.uploadCVTitle'),     desc: t('dashboard.uploadCVDesc') },
          { to: '/jobs',    icon: Briefcase,  title: t('dashboard.addJobTitle'),       desc: t('dashboard.addJobDesc') },
          { to: '/history', icon: TrendingUp, title: t('dashboard.viewHistoryTitle'),  desc: t('dashboard.viewHistoryDesc') },
        ].map(({ to, icon, title, desc }, i) => (
          <QuickCard
            key={to}
            to={to}
            icon={icon}
            title={title}
            desc={desc}
            delay={`${0.2 + i * 0.08}s`}
          />
        ))}
      </div>

      {/* ── Recent activity ── */}
      {!loading && recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">{t('dashboard.recentActivity')}</h2>
            <Link to="/history" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            {recent.map((a, i) => {
              const job = a.jobs?.parsed_data || {}
              const isLast = i === recent.length - 1
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-5 py-3.5 stagger-item transition-colors duration-150"
                  style={{
                    '--delay': `${0.35 + i * 0.07}s`,
                    background: i % 2 === 0 ? 'var(--bg-card-subtle)' : 'transparent',
                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {job.title || t('dashboard.unknownRole')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {job.company || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <ScoreBadge score={a.match_score} />
                    <span className="text-xs text-gray-600">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
