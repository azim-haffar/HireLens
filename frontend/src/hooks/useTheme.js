import { useState, useEffect } from 'react'
import { getTheme, setTheme } from '../lib/theme'

export function useTheme() {
  const [theme, setThemeState] = useState(getTheme)

  useEffect(() => {
    setTheme(theme)
  }, [theme])

  const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle }
}
