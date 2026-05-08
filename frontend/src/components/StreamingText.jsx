import { useState } from 'react'
import { streamSSE } from '../lib/api'

/* Split text into ≤2-sentence chunks for readable paragraph sizing */
function chunked(text) {
  const sentences = text.match(/[^.!?]*(?:[.!?]+(?:\s+|$)|$)/g)?.filter((s) => s.trim()) || [text]
  const out = []
  for (let i = 0; i < sentences.length; i += 2) {
    const chunk = sentences.slice(i, i + 2).join('').trim()
    if (chunk) out.push(chunk)
  }
  return out.length ? out : [text]
}

/*
 * Parse the streamed text into an array of { type: 'header' | 'para', text }
 * objects so we can render them with proper styles.
 *
 * Header detection: a block that starts with ≤5 words followed by a colon,
 * e.g. "Area 1:", "Overall:", "Key Strengths:".
 */
function parseBlocks(text) {
  const rawBlocks = text.split(/\n{2,}/).filter((b) => b.trim())
  const blocks = []

  for (const block of rawBlocks) {
    const trimmed = block.trim()
    const m = trimmed.match(/^([A-Za-z][A-Za-z0-9 ]{0,35}:)\s*([\s\S]*)$/)
    const wordCount = m ? m[1].replace(':', '').trim().split(/\s+/).length : 0
    const isHeader = m && wordCount <= 5

    if (isHeader) {
      blocks.push({ type: 'header', text: m[1] })
      const body = m[2].trim()
      if (body) {
        for (const chunk of chunked(body)) {
          blocks.push({ type: 'para', text: chunk })
        }
      }
    } else {
      for (const chunk of chunked(trimmed)) {
        blocks.push({ type: 'para', text: chunk })
      }
    }
  }

  return blocks
}

export default function StreamingText({ path, body, triggerLabel, className = '' }) {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)

  const start = async () => {
    setLoading(true)
    setStarted(true)
    setText('')
    try {
      await streamSSE(
        path,
        body,
        (chunk) => setText((prev) => prev + chunk),
        () => setLoading(false),
      )
    } catch {
      setLoading(false)
    }
  }

  const blocks      = parseBlocks(text)
  const lastParaIdx = blocks.reduce((acc, b, i) => (b.type === 'para' ? i : acc), -1)

  return (
    <div className={className}>
      {!started && (
        <button
          onClick={start}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {triggerLabel}
        </button>
      )}

      {started && (
        <>
          {/* Scoped styles for cursor animation + custom scrollbar */}
          <style>{`
            @keyframes cursorBlink {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0; }
            }
            .explain-scroll::-webkit-scrollbar          { width: 4px; }
            .explain-scroll::-webkit-scrollbar-track    { background: transparent; }
            .explain-scroll::-webkit-scrollbar-thumb    { background: rgba(255,255,255,0.12); border-radius: 2px; }
            .explain-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
          `}</style>

          <div
            className="explain-scroll max-h-[400px] overflow-y-auto pr-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' }}
          >
            {/* Empty-state cursor while the first tokens arrive */}
            {loading && blocks.length === 0 && (
              <p className="text-sm text-gray-300 leading-relaxed mb-3">
                <span
                  className="inline-block w-px rounded-full bg-blue-400 align-middle"
                  style={{ height: '1.1em', animation: 'cursorBlink 0.9s ease-in-out infinite' }}
                />
              </p>
            )}

            {blocks.map((block, i) => {
              if (block.type === 'header') {
                return (
                  <p
                    key={i}
                    className="font-bold text-gray-100 text-sm mb-2"
                    style={{ marginTop: i === 0 ? 0 : '1.25rem' }}
                  >
                    {block.text}
                  </p>
                )
              }

              /* paragraph */
              return (
                <p key={i} className="text-sm text-gray-300 leading-relaxed mb-3">
                  {block.text}
                  {/* Typing cursor inline at end of last paragraph while streaming */}
                  {loading && i === lastParaIdx && (
                    <span
                      className="inline-block w-px rounded-full bg-blue-400 ml-0.5 align-middle"
                      style={{ height: '1.1em', animation: 'cursorBlink 0.9s ease-in-out infinite' }}
                    />
                  )}
                </p>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
