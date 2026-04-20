import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Sync theme from Supabase user_metadata on auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const metaTheme = session?.user?.user_metadata?.theme
      if (metaTheme === 'dark' || metaTheme === 'light') {
        setDark(metaTheme === 'dark')
      }
    })
    // Also check on mount in case user is already signed in
    supabase.auth.getUser().then(({ data: { user } }) => {
      const metaTheme = user?.user_metadata?.theme
      if (metaTheme === 'dark' || metaTheme === 'light') {
        setDark(metaTheme === 'dark')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const toggle = () => {
    setDark(d => {
      const next = !d
      // Persist to Supabase user_metadata (fire and forget)
      supabase.auth.updateUser({ data: { theme: next ? 'dark' : 'light' } }).catch(() => {})
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
