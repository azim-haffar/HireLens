import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Link2, CheckCircle, AlertCircle, ArrowRight, FileText } from 'lucide-react'

const PLATFORMS = ['LinkedIn', 'Indeed', 'Greenhouse', 'Lever', 'Stepstone']

/* ── Reusable focused-input style helpers ─────────────────────── */
const baseInput = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-input)',
  color: 'var(--text-input)',
  outline: 'none',
  transition: 'border-color 0.2s',
}
const focusBorder  = 'rgba(59,130,246,0.55)'
const normalBorder = 'var(--border-input)'

/* ── Run-analysis button with animated arrow ─────────────────── */
function RunButton({ onClick }) {
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
      {t('job.runAnalysis')}
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

/* ── Page ────────────────────────────────────────────────────── */
export default function JobsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode]       = useState('url')
  const [url, setUrl]         = useState('')
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body = mode === 'url' ? { url } : { text }
      const data = await api.post('/jobs/ingest', body)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  /* ── dot-grid wrapper shared between both states ── */
  const Page = ({ children }) => (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div className="w-full max-w-[640px] animate-page">{children}</div>
    </div>
  )

  /* ── Success state ── */
  if (result) return (
    <Page>
      {/* Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div
          style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'rgba(74,222,128,0.12)',
              border: '2px solid rgba(74,222,128,0.35)',
              boxShadow: '0 0 28px rgba(74,222,128,0.2)',
            }}
          >
            <CheckCircle size={32} className="text-green-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">{t('job.jobAdded')}</h1>
        <p
          className="text-2xl font-black"
          style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {result.job.title}
        </p>
        {result.job.company && (
          <p className="text-gray-500 mt-1 text-sm">{result.job.company}</p>
        )}
      </div>

      {/* Skills card */}
      <div
        className="rounded-2xl p-6 mb-5 space-y-5"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Required skills */}
        {result.job.required_skills?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1.5 h-4 rounded-full"
                style={{ background: 'linear-gradient(180deg, #3b82f6, #6366f1)' }}
              />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                {t('job.requiredSkills')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.job.required_skills.map((s) => (
                <span key={s} className="skill-pill">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Nice-to-have skills */}
        {result.job.nice_to_have?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1.5 h-4 rounded-full"
                style={{ background: 'linear-gradient(180deg, #8b5cf6, #a78bfa)' }}
              />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                {t('job.niceToHave')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.job.nice_to_have.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200"
                  style={{
                    background: 'rgba(139,92,246,0.1)',
                    border: '1px solid rgba(139,92,246,0.22)',
                    color: 'rgb(196,181,253)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(139,92,246,0.2)'
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(139,92,246,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(139,92,246,0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <RunButton onClick={() => navigate('/analysis')} />
        <button
          onClick={() => setResult(null)}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          {t('job.addAnother')}
        </button>
      </div>
    </Page>
  )

  /* ── Form state ── */
  return (
    <Page>
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
          {t('job.pageTitle')}
        </h1>
        <p className="text-sm" style={{ color: '#94a3b8' }}>Add a job posting via URL or paste the description. We'll extract the requirements automatically.</p>
      </div>

      {/* Glass card */}
      <div
        className="rounded-2xl p-7"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Pill toggle */}
        <div
          className="flex p-1 rounded-xl mb-6"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
        >
          {[
            { key: 'url',  label: t('job.urlLabel'),       icon: Link2 },
            { key: 'text', label: t('job.pasteTextLabel'), icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={
                mode === key
                  ? {
                      background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 12px rgba(59,130,246,0.3)',
                    }
                  : {
                      color: 'rgb(107,114,128)',
                      background: 'transparent',
                    }
              }
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
            style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.22)',
            }}
          >
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-xs text-red-400 hover:text-red-200 transition-colors shrink-0 font-medium"
            >
              {t('job.tryAgain')}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'url' ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('job.url')}
              </label>
              {/* URL input with icon */}
              <div
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 transition-all duration-200"
                style={baseInput}
                onFocusCapture={(e) => e.currentTarget.style.borderColor = focusBorder}
                onBlurCapture={(e) => e.currentTarget.style.borderColor = normalBorder}
              >
                <Link2 size={15} className="text-gray-500 shrink-0" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://linkedin.com/jobs/view/..."
                  className="flex-1 text-sm bg-transparent outline-none text-gray-200 placeholder-gray-600"
                />
              </div>

              {/* Platform pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="text-xs text-gray-600">{t('job.supports')}</span>
                {PLATFORMS.map((p) => (
                  <span
                    key={p}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-placeholder)',
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('job.paste')}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                className="w-full rounded-xl px-3.5 py-3 text-sm resize-none placeholder-gray-600 transition-all duration-200"
                style={{ ...baseInput, minHeight: '200px' }}
                placeholder={t('job.pasteJobPlaceholder')}
                onFocus={(e) => e.target.style.borderColor = focusBorder}
                onBlur={(e) => e.target.style.borderColor = normalBorder}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? 'rgba(59,130,246,0.4)'
                : 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
              boxShadow: loading ? 'none' : '0 2px 14px rgba(59,130,246,0.28)',
            }}
          >
            {loading ? (
              <>
                <div
                  className="animate-spin rounded-full h-4 w-4 border-b-2"
                  style={{ borderColor: 'rgba(255,255,255,0.8)' }}
                />
                {t('job.scraping')}
              </>
            ) : (
              t('job.ingest')
            )}
          </button>
        </form>
      </div>
    </Page>
  )
}
