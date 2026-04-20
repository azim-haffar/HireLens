import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { flushSync } from 'react-dom'
import { analysisApi, appApi } from '../lib/api'
import ScoreCard from '../components/ScoreCard'
import ATSReport from '../components/ATSReport'
import InterviewQuestions from '../components/InterviewQuestions'
import CoverLetter from '../components/CoverLetter'
import toast from 'react-hot-toast'
import { ArrowLeft, Bookmark, Loader2, Sparkles, Download } from 'lucide-react'
import clsx from 'clsx'

export default function AnalysisResult() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('score')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [printing, setPrinting] = useState(false)

  const TABS = [
    { key: 'score',        label: t('analysisResult.tabScore') },
    { key: 'ats',          label: t('analysisResult.tabATS') },
    { key: 'interview',    label: t('analysisResult.tabInterview') },
    { key: 'cover_letter', label: t('analysisResult.tabCoverLetter') },
  ]

  useEffect(() => {
    analysisApi.get(id)
      .then(setAnalysis)
      .catch(() => toast.error(t('analysisResult.loadFailed')))
      .finally(() => setLoading(false))
  }, [id])

  const handleSaveApplication = async () => {
    setSaving(true)
    try {
      await appApi.create({ analysis_id: id })
      setSaved(true)
      toast.success(t('analysisResult.savedToTracker'))
    } catch (err) {
      toast.error(err.message || t('analysisResult.loadFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = () => {
    flushSync(() => setPrinting(true))
    window.print()
    setPrinting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-glow-brand">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('analysisResult.loadFailed')}</p>
        <Link to="/analyze" className="btn-primary inline-flex gap-2 text-sm">
          <Sparkles className="w-4 h-4" /> {t('analyze.heading')} {t('analyze.headingGradient')}
        </Link>
      </div>
    )
  }

  const score     = analysis.score_result || {}
  const ats       = analysis.ats_report || {}
  const questions = analysis.interview_questions || []

  const jobLabel = [analysis.job_title, analysis.job_company]
    .filter(x => x && x !== 'null')
    .join(' @ ')

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <p className="text-2xl font-bold text-gray-900">HireLens — Analysis Report</p>
        {jobLabel && <p className="text-gray-500 mt-1">{jobLabel}</p>}
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date(analysis.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        <hr className="mt-4 border-gray-200" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {t('analysisResult.backToHistory')}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('analysisResult.heading')}
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {new Date(analysis.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadPDF}
            className="btn-secondary flex items-center gap-2 text-sm"
            title={t('analysisResult.downloadPDF')}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('analysisResult.downloadPDF')}</span>
          </button>
          <button
            onClick={handleSaveApplication}
            disabled={saving || saved}
            className={clsx('flex items-center gap-2', saved ? 'btn-secondary' : 'btn-primary')}
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Bookmark className={clsx('w-4 h-4', saved && 'fill-current')} />}
            {saved ? t('analysisResult.savedToTracker') : t('analysisResult.saveToTracker')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-1.5 w-fit print:hidden">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200',
              activeTab === key
                ? 'bg-white dark:bg-gray-700 text-brand-700 dark:text-brand-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels — single active tab normally, all when printing */}
      {printing ? (
        <div className="space-y-8">
          <ScoreCard score={score} />
          <div className="print-break"><ATSReport report={ats} /></div>
          <div className="print-break"><InterviewQuestions questions={questions} /></div>
        </div>
      ) : (
        <div className="animate-fade-in">
          {activeTab === 'score'        && <ScoreCard score={score} />}
          {activeTab === 'ats'          && <ATSReport report={ats} />}
          {activeTab === 'interview'    && <InterviewQuestions questions={questions} />}
          {activeTab === 'cover_letter' && <CoverLetter analysisId={id} existing={analysis.cover_letter} />}
        </div>
      )}
    </div>
  )
}
