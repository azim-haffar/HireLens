import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

const VERDICT_CONFIG = {
  strong:   { color: 'text-emerald-600',  bg: 'bg-emerald-50 dark:bg-emerald-900/20',  border: 'border-emerald-200 dark:border-emerald-800',  ring: '#10b981', key: 'score.strong' },
  moderate: { color: 'text-amber-600',    bg: 'bg-amber-50 dark:bg-amber-900/20',     border: 'border-amber-200 dark:border-amber-800',     ring: '#f59e0b', key: 'score.moderate' },
  weak:     { color: 'text-orange-600',   bg: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-200 dark:border-orange-800',   ring: '#f97316', key: 'score.weak' },
  rejected: { color: 'text-red-600',      bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-200 dark:border-red-800',         ring: '#ef4444', key: 'score.notAMatch' },
}

function ScoreRing({ score, color }) {
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-200 dark:text-gray-700" />
      <circle
        cx="60" cy="60" r={radius} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
    </svg>
  )
}

function DimBar({ label, score }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-800 dark:text-gray-200">{score}%</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            backgroundColor: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444',
          }}
        />
      </div>
    </div>
  )
}

export default function ScoreCard({ score }) {
  const { t } = useTranslation()
  const cfg = VERDICT_CONFIG[score.verdict] || VERDICT_CONFIG.weak

  return (
    <div className={clsx('card p-6 border-2', cfg.border)}>
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('score.matchScore')}</h2>

      <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
        <div className="relative shrink-0">
          <ScoreRing score={score.overall_score} color={cfg.ring} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{score.overall_score}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">/ 100</span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div className={clsx('inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold', cfg.bg, cfg.color)}>
            {t(cfg.key)}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('score.matchedSkills')}</p>
              <div className="flex flex-wrap gap-1">
                {score.matched_skills?.slice(0, 6).map((s) => (
                  <span key={s} className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{s}</span>
                ))}
                {(score.matched_skills?.length || 0) > 6 && (
                  <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">+{score.matched_skills.length - 6}</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('score.missingSkills')}</p>
              <div className="flex flex-wrap gap-1">
                {score.missing_skills?.slice(0, 6).map((s) => (
                  <span key={s} className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{s}</span>
                ))}
                {(score.missing_skills?.length || 0) > 6 && (
                  <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">+{score.missing_skills.length - 6}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <DimBar label={t('score.skillMatch')} score={score.skill_match_score} />
        <DimBar label={t('score.experienceRelevance')} score={score.experience_score} />
        <DimBar label={t('score.educationFit')} score={score.education_score} />
        <DimBar label={t('score.keywordCoverage')} score={score.keyword_score} />
      </div>

      {score.reasons?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('score.whyScore')}</p>
          <ul className="space-y-1.5">
            {score.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.recommendations?.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('score.recommendations')}</p>
          <ul className="space-y-1.5">
            {score.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-brand-500 dark:text-brand-400 shrink-0">→</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
