import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react'
import { chatApi } from '../lib/api'
import clsx from 'clsx'

export default function ChatPanel({ analysisId }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = analysisId ? t('chat.greetingContext') : t('chat.greeting')
      setMessages([{ role: 'assistant', content: greeting }])
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setStreaming(true)

    // Add empty assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      await chatApi.stream(
        analysisId,
        history.filter(m => m.role !== 'system'),
        (chunk) => {
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              role: 'assistant',
              content: updated[updated.length - 1].content + chunk,
            }
            return updated
          })
        }
      )
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: t('chat.error') }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const SUGGESTIONS = [
    t('chat.suggest1'),
    t('chat.suggest2'),
    t('chat.suggest3'),
  ]

  return (
    <div className="no-print">
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Tooltip label */}
        <div className={clsx(
          'flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg transition-all duration-300',
          !open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}>
          <Sparkles className="w-3 h-3" />
          Ask AI
        </div>

        <div className="relative">
          {/* Pulse rings — only when closed */}
          {!open && (
            <>
              <span className="absolute inset-0 rounded-full bg-brand-500 opacity-30 animate-ping" />
              <span className="absolute inset-[-4px] rounded-full border border-brand-400/40 animate-pulse" />
            </>
          )}

          <button
            onClick={() => setOpen(o => !o)}
            className={clsx(
              'relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300',
              'bg-gradient-to-br from-brand-500 via-violet-500 to-violet-600',
              'hover:scale-110 hover:shadow-glow-brand active:scale-95',
              open ? 'rotate-0' : 'rotate-0'
            )}
            aria-label="Open AI chat"
          >
            <div className={clsx('absolute transition-all duration-300', open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75')}>
              <X className="w-5 h-5 text-white" />
            </div>
            <div className={clsx('absolute transition-all duration-300', !open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75')}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      </div>

      {/* Chat panel */}
      <div className={clsx(
        'fixed bottom-24 right-6 z-50 w-[360px] max-h-[540px] flex flex-col rounded-2xl shadow-2xl border',
        'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
        'transition-all duration-300 origin-bottom-right',
        open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('chat.title')}</p>
            <p className="text-xs text-gray-400">{t('chat.subtitle')}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={clsx('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={clsx(
                'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
              )}>
                {msg.content}
                {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                  <span className="inline-block w-1.5 h-4 bg-brand-500 ml-0.5 animate-pulse rounded-sm align-middle" />
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
              )}
            </div>
          ))}

          {/* Suggestions shown only before first user message */}
          {messages.length === 1 && (
            <div className="space-y-1.5 pt-1">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t('chat.placeholder')}
              rows={1}
              className="flex-1 resize-none rounded-xl px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all max-h-24"
              style={{ scrollbarWidth: 'thin' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || streaming}
              className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                input.trim() && !streaming
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              {streaming
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
