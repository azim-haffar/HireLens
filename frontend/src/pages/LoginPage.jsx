import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgb(209,213,219)',
  outline: 'none',
}
const inputFocus = 'rgba(59,130,246,0.5)'
const inputBlur  = 'rgba(255,255,255,0.08)'

export default function LoginPage() {
  const { t } = useTranslation()
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email, password)
    if (err) { setError(err.message); setLoading(false) }
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050810' }}>
      <div className="w-full max-w-sm animate-page">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold gradient-text">HireLens</span>
          <h1 className="text-xl font-semibold text-gray-200 mt-2">{t('auth.signIn')}</h1>
        </div>

        <div className="glass-card p-7">
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

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm placeholder-gray-600"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = inputFocus}
                onBlur={(e) => e.target.style.borderColor = inputBlur}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm placeholder-gray-600"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = inputFocus}
                onBlur={(e) => e.target.style.borderColor = inputBlur}
              />
            </div>
            <Link to="/forgot-password" className="block text-xs text-blue-400 hover:text-blue-300 transition-colors text-right">
              {t('auth.forgotPassword')}
            </Link>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
              {loading ? t('common.loading') : t('auth.signIn')}
            </button>
          </form>

          <div className="my-4 flex items-center gap-2 text-xs text-gray-600">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            {t('auth.orContinueWith')}
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-300 transition-all hover:text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            {t('auth.google')}
          </button>

          <p className="mt-5 text-center text-sm text-gray-500">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              {t('auth.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
