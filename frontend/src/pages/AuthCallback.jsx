import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Zap } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        if (error) {
          console.error('OAuth callback error:', error)
          navigate('/login', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-glow-brand animate-pulse">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Signing you in…</p>
      </div>
    </div>
  )
}
