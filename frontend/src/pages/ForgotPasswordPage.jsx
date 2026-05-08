import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await resetPassword(email)
    setSent(true)
    setLoading(false)
  }

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050810' }}>
      <div className="glass-card p-10 max-w-sm w-full text-center animate-page">
        <Mail size={40} className="text-blue-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-100 mb-2">Email sent</h2>
        <p className="text-gray-500 text-sm mb-6">
          Check <strong className="text-gray-300">{email}</strong> for a reset link.
        </p>
        <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
          Back to login
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050810' }}>
      <div className="w-full max-w-sm animate-page">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold gradient-text">HireLens</span>
          <h1 className="text-xl font-semibold text-gray-200 mt-2">{t('auth.forgotPassword')}</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email to receive a reset link.</p>
        </div>

        <div className="glass-card p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('auth.email')}
              className="w-full rounded-xl px-3 py-2.5 text-sm placeholder-gray-600"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgb(209,213,219)',
                outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
              {loading ? t('common.loading') : 'Send Reset Link'}
            </button>
          </form>

          <Link to="/login" className="mt-5 block text-center text-sm text-blue-400 hover:text-blue-300 transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
