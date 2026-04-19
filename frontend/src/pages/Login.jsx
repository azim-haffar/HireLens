import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Zap, Mail, Lock, ArrowRight } from 'lucide-react'
import clsx from 'clsx'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
]

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      toast.error(err.message || t('auth.googleFailed'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4
                    bg-gradient-to-br from-brand-50 via-white to-violet-50
                    dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-brand-400 dark:bg-brand-700 blob pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-violet-400 dark:bg-violet-800 blob-2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-300 dark:bg-blue-800 blob pointer-events-none" style={{ animationDelay: '4s' }} />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow-brand mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold"><span className="text-gradient">{t('brand')}</span></h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('tagline')}</p>
        </div>

        <div className="card-glass p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">{t('auth.signInHeading')}</h2>

          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 dark:border-gray-600
                       py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-200
                       bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                       hover:border-gray-300 dark:hover:border-gray-500
                       shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 mb-5"
          >
            <GoogleIcon />
            {t('auth.continueWithGoogle')}
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-3 text-xs text-gray-400 dark:text-gray-500 font-medium">
                {t('auth.orContinueEmail')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input type="email" className="input pl-10" placeholder={t('auth.emailPlaceholder')}
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">{t('auth.password')}</label>
                <Link to="/forgot-password" className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input type="password" className="input pl-10" placeholder={t('auth.passwordPlaceholder')}
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 gap-2 mt-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('auth.signingIn')}</>
              ) : (
                <>{t('auth.signIn')} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              {t('auth.signUp')}
            </Link>
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center justify-center gap-1 mt-6 flex-wrap">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                i18n.language?.startsWith(lang.code)
                  ? 'bg-white/20 dark:bg-white/10 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/10'
              )}
            >
              <span>{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
