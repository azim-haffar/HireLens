import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'

/*
 * A <select>-like dropdown where every option row has a trash icon.
 *
 * Props:
 *   value        — currently selected option value (string)
 *   onChange     — (value: string) => void
 *   onDelete     — async (value: string) => void
 *   options      — [{ value: string, label: string }]
 *   placeholder  — string shown when nothing is selected
 *   disabled     — boolean
 */
export default function DeletableSelect({ value, onChange, onDelete, options, placeholder, disabled }) {
  const [open, setOpen]         = useState(false)
  const [deleting, setDeleting] = useState(null) // id being deleted
  const containerRef            = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find((o) => o.value === value)

  const handleDelete = async (e, optValue) => {
    e.stopPropagation()
    setDeleting(optValue)
    try {
      await onDelete(optValue)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'var(--bg-input)',
          border: `1px solid ${open ? 'rgba(59,130,246,0.5)' : 'var(--border-input)'}`,
          color: selected ? 'var(--text-input)' : 'var(--text-placeholder)',
          boxShadow: open ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
          outline: 'none',
        }}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          size={14}
          className="shrink-0 ml-2 text-gray-500 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-dropdown)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-600 text-center">No items</div>
          ) : (
            <div
              className="max-h-52 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
              {options.map((opt) => {
                const isSelected  = opt.value === value
                const isDeleting  = deleting === opt.value

                return (
                  <div
                    key={opt.value}
                    className="group flex items-center gap-2 px-3 py-2.5 transition-colors duration-100 cursor-pointer"
                    style={{
                      background: isSelected ? 'rgba(59,130,246,0.14)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-subtle)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                    onClick={() => { onChange(opt.value); setOpen(false) }}
                  >
                    {/* Label */}
                    <span
                      className="flex-1 text-sm truncate"
                      style={{ color: isSelected ? 'rgb(147,197,253)' : 'var(--text-input)' }}
                    >
                      {opt.label}
                    </span>

                    {/* Delete button — visible on hover or while deleting */}
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={(e) => handleDelete(e, opt.value)}
                      className="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 disabled:opacity-40"
                      style={{ color: 'rgb(248,113,113)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      title="Delete"
                    >
                      {isDeleting
                        ? <div className="w-3 h-3 rounded-full border border-red-400 border-t-transparent animate-spin" />
                        : <Trash2 size={13} />
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
