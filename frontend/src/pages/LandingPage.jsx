import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { Zap, Target, FileText, MessageSquare, BarChart2, Kanban, Sun, Moon } from 'lucide-react'

const FEATURES = [
  { icon: Target,       title: 'Match Scoring',  desc: 'Weighted AI score across skills, experience, education and keywords.' },
  { icon: Zap,          title: 'ATS Checker',    desc: '10-rule automated check with severity ratings and fix suggestions.' },
  { icon: FileText,     title: 'Cover Letter',   desc: 'One-click tailored cover letter generated from your CV + job.' },
  { icon: MessageSquare,title: 'Interview Prep', desc: '10 role-specific questions with STAR answer frameworks.' },
  { icon: BarChart2,    title: 'Score Trends',   desc: 'Track your match scores over time with visual charts.' },
  { icon: Kanban,       title: 'Job Tracker',    desc: 'Drag-and-drop Kanban board for your entire job search.' },
]

export default function LandingPage() {
  const { t } = useTranslation()
  const { user, signIn, signUp, signInWithGoogle } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fn = authMode === 'signin' ? signIn : signUp
    const { error: err } = await fn(email, password)
    if (err) { setError(err.message); setLoading(false) }
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen" style={{ background: '#050810' }}>
      {/* Nav */}
      <nav
        className="px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: 'rgba(5,8,16,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span className="text-xl font-bold gradient-text">HireLens</span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user ? (
            <Link to="/dashboard" className="btn-primary px-4 py-2 text-sm">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
              >
                {t('auth.signIn')}
              </Link>
              <Link to="/register" className="btn-primary px-4 py-2 text-sm">
                {t('auth.signUp')}
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-2 gap-16 items-center">
        <div className="animate-page">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)',
              color: 'rgb(147,197,253)',
            }}
          >
            AI-Powered CV Analysis
          </div>
          <h1 className="text-5xl font-black leading-tight mb-4 text-white">
            Land the job.<br />
            <span className="gradient-text">Not just an interview.</span>
          </h1>
          <p className="text-lg text-gray-400 mb-8 leading-relaxed">
            Upload your CV, paste a job posting, and get an instant AI analysis — ATS score,
            match breakdown, interview questions and a tailored cover letter.
          </p>
          <Link
            to="/roast"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: 'rgb(251,146,60)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(253,186,116)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(251,146,60)'}
          >
            Try "Roast My CV" for free — no login needed →
          </Link>
        </div>

        {/* Auth card */}
        <div
          className="glass-card p-7 animate-page"
          style={{ '--delay': '0.1s', animationDelay: '0.1s' }}
        >
          <div className="flex gap-2 mb-5">
            {['signin', 'signup'].map((m) => (
              <button
                key={m}
                onClick={() => setAuthMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  authMode === m
                    ? 'btn-primary'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {m === 'signin' ? t('auth.signIn') : t('auth.signUp')}
              </button>
            ))}
          </div>

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

          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('auth.email')}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-100 outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('auth.password')}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-100 outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
              {loading ? t('common.loading') : authMode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
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
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            {t('auth.google')}
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-2 text-white">
          Everything you need to get hired
        </h2>
        <p className="text-center text-gray-500 mb-12">Powered by Groq's blazing-fast AI inference</p>
        <div className="grid grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="glass-card card-3d p-6 stagger-item"
              style={{ '--delay': `${i * 0.06}s` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: 'rgba(59,130,246,0.12)',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}
              >
                <Icon size={19} className="text-blue-400" />
              </div>
              <h3 className="font-semibold mb-1.5 text-gray-100">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer
        className="py-8 text-center text-sm text-gray-600"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        HireLens · Built with Groq AI · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
