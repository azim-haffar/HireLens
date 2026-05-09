import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Upload, CheckCircle, FileText, ArrowRight, Briefcase, GraduationCap } from 'lucide-react'

/* ── Progress bar that fills to ~82% while loading, 100% on done ── */
function ProgressBar({ loading, done }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (loading) {
      setWidth(0)
      // Small delay so browser paints 0% first
      const t = setTimeout(() => setWidth(82), 30)
      return () => clearTimeout(t)
    }
    if (done) setWidth(100)
  }, [loading, done])

  return (
    <div
      className="w-full h-1 rounded-full overflow-hidden"
      style={{ background: 'var(--progress-track)' }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          transition: loading
            ? 'width 2.5s cubic-bezier(0.4,0,0.2,1)'
            : 'width 0.3s ease',
        }}
      />
    </div>
  )
}

/* ── Next button with animated arrow ─────────────────────────────── */
function NextButton({ onClick }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
        boxShadow: hovered ? '0 8px 24px rgba(59,130,246,0.45)' : '0 2px 14px rgba(59,130,246,0.28)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {t('upload.nextAddJob')}
      <ArrowRight
        size={16}
        style={{
          transform: hovered ? 'translateX(4px)' : 'translateX(0)',
          transition: 'transform 0.2s ease',
        }}
      />
    </button>
  )
}

/* ── Timeline row ─────────────────────────────────────────────────── */
function TimelineItem({ primary, secondary, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ background: 'rgba(59,130,246,0.7)', boxShadow: '0 0 6px rgba(59,130,246,0.5)' }}
        />
        {!isLast && (
          <div
            className="flex-1 w-px mt-1"
            style={{ background: 'var(--border-subtle)', minHeight: '16px' }}
          />
        )}
      </div>
      <div className="pb-3 min-w-0">
        <p className="text-sm font-medium text-gray-200 leading-snug">{primary}</p>
        {secondary && <p className="text-xs text-gray-500 mt-0.5">{secondary}</p>}
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function UploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [dragging, setDragging]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState('')
  const [result, setResult]         = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) {
      setError(t('upload.pdfOnly'))
      return
    }
    setSelectedFile(file)
    setLoading(true)
    setDone(false)
    setError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const data = await api.upload('/cv/upload', form)
      setDone(true)
      // brief pause so progress bar hits 100% visibly
      setTimeout(() => setResult(data), 350)
    } catch (e) {
      setError(e.message)
      setLoading(false)
      setDone(false)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const reset = () => {
    setResult(null)
    setSelectedFile(null)
    setDone(false)
    setError('')
  }

  /* ── Success state ── */
  if (result) return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--dot-pattern) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div className="w-full max-w-2xl animate-page">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="pop-in"
            style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'rgba(74,222,128,0.12)',
                border: '2px solid rgba(74,222,128,0.35)',
                boxShadow: '0 0 24px rgba(74,222,128,0.2)',
              }}
            >
              <CheckCircle size={32} className="text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">{t('cv.parsed')}</h1>
          {result.parsed.name && (
            <p className="text-xl font-black gradient-text">{result.parsed.name}</p>
          )}
        </div>

        {/* Content card */}
        <div
          className="rounded-2xl p-7 mb-5 space-y-7"
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Skills */}
          {result.parsed.skills?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.15)' }}
                >
                  <span className="text-blue-400 text-xs font-bold">S</span>
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {t('cv.skills')}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.parsed.skills.slice(0, 24).map((s) => (
                  <span key={s} className="skill-pill">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {result.parsed.experience?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.15)' }}
                >
                  <Briefcase size={12} className="text-purple-400" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {t('cv.experience')}
                </span>
              </div>
              <div>
                {result.parsed.experience.map((e, i) => (
                  <TimelineItem
                    key={i}
                    primary={`${e.title}${e.company ? ` · ${e.company}` : ''}`}
                    secondary={e.duration}
                    isLast={i === result.parsed.experience.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {result.parsed.education?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(74,222,128,0.12)' }}
                >
                  <GraduationCap size={12} className="text-green-400" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {t('cv.education')}
                </span>
              </div>
              <div>
                {result.parsed.education.map((e, i) => (
                  <TimelineItem
                    key={i}
                    primary={e.degree || '—'}
                    secondary={e.institution}
                    isLast={i === result.parsed.education.length - 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <NextButton onClick={() => navigate('/jobs')} />
          <button
            onClick={reset}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            {t('upload.uploadAnother')}
          </button>
        </div>
      </div>
    </div>
  )

  /* ── Upload state ── */
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--dot-pattern) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div className="w-full max-w-lg animate-page">
        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-black mb-2"
            style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('upload.title')}
          </h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>Upload your CV as a PDF. We'll parse it instantly and extract your skills, experience, and education.</p>
        </div>

        {/* Error */}
        {error && (
          <p
            className="mb-4 text-sm rounded-xl px-4 py-2.5 text-center"
            style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.22)',
              color: 'rgb(248,113,113)',
            }}
          >
            {error}
          </p>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
          onDrop={onDrop}
          onClick={() => !loading && fileRef.current?.click()}
          className="relative rounded-2xl flex flex-col items-center justify-center gap-5 transition-all duration-300"
          style={{
            minHeight: '280px',
            cursor: loading ? 'default' : 'pointer',
            background: dragging ? 'rgba(59,130,246,0.08)' : 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: dragging
              ? '2px solid rgba(59,130,246,0.7)'
              : '2px dashed var(--border-input)',
            boxShadow: dragging ? '0 0 32px rgba(59,130,246,0.15) inset' : 'none',
          }}
        >
          {loading ? (
            /* Parsing state */
            <div className="flex flex-col items-center gap-5 px-8 w-full">
              {/* File info */}
              {selectedFile && (
                <div
                  className="flex items-center gap-3 w-full rounded-xl px-4 py-3"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(59,130,246,0.15)' }}
                  >
                    <FileText size={16} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatSize(selectedFile.size)}</p>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              <div className="w-full">
                <ProgressBar loading={loading} done={done} />
              </div>

              {/* Spinner + label */}
              <div className="flex items-center gap-3">
                <div
                  className="animate-spin rounded-full h-5 w-5 border-b-2"
                  style={{ borderColor: '#3b82f6' }}
                />
                <span className="text-sm text-gray-400">{t('cv.parsing')}</span>
              </div>
            </div>
          ) : (
            /* Idle state */
            <>
              {/* Floating icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  boxShadow: '0 0 28px rgba(59,130,246,0.2)',
                  animation: 'iconFloat 2.8s ease-in-out infinite',
                }}
              >
                <Upload size={34} className="text-blue-400" />
              </div>

              <div className="text-center">
                <p className="font-bold text-gray-100 text-base">{t('upload.dropHere')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('upload.clickBrowse')}</p>
              </div>

              {/* Drag-over overlay hint */}
              {dragging && (
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.06)' }}
                >
                  <p className="text-blue-300 font-semibold text-lg">{t('upload.releaseToUpload')}</p>
                </div>
              )}
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        <p className="text-center text-xs text-gray-600 mt-4">
          {t('upload.footer')}
        </p>
      </div>
    </div>
  )
}
