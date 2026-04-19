import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { jobApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Link2, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

export default function JobInput({ onSaved }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (mode === 'url' && !url.trim()) { toast.error(t('jobInput.enterURL')); return }
    if (mode === 'text' && text.trim().length < 50) { toast.error(t('jobInput.minChars')); return }
    setLoading(true)
    try {
      const result = await jobApi.create({
        url: mode === 'url' ? url.trim() : null,
        text: mode === 'text' ? text.trim() : null,
      })
      setSaved(result)
      toast.success(t('jobInput.parseSuccess'))
      onSaved(result.id)
    } catch (err) {
      toast.error(err.message || t('jobInput.parseFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('jobInput.heading')}</h2>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl w-fit">
        {[
          { id: 'url', labelKey: 'jobInput.pasteURL', icon: Link2 },
          { id: 'text', labelKey: 'jobInput.pasteText', icon: FileText },
        ].map(({ id, labelKey, icon: Icon }) => (
          <button key={id} onClick={() => setMode(id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              mode === id
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}>
            <Icon className="w-3.5 h-3.5" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'url' ? (
          <div>
            <label className="label">{t('jobInput.urlLabel')}</label>
            <input type="url" className="input" placeholder={t('jobInput.urlPlaceholder')}
              value={url} onChange={(e) => setUrl(e.target.value)} disabled={loading} />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('jobInput.urlHelper')}</p>
          </div>
        ) : (
          <div>
            <label className="label">{t('jobInput.textLabel')}</label>
            <textarea className="input min-h-[180px] resize-y" placeholder={t('jobInput.textPlaceholder')}
              value={text} onChange={(e) => setText(e.target.value)} disabled={loading} />
          </div>
        )}

        <button type="submit" disabled={loading || !!saved} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t('jobInput.parsing')}</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4" /> {t('jobInput.saved')}</>
          ) : t('jobInput.parseBtn')}
        </button>
      </form>

      {saved && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-400">
            {saved.title}{saved.company && ` at ${saved.company}`}
          </p>
          <p className="text-blue-600 dark:text-blue-500 mt-1">
            {saved.parsed_data?.required_skills?.length || 0} {t('jobInput.skillsExtracted')}
          </p>
        </div>
      )}
    </div>
  )
}
