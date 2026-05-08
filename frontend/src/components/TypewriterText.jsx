import { useState, useEffect } from 'react'

export default function TypewriterText({ text, speed = 6, className = '' }) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    if (!text) { setDisplayed(''); return }
    setDisplayed('')
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])

  const done = displayed.length >= (text?.length ?? 0)

  return (
    <span className={className}>
      {displayed}
      {!done && (
        <span className="inline-block w-0.5 h-[1em] bg-blue-400 animate-pulse align-middle ml-px" />
      )}
    </span>
  )
}
