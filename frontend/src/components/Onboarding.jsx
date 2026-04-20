import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Upload, Sparkles, Briefcase, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

function Step1({ t }) {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mx-auto shadow-glow-brand">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('onboarding.step1Title')}</h2>
      <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{t('onboarding.step1Desc')}</p>
    </div>
  )
}

function Step2({ t }) {
  const features = [
    { icon: Upload,   title: t('onboarding.feature1'), desc: t('onboarding.feature1Desc'), color: 'from-brand-500 to-brand-600' },
    { icon: Sparkles, title: t('onboarding.feature2'), desc: t('onboarding.feature2Desc'), color: 'from-violet-500 to-purple-600' },
    { icon: Briefcase,title: t('onboarding.feature3'), desc: t('onboarding.feature3Desc'), color: 'from-emerald-500 to-teal-600' },
  ]
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('onboarding.step2Title')}</h2>
      <div className="space-y-4">
        {features.map(({ icon: Icon, title, desc, color }, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className={clsx('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', color)}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Step3({ t }) {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('onboarding.step3Title')}</h2>
      <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{t('onboarding.step3Desc')}</p>
    </div>
  )
}

export default function Onboarding({ onDismiss }) {
  const [step, setStep] = useState(0)
  const { t } = useTranslation()
  const navigate = useNavigate()

  const dismiss = () => {
    localStorage.setItem('onboarding_done', '1')
    onDismiss()
  }

  const start = () => {
    localStorage.setItem('onboarding_done', '1')
    onDismiss()
    navigate('/analyze')
  }

  const STEPS = [
    <Step1 t={t} />,
    <Step2 t={t} />,
    <Step3 t={t} />,
  ]
  const total = STEPS.length

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md relative animate-scale-in">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 pt-8">
          {STEPS[step]}
        </div>

        <div className="px-6 pb-6 sm:px-8 sm:pb-8 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === step ? 'w-6 bg-brand-500' : 'w-1.5 bg-gray-200 dark:bg-gray-700'
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary text-sm py-2 px-3">
                {t('onboarding.back')}
              </button>
            )}
            {step < total - 1 ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-primary text-sm py-2 px-4">
                {t('onboarding.next')}
              </button>
            ) : (
              <button onClick={start} className="btn-primary text-sm py-2 px-4">
                {t('onboarding.getStarted')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
