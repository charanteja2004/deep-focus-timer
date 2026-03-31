/**
 * CircularTimer — Fully responsive SVG timer using viewBox scaling
 * The ring grows/shrinks smoothly with screen resolution via CSS clamp()
 */
import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PHASES, formatTime } from '../hooks/useTimer'

// Internal coordinate space (viewBox units — never changes)
const V      = 340   // viewBox size
const STROKE = 14
const R      = (V - STROKE) / 2
const CIRC   = 2 * Math.PI * R

const PHASE_CONFIG = {
  [PHASES.FOCUS]: {
    stroke:     '#4d6ef5',
    strokeEnd:  '#818cf8',
    glowActive: 'timer-glow-focus-active',
    glowIdle:   'timer-glow-focus-idle',
    ambient:    'timer-ambient-focus',
    textVar:    '--timer-text-focus',
    label:      'FOCUS',
  },
  [PHASES.SHORT_BREAK]: {
    stroke:     '#10b981',
    strokeEnd:  '#34d399',
    glowActive: 'timer-glow-break-active',
    glowIdle:   'timer-glow-break-idle',
    ambient:    'timer-ambient-break',
    textVar:    '--timer-text-break',
    label:      'SHORT BREAK',
  },
  [PHASES.LONG_BREAK]: {
    stroke:     '#8b5cf6',
    strokeEnd:  '#c4b5fd',
    glowActive: 'timer-glow-long-active',
    glowIdle:   'timer-glow-long-idle',
    ambient:    'timer-ambient-long',
    textVar:    '--timer-text-long',
    label:      'LONG BREAK',
  },
}

export default function CircularTimer({ timeLeft, progress, phase, running }) {
  const dashOffset = useMemo(() => CIRC * (1 - progress), [progress])
  const cfg = PHASE_CONFIG[phase] || PHASE_CONFIG[PHASES.FOCUS]
  const gradId = `timer-grad-${phase}`

  // Responsive container: grows from 220px (mobile) up to 360px (4K)
  // At 1366px viewport: ~24vw = 328px; at 1920px: ~26vw = 499px → capped at 360px
  const containerStyle = {
    width:  'clamp(220px, 26vw, 380px)',
    height: 'clamp(220px, 26vw, 380px)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div style={containerStyle}>

      {/* Ambient glow — full bleed behind the ring */}
      <div
        className={`timer-ambient ${cfg.ambient} ${running ? 'timer-ambient-active' : ''}`}
        style={{ position: 'absolute', inset: '-15%', borderRadius: '50%', zIndex: 0 }}
      />

      {/*
        Single SVG handles everything: outer depth ring, track, progress arc.
        viewBox="0 0 340 340" means internal coords are always 340×340,
        but the SVG's display size is determined by CSS (100% of container).
      */}
      <svg
        viewBox={`0 0 ${V} ${V}`}
        width="100%" height="100%"
        className={`progress-ring ${running ? cfg.glowActive : cfg.glowIdle}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        role="img"
        aria-label={`${formatTime(timeLeft)} remaining`}
        overflow="visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={cfg.stroke} />
            <stop offset="100%" stopColor={cfg.strokeEnd} />
          </linearGradient>
          {/* Outer depth ring gradient */}
          <radialGradient id="depth-grad" cx="35%" cy="35%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Glow filter */}
          <filter id={`glow-${phase}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Outer decorative depth ring */}
        <circle
          cx={V/2} cy={V/2} r={R + STROKE/2 + 10}
          fill="url(#depth-grad)"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />

        {/* Track */}
        <circle
          cx={V/2} cy={V/2} r={R}
          fill="none"
          stroke="var(--timer-track)"
          strokeWidth={STROKE}
        />

        {/* Subtle inner shadow ring */}
        <circle
          cx={V/2} cy={V/2} r={R - STROKE/2 - 3}
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1.5"
        />

        {/* Progress arc */}
        <circle
          cx={V/2} cy={V/2} r={R}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE}
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="progress-ring-circle"
          filter={`url(#glow-${phase})`}
        />
      </svg>

      {/* Center text overlay — positioned absolutely, uses CSS clamp for font-size */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '8px',
          userSelect: 'none',
        }}
      >
        {/* Time display — font scales with container via clamp */}
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: 'clamp(2.4rem, 5.5vw, 4rem)',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: `var(${cfg.textVar})`,
              transition: 'color 0.4s ease',
            }}
          >
            {formatTime(timeLeft)}
          </motion.span>
        </AnimatePresence>

        {/* Status label */}
        {running ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-1.5"
          >
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: cfg.stroke, display: 'inline-block',
              }}
            />
            <span style={{
              fontSize: 'clamp(0.6rem, 0.85vw, 0.75rem)',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: `var(${cfg.textVar})`,
              opacity: 0.6,
            }}>
              {cfg.label}
            </span>
          </motion.div>
        ) : (
          <span className="text-white/25" style={{
            fontSize: 'clamp(0.6rem, 0.85vw, 0.75rem)',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {progress > 0 ? 'PAUSED' : cfg.label}
          </span>
        )}
      </div>
    </div>
  )
}
