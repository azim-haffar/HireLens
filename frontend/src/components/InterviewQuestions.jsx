import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import clsx from 'clsx'

const CATEGORY_STYLES = {
  technical:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  behavioral:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  situational: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}
const DIFFICULTY_STYLES = {
  easy:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  hard:   'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

function QuestionCard({ q, index }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{q.question}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {q.category && (
              <span className={clsx('badge capitalize', CATEGORY_STYLES[q.category] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400')}>
                {t(`interview.categories.${q.category}`, q.category)}
              </span>
            )}
            {q.difficulty && (
              <span className={clsx('badge capitalize', DIFFICULTY_STYLES[q.difficulty] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400')}>
                {t(`interview.difficulty.${q.difficulty}`, q.difficulty)}
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
      </button>
      {open && (
        <div className="px-4 pb-4 ml-9 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          {q.why_asked && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">{t('interview.whyAsk')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">{q.why_asked}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">{t('interview.answerFramework')}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{q.suggested_answer}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InterviewQuestions({ questions }) {
  const { t } = useTranslation()
  if (!questions?.length) return null
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('interview.heading')}</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('interview.description')}</p>
      <div className="space-y-2">
        {questions.map((q, i) => <QuestionCard key={i} q={q} index={i} />)}
      </div>
    </div>
  )
}
