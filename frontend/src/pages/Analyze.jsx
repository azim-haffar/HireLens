import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analysisApi } from '../lib/api'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import CVUpload from '../components/CVUpload'
import JobInput from '../components/JobInput'
import { CheckCircle2, Sparkles, FileText, Briefcase, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function Analyze() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [cvId, setCvId] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const STEPS = [
    { id: 1, label: t('analyze.step1Label'), icon: FileText, desc: t('analyze.step1Desc') },
    { id: 2, label: t('analyze.step2Label'), icon: Briefcase, desc: t('analyze.step2Desc') },
    { id: 3, label: t('analyze.step3Label'), icon: Sparkles, desc: t('analyze.step3Desc') },
  ]

  const ANALYSIS_TASKS = [
    { label: t('analyze.task1'), delay: 0 },
    { label: t('analyze.task2'), delay: 800 },
    { label: t('analyze.task3'), delay: 1800 },
    { label: t('analyze.task4'), delay: 3000 },
  ]

  const handleCvUploaded = (id) => { setCvId(id); setStep(2) }

  const handleJobSaved = (id) => {
    setStep(3)
    runAnalysis(cvId, id)
  }

  const runAnalysis = async (cid, jid) => {
    setAnalyzing(true)
    try {
      const result = await analysisApi.run({ cv_id: cid, job_id: jid })
      toast.success(t('analyze.complete'))
      navigate(`/analysis/${result.id}`)
    } catch (err) {
      toast.error(err.message || t('analyze.failed'))
      setStep(2)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          {t('analyze.heading')} <span className="text-gradient">{t('analyze.headingGradient')}</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5">{t('analyze.subtitle')}</p>
      </div>

      {/* Stepper */}
      <div className="relative">
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-700 ease-out"
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
        />
        <div className="relative flex justify-between">
          {STEPS.map((s) => {
            const done = step > s.id
            const active = step === s.id
            const Icon = s.icon
            return (
              <div key={s.id} className="flex flex-col items-center gap-2 flex-1">
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 z-10',
                  done ? 'bg-emerald-500 border-emerald-500 text-white shadow-glow-green'
                    : active ? 'bg-gradient-to-br from-brand-500 to-violet-600 border-brand-500 text-white shadow-glow-brand animate-pulse-ring'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                )}>
                  {done ? <CheckCircle2 className="w-5 h-5" />
                    : active && s.id === 3 ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Icon className="w-4 h-4" />}
                </div>
                <div className="text-center">
                  <p className={clsx('text-xs font-semibold transition-colors duration-300',
                    active ? 'text-brand-700 dark:text-brand-300' : done ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                  )}>{s.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block mt-0.5">{s.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {step === 1 && <div className="animate-fade-in-up"><CVUpload onUploaded={handleCvUploaded} /></div>}
      {step === 2 && <div className="animate-fade-in-up"><JobInput onSaved={handleJobSaved} /></div>}
      {step === 3 && (
        <div className="card p-12 text-center animate-scale-in">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow-brand flex items-center justify-center animate-bounce-gentle">
              <Sparkles className="w-9 h-9 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 opacity-30 blur-xl animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-2">{t('analyze.analyzingHeading')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">{t('analyze.analyzingSubtitle')}</p>
          <div className="space-y-3 text-left max-w-sm mx-auto">
            {ANALYSIS_TASKS.map((task) => (
              <AnalysisTask key={task.label} label={task.label} delay={task.delay} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AnalysisTask({ label, delay }) {
  const [visible, setVisible] = useState(false)
  const [done, setDone] = useState(false)

  if (!visible) setTimeout(() => setVisible(true), delay)
  if (visible && !done) setTimeout(() => setDone(true), delay + 2000)
  if (!visible) return null

  return (
    <div className="flex items-center gap-3 text-sm animate-fade-in-up">
      <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-500',
        done ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-brand-100 dark:bg-brand-900/30'
      )}>
        {done
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          : <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />}
      </div>
      <span className={clsx('transition-colors duration-300',
        done ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'
      )}>{label}</span>
    </div>
  )
}
