import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'

export default function DeletableSelect({ value, onChange, onDelete, options, placeholder, disabled }) {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const remove = async () => {
    if (!value || deleting) return
    setDeleting(true); setError('')
    try { await onDelete(value) } catch (e) { setError(e.message) }
    finally { setDeleting(false) }
  }
  return (
    <div>
      <div className="flex gap-2 min-w-0">
        <select aria-label={placeholder} value={value} disabled={disabled || deleting}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 rounded-xl px-3 py-2 text-sm"
          style={{ background: 'var(--bg-input)', color: 'var(--text-input)', border: '1px solid var(--border-input)' }}>
          <option value="">{placeholder}</option>
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {value && <button type="button" aria-label={`${t('common.delete')} ${options.find((o) => o.value === value)?.label || ''}`}
          onClick={remove} disabled={disabled || deleting} className="p-2 text-red-400">
          <Trash2 size={16} />
        </button>}
      </div>
      {error && <p role="alert" className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}
