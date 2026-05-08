import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import ScoreGauge from '../components/ScoreGauge'
import StreamingText from '../components/StreamingText'
import ChatPanel from '../components/ChatPanel'
import TypewriterText from '../components/TypewriterText'
import DeletableSelect from '../components/DeletableSelect'
import { CheckCircle, XCircle, AlertTriangle, Info, Copy, ChevronDown } from 'lucide-react'

const SEVERITY_ICON = {
  critical: <XCircle size={14} className="text-red-400 shrink-0" />,
  warning:  <AlertTriangle size={14} className="text-yellow-400 shrink-0" />,
  info:     <Info size={14} className="text-blue-400 shrink-0" />,
}

const Q_TYPE_COLOR = {
  technical:   { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)',  text: 'rgb(147,197,253)' },
  behavioural: { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.25)',  text: 'rgb(196,181,253)' },
  situational: { bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.25)',  text: 'rgb(253,186,116)' },
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgb(209,213,219)',
  outline: 'none',
}

export default function AnalysisPage() {
  const { t } = useTranslation()

  const TABS = [
    { key: 'scores',    label: t('analysis.tabScores') },
    { key: 'explain',   label: t('analysis.tabExplain') },
    { key: 'interview', label: t('analysis.tabInterview') },
    { key: 'cover',     label: t('analysis.tabCoverLetter') },
    { key: 'compare',   label: t('analysis.tabCompare') },
  ]
  const [cvs, setCvs] = useState([])
  const [jobs, setJobs] = useState([])
  const [cvId, setCvId] = useState('')
  const [jobId, setJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [match, setMatch] = useState(null)
  const [ats, setAts] = useState(null)
  const [interview, setInterview] = useState(null)
  const [coverLetter, setCoverLetter] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [cvBId, setCvBId] = useState('')
  const [tab, setTab] = useState('scores')
  const [copied, setCopied] = useState(false)
  const [interviewLoading, setInterviewLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/cv/versions').catch(() => []),
      api.get('/jobs/list').catch(() => []),
    ]).then(([c, j]) => {
      setCvs(c)
      setJobs(j)
    })
  }, [])

  const runAnalysis = async () => {
    if (!cvId || !jobId) return
    setLoading(true)
    setError('')
    try {
      const [m, a] = await Promise.all([
        api.post('/match/score',  { cv_id: cvId, job_id: jobId }),
        api.post('/ats/check',    { cv_id: cvId, job_id: jobId }),
      ])
      setMatch(m)
      setAts(a)
      setTab('scores')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadInterview = async () => {
    if (interviewLoading) return
    setInterviewLoading(true)
    try {
      const data = await api.post('/interview/generate', { cv_id: cvId, job_id: jobId })
      setInterview(data)
      setTab('interview')
    } catch (e) {
      console.error('Interview fetch failed:', e)
    } finally {
      setInterviewLoading(false)
    }
  }

  const loadCoverLetter = async () => {
    const data = await api.post('/cover-letter/generate', { cv_id: cvId, job_id: jobId })
    setCoverLetter(data)
    setTab('cover')
  }

  const loadComparison = async () => {
    if (!cvBId) return
    const data = await api.post('/comparison/compare', { cv_id_a: cvId, cv_id_b: cvBId, job_id: jobId })
    setComparison(data)
    setTab('compare')
  }

  const copyCoverLetter = () => {
    navigator.clipboard.writeText(`Subject: ${coverLetter.subject}\n\n${coverLetter.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const deleteCV = async (id) => {
    await api.delete(`/cv/versions/${id}`)
    setCvs((prev) => prev.filter((c) => c.id !== id))
    if (cvId === id) setCvId('')
  }

  const deleteJob = async (id) => {
    await api.delete(`/jobs/${id}`)
    setJobs((prev) => prev.filter((j) => j.id !== id))
    if (jobId === id) setJobId('')
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-page">
      <h1 className="text-2xl font-bold mb-1 text-gray-100">{t('analysis.pageTitle')}</h1>
      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>Run a full AI-powered analysis of your CV against a job. Get match score, ATS audit, interview questions, and a cover letter.</p>

      {/* Setup card */}
      <div className="glass-card p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('analysis.selectCV')}</label>
            <DeletableSelect
              value={cvId}
              onChange={setCvId}
              onDelete={deleteCV}
              options={cvs.map((c) => ({ value: c.id, label: c.filename }))}
              placeholder={t('analysis.chooseCV')}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-300">{t('analysis.selectJob')}</label>
              <Link to="/jobs" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                {t('analysis.addJobFirstLink')}
              </Link>
            </div>
            {jobs.length === 0 ? (
              <p
                className="text-sm text-gray-500 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {t('analysis.noJobsSaved')}{' '}
                <Link to="/jobs" className="text-blue-400 hover:text-blue-300 transition-colors">{t('analysis.addOne')}</Link>
              </p>
            ) : (
              <DeletableSelect
                value={jobId}
                onChange={setJobId}
                onDelete={deleteJob}
                options={jobs.map((j) => ({
                  value: j.id,
                  label: `${j.parsed_data?.title || t('analysis.untitled')} — ${j.parsed_data?.company || t('analysis.unknown')}`,
                }))}
                placeholder={t('analysis.chooseJob')}
              />
            )}
          </div>
        </div>

        {error && (
          <p
            className="mb-4 text-sm rounded-xl px-3 py-2"
            style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              color: 'rgb(248,113,113)',
            }}
          >
            {error}
          </p>
        )}

        <button
          onClick={runAnalysis}
          disabled={loading || !cvId || !jobId || jobs.length === 0}
          title={jobs.length === 0 ? t('analysis.addJobFirstLink') : undefined}
          className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('analysis.analyzing') : t('analysis.pageTitle')}
        </button>
      </div>

      {(match || ats) && (
        <>
          {/* Tab bar */}
          <div
            className="flex mb-6"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key)
                  if (key === 'interview' && !interview) loadInterview()
                }}
                className={`tab-underline px-4 py-2.5 text-sm font-medium transition-all ${
                  tab === key ? 'active text-gray-100' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scores */}
          {tab === 'scores' && match && ats && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                {/* Match score */}
                <div className="glass-card p-6 flex flex-col items-center gap-4">
                  <ScoreGauge score={match.score} label={t('analysis.matchScore')} size="lg" />
                  <div className="w-full space-y-2.5 mt-1">
                    {[
                      [t('analysis.skillFit'),   match.breakdown.skill_fit],
                      [t('analysis.experience'),  match.breakdown.experience],
                      [t('analysis.education'),   match.breakdown.education],
                      [t('analysis.keywords'),    match.breakdown.keyword_coverage],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">{label}</span>
                          <span className="text-gray-300 font-medium">{val}%</span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${val}%`,
                              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ATS score */}
                <div className="glass-card p-6 flex flex-col items-center gap-4">
                  <ScoreGauge score={ats.score} label={t('analysis.atsScore')} size="lg" />
                  <p className="text-xs text-gray-500 text-center leading-relaxed">{ats.summary}</p>
                </div>
              </div>

              {/* ATS rules */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-gray-200 mb-4">{t('analysis.atsRules')}</h3>
                <div className="space-y-2">
                  {ats.rules.map((r, i) => (
                    <div
                      key={r.rule}
                      className="flex items-start gap-2.5 text-sm p-3 rounded-xl stagger-item"
                      style={{
                        '--delay': `${i * 0.05}s`,
                        background: r.passed ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
                        border: `1px solid ${r.passed ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}`,
                      }}
                    >
                      <span className="mt-0.5 pop-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        {r.passed
                          ? <CheckCircle size={14} className="text-green-400 shrink-0" />
                          : SEVERITY_ICON[r.severity]}
                      </span>
                      <div>
                        <span className="font-medium text-gray-200">{r.rule}</span>
                        {!r.passed && r.suggestion && (
                          <p className="text-gray-500 text-xs mt-0.5">{r.suggestion}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button onClick={loadInterview} className="btn-primary px-4 py-2">
                  {t('analysis.interviewPrep')}
                </button>
                <button onClick={loadCoverLetter} className="btn-outline px-4 py-2">
                  {t('analysis.coverLetter')}
                </button>
              </div>
            </div>
          )}

          {/* Explain */}
          {tab === 'explain' && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-gray-200 mb-4">{t('analysis.aiExplanation')}</h3>
              <StreamingText
                path="/explain/stream"
                body={{ cv_id: cvId, job_id: jobId }}
                triggerLabel={t('analysis.explainScore')}
              />
            </div>
          )}

          {/* Interview */}
          {tab === 'interview' && (
            <div className="space-y-3">
              {interviewLoading && (
                <div className="flex items-center gap-3 text-sm text-gray-500 py-12 justify-center">
                  <div
                    className="animate-spin rounded-full h-5 w-5 border-b-2"
                    style={{ borderColor: 'rgb(59,130,246)' }}
                  />
                  {t('analysis.generatingQuestions')}
                </div>
              )}
              {!interviewLoading && !interview && (
                <div className="glass-card p-8 text-center">
                  <p className="text-sm text-gray-500 mb-4">{t('analysis.questionsNotReady')}</p>
                  <button onClick={loadInterview} className="btn-primary px-4 py-2">
                    {t('analysis.generateQuestions')}
                  </button>
                </div>
              )}
              {!interviewLoading && interview && interview.questions.map((q, i) => {
                const tc = Q_TYPE_COLOR[q.type] || Q_TYPE_COLOR.situational
                return (
                  <details
                    key={i}
                    className="glass-card p-4 group stagger-item"
                    style={{ '--delay': `${i * 0.05}s` }}
                  >
                    <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                          style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text }}
                        >
                          {q.type}
                        </span>
                        <span className="font-medium text-sm text-gray-200 truncate">{q.question}</span>
                      </div>
                      <ChevronDown
                        size={15}
                        className="text-gray-500 shrink-0 transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <div
                      className="mt-3 pt-3"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1.5">
                        {t('analysis.framework')}: {q.framework}
                      </p>
                      <p className="text-sm text-gray-400 leading-relaxed">{q.answer_outline}</p>
                    </div>
                  </details>
                )
              })}
            </div>
          )}

          {/* Cover letter */}
          {tab === 'cover' && (
            <div className="glass-card p-6">
              {coverLetter ? (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-gray-200">{t('analysis.coverLetterTitle')}</h3>
                    <button
                      onClick={copyCoverLetter}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-400 transition-colors"
                    >
                      <Copy size={13} />
                      {copied ? t('common.copied') : t('common.copy')}
                    </button>
                  </div>
                  <p
                    className="text-sm font-medium text-gray-300 mb-4 pb-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {t('analysis.subject')}: {coverLetter.subject}
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                    <TypewriterText text={coverLetter.body} speed={4} />
                  </p>
                </>
              ) : (
                <div className="text-center py-4">
                  <button onClick={loadCoverLetter} className="btn-primary px-5 py-2.5">
                    {t('analysis.generateCoverLetter')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Compare */}
          {tab === 'compare' && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-gray-200 mb-4">{t('analysis.compare')}</h3>
              <div className="flex gap-3 mb-5">
                <select
                  value={cvBId}
                  onChange={(e) => setCvBId(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2 text-sm transition-all"
                  style={inputStyle}
                >
                  <option value="">— Select second CV —</option>
                  {cvs.filter((c) => c.id !== cvId).map((c) => (
                    <option key={c.id} value={c.id}>{c.filename}</option>
                  ))}
                </select>
                <button
                  onClick={loadComparison}
                  disabled={!cvBId}
                  className="btn-primary px-4 py-2 disabled:opacity-50"
                >
                  {t('analysis.compareBtn')}
                </button>
              </div>
              {comparison && (
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-5">{comparison.verdict}</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[comparison.cv_a, comparison.cv_b].map((cv) => (
                      <div
                        key={cv.cv_id}
                        className="rounded-xl p-4"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `2px solid ${comparison.winner === cv.name ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        <p className="font-medium text-gray-200 mb-2">{cv.name}</p>
                        <p className="text-sm text-gray-400">{t('analysis.matchLabel')}: <strong className="text-gray-200">{cv.match_score}</strong></p>
                        <p className="text-sm text-gray-400">{t('analysis.atsLabel')}: <strong className="text-gray-200">{cv.ats_score}</strong></p>
                        <p className="text-sm text-gray-400">{t('analysis.skillFit')}: {cv.skill_fit}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <ChatPanel cvId={cvId} jobId={jobId} />
    </div>
  )
}
