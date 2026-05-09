import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import {
  Sun, Moon, LogOut,
  LayoutDashboard, Upload, Briefcase, KanbanSquare, History, Flame, Shield,
} from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
  { code: 'da', label: 'DA' },
  { code: 'tr', label: 'TR' },
]

/* ── Logomark ─────────────────────────────────────────────────────── */
function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lmGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="7" fill="url(#lmGrad)" />
      {/* H letterform */}
      <path
        d="M8 8v12M8 14h12M20 8v12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ── Section label ────────────────────────────────────────────────── */
function SectionLabel({ children, first }) {
  return (
    <p
      className="px-3 pb-1.5 text-[10px] font-semibold uppercase"
      style={{
        color: '#475569',
        letterSpacing: '0.1em',
        paddingTop: first ? '8px' : '20px',
      }}
    >
      {children}
    </p>
  )
}

/* ── Layout ───────────────────────────────────────────────────────── */
export default function Layout() {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const email      = user?.email ?? ''
  const initials   = email.slice(0, 2).toUpperCase()
  const activeLang = i18n.language?.split('-')[0] ?? 'en'

  const NAV_GROUPS = [
    {
      label: 'MAIN',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
        { to: '/upload',    icon: Upload,          label: t('nav.upload') },
        { to: '/jobs',      icon: Briefcase,       label: t('nav.jobs') },
      ],
    },
    {
      label: 'TOOLS',
      items: [
        { to: '/tracker',     icon: KanbanSquare, label: t('nav.tracker') },
        { to: '/history',     icon: History,      label: t('nav.history') },
        { to: '/ats-checker', icon: Shield,       label: t('nav.atsChecker', 'ATS Checker') },
      ],
    },
    {
      label: 'FUN',
      items: [
        { to: '/roast', icon: Flame, label: t('nav.roast') },
      ],
    },
  ]

  return (
    <div className="min-h-screen flex">

      {/* ════════════════════ Sidebar ════════════════════ */}
      <aside
        className="shrink-0 flex flex-col"
        style={{
          width: '220px',
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >

        {/* ── Brand ── */}
        <div
          className="flex items-center gap-3 px-4 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <LogoMark />
          <span
            className="text-xl font-black tracking-tight select-none"
            style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            HireLens
          </span>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 relative min-h-0">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label}>
              <SectionLabel first={gi === 0}>{group.label}</SectionLabel>

              <div className="flex flex-col" style={{ gap: '2px' }}>
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={label}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive ? '' : 'hover:text-white hover:bg-blue-500/[.08]'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(124,58,237,0.18) 100%)',
                            boxShadow: 'inset 3px 0 0 #3b82f6',
                            color: 'white',
                          }
                        : { color: '#94a3b8' }
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={18}
                          style={{
                            color: isActive ? '#60a5fa' : '#94a3b8',
                            transition: 'color 0.2s',
                            flexShrink: 0,
                          }}
                        />
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Bottom fade overlay */}
          <div
            className="sticky bottom-0 h-8 pointer-events-none"
            style={{
              background: 'var(--nav-fade)',
              marginLeft: '-8px',
              marginRight: '-8px',
            }}
          />
        </nav>

        {/* ── Bottom section ── */}
        <div
          className="px-3 py-3 space-y-3 shrink-0"
          style={{ borderTop: '1px solid var(--sidebar-border)' }}
        >
          {/* Language pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => i18n.changeLanguage(code)}
                className="text-xs px-2 py-0.5 rounded-full font-medium transition-all duration-200"
                style={
                  activeLang === code
                    ? {
                        background: 'rgba(59,130,246,0.2)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59,130,246,0.35)',
                      }
                    : {
                        color: '#475569',
                        border: '1px solid transparent',
                      }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Theme toggle + Logout */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggle}
              className="p-1.5 rounded-lg transition-all duration-200"
              style={{ color: '#94a3b8' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-card-subtle)'
                e.currentTarget.style.color = 'inherit'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#94a3b8'
              }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200"
              style={{ color: '#94a3b8' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(248,113,113,0.08)'
                e.currentTarget.style.color = '#f87171'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#94a3b8'
              }}
            >
              <LogOut size={14} />
              {t('nav.logout')}
            </button>
          </div>

          {/* User avatar + email */}
          {email && (
            <div
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
                  color: 'white',
                }}
              >
                {initials}
              </div>
              <span className="text-xs truncate min-w-0" style={{ color: '#64748b' }}>
                {email}
              </span>
            </div>
          )}
        </div>

      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

    </div>
  )
}
