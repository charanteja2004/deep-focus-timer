/**
 * ProjectSelector — dropdown shown above the Start button.
 * Lets the user pick which project to tag the current session to.
 */
import React, { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'

export default function ProjectSelector({ projects, activeProjectId, onChange, darkMode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const active = projects.find(p => p.id === activeProjectId) || projects[0]

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        id="project-selector"
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium',
          'border transition-all duration-200',
          open
            ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
            : darkMode
              ? 'border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10'
              : 'border-surface-200 bg-surface-50 text-surface-500 hover:bg-surface-100'
        )}
      >
        <span className="text-sm">{active?.icon || '⚡'}</span>
        <span>{active?.name || 'General'}</span>
        <ChevronDown size={12} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={clsx(
          'absolute bottom-full mb-2 left-0 min-w-[160px] z-50',
          'rounded-2xl border overflow-hidden shadow-2xl',
          darkMode
            ? 'bg-surface-900 border-white/10'
            : 'bg-white border-surface-200 shadow-surface-200/50'
        )}>
          {projects.map(p => (
            <button
              key={p.id}
              id={`project-opt-${p.id}`}
              onClick={() => { onChange(p.id); setOpen(false) }}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all',
                p.id === activeProjectId
                  ? 'bg-brand-500/10 text-brand-300'
                  : darkMode
                    ? 'text-white/60 hover:bg-white/5 hover:text-white'
                    : 'text-surface-600 hover:bg-surface-50'
              )}
            >
              <span style={{ color: p.color }} className="text-base">{p.icon}</span>
              <span className="flex-1 text-left">{p.name}</span>
              {p.id === activeProjectId && (
                <span className="text-brand-400 text-xs">●</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
