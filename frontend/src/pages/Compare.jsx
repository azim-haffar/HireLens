import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cvApi, jobApi, analysisApi } from '../lib/api'
import toast from 'react-hot-toast'
import { GitCompare, Loader2, Upload, ArrowRight, FileUp, Trash2 } from 'lucide-react'
import CVUpload from '../components/CVUpload'
import clsx from 'clsx'

const VERDICT_STYLES = {
  strong:   'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  weak:     'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

function ScoreBadge({ score, verdict, label }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 uppercase font-semibold">{label}</p>
      <div className={clsx('flex flex-col items-center px-6 py-4 rounded-xl border-2', VERDICT_STYLES[verdict] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600')}>
        <span className="text-4xl font-bold">{score}</span>
        <span className="text-xs mt-1 capitalize font-medium">{verdict}</span>
      </div>
    </div>
  )
}

export default function Compare() {
  const { t } = useTranslation()
  const [cvs, setCvs] = useState([])
  const [jobs, setJobs] = useState([])
  const [cvsLoading, setCvsLoading] = useState(true)
  const [cvV1, setCvV1] = useState('')
  const [cvV2, setCvV2] = useState('')
  const [jobId, setJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [uploadMode, setUploadMode] = useState(false)

  useEffect(() => {
    Promise.all([cvApi.list(), jobApi.list()])
      .then(([c, j]) => { setCvs(c); setJobs(j) })
      .catch(console.error)
      .finally(() => setCvsLoading(false))
  }, [])

  const handleCompare = async (e) => {
    e.preventDefault()
    if (!cvV1 || !cvV2 || !jobId) { toast.error(t('compare.selectBoth')); return }
    if (cvV1 === cvV2) { toast.error(t('compare.selectDifferent')); return }
    setLoading(true)
    setResult(null)
    try {
      const r = await analysisApi.compare({ cv_id_v1: cvV1, cv_id_v2: cvV2, job_id: jobId })
      setResult(r)
    } catch (err) {
      toast.error(err.message || t('compare.comparisonFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleNewCvUploaded = () => {
    cvApi.list().then(setCvs)
    setUploadMode(false)
    toast.success(t('compare.newCVUploaded'))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{t('compare.heading')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5">{t('compare.subtitle')}</p>
      </div>

      {uploadMode ? (
        <div>
          <button
            onClick={() => setUploadMode(false)}
            className="text-sm text-brand-600 dark:text-brand-400 hover:underline mb-4 flex items-center gap-1 group"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            {t('compare.backToSelection')}
          </button>
          <CVUpload onUploaded={handleNewCvUploaded} />
        </div>
      ) : !cvsLoading && cvs.length < 2 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-4">
            <FileUp className="w-8 h-8 text-brand-400" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('compare.needTwoCVs')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('compare.needTwoCVsDesc')}</p>
          <Link to="/analyze" className="btn-primary inline-flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" /> {t('compare.goUploadCV')}
          </Link>
        </div>
      ) : (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('compare.selectHeading')}</h2>
            <button onClick={() => setUploadMode(true)} className="btn-secondary text-sm flex items-center gap-1.5 py-1.5">
              <Upload className="w-3.5 h-3.5" /> {t('compare.uploadNew')}
            </button>
          </div>

          <form onSubmit={handleCompare} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('compare.cv1Label')}</label>
                <select className="input" value={cvV1} onChange={(e) => setCvV1(e.target.value)} required>
                  <option value="">{t('compare.selectCV')}</option>
                  {cvs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.filename} — {new Date(c.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('compare.cv2Label')}</label>
                <select className="input" value={cvV2} onChange={(e) => setCvV2(e.target.value)} required>
                  <option value="">{t('compare.selectCV')}</option>
                  {cvs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.filename} — {new Date(c.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">{t('compare.jobLabel')}</label>
              <div className="space-y-1.5">
                {jobs.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('compare.noJobs')}</p>
                ) : (
                  jobs.map((j) => (
                    <div
                      key={j.id}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150 group',
                        jobId === j.id
                          ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                      )}
                      onClick={() => setJobId(j.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-medium truncate', jobId === j.id ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200')}>
                          {(j.title && j.title !== 'null') ? j.title : 'Untitled Role'}
                        </p>
                        {j.company && j.company !== 'null' && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{j.company}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm('Delete this job?')) return
                          try {
                            await jobApi.delete(j.id)
                            setJobs((prev) => prev.filter((x) => x.id !== j.id))
                            if (jobId === j.id) setJobId('')
                            toast.success('Job deleted')
                          } catch (err) {
                            toast.error(err.message || 'Delete failed')
                          }
                        }}
                        className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Delete job"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <input type="hidden" value={jobId} required />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('compare.comparing')}</>
                : <><GitCompare className="w-4 h-4" /> {t('compare.compareCVs')}</>}
            </button>
          </form>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5 animate-fade-in-up">
          {/* Score comparison */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-5">{t('compare.scoreComparison')}</h3>
            <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
              <ScoreBadge
                score={result.v1_score.overall_score}
                verdict={result.v1_score.verdict}
                label={t('compare.v1')}
              />
              <ArrowRight className="w-6 h-6 text-gray-400 dark:text-gray-600 shrink-0" />
              <ScoreBadge
                score={result.v2_score.overall_score}
                verdict={result.v2_score.verdict}
                label={t('compare.v2')}
              />
              <div className="text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 uppercase font-semibold">{t('compare.change')}</p>
                <div className={clsx(
                  'flex flex-col items-center px-5 py-4 rounded-xl border-2',
                  result.v2_score.overall_score >= result.v1_score.overall_score
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                    : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                )}>
                  <span className="text-3xl font-bold">
                    {result.v2_score.overall_score >= result.v1_score.overall_score ? '+' : ''}
                    {result.v2_score.overall_score - result.v1_score.overall_score}
                  </span>
                  <span className="text-xs mt-1 font-medium">{t('compare.points')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Skill changes */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('compare.skillChanges')}</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold mb-2">{t('compare.newSkills')}</p>
                <div className="flex flex-wrap gap-1">
                  {result.v2_score.matched_skills
                    .filter((s) => !result.v1_score.matched_skills.includes(s))
                    .map((s) => (
                      <span key={s} className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{s}</span>
                    ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold mb-2">{t('compare.stillMissing')}</p>
                <div className="flex flex-wrap gap-1">
                  {result.v2_score.missing_skills.map((s) => (
                    <span key={s} className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('compare.summary')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{result.summary}</p>
              {result.improvement_areas?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold mb-2">{t('compare.remainingImprovements')}</p>
                  <ul className="space-y-1">
                    {result.improvement_areas.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-brand-500 dark:text-brand-400 shrink-0">→</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
