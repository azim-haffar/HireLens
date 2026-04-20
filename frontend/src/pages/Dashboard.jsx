import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation, Trans } from 'react-i18next'
import { analysisApi, appApi, cvApi } from '../lib/api'
import { Search, GitCompare, Briefcase, TrendingUp, FileText, ArrowRight, Plus, Sparkles, Upload } from 'lucide-react'
import clsx from 'clsx'
import ScoreTrendChart from '../components/ScoreTrendChart'
import Onboarding from '../components/Onboarding'

const VERDICT_STYLES = {
  strong:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  weak:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [analyses, setAnalyses] = useState([])
  const [applications, setApplications] = useState([])
  const [cvCount, setCvCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const fetchData = () =>
    Promise.all([analysisApi.list(), appApi.list(), cvApi.list()])
      .then(([a, b, c]) => {
        setAnalyses(a)
        setApplications(b)
        setCvCount(c.length)
        if (a.length === 0 && !localStorage.getItem('onboarding_done')) {
          setShowOnboarding(true)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))

  useEffect(() => {
    fetchData()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const avgScore = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + (a.overall_score || 0), 0) / analyses.length)
    : 0

  const firstName = user?.email?.split('@')[0] || 'there'

  const lastAnalysisDaysAgo = (() => {
    if (!analyses.length) return null
    const latest = new Date(analyses[0].created_at)
    const days = Math.floor((Date.now() - latest) / 86400000)
    if (days === 0) return t('dashboard.lastAnalysisToday')
    if (days === 1) return t('dashboard.lastAnalysisYesterday')
    return t('dashboard.lastAnalysisDaysAgo', { count: days })
  })()

  const STAT_CARDS = [
    { label: t('dashboard.analysesRun'), value: analyses.length, icon: FileText, gradient: 'from-brand-500 to-brand-700', bg: 'bg-brand-50 dark:bg-brand-900/20' },
    { label: t('dashboard.applications'), value: applications.length, icon: Briefcase, gradient: 'from-violet-500 to-purple-700', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: t('dashboard.interviews'), value: applications.filter(a => a.status === 'interview').length, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: t('dashboard.avgScore'), value: avgScore ? `${avgScore}%` : '—', icon: Search, gradient: 'from-orange-400 to-rose-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ]

  const QUICK_ACTIONS = [
    { to: '/analyze', icon: Sparkles, title: t('dashboard.qaAnalyzeTitle'), desc: t('dashboard.qaAnalyzeDesc'), hover: 'hover:border-brand-300 dark:hover:border-brand-600', iconBg: 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' },
    { to: '/compare', icon: GitCompare, title: t('dashboard.qaCompareTitle'), desc: t('dashboard.qaCompareDesc'), hover: 'hover:border-violet-300 dark:hover:border-violet-600', iconBg: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
    { to: '/applications', icon: Briefcase, title: t('dashboard.qaTrackTitle'), desc: t('dashboard.qaTrackDesc'), hover: 'hover:border-emerald-300 dark:hover:border-emerald-600', iconBg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
  ]

  return (
    <div className="space-y-8 animate-fade-in-up">
      {showOnboarding && <Onboarding onDismiss={() => setShowOnboarding(false)} />}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            <Trans i18nKey="dashboard.welcomeBack" values={{ name: firstName }} components={{ grad: <span className="text-gradient" /> }} />
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5">{t('dashboard.subtitle')}</p>
        </div>
        <Link to="/analyze" className="btn-primary hidden sm:inline-flex gap-2 text-sm">
          <Plus className="w-4 h-4" /> {t('dashboard.newAnalysis')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, gradient, bg }, i) => (
          <div key={label} className="card p-5 group hover:-translate-y-1 transition-all duration-300" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110', bg)}>
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br', gradient)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
              {loading ? <span className="skeleton inline-block w-12 h-7" /> : value}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* No CV banner */}
      {!loading && cvCount === 0 && (
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('dashboard.noCVTitle')}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{t('dashboard.noCVDesc')}</p>
          </div>
          <Link to="/analyze" className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline">
            {t('dashboard.noCVAction')} →
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map(({ to, icon: Icon, title, desc, hover, iconBg }) => (
            <Link key={to} to={to} className={clsx('card p-5 border-2 border-transparent group hover:-translate-y-1 transition-all duration-300', hover)}>
              <div className="flex items-start gap-4">
                <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110', iconBg)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">{title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-500 dark:group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Score trend chart */}
      <ScoreTrendChart analyses={analyses} />

      {/* Recent analyses */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.recentAnalyses')}</h2>
            {lastAnalysisDaysAgo && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lastAnalysisDaysAgo}</p>
            )}
          </div>
          <Link to="/history" className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium flex items-center gap-1 group">
            {t('dashboard.viewAll')}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-brand-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium">{t('dashboard.noAnalyses')}</p>
            <Link to="/analyze" className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> {t('dashboard.runFirst')}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {analyses.slice(0, 5).map((a) => {
              const score = a.overall_score ?? null
              const verdict = a.verdict
              return (
                <Link key={a.id} to={`/analysis/${a.id}`} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2',
                    score >= 80 ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700' :
                    score >= 60 ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700' :
                    score >= 40 ? 'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700' :
                    'border-gray-200 bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                  )}>
                    {score ?? '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors truncate">
                      {(() => {
                        const title = a.job_title && a.job_title !== 'null' ? a.job_title : null
                        const company = a.job_company && a.job_company !== 'null' ? a.job_company : null
                        if (title && company) return `${title} @ ${company}`
                        return title || company || t('history.unknownRole')
                      })()}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {verdict && (
                      <span className={clsx('badge capitalize', VERDICT_STYLES[verdict] || 'bg-gray-100 text-gray-700')}>
                        {t(`verdicts.${verdict}`, verdict)}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
