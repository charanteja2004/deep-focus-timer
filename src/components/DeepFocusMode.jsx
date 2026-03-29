/**
 * DeepFocusMode — Fullscreen distraction-free mode
 * Uses browser Fullscreen API.
 * ESC key or button to exit.
 */
import React, { useEffect } from 'react'
import CircularTimer from './CircularTimer'
import { PHASES, PHASE_LABELS } from '../hooks/useTimer'
import { Play, Pause, SkipForward, Minimize2 } from 'lucide-react'
import clsx from 'clsx'

export default function DeepFocusMode({
  timeLeft, progress, phase, running,
  onStart, onPause, onResume, onSkip,
  onDistraction, distractions,
  activeTask, onExit,
  elapsedSeconds,
}) {
  const isFocus = phase === PHASES.FOCUS

  // Phase accent colors
  const accentColor = {
    [PHASES.FOCUS]:       '#4d6ef5',
    [PHASES.SHORT_BREAK]: '#10b981',
    [PHASES.LONG_BREAK]:  '#8b5cf6',
  }[phase]

  const handlePrimary = () => {
    if (running) onPause()
    else if (elapsedSeconds > 0) onResume()
    else onStart()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#080c14' }}
    >
      {/* Subtle radial glow behind timer — NOT transparent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 600px 400px at 50% 50%, ${accentColor}14 0%, transparent 70%)`,
        }}
      />

      {/* ── Top bar ────────────────────────── */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-8 py-6">
        {/* Left: App name */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
          </div>
          <span className="text-xs font-semibold text-white/30 tracking-wider">DEEPFOCUS</span>
        </div>

        {/* Right: Exit */}
        <button
          id="deep-focus-exit"
          onClick={onExit}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all text-xs"
          aria-label="Exit deep focus"
        >
          <Minimize2 size={14} />
          Exit
          <span className="kbd ml-1">ESC</span>
        </button>
      </div>

      {/* ── Phase label ─────────────────────── */}
      <div className="flex flex-col items-center gap-2 mb-10 relative z-10">
        <span
          className="text-xs font-semibold uppercase tracking-[0.3em]"
          style={{ color: accentColor + 'aa' }}
        >
          {PHASE_LABELS[phase]}
        </span>
        {activeTask && (
          <span className="text-sm text-white/40 max-w-sm truncate px-4 text-center">
            {activeTask.text}
          </span>
        )}
      </div>

      {/* ── Timer ───────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-10">
        <CircularTimer
          timeLeft={timeLeft}
          progress={progress}
          phase={phase}
          running={running}
        />

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Skip */}
          <button
            id="deep-focus-skip"
            onClick={onSkip}
            className="p-3 rounded-2xl text-white/25 hover:text-white/60 hover:bg-white/5 transition-all"
            aria-label="Skip phase"
          >
            <SkipForward size={17} />
          </button>

          {/* Primary button */}
          <button
            id="deep-focus-primary"
            onClick={handlePrimary}
            className="flex items-center gap-2.5 px-10 py-4 rounded-2xl font-medium text-sm text-white transition-all duration-200 active:scale-95 btn-ripple"
            style={{ background: accentColor, boxShadow: `0 8px 32px ${accentColor}40` }}
            aria-label={running ? 'Pause timer' : 'Start timer'}
          >
            {running
              ? <><Pause size={18} strokeWidth={2.5} /> Pause</>
              : <><Play  size={18} strokeWidth={2.5} /> {elapsedSeconds > 0 ? 'Resume' : 'Start'}</>
            }
          </button>

          {/* Placeholder for symmetry */}
          <div className="w-11 h-11" />
        </div>

        {/* Distraction tracker */}
        {isFocus && (
          <button
            id="deep-focus-distraction"
            onClick={onDistraction}
            className={clsx(
              'flex items-center gap-2 text-sm transition-all duration-200 px-5 py-2.5 rounded-xl border',
              distractions.length > 0
                ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
                : 'text-white/20 border-white/8 hover:text-white/45 hover:border-white/15'
            )}
          >
            ⚡ I got distracted
            {distractions.length > 0 && (
              <span className="bg-orange-400/20 text-orange-300 rounded-full px-2 py-0 text-xs font-mono">
                {distractions.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Bottom hint ─────────────────────── */}
      <div className="absolute bottom-6 text-xs text-white/12 flex items-center gap-3 z-10">
        <span><span className="kbd">Space</span> play/pause</span>
        <span>·</span>
        <span><span className="kbd">ESC</span> exit</span>
      </div>
    </div>
  )
}
