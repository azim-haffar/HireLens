import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false) }
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050810' }}>
      <div className="w-full max-w-sm animate-page">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold gradient-text">HireLens</span>
          <h1 className="text-xl font-semibold text-gray-200 mt-2">{t('auth.resetPassword')}</h1>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">New {t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl px-3 py-2.5 text-sm placeholder-gray-600"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  color: 'var(--text-input)',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-input)'}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
              {loading ? t('common.loading') : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
