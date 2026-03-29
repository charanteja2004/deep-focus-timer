/**
 * FloatingTimer — Persistent mini timer overlay (Picture-in-Picture style)
 * Draggable, shows countdown + phase, stays on top of other content.
 */
import React, { useState, useRef, useCallback } from 'react'
import { formatTime, PHASE_LABELS, PHASES } from '../hooks/useTimer'
import { Play, Pause, X, Maximize2 } from 'lucide-react'
import clsx from 'clsx'

const PHASE_DOT = {
  [PHASES.FOCUS]:       'bg-brand-400',
  [PHASES.SHORT_BREAK]: 'bg-emerald-400',
  [PHASES.LONG_BREAK]:  'bg-violet-400',
}

export default function FloatingTimer({
  timeLeft, phase, running,
  onStart, onPause, onResume,
  onClose, onExpand, elapsed,
}) {
  const [pos, setPos] = useState({ x: 20, y: 20 })
  const dragging = useRef(false)
  const offset   = useRef({ x: 0, y: 0 })
  const elRef    = useRef(null)

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragging.current = true
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [pos])

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 200, e.clientX - offset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - offset.current.y)),
    })
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove])

  const togglePlay = (e) => {
    e.stopPropagation()
    if (running) onPause()
    else if (elapsed > 0) onResume()
    else onStart()
  }

  return (
    <div
      ref={elRef}
      className={clsx(
        'fixed z-40 select-none',
        'bg-surface-900/95 border border-white/10 rounded-2xl shadow-2xl',
        'backdrop-filter backdrop-blur-xl',
        'flex items-center gap-3 px-4 py-3',
        'cursor-grab active:cursor-grabbing',
        'transition-shadow hover:shadow-brand-500/10',
        'min-w-[180px]'
      )}
      style={{ left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }}
      onMouseDown={onMouseDown}
    >
      {/* Phase dot */}
      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', PHASE_DOT[phase], running && 'animate-pulse')} />

      {/* Time */}
      <div className="flex flex-col flex-1">
        <span className="font-mono text-lg font-medium text-white leading-none">
          {formatTime(timeLeft)}
        </span>
        <span className="text-[10px] text-white/30 mt-0.5">
          {PHASE_LABELS[phase]}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 ml-1">
        <button
          id="float-play-pause"
          onClick={togglePlay}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
          aria-label={running ? 'Pause' : 'Resume'}
        >
          {running ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          id="float-expand"
          onClick={(e) => { e.stopPropagation(); onExpand() }}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          aria-label="Expand"
        >
          <Maximize2 size={12} />
        </button>
        <button
          id="float-close"
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          aria-label="Close floating timer"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
