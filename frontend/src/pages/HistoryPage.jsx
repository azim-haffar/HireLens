import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Search, BarChart2 } from 'lucide-react'

/* ── Score helpers ──────────────────────────────────────────────── */
const scoreHex   = (s) => s >= 70 ? '#4ade80' : s >= 50 ? '#facc15' : '#f87171'
const scoreRgb   = (s) => s >= 70 ? '74,222,128' : s >= 50 ? '250,204,21' : '248,113,113'
const scoreCls   = (s) => s >= 70 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400'

/* ── Custom chart dot ───────────────────────────────────────────── */
function CustomDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null
  const s     = payload?.score ?? 0
  const color = scoreHex(s)
  return (
    <g>
      <circle cx={cx} cy={cy} r={9}  fill={color} opacity={0.15} />
      <circle cx={cx} cy={cy} r={5}  fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} />
    </g>
  )
}

/* ── Custom tooltip ─────────────────────────────────────────────── */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const s = d.score
  return (
    <div
      className="rounded-xl px-3.5 py-2.5 text-xs"
      style={{
        background: 'rgba(8,12,24,0.96)',
        border: `1px solid rgba(${scoreRgb(s)},0.35)`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(${scoreRgb(s)},0.15)`,
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="font-semibold text-gray-200 mb-0.5 truncate max-w-[160px]">{d.title}</p>
      {d.company && <p className="text-gray-500 mb-1.5">{d.company}</p>}
      <p className="font-bold text-base" style={{ color: scoreHex(s) }}>{s}<span className="text-xs font-normal text-gray-500 ml-1">/ 100</span></p>
      <p className="text-gray-600 mt-1">{d.date}</p>
    </div>
  )
}

/* ── History row ────────────────────────────────────────────────── */
function HistoryRow({ a, index }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  const job   = a.jobs?.parsed_data || {}
  const score = a.match_score ?? null
  const hex   = scoreHex(score ?? 0)
  const rgb   = scoreRgb(score ?? 0)

  return (
    <div
      className="relative overflow-hidden rounded-2xl flex items-center stagger-item transition-all duration-200 cursor-default"
      style={{
        '--delay': `${index * 0.05}s`,
        background: hovered ? `rgba(${rgb},0.06)` : 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${hovered ? `rgba(${rgb},0.35)` : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered ? `0 6px 24px rgba(${rgb},0.15)` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl"
        style={{ background: hex }}
      />

      <div className="flex items-center justify-between w-full pl-4 pr-5 py-4">
        {/* Left: title + meta */}
        <div className="flex-1 min-w-0 mr-4">
          <p className="font-semibold text-gray-100 truncate leading-snug">
            {job.title || t('history.unknownRole')}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {job.company || '—'}
            {a.created_at && (
              <span className="ml-2 text-gray-600">
                · {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </p>
        </div>

        {/* Right: score + hover label */}
        <div className="flex items-center gap-4 shrink-0">
          {hovered && (
            <span
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: hex, animation: 'slideFromRight 0.18s ease both' }}
            >
              {t('history.viewAnalysis')}
            </span>
          )}

          {a.ats_score != null && (
            <div className="text-center hidden sm:block">
              <div className={`text-lg font-bold ${scoreCls(a.ats_score)}`}>{a.ats_score}</div>
              <div className="text-xs text-gray-600">{t('history.atsLabel')}</div>
            </div>
          )}

          <div className="text-center min-w-[40px]">
            <div
              className="text-2xl font-black leading-none"
              style={{ color: hex }}
            >
              {score ?? '—'}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">{t('history.matchLabel')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Empty state ────────────────────────────────────────────────── */
function EmptyState({ navigate }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <rect x="4" y="4" width="64" height="64" rx="16"
          fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.18)" strokeWidth="1.5" />
        <polyline points="14,50 26,34 36,40 48,24 58,28"
          stroke="url(#eg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="26" cy="34" r="3" fill="#3b82f6" opacity="0.7" />
        <circle cx="36" cy="40" r="3" fill="#6366f1" opacity="0.7" />
        <circle cx="48" cy="24" r="3" fill="#8b5cf6" opacity="0.7" />
        <defs>
          <linearGradient id="eg" x1="14" y1="50" x2="58" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3b82f6" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center">
        <p className="text-gray-300 font-semibold text-lg mb-1">{t('history.noAnalyses')}</p>
        <p className="text-gray-600 text-sm">{t('history.noAnalysesDesc')}</p>
      </div>
      <button
        onClick={() => navigate('/analysis')}
        className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
          boxShadow: '0 2px 14px rgba(59,130,246,0.28)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 6px 22px rgba(59,130,246,0.45)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 14px rgba(59,130,246,0.28)'
        }}
      >
        {t('history.runFirst')}
      </button>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function HistoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [analyses, setAnalyses] = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [searchFocused, setSearchFocused] = useState(false)

  useEffect(() => {
    api.get('/history/analyses')
      .then((data) => { setAnalyses(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = analyses.filter((a) => {
    const job = a.jobs?.parsed_data || {}
    const q   = search.toLowerCase()
    return !q || (job.title || '').toLowerCase().includes(q) || (job.company || '').toLowerCase().includes(q)
  })

  const chartData = [...analyses].reverse().map((a, i) => ({
    name:    i + 1,
    score:   a.match_score || 0,
    date:    new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    title:   a.jobs?.parsed_data?.title   || t('history.unknownRole'),
    company: a.jobs?.parsed_data?.company || '',
  }))

  return (
    <div
      className="p-8 max-w-4xl mx-auto animate-page"
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
          {t('history.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Browse all your past analyses and see how your match score improves over time.</p>
      </div>

      {/* ── Chart ── */}
      {chartData.length > 1 && (
        <div
          className="rounded-2xl p-6 mb-7"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Chart header */}
          <div className="flex items-center gap-2 mb-5">
            <div className="relative w-2.5 h-2.5">
              <div
                className="absolute inset-0 rounded-full bg-blue-500"
                style={{ animation: 'ping 1.8s ease-in-out infinite' }}
              />
              <div className="relative rounded-full w-2.5 h-2.5 bg-blue-400" />
            </div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {t('history.trend')}
            </h2>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'rgb(75,85,99)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'rgb(75,85,99)' }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="url(#lineGrad)"
                strokeWidth={2.5}
                fill="url(#areaFill)"
                dot={<CustomDot />}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: 'rgba(59,130,246,0.4)', strokeWidth: 4 }}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Search ── */}
      <div
        className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 mb-5 transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${searchFocused ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.07)'}`,
          boxShadow: searchFocused ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
        }}
      >
        <Search size={15} className="shrink-0" style={{ color: searchFocused ? '#60a5fa' : 'rgb(107,114,128)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder={t('history.searchPlaceholder')}
          className="flex-1 text-sm bg-transparent outline-none text-gray-300 placeholder-gray-600"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-gray-600 hover:text-gray-400 transition-colors text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: '#3b82f6' }}
          />
        </div>
      ) : analyses.length === 0 ? (
        <EmptyState navigate={navigate} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-gray-500 mb-2">{t('history.noResults')} "{search}"</p>
          <button onClick={() => setSearch('')} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            {t('history.clearSearch')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => (
            <HistoryRow key={a.id} a={a} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
