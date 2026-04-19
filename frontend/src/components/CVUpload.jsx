import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { cvApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

export default function CVUpload({ onUploaded }) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(null)

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error(t('cvUpload.pdfOnly'))
      return
    }
    setUploading(true)
    try {
      const result = await cvApi.upload(file)
      setUploaded(result)
      toast.success(t('cvUpload.uploadSuccess'))
      onUploaded(result.id)
    } catch (err) {
      toast.error(err.message || t('cvUpload.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }, [onUploaded, t])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <div className="card p-6 space-y-4">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('cvUpload.heading')}</h2>
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-brand-400 hover:bg-gray-50 dark:hover:border-brand-500 dark:hover:bg-gray-700/30',
          uploading && 'opacity-60 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('cvUpload.uploading')}</p>
          </div>
        ) : uploaded ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{uploaded.filename}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('cvUpload.parsedSuccess')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isDragActive ? t('cvUpload.dropActive') : t('cvUpload.dropPrompt')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('cvUpload.requirement')}</p>
            </div>
          </div>
        )}
      </div>

      {uploaded && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-emerald-800 dark:text-emerald-400">{t('cvUpload.parsedTitle')}</p>
              <p className="text-emerald-600 dark:text-emerald-500 mt-1">
                {t('cvUpload.parsedSummary', {
                  skills: uploaded.parsed_data?.skills?.length || 0,
                  experience: uploaded.parsed_data?.experience?.length || 0,
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
