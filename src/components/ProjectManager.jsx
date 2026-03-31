/**
 * ProjectManager — create, edit, delete focus projects.
 * Lives inside the Settings tab.
 */
import React, { useState } from 'react'
import clsx from 'clsx'
import { Plus, Trash2, Check } from 'lucide-react'

const PRESET_COLORS = [
  '#4d6ef5','#10b981','#8b5cf6','#f97316',
  '#ec4899','#06b6d4','#84cc16','#f59e0b',
]
const PRESET_ICONS = ['⚡','📚','💻','🏋️','🎨','💼','🎵','🌱','🎯','🧘','✍️','🔬']

export default function ProjectManager({ projects, onChange }) {
  const [adding, setAdding]   = useState(false)
  const [editId, setEditId]   = useState(null)
  const [form,   setForm]     = useState({ name: '', color: '#4d6ef5', icon: '⚡' })

  function openAdd() {
    setForm({ name: '', color: '#4d6ef5', icon: '⚡' })
    setAdding(true)
    setEditId(null)
  }

  function openEdit(p) {
    setForm({ name: p.name, color: p.color, icon: p.icon })
    setEditId(p.id)
    setAdding(false)
  }

  function save() {
    if (!form.name.trim()) return
    if (adding) {
      const id = `proj_${Date.now()}`
      onChange([...projects, { id, ...form, name: form.name.trim() }])
    } else {
      onChange(projects.map(p => p.id === editId ? { ...p, ...form, name: form.name.trim() } : p))
    }
    setAdding(false)
    setEditId(null)
  }

  function remove(id) {
    if (confirm('Delete this project? Existing sessions will be tagged as General.')) {
      onChange(projects.filter(p => p.id !== id && p.id !== 'general').concat(
        projects.filter(p => p.id === 'general')
      ).sort((a,b) => a.id === 'general' ? -1 : 1))
    }
  }

  const showForm = adding || editId !== null

  return (
    <div className="flex flex-col gap-3">
      {/* Project list */}
      {projects.map(p => (
        <div
          key={p.id}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
            editId === p.id
              ? 'border-brand-500/40 bg-brand-500/10'
              : 'border-white/8 bg-white/4 hover:bg-white/8'
          )}
        >
          <span className="text-lg w-7 text-center">{p.icon}</span>
          <span className="flex-1 text-sm text-white/70">{p.name}</span>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <button
            onClick={() => openEdit(p)}
            className="text-white/25 hover:text-white/70 text-xs px-2 transition-colors"
          >Edit</button>
          {p.id !== 'general' && (
            <button
              onClick={() => remove(p.id)}
              className="text-red-400/40 hover:text-red-400 transition-colors"
            ><Trash2 size={13} /></button>
          )}
        </div>
      ))}

      {/* Inline form */}
      {showForm && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl border border-brand-500/20 bg-brand-500/5">
          {/* Name input */}
          <input
            type="text"
            placeholder="Project name…"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && save()}
            className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50"
            autoFocus
          />

          {/* Icon picker */}
          <div>
            <p className="text-xs text-white/30 mb-2">Icon</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  className={clsx(
                    'w-9 h-9 rounded-xl text-lg transition-all',
                    form.icon === ic
                      ? 'bg-brand-500/30 border border-brand-500/50 scale-110'
                      : 'bg-white/5 hover:bg-white/15'
                  )}
                >{ic}</button>
              ))}
            </div>
          </div>

          {/* Colour picker */}
          <div>
            <p className="text-xs text-white/30 mb-2">Colour</p>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={clsx(
                    'w-7 h-7 rounded-full transition-all',
                    form.color === c && 'ring-2 ring-white/60 ring-offset-1 ring-offset-surface-900 scale-110'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-500 transition-all"
            ><Check size={14} /> {adding ? 'Create' : 'Save'}</button>
            <button
              onClick={() => { setAdding(false); setEditId(null) }}
              className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
            >Cancel</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          id="add-project-btn"
          onClick={openAdd}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/15 text-white/35 hover:border-brand-500/40 hover:text-brand-300 transition-all text-sm"
        >
          <Plus size={14} /> Add project
        </button>
      )}
    </div>
  )
}
