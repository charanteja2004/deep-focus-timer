/**
 * FloatingTimerContent — Minimal timer UI rendered inside the PiP window.
 *
 * Uses inline styles as the primary styling (PiP CSS copy may have a short
 * delay), with Tailwind classes as enhancement. Designed to look great at
 * 260×150px — the PiP window dimensions.
 */
import React from 'react'
import { formatTime, PHASES, PHASE_LABELS } from '../hooks/useTimer'

const PHASE_COLOR = {
  [PHASES.FOCUS]:       { dot: '#4d6ef5', btn: '#4d6ef5', btnHover: '#6281ff' },
  [PHASES.SHORT_BREAK]: { dot: '#10b981', btn: '#10b981', btnHover: '#34d399' },
  [PHASES.LONG_BREAK]:  { dot: '#8b5cf6', btn: '#8b5cf6', btnHover: '#a78bfa' },
}

export default function FloatingTimerContent({
  timeLeft,
  phase,
  running,
  elapsedSeconds,
  onPlay,
  onPause,
  onDistraction,
}) {
  const colors = PHASE_COLOR[phase] || PHASE_COLOR[PHASES.FOCUS]

  const handlePrimary = () => {
    if (running) onPause()
    else onPlay()
  }

  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      height:     '150px',
      padding:    '0 18px',
      gap:        '14px',
      background: '#0d1117',
      fontFamily: 'Inter, system-ui, sans-serif',
      color:      '#fff',
      userSelect: 'none',
    }}>
      {/* Phase pulse dot */}
      <div style={{
        width:        10,
        height:       10,
        borderRadius: '50%',
        background:   colors.dot,
        flexShrink:   0,
        opacity:      running ? 1 : 0.4,
        animation:    running ? 'none' : 'none',
        boxShadow:    running ? `0 0 8px ${colors.dot}80` : 'none',
        transition:   'all 0.3s',
      }} />

      {/* Time + phase label */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily:     'JetBrains Mono, monospace',
          fontSize:        '32px',
          fontWeight:      300,
          letterSpacing:  '-1px',
          lineHeight:      1,
          color:           running ? '#fff' : 'rgba(255,255,255,0.5)',
          transition:      'color 0.3s',
        }}>
          {formatTime(timeLeft)}
        </div>
        <div style={{
          fontSize:      '10px',
          color:         'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginTop:      4,
        }}>
          {PHASE_LABELS[phase]}
          {!running && elapsedSeconds > 0 && (
            <span style={{ marginLeft: 6, opacity: 0.6 }}>· paused</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Play / Pause */}
        <button
          onClick={handlePrimary}
          title={running ? 'Pause' : 'Play'}
          style={{
            width:           36,
            height:          36,
            borderRadius:     8,
            border:          'none',
            background:      colors.btn,
            color:           '#fff',
            cursor:          'pointer',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            transition:      'transform 0.1s, background 0.2s',
            fontSize:         14,
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
          onMouseUp={e   => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {running ? (
            // Pause icon
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="6"  y="4" width="4" height="16" fill="white" stroke="none"/>
              <rect x="14" y="4" width="4" height="16" fill="white" stroke="none"/>
            </svg>
          ) : (
            // Play icon
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
        </button>

        {/* Distraction (focus phase only) */}
        {phase === PHASES.FOCUS && (
          <button
            onClick={onDistraction}
            title="Log distraction"
            style={{
              width:           36,
              height:          36,
              borderRadius:     8,
              border:          '1px solid rgba(249,115,22,0.3)',
              background:      'rgba(249,115,22,0.1)',
              color:           'rgba(249,115,22,0.8)',
              cursor:          'pointer',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:         16,
              transition:      'all 0.15s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
            onMouseUp={e   => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            ⚡
          </button>
        )}
      </div>
    </div>
  )
}
