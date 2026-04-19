import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { appApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Briefcase, Trash2, ExternalLink, Loader2, Sparkles, TrendingUp, Calendar, MessageSquare } from 'lucide-react'
import clsx from 'clsx'

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected', 'ghosted']

const STATUS_STYLES = {
  saved:     'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
  applied:   'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  interview: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  offer:     'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  rejected:  'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  ghosted:   'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
}

const STATUS_DOT = {
  saved: 'bg-gray-400', applied: 'bg-blue-500', interview: 'bg-violet-500',
  offer: 'bg-emerald-500', rejected: 'bg-red-500', ghosted: 'bg-zinc-400',
}

const FILTER_ACTIVE = {
  all:       'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white',
  saved:     'bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500',
  applied:   'bg-blue-600 text-white border-blue-600',
  interview: 'bg-violet-600 text-white border-violet-600',
  offer:     'bg-emerald-600 text-white border-emerald-600',
  rejected:  'bg-red-600 text-white border-red-600',
  ghosted:   'bg-zinc-500 text-white border-zinc-500',
}

const SCORE_COLOR = (s) =>
  s >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
  s >= 60 ? 'text-amber-600 dark:text-amber-400' :
  s >= 40 ? 'text-orange-600 dark:text-orange-400' : 'text-red-500 dark:text-red-400'

function daysAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `${diff}d ago`
}

