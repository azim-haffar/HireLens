import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

const SEVERITY_CONFIG = {
  critical: { icon: XCircle,       color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800',       labelKey: 'ats.critical' },
  warning:  { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800',   labelKey: 'ats.warning' },
  info:     { icon: Info,          color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800',     labelKey: 'ats.info' },
}

function IssueCard({ issue }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info
  const Icon = cfg.icon

  return (
    <div className={clsx('rounded-xl border p-4', cfg.bg, cfg.border)}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-start gap-3 text-left">
        <Icon className={clsx('w-5 h-5 shrink-0 mt-0.5', cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{issue.rule}</span>
            <span className={clsx('badge shrink-0 capitalize', cfg.bg, cfg.color)}>{t(cfg.labelKey)}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{issue.description}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="mt-3 ml-8">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('ats.howToFix')}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{issue.suggestion}</p>
        </div>
      )}
    </div>
  )
}

export default function ATSReport({ report }) {
  const { t } = useTranslation()
  const criticalCount = report.issues?.filter((i) => i.severity === 'critical').length || 0
  const warningCount  = report.issues?.filter((i) => i.severity === 'warning').length || 0

  const scoreColor =
    report.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
    report.score >= 60 ? 'text-amber-600 dark:text-amber-400' :
    report.score >= 40 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('ats.heading')}</h2>
        <div className="flex items-center gap-2">
          <span className={clsx('text-2xl font-bold', scoreColor)}>{report.score}</span>
          <span className="text-gray-400 dark:text-gray-500 text-sm">/100</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
          <XCircle className="w-4 h-4" /> {criticalCount} {t('ats.criticalCount')}
        </span>
        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
          <AlertTriangle className="w-4 h-4" /> {warningCount} {t('ats.warningsCount')}
        </span>
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4" /> {report.passed_checks?.length || 0} {t('ats.passedCount')}
        </span>
      </div>

      {report.overall_assessment && (
        <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
          {report.overall_assessment}
        </p>
      )}

      {report.issues?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('ats.issuesFound')}</p>
          {report.issues.map((issue, i) => <IssueCard key={i} issue={issue} />)}
        </div>
      )}

      {report.passed_checks?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('ats.passedChecks')}</p>
          <div className="flex flex-wrap gap-2">
            {report.passed_checks.map((check, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> {check}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
