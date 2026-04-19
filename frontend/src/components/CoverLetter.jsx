import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { coverLetterApi } from '../lib/api'
import toast from 'react-hot-toast'
import { FileEdit, Loader2, Copy, Check, Sparkles } from 'lucide-react'

export default function CoverLetter({ analysisId, existing }) {
  const { t } = useTranslation()
  const [data, setData] = useState(existing || null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const result = await coverLetterApi.generate(analysisId)
      setData(result)
      toast.success(t('coverLetter.generated'))
    } catch (err) {
      toast.error(err.message || t('coverLetter.failed'))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!data?.cover_letter) return
    await navigator.clipboard.writeText(data.cover_letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileEdit className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('coverLetter.heading')}</h2>
        </div>
        {data && (
          <button onClick={copyToClipboard} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('coverLetter.copied') : t('coverLetter.copy')}
          </button>
        )}
      </div>

      {!data ? (
        <div className="text-center py-8">
          <Sparkles className="w-10 h-10 text-brand-300 dark:text-brand-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('coverLetter.description')}</p>
          <button onClick={generate} disabled={loading} className="btn-primary flex items-center gap-2 mx-auto">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('coverLetter.generating')}</>
              : <><Sparkles className="w-4 h-4" /> {t('coverLetter.generate')}</>}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.subject_line && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">{t('coverLetter.subjectLine')}</p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl px-3 py-2">
                {data.subject_line}
              </p>
            </div>
          )}

          {data.key_highlights?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2">{t('coverLetter.keyHighlights')}</p>
              <div className="flex flex-wrap gap-2">
                {data.key_highlights.map((h, i) => (
                  <span key={i} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">{h}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2">{t('coverLetter.coverLetter')}</p>
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {data.cover_letter}
            </div>
          </div>

          <button onClick={generate} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {t('coverLetter.regenerate')}
          </button>
        </div>
      )}
    </div>
  )
}
