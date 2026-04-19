import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Zap, Lock } from 'lucide-react'

export default function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // Supabase fires PASSWORD_RECOVERY when the user arrives via the reset link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error(t('auth.passwordMismatch'))
      return
    }
    if (password.length < 8) {
      toast.error(t('auth.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success(t('auth.passwordUpdated'))
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.message || t('auth.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-glow-brand animate-pulse">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('auth.verifyingLink')}</p>
        </div>
      </div>
    )
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('auth.newPasswordHeading')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('auth.newPasswordDesc')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder={t('auth.passwordMinPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">{t('auth.confirmPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 gap-2 mt-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('auth.updating')}</>
                : t('auth.updatePassword')
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
