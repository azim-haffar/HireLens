import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, GripVertical, Inbox } from 'lucide-react'

/* ── Column config ──────────────────────────────────────────────── */
const COLUMNS = ['saved', 'applied', 'interview', 'offer', 'rejected', 'ghosted']

const COL_META = {
  saved:     { hex: '#3B82F6', rgb: '59,130,246',   label: 'Saved' },
  applied:   { hex: '#8B5CF6', rgb: '139,92,246',   label: 'Applied' },
  interview: { hex: '#F59E0B', rgb: '245,158,11',   label: 'Interview' },
  offer:     { hex: '#10B981', rgb: '16,185,129',   label: 'Offer' },
  rejected:  { hex: '#EF4444', rgb: '239,68,68',    label: 'Rejected' },
  ghosted:   { hex: '#6B7280', rgb: '107,114,128',  label: 'Ghosted' },
}

/* ── Application card ───────────────────────────────────────────── */
function ApplicationCard({ app, onDelete, onMove, accentRgb, accentHex }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: app.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? 'scale(1.02)' : CSS.Transform.toString(transform),
        transition: [transition, 'background 0.2s, border-color 0.2s, box-shadow 0.2s'].filter(Boolean).join(', '),
        opacity: isDragging ? 0 : 1,
        background: hovered ? `rgba(${accentRgb},0.07)` : 'var(--bg-card)',
        border: `1px solid ${hovered ? `rgba(${accentRgb},0.35)` : 'var(--border-subtle)'}`,
        boxShadow: hovered ? `0 4px 18px rgba(${accentRgb},0.18)` : 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      className="rounded-xl p-3 cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: grip + title + delete */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab transition-colors shrink-0"
          style={{ color: hovered ? accentHex : 'rgba(107,114,128,0.5)' }}
        >
          <GripVertical size={13} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-100 truncate leading-snug">{app.company || '—'}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{app.job_title}</p>
        </div>
        <button
          onClick={() => onDelete(app.id)}
          className="text-gray-700 hover:text-red-400 transition-colors shrink-0"
        >
          <X size={12} />
        </button>
      </div>

      {/* Move shortcuts */}
      <div className="mt-2.5 flex gap-1 flex-wrap">
        {COLUMNS.filter((c) => c !== app.status).slice(0, 3).map((s) => {
          const m = COL_META[s]
          return (
            <button
              key={s}
              onClick={() => onMove(app.id, s)}
              className="text-xs px-1.5 py-0.5 rounded-md font-medium transition-all duration-150"
              style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-placeholder)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `rgba(${m.rgb},0.15)`
                e.currentTarget.style.color = m.hex
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-card-subtle)'
                e.currentTarget.style.color = 'var(--text-placeholder)'
              }}
            >
              → {t(`tracker.${s}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Input style ────────────────────────────────────────────────── */
const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-input)',
  color: 'var(--text-input)',
  outline: 'none',
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function TrackerPage() {
  const { t } = useTranslation()
  const [apps, setApps]         = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ job_title: '', company: '', job_url: '' })
  const [draggingOver, setDraggingOver] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { api.get('/tracker/applications').then(setApps).catch(() => {}) }, [])

  const createApp = async () => {
    const data = await api.post('/tracker/applications', form)
    setApps((prev) => [data, ...prev])
    setForm({ job_title: '', company: '', job_url: '' })
    setShowForm(false)
  }

  const deleteApp = async (id) => {
    await api.delete(`/tracker/applications/${id}`)
    setApps((prev) => prev.filter((a) => a.id !== id))
  }

  const moveApp = async (id, status) => {
    await api.patch(`/tracker/applications/${id}`, { status })
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
  }

  const handleDragEnd = ({ active, over }) => {
    setDraggingOver(null)
    if (!over || active.id === over.id) return
    const target = apps.find((a) => a.id === over.id)
    if (target) moveApp(active.id, target.status)
  }

  const handleDragOver = ({ over }) => {
    if (!over) { setDraggingOver(null); return }
    const target = apps.find((a) => a.id === over.id)
    setDraggingOver(target?.status ?? null)
  }

  const colApps = (col) => apps.filter((a) => a.status === col)

  return (
    <div
      className="p-6 animate-page min-h-screen"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1
            className="text-2xl font-black"
            style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('tracker.pageTitle')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>Track every application from saved to offer. Drag cards between columns as your status changes.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all duration-200 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
            boxShadow: '0 2px 14px rgba(59,130,246,0.28)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 22px rgba(59,130,246,0.45)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 14px rgba(59,130,246,0.28)'
          }}
        >
          <Plus size={15} />
          {t('tracker.addApplication')}
        </button>
      </div>

      {/* ── Add form ── */}
      {showForm && (
        <div
          className="rounded-2xl p-5 mb-6 mt-4"
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-sm font-semibold text-gray-300 mb-3">{t('tracker.newApplication')}</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { key: 'job_title', placeholder: t('tracker.jobTitlePlaceholder') },
              { key: 'company',   placeholder: t('tracker.companyPlaceholder') },
              { key: 'job_url',   placeholder: t('tracker.jobUrlPlaceholder') },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="rounded-xl px-3 py-2.5 text-sm placeholder-gray-600 transition-all duration-200"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-input)'}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={createApp} className="btn-primary px-4 py-2 text-sm">
              {t('common.save')}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-sm">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ── Kanban board ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid grid-cols-6 gap-3 overflow-x-auto pb-4 mt-5">
          {COLUMNS.map((col) => {
            const meta   = COL_META[col]
            const cards  = colApps(col)
            const isOver = draggingOver === col

            return (
              <div
                key={col}
                className="rounded-2xl flex flex-col transition-all duration-200"
                style={{
                  minWidth: '160px',
                  minHeight: '500px',
                  background: isOver
                    ? `rgba(${meta.rgb},0.07)`
                    : 'var(--bg-card)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderTop: `3px solid ${meta.hex}`,
                  border: `1px solid rgba(${meta.rgb},0.18)`,
                  borderTopWidth: '3px',
                  borderTopColor: meta.hex,
                  boxShadow: isOver
                    ? `inset 0 0 32px rgba(${meta.rgb},0.08), 0 0 0 1px rgba(${meta.rgb},0.3)`
                    : 'none',
                }}
              >
                {/* Column header */}
                <div
                  className="flex items-center justify-between px-3 pt-3 pb-2"
                  style={{ borderBottom: `1px solid rgba(${meta.rgb},0.12)` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: meta.hex, boxShadow: `0 0 6px ${meta.hex}` }}
                    />
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: meta.hex }}
                    >
                      {t(`tracker.${col}`)}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `rgba(${meta.rgb},0.2)`,
                      color: meta.hex,
                      border: `1px solid rgba(${meta.rgb},0.3)`,
                    }}
                  >
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2">
                  <SortableContext items={cards.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                    {cards.length > 0 ? (
                      <div className="space-y-2">
                        {cards.map((app) => (
                          <ApplicationCard
                            key={app.id}
                            app={app}
                            onDelete={deleteApp}
                            onMove={moveApp}
                            accentRgb={meta.rgb}
                            accentHex={meta.hex}
                          />
                        ))}
                      </div>
                    ) : (
                      /* Empty state */
                      <div
                        className="h-full flex flex-col items-center justify-center gap-2 rounded-xl p-4 mt-1"
                        style={{
                          minHeight: '120px',
                          border: `1.5px dashed rgba(${meta.rgb},0.2)`,
                          color: `rgba(${meta.rgb},0.35)`,
                        }}
                      >
                        <Inbox size={18} style={{ color: `rgba(${meta.rgb},0.4)` }} />
                        <span className="text-xs text-center" style={{ color: `rgba(${meta.rgb},0.4)` }}>
                          {t('tracker.dropHere')}
                        </span>
                      </div>
                    )}
                  </SortableContext>
                </div>
              </div>
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}
