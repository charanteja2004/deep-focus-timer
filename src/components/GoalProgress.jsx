/**
 * GoalProgress — compact daily goal ring shown in the app header.
 * Shows today's focus minutes vs the user's daily goal.
 * Clicking opens an inline goal editor.
 */
import React, { useState } from 'react'
import clsx from 'clsx'

export default function GoalProgress({ todayMinutes, goalMinutes, onSetGoal, darkMode }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(goalMinutes)

  const pct      = goalMinutes > 0 ? Math.min(1, todayMinutes / goalMinutes) : 0
  const done     = pct >= 1
  const radius   = 14
  const circ     = 2 * Math.PI * radius
  const strokeDashoffset = circ * (1 - pct)

  function saveGoal() {
    onSetGoal(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs',
        darkMode ? 'bg-white/5 border-white/10' : 'bg-surface-50 border-surface-200'
      )}>
        <span className={darkMode ? 'text-white/40' : 'text-surface-400'}>Goal:</span>
        <input
          type="number" min={30} max={480} step={30}
          value={draft}
          onChange={e => setDraft(Number(e.target.value))}
          onKeyDown={e => e.key === 'Enter' && saveGoal()}
          className="w-14 bg-transparent text-center font-mono text-sm outline-none"
          autoFocus
        />
        <span className={darkMode ? 'text-white/40' : 'text-surface-400'}>min</span>
        <button onClick={saveGoal}
          className="text-brand-400 font-medium hover:text-brand-300">✓</button>
        <button onClick={() => setEditing(false)}
          className={clsx('hover:opacity-80', darkMode ? 'text-white/30' : 'text-surface-300')}>✕</button>
      </div>
    )
  }

  return (
    <button
      id="goal-progress-ring"
      onClick={() => { setDraft(goalMinutes); setEditing(true) }}
      title={`${todayMinutes}m / ${goalMinutes}m daily goal — click to change`}
      className="flex items-center gap-2 group"
    >
      {/* SVG ring */}
      <svg width={34} height={34} viewBox="0 0 34 34" className="-rotate-90">
        {/* Track */}
        <circle cx={17} cy={17} r={radius}
          fill="none"
          stroke={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
          strokeWidth={3}
        />
        {/* Progress */}
        <circle cx={17} cy={17} r={radius}
          fill="none"
          stroke={done ? '#10b981' : '#4d6ef5'}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>

      {/* Label */}
      <div className="flex flex-col items-start leading-none">
        <span className={clsx(
          'text-[11px] font-semibold tabular-nums',
          done
            ? 'text-emerald-400'
            : darkMode ? 'text-white/70' : 'text-surface-700'
        )}>
          {done ? '✓ Done!' : `${todayMinutes}m`}
        </span>
        <span className={clsx('text-[9px]', darkMode ? 'text-white/25' : 'text-surface-400')}>
          {done ? 'Goal reached' : `of ${goalMinutes}m goal`}
        </span>
      </div>
    </button>
  )
}
