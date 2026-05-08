export function getTheme() {
  return localStorage.getItem('theme') || 'dark'
}

export function setTheme(theme) {
  localStorage.setItem('theme', theme)
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function initTheme() {
  setTheme(getTheme())
}
