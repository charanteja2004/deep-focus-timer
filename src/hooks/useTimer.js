/**
 * useTimer — Core Pomodoro timer logic
 * Handles focus/break phases, auto-cycling, pause/resume/reset.
 * Records partial sessions on reset/skip if >30s of focus elapsed.
 */
import { useState, useEffect, useRef, useCallback } from 'react'

export const PHASES = { FOCUS: 'focus', SHORT_BREAK: 'short_break', LONG_BREAK: 'long_break' }

export const PHASE_LABELS = {
  [PHASES.FOCUS]:       'Focus',
  [PHASES.SHORT_BREAK]: 'Short Break',
  [PHASES.LONG_BREAK]:  'Long Break',
}

const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
}

// Minimum elapsed seconds to record a partial session
const MIN_PARTIAL_SECONDS = 30

export function useTimer(settings = DEFAULT_SETTINGS, onSessionComplete) {
  const s = { ...DEFAULT_SETTINGS, ...settings }

  const phaseDurations = {
    [PHASES.FOCUS]:       s.focusDuration * 60,
    [PHASES.SHORT_BREAK]: s.shortBreakDuration * 60,
    [PHASES.LONG_BREAK]:  s.longBreakDuration * 60,
  }

  const [phase, setPhase]               = useState(PHASES.FOCUS)
  const [timeLeft, setTimeLeft]         = useState(phaseDurations[PHASES.FOCUS])
  const [running, setRunning]           = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [distractions, setDistractions] = useState([])
  const [pauses, setPauses]             = useState([])
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [elapsedSeconds, setElapsedSeconds]     = useState(0)

  const intervalRef  = useRef(null)
  // Keep a stable ref to onSessionComplete to avoid stale closures
  const onCompleteRef = useRef(onSessionComplete)
  useEffect(() => { onCompleteRef.current = onSessionComplete }, [onSessionComplete])

  // Also keep live refs to state used in callbacks
  const phaseRef        = useRef(phase)
  const elapsedRef      = useRef(elapsedSeconds)
  const sessionCountRef = useRef(sessionCount)
  const distractionsRef = useRef(distractions)
  const pausesRef       = useRef(pauses)

  useEffect(() => { phaseRef.current        = phase },        [phase])
  useEffect(() => { elapsedRef.current      = elapsedSeconds }, [elapsedSeconds])
  useEffect(() => { sessionCountRef.current = sessionCount }, [sessionCount])
  useEffect(() => { distractionsRef.current = distractions }, [distractions])
  useEffect(() => { pausesRef.current       = pauses },       [pauses])

  // Keep durations up-to-date via ref
  const durationsRef = useRef(phaseDurations)
  durationsRef.current = phaseDurations

  // Reset timer display only when settings change and not running
  useEffect(() => {
    if (!running) {
      setTimeLeft(durationsRef.current[phase])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.focusDuration, s.shortBreakDuration, s.longBreakDuration])

  const totalDuration = phaseDurations[phase]

  // ── Helper: record a session (full or partial) ───────
  const recordSession = useCallback((partial = false) => {
    const elapsed = elapsedRef.current
    if (elapsed < MIN_PARTIAL_SECONDS) return  // too short to record

    const newCount = sessionCountRef.current + (partial ? 0 : 1)
    onCompleteRef.current?.({
      phase:          phaseRef.current,
      duration:       elapsed,
      distractions:   distractionsRef.current.length,
      pauses:         pausesRef.current.length,
      completedAt:    Date.now(),
      sessionNumber:  newCount,
      elapsedSeconds: elapsed,
      partial,
    })
  }, [])

  // ── Core tick ────────────────────────────────────────
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

    if (phaseRef.current === PHASES.FOCUS) {
      const newCount = sessionCountRef.current + 1
      setSessionCount(newCount)

      onCompleteRef.current?.({
        phase:          PHASES.FOCUS,
        duration:       durationsRef.current[PHASES.FOCUS],
        distractions:   distractionsRef.current.length,
        pauses:         pausesRef.current.length,
        completedAt:    Date.now(),
        sessionNumber:  newCount,
        elapsedSeconds: elapsedRef.current,
        partial:        false,
      })

      const isLongBreak = newCount % s.sessionsUntilLongBreak === 0
      const nextPhase   = isLongBreak ? PHASES.LONG_BREAK : PHASES.SHORT_BREAK
      setPhase(nextPhase)
      setTimeLeft(durationsRef.current[nextPhase])
      setDistractions([]); setPauses([]); setElapsedSeconds(0)

      if (s.autoStartBreaks) setTimeout(() => setRunning(true), 500)
    } else {
      setPhase(PHASES.FOCUS)
      setTimeLeft(durationsRef.current[PHASES.FOCUS])
      setElapsedSeconds(0)
      if (s.autoStartFocus) setTimeout(() => setRunning(true), 500)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.sessionsUntilLongBreak, s.autoStartBreaks, s.autoStartFocus])

  // ── Controls ─────────────────────────────────────────
  const start = useCallback(() => {
    if (!sessionStartTime) setSessionStartTime(Date.now())
    setRunning(true)
  }, [sessionStartTime])

  const pause = useCallback(() => {
    setRunning(false)
    setPauses(p => [...p, { at: Date.now() }])
  }, [])

  const resume = useCallback(() => setRunning(true), [])

  // Reset — records partial session if focus was happening
  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    setRunning(false)

    // Record partial if we were in focus and enough time passed
    if (phaseRef.current === PHASES.FOCUS) {
      recordSession(true)
    }

    setTimeLeft(durationsRef.current[phaseRef.current])
    setElapsedSeconds(0)
    setSessionStartTime(null)
    setDistractions([])
    setPauses([])
  }, [recordSession])

  // Skip — records partial focus session, then advances phase
  const skipPhase = useCallback(() => {
    clearInterval(intervalRef.current)
    setRunning(false)

    if (phaseRef.current === PHASES.FOCUS) {
      // Record partial session
      recordSession(true)
      const newCount = sessionCountRef.current + 1
      setSessionCount(newCount)
      const isLongBreak = newCount % s.sessionsUntilLongBreak === 0
      const nextPhase   = isLongBreak ? PHASES.LONG_BREAK : PHASES.SHORT_BREAK
      setPhase(nextPhase)
      setTimeLeft(durationsRef.current[nextPhase])
    } else {
      setPhase(PHASES.FOCUS)
      setTimeLeft(durationsRef.current[PHASES.FOCUS])
    }
    setDistractions([]); setPauses([]); setElapsedSeconds(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordSession, s.sessionsUntilLongBreak])

  const logDistraction = useCallback(() => {
    setDistractions(d => [...d, { at: Date.now() }])
  }, [])

  const setPhaseManual = useCallback((newPhase) => {
    clearInterval(intervalRef.current)
    setRunning(false)
    // Record partial if leaving focus mid-session
    if (phaseRef.current === PHASES.FOCUS) recordSession(true)
    setPhase(newPhase)
    setTimeLeft(durationsRef.current[newPhase])
    setDistractions([]); setPauses([]); setElapsedSeconds(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordSession])

  const progress = totalDuration > 0 ? 1 - timeLeft / totalDuration : 0

  return {
    phase, timeLeft, running, sessionCount,
    distractions, pauses, progress, totalDuration, elapsedSeconds,
    start, pause, resume, reset, skipPhase, logDistraction, setPhaseManual,
  }
}

/** Format seconds → MM:SS */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
