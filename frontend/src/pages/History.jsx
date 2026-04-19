import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { analysisApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Clock, Loader2, Search, Sparkles, ArrowRight } from 'lucide-react'
import clsx from 'clsx'

const VERDICT_STYLES = {
  strong:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  weak:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const SCORE_RING = (s) =>
  s >= 80 ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700' :
  s >= 60 ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700' :
  s >= 40 ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700' :
            'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700'

export default function History() {
  const { t } = useTranslation()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    analysisApi.list()
      .then(setAnalyses)
      .catch(() => toast.error(t('history.loadFailed')))
      .finally(() => setLoading(false))
  }, [])

  const displayTitle = (a) => {
    const title = a.job_title && a.job_title !== 'null' ? a.job_title : null
    const company = a.job_company && a.job_company !== 'null' ? a.job_company : null
    if (title && company) return `${title} @ ${company}`
    if (title) return title
    if (company) return `Unknown Role @ ${company}`
    return t('history.unknownRole')
  }

  const filtered = analyses.filter((a) => {
    const q = search.toLowerCase()
    return !q || displayTitle(a).toLowerCase().includes(q)
      || (a.verdict || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            {t('history.heading')} <span className="text-gradient">{t('history.headingGradient')}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5">
            {analyses.length === 1 ? t('history.totalOne', { count: analyses.length }) : t('history.totalMany', { count: analyses.length })}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input className="input pl-10 w-full sm:w-64" placeholder={t('history.searchPlaceholder')}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-glow-brand">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('history.loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">
            {search ? t('history.noMatching') : t('history.noAnalyses')}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
            {search ? t('history.tryDifferent') : t('history.runFirst')}
          </p>
          {!search && (
            <Link to="/analyze" className="btn-primary inline-flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4" /> {t('history.runFirstBtn')}
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {filtered.map((a) => (
              <Link key={a.id} to={`/analysis/${a.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-all duration-200 group">
                <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 transition-transform duration-200 group-hover:scale-105',
                  SCORE_RING(a.overall_score || 0)
                )}>
                  {a.overall_score ?? '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors truncate">
                      {displayTitle(a)}
                    </span>
                    {a.verdict && (
                      <span className={clsx('badge capitalize', VERDICT_STYLES[a.verdict] || 'bg-gray-100 text-gray-600')}>
                        {t(`verdicts.${a.verdict}`, a.verdict)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
