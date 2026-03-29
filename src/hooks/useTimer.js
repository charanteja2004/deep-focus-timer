/**
 * useTimer — Core Pomodoro timer logic
 * Handles focus/break phases, auto-cycling, pause/resume/reset.
 */
import { useState, useEffect, useRef, useCallback } from 'react'

export const PHASES = { FOCUS: 'focus', SHORT_BREAK: 'short_break', LONG_BREAK: 'long_break' }

export const PHASE_LABELS = {
  [PHASES.FOCUS]: 'Focus',
  [PHASES.SHORT_BREAK]: 'Short Break',
  [PHASES.LONG_BREAK]: 'Long Break',
}

const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
}

export function useTimer(settings = DEFAULT_SETTINGS, onSessionComplete) {
  const s = { ...DEFAULT_SETTINGS, ...settings }

  const phaseDurations = {
    [PHASES.FOCUS]:       s.focusDuration * 60,
    [PHASES.SHORT_BREAK]: s.shortBreakDuration * 60,
    [PHASES.LONG_BREAK]:  s.longBreakDuration * 60,
  }

  const [phase, setPhase]         = useState(PHASES.FOCUS)
  const [timeLeft, setTimeLeft]   = useState(phaseDurations[PHASES.FOCUS])
  const [running, setRunning]     = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [distractions, setDistractions] = useState([])
  const [pauses, setPauses]       = useState([])
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const intervalRef = useRef(null)
  const pauseStartRef = useRef(null)

  // Reset when settings change
  useEffect(() => {
    if (!running) {
      setTimeLeft(phaseDurations[phase])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.focusDuration, s.shortBreakDuration, s.longBreakDuration])

  const totalDuration = phaseDurations[phase]

  // Core tick
  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current)
          handlePhaseComplete()
          return 0
        }
        setElapsedSeconds(e => e + 1)
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase])

  const handlePhaseComplete = useCallback(() => {
    setRunning(false)

    if (phase === PHASES.FOCUS) {
      const newCount = sessionCount + 1
      setSessionCount(newCount)
      
      // Fire callback with session data
      if (onSessionComplete) {
        const duration = phaseDurations[PHASES.FOCUS]
        onSessionComplete({
          phase: PHASES.FOCUS,
          duration,
          distractions: distractions.length,
          pauses: pauses.length,
          completedAt: Date.now(),
          sessionNumber: newCount,
          elapsedSeconds,
        })
      }

      // Determine next break
      const isLongBreak = newCount % s.sessionsUntilLongBreak === 0
      const nextPhase = isLongBreak ? PHASES.LONG_BREAK : PHASES.SHORT_BREAK
      setPhase(nextPhase)
      setTimeLeft(phaseDurations[nextPhase])
      setDistractions([])
      setPauses([])
      setElapsedSeconds(0)

      if (s.autoStartBreaks) {
        setTimeout(() => setRunning(true), 500)
      }
    } else {
      // Break ended → go to focus
      setPhase(PHASES.FOCUS)
      setTimeLeft(phaseDurations[PHASES.FOCUS])
      setElapsedSeconds(0)
      if (s.autoStartFocus) {
        setTimeout(() => setRunning(true), 500)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionCount, distractions, pauses, elapsedSeconds, s])

  const start = useCallback(() => {
    if (!sessionStartTime) setSessionStartTime(Date.now())
    setRunning(true)
  }, [sessionStartTime])

  const pause = useCallback(() => {
    setRunning(false)
    pauseStartRef.current = Date.now()
    setPauses(p => [...p, { at: Date.now() }])
  }, [])

  const resume = useCallback(() => {
    setRunning(true)
  }, [])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setTimeLeft(phaseDurations[phase])
    setElapsedSeconds(0)
    setSessionStartTime(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, phaseDurations[phase]])

  const skipPhase = useCallback(() => {
    clearInterval(intervalRef.current)
    setRunning(false)
    if (phase === PHASES.FOCUS) {
      const newCount = sessionCount + 1
      setSessionCount(newCount)
      const isLongBreak = newCount % s.sessionsUntilLongBreak === 0
      const nextPhase = isLongBreak ? PHASES.LONG_BREAK : PHASES.SHORT_BREAK
      setPhase(nextPhase)
      setTimeLeft(phaseDurations[nextPhase])
    } else {
      setPhase(PHASES.FOCUS)
      setTimeLeft(phaseDurations[PHASES.FOCUS])
    }
    setDistractions([])
    setPauses([])
    setElapsedSeconds(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionCount, s])

  const logDistraction = useCallback(() => {
    setDistractions(d => [...d, { at: Date.now() }])
  }, [])

  const setPhaseManual = useCallback((newPhase) => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setPhase(newPhase)
    setTimeLeft(phaseDurations[newPhase])
    setDistractions([])
    setPauses([])
    setElapsedSeconds(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progress = totalDuration > 0 ? 1 - timeLeft / totalDuration : 0

  return {
    phase,
    timeLeft,
    running,
    sessionCount,
    distractions,
    pauses,
    progress,
    totalDuration,
    elapsedSeconds,
    start,
    pause,
    resume,
    reset,
    skipPhase,
    logDistraction,
    setPhaseManual,
  }
}

/** Format seconds → MM:SS */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
