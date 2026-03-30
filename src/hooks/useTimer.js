/**
 * useTimer — Core Pomodoro timer logic
 *
 * Bug fix: setInterval replaced with a Web Worker (/public/timer.worker.js)
 * so the countdown is NEVER throttled when the tab is in the background.
 * Wall-clock compensation inside the worker keeps time drift-free.
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

const MIN_PARTIAL_SECONDS = 30

export function useTimer(settings = DEFAULT_SETTINGS, onSessionComplete, onPhaseComplete) {
  const s = { ...DEFAULT_SETTINGS, ...settings }

  // Phase durations in seconds
  const phaseDurations = {
    [PHASES.FOCUS]:       s.focusDuration * 60,
    [PHASES.SHORT_BREAK]: s.shortBreakDuration * 60,
    [PHASES.LONG_BREAK]:  s.longBreakDuration * 60,
  }

  // ── React state ───────────────────────────────────────
  const [phase,        setPhase]        = useState(PHASES.FOCUS)
  const [timeLeft,     setTimeLeft]     = useState(phaseDurations[PHASES.FOCUS])
  const [running,      setRunning]      = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [distractions, setDistractions] = useState([])
  const [pauses,       setPauses]       = useState([])

  // ── Stable refs (avoid stale closure bugs) ────────────
  const workerRef           = useRef(null)
  const onCompleteRef       = useRef(onSessionComplete)
  const handleCompleteRef   = useRef(null)   // forward ref — set after definition
  const phaseRef            = useRef(phase)
  const timeLeftRef         = useRef(timeLeft)
  const sessionCountRef     = useRef(sessionCount)
  const distractionsRef     = useRef(distractions)
  const pausesRef           = useRef(pauses)
  const runningRef          = useRef(running)
  const durationsRef        = useRef(phaseDurations)
  const settingsRef         = useRef(s)
  const onPhaseCompleteRef  = useRef(onPhaseComplete)

  useEffect(() => { onCompleteRef.current     = onSessionComplete },  [onSessionComplete])
  useEffect(() => { onPhaseCompleteRef.current = onPhaseComplete },   [onPhaseComplete])
  useEffect(() => { phaseRef.current          = phase },             [phase])
  useEffect(() => { timeLeftRef.current       = timeLeft },          [timeLeft])
  useEffect(() => { sessionCountRef.current   = sessionCount },      [sessionCount])
  useEffect(() => { distractionsRef.current   = distractions },      [distractions])
  useEffect(() => { pausesRef.current         = pauses },            [pauses])
  // IMPORTANT: update runningRef synchronously using layout effect
  // so that the settings-change guard (below) reads the correct value
  useEffect(() => { runningRef.current        = running },           [running])
  useEffect(() => { durationsRef.current      = phaseDurations },    )  // every render
  useEffect(() => { settingsRef.current       = s },                 )  // every render

  // ── Create Web Worker once on mount ───────────────────
  useEffect(() => {
    const worker = new Worker('/timer.worker.js')

    worker.onmessage = (e) => {
      const { type, remaining } = e.data

      if (type === 'TICK') {
        setTimeLeft(remaining)
        if (remaining <= 0) {
          // Phase complete — delegate to the ref so we always use the latest handler
          handleCompleteRef.current?.()
        }
      }
      // 'COMPLETE' is sent by the worker too but we handle it via remaining===0 above
    }

    worker.onerror = (err) => {
      console.error('[DeepFocus] Timer worker error:', err)
    }

    workerRef.current = worker
    return () => worker.terminate()
  }, []) // ← deliberately empty: worker is created only once

  // ── Session recording helper ──────────────────────────
  const recordSession = useCallback((partial = false) => {
    const totalDuration = durationsRef.current[phaseRef.current]
    const elapsed       = totalDuration - timeLeftRef.current
    if (elapsed < MIN_PARTIAL_SECONDS) return

    onCompleteRef.current?.({
      phase:          phaseRef.current,
      duration:       elapsed,
      distractions:   distractionsRef.current.length,
      pauses:         pausesRef.current.length,
      completedAt:    Date.now(),
      sessionNumber:  sessionCountRef.current + (partial ? 0 : 1),
      elapsedSeconds: elapsed,
      partial,
    })
  }, [])

  // ── Phase complete handler ────────────────────────────
  const handlePhaseComplete = useCallback(() => {
    setRunning(false)
    workerRef.current?.postMessage({ type: 'RESET' })

    const cfg          = settingsRef.current
    const dur          = durationsRef.current
    const completedPhase = phaseRef.current

    if (completedPhase === PHASES.FOCUS) {
      const newCount = sessionCountRef.current + 1
      setSessionCount(newCount)

      // Record completed session (full duration)
      onCompleteRef.current?.({
        phase:          PHASES.FOCUS,
        duration:       dur[PHASES.FOCUS],
        distractions:   distractionsRef.current.length,
        pauses:         pausesRef.current.length,
        completedAt:    Date.now(),
        sessionNumber:  newCount,
        elapsedSeconds: dur[PHASES.FOCUS],
        partial:        false,
      })

      const isLong    = newCount % cfg.sessionsUntilLongBreak === 0
      const nextPhase = isLong ? PHASES.LONG_BREAK : PHASES.SHORT_BREAK

      // ── Notify: focus ended, break starting ──────────
      onPhaseCompleteRef.current?.({
        completedPhase: PHASES.FOCUS,
        nextPhase,
        autoStarting:   cfg.autoStartBreaks,
      })

      setPhase(nextPhase)
      setTimeLeft(dur[nextPhase])
      setDistractions([])
      setPauses([])

      if (cfg.autoStartBreaks) {
        setTimeout(() => {
          workerRef.current?.postMessage({ type: 'START', durationSeconds: dur[nextPhase] })
          setRunning(true)
        }, 800)  // slight delay so notification fires first
      }
    } else {
      // Break ended → return to focus
      const nextPhase = PHASES.FOCUS

      // ── Notify: break ended, focus starting ──────────
      onPhaseCompleteRef.current?.({
        completedPhase,
        nextPhase,
        autoStarting:   cfg.autoStartFocus,
      })

      setPhase(PHASES.FOCUS)
      setTimeLeft(dur[PHASES.FOCUS])
      setDistractions([])
      setPauses([])

      if (cfg.autoStartFocus) {
        setTimeout(() => {
          workerRef.current?.postMessage({ type: 'START', durationSeconds: dur[PHASES.FOCUS] })
          setRunning(true)
        }, 800)
      }
    }
  }, []) // stable — reads everything from refs

  // Keep forward ref up-to-date
  useEffect(() => { handleCompleteRef.current = handlePhaseComplete }, [handlePhaseComplete])

  // ── Reset timer whenever settings change ─────────────────
  // Always resets — even if running — so the new duration takes effect immediately.
  useEffect(() => {
    setRunning(false)
    workerRef.current?.postMessage({ type: 'RESET' })
    setTimeLeft(phaseDurations[phaseRef.current])
    setDistractions([])
    setPauses([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.focusDuration, s.shortBreakDuration, s.longBreakDuration])

  // ── Public controls ───────────────────────────────────
  const start = useCallback(() => {
    const dur = timeLeftRef.current
    workerRef.current?.postMessage({ type: 'START', durationSeconds: dur })
    setRunning(true)
  }, [])

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: 'PAUSE' })
    setRunning(false)
    setPauses(p => [...p, { at: Date.now() }])
  }, [])

  const resume = useCallback(() => {
    workerRef.current?.postMessage({ type: 'RESUME' })
    setRunning(true)
  }, [])

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ type: 'RESET' })
    setRunning(false)
    // Record partial session if in focus and enough time elapsed
    if (phaseRef.current === PHASES.FOCUS) recordSession(true)
    setTimeLeft(durationsRef.current[phaseRef.current])
    setDistractions([])
    setPauses([])
  }, [recordSession])

  const skipPhase = useCallback(() => {
    workerRef.current?.postMessage({ type: 'RESET' })
    setRunning(false)

    if (phaseRef.current === PHASES.FOCUS) {
      recordSession(true)
      const newCount  = sessionCountRef.current + 1
      setSessionCount(newCount)
      const isLong    = newCount % settingsRef.current.sessionsUntilLongBreak === 0
      const nextPhase = isLong ? PHASES.LONG_BREAK : PHASES.SHORT_BREAK
      setPhase(nextPhase)
      setTimeLeft(durationsRef.current[nextPhase])
    } else {
      setPhase(PHASES.FOCUS)
      setTimeLeft(durationsRef.current[PHASES.FOCUS])
    }
    setDistractions([])
    setPauses([])
  }, [recordSession])

  const logDistraction = useCallback(() => {
    setDistractions(d => [...d, { at: Date.now() }])
  }, [])

  const setPhaseManual = useCallback((newPhase) => {
    workerRef.current?.postMessage({ type: 'RESET' })
    setRunning(false)
    if (phaseRef.current === PHASES.FOCUS) recordSession(true)
    setPhase(newPhase)
    setTimeLeft(durationsRef.current[newPhase])
    setDistractions([])
    setPauses([])
  }, [recordSession])

  // elapsed = how many seconds have been focused in this phase
  const totalDuration  = phaseDurations[phase]
  const elapsedSeconds = Math.max(0, totalDuration - timeLeft)
  const progress       = totalDuration > 0 ? 1 - timeLeft / totalDuration : 0

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