function InlineNotes({ appId, initial, onSaved }) {
  const [value, setValue] = useState(initial || '')
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  const save = async () => {
    if (value === (initial || '')) return
    setSaving(true)
    try {
      await appApi.update(appId, { notes: value })
      onSaved(value)
    } catch {
      setValue(initial || '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative flex items-center gap-1 mt-1">
      <MessageSquare className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && ref.current?.blur()}
        placeholder="Add a note…"
        className="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-none outline-none w-full placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:text-gray-700 dark:focus:text-gray-200"
      />
      {saving && <Loader2 className="w-3 h-3 animate-spin text-brand-400 shrink-0" />}
    </div>
  )
}

function AppliedDatePicker({ appId, initial, onSaved }) {
  const [value, setValue] = useState(initial || '')

  const save = async (date) => {
    setValue(date)
    try {
      await appApi.update(appId, { applied_date: date || null })
      onSaved(date)
    } catch {
      setValue(initial || '')
    }
  }

  return (
    <div className="flex items-center gap-1 mt-0.5">
      <Calendar className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
      <input
        type="date"
        value={value}
        onChange={(e) => save(e.target.value)}
        className="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-none outline-none cursor-pointer dark:[color-scheme:dark]"
        title="Applied date"
      />
    </div>
  )
}

export default function Applications() {
  const { t } = useTranslation()
  const [apps, setApps]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    appApi.list()
      .then(setApps)
      .catch(() => toast.error(t('applications.loadFailed')))
      .finally(() => setLoading(false))
  }, [])

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      const updated = await appApi.update(id, { status })
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a)))
    } catch (err) {
      toast.error(err.message || t('applications.updateFailed'))
    } finally {
      setUpdating(null)
    }
  }

  const patchField = (id, field, value) =>
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value } : a))

  const deleteApp = async (id) => {
    if (!confirm(t('applications.confirmRemove'))) return
    try {
      await appApi.delete(id)
      setApps((prev) => prev.filter((a) => a.id !== id))
      toast.success(t('applications.removed'))
    } catch (err) {
      toast.error(err.message || t('applications.deleteFailed'))
    }
  }

  const filtered = filter === 'all' ? apps : apps.filter((a) => a.status === filter)
  const counts = STATUSES.reduce((acc, s) => { acc[s] = apps.filter((a) => a.status === s).length; return acc }, {})

  // Stats
  const appliedCount = counts.applied || 0
  const responseCount = (counts.interview || 0) + (counts.offer || 0)
  const responseRate = appliedCount > 0 ? Math.round((responseCount / appliedCount) * 100) : null
  const scored = apps.filter((a) => a.score != null)
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length) : null

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          {t('applications.heading')} <span className="text-gradient">{t('applications.headingGradient')}</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5">{t('applications.subtitle')}</p>
      </div>

      {/* Stats bar */}
      {apps.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold mb-1">{t('applications.statsTotal')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{apps.length}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold mb-1">{t('applications.statsResponseRate')}</p>
            <p className={clsx('text-2xl font-bold', responseRate != null ? (responseRate >= 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400') : 'text-gray-400')}>
              {responseRate != null ? `${responseRate}%` : '—'}
            </p>
          </div>
          <div className="card px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold mb-1">{t('applications.statsAvgScore')}</p>
            <p className={clsx('text-2xl font-bold', avgScore != null ? SCORE_COLOR(avgScore) : 'text-gray-400')}>
              {avgScore != null ? `${avgScore}%` : '—'}
            </p>
          </div>
          <div className="card px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold mb-1">{t('applications.statsInterviews')}</p>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{responseCount}</p>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')}
          className={clsx('badge border text-xs font-semibold px-3 py-1.5 transition-all duration-200 hover:-translate-y-0.5',
            filter === 'all' ? FILTER_ACTIVE.all : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400'
          )}>
          {t('applications.filterAll', { count: apps.length })}
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={clsx('badge border text-xs font-semibold px-3 py-1.5 transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-1.5',
              filter === s ? FILTER_ACTIVE[s] || STATUS_STYLES[s] : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400'
            )}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', filter === s ? 'bg-current opacity-70' : STATUS_DOT[s])} />
            {t(`applications.status.${s}`)} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-glow-brand">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('applications.loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">
            {filter === 'all' ? t('applications.emptyAll') : t('applications.emptyFiltered', { filter: t(`applications.status.${filter}`) })}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
            {filter === 'all' ? t('applications.emptyAllDesc') : t('applications.emptyFilterDesc')}
          </p>
          {filter === 'all' && (
            <Link to="/analyze" className="btn-primary inline-flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4" /> {t('applications.runFirst')}
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {filtered.map((app) => (
              <div key={app.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-3 hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-colors">
                <div className={clsx('w-2 h-2 rounded-full shrink-0 hidden sm:block mt-2', STATUS_DOT[app.status])} />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {(app.job_title && app.job_title !== 'null') ? app.job_title : t('applications.untitledRole')}
                    </p>
                    <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                      @ {(app.company && app.company !== 'null') ? app.company : t('applications.unknownCompany')}
                    </span>
                    {app.score != null && (
                      <span className={clsx('text-sm font-bold flex items-center gap-1', SCORE_COLOR(app.score))}>
                        <TrendingUp className="w-3.5 h-3.5" />{app.score}%
                      </span>
                    )}
                  </div>

                  {/* Relative date + applied date */}
                  <div className="flex flex-wrap items-center gap-3 mt-0.5">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('applications.added', { date: daysAgo(app.created_at) })}
                    </p>
                    <AppliedDatePicker
                      appId={app.id}
                      initial={app.applied_date || ''}
                      onSaved={(v) => patchField(app.id, 'applied_date', v)}
                    />
                  </div>

                  {/* Inline notes */}
                  <InlineNotes
                    appId={app.id}
                    initial={app.notes || ''}
                    onSaved={(v) => patchField(app.id, 'notes', v)}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {updating === app.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  ) : (
                    <select value={app.status} onChange={(e) => updateStatus(app.id, e.target.value)}
                      className={clsx('text-xs font-semibold rounded-xl border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer transition-all duration-200 dark:[color-scheme:dark]', STATUS_STYLES[app.status])}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{t(`applications.status.${s}`)}</option>
                      ))}
                    </select>
                  )}
                  <Link to={`/analysis/${app.analysis_id}`}
                    className="p-2 rounded-xl text-gray-400 hover:text-brand-600 dark:text-gray-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all"
                    title={t('applications.viewAnalysis')}>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button onClick={() => deleteApp(app.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title={t('applications.remove')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
