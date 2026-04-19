import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Zap, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://hire-lens-topaz.vercel.app/reset-password',
      })
      if (error) throw error
      setSent(true)
      toast.success(t('auth.resetEmailSent'))
    } catch (err) {
      toast.error(err.message || t('auth.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4
                    bg-gradient-to-br from-brand-50 via-white to-violet-50
                    dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-brand-400 dark:bg-brand-700 blob pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-violet-400 dark:bg-violet-800 blob-2 pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow-brand mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold"><span className="text-gradient">{t('brand')}</span></h1>
        </div>

        <div className="card-glass p-8 shadow-xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('auth.checkYourEmail')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('auth.resetEmailDesc')}</p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 font-semibold hover:underline mt-2">
                <ArrowLeft className="w-4 h-4" />{t('auth.backToSignIn')}
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('auth.forgotPasswordHeading')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('auth.forgotPasswordDesc')}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      className="input pl-10"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 gap-2 mt-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('auth.sending')}</>
                    : t('auth.sendResetLink')
                  }
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
                <Link to="/login" className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                  <ArrowLeft className="w-3.5 h-3.5" />{t('auth.backToSignIn')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
