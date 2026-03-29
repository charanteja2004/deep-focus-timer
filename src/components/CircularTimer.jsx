/**
 * CircularTimer — Animated SVG circular progress ring
 * Shows time remaining with a crisp, minimal aesthetic.
 */
import React, { useMemo } from 'react'
import { PHASES, formatTime } from '../hooks/useTimer'
import clsx from 'clsx'

const SIZE = 280
const STROKE = 10
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

const PHASE_COLORS = {
  [PHASES.FOCUS]:       { stroke: '#4d6ef5', glow: 'timer-glow-focus', text: 'text-brand-400' },
  [PHASES.SHORT_BREAK]: { stroke: '#10b981', glow: 'timer-glow-break', text: 'text-emerald-400' },
  [PHASES.LONG_BREAK]:  { stroke: '#8b5cf6', glow: 'timer-glow-break', text: 'text-violet-400' },
}

export default function CircularTimer({ timeLeft, progress, phase, running }) {
  const dashOffset = useMemo(() => CIRC * (1 - progress), [progress])
  const phaseStyle = PHASE_COLORS[phase] || PHASE_COLORS[PHASES.FOCUS]

  return (
    <div className={clsx('relative flex items-center justify-center', phaseStyle.glow)}>
      <svg
        width={SIZE}
        height={SIZE}
        className="progress-ring"
        role="img"
        aria-label={`Timer: ${formatTime(timeLeft)} remaining`}
      >
        {/* Background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-white/5 dark:text-white/5"
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={phaseStyle.stroke}
          strokeWidth={STROKE}
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="progress-ring-circle"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 select-none">
        <span className={clsx(
          'font-mono text-5xl font-light tracking-tight leading-none',
          phaseStyle.text
        )}>
          {formatTime(timeLeft)}
        </span>
        <div className="flex items-center gap-1.5 mt-1">
          {running ? (
            <span className="flex items-center gap-1 text-xs text-white/40 font-medium uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              running
            </span>
          ) : (
            <span className="text-xs text-white/30 font-medium uppercase tracking-widest">
              paused
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
