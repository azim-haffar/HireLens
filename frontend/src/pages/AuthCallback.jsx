import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Zap } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [exchangeDone, setExchangeDone] = useState(false)
  const [exchangeFailed, setExchangeFailed] = useState(false)

  // Step 1: exchange the code once
  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        if (error) {
          console.error('OAuth callback error:', error)
          setExchangeFailed(true)
        } else {
          setExchangeDone(true)
        }
      })
  }, [])

  // Step 2: navigate only after exchange AND AuthContext have both settled
  useEffect(() => {
    if (exchangeFailed) {
      navigate('/login', { replace: true })
      return
    }
    if (exchangeDone && !loading) {
      navigate(user ? '/dashboard' : '/login', { replace: true })
    }
  }, [exchangeDone, exchangeFailed, loading, user, navigate])

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
