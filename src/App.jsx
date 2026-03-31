/**
 * App.jsx — DeepFocus v3
 * Layout: 3-column desktop (tasks | timer | stats), mobile bottom nav
 * Animations: Framer Motion throughout
 * FX: Confetti on goal, glow timer, glassmorphism cards
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import clsx from 'clsx'

// ── Hooks ──────────────────────────────────────────────────────────
import { useTimer, PHASES, PHASE_LABELS, formatTime } from './hooks/useTimer'
import { useStorage }       from './hooks/useStorage'
import { useAnalytics }     from './hooks/useAnalytics'
import { useAmbientSound }  from './hooks/useAmbientSound'
import { useNotifications } from './hooks/useNotifications'
import { usePiPTimer }      from './hooks/usePiPTimer'
import { useGamification }  from './hooks/useGamification'
import { generateSeedSessions } from './utils/seedData'

// ── Storage ───────────────────────────────────────────────────────
import {
  KEYS, DEFAULT_PROJECTS, DEFAULT_GOALS, clearTimerState,
} from './data/storage'

// ── Components ────────────────────────────────────────────────────
import CircularTimer        from './components/CircularTimer'
import TaskPanel            from './components/TaskPanel'
import AnalyticsDashboard   from './components/AnalyticsDashboard'
import SettingsPanel        from './components/SettingsPanel'
import DeepFocusMode        from './components/DeepFocusMode'
import FloatingTimerContent from './components/FloatingTimerContent'
import GoalProgress         from './components/GoalProgress'
import ProjectSelector      from './components/ProjectSelector'
import GamificationPanel, { LevelBadge } from './components/GamificationPanel'
import InsightsPanel        from './components/InsightsPanel'

// ── Icons ─────────────────────────────────────────────────────────
import {
  Play, Pause, SkipForward, RotateCcw, AlertCircle,
  BarChart2, Settings, ListTodo, Maximize2, Minimize2,
  PictureInPicture2, Zap, Moon, Sun, Trophy,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  focusDuration: 25, shortBreakDuration: 5,
  longBreakDuration: 15, sessionsUntilLongBreak: 4,
  autoStartBreaks: true, autoStartFocus: false,
}

const PHASE_BTN = {
  [PHASES.FOCUS]:       'btn-primary-focus',
  [PHASES.SHORT_BREAK]: 'btn-primary-break',
  [PHASES.LONG_BREAK]:  'btn-primary-long',
}

const PHASE_ACCENT = {
  [PHASES.FOCUS]:       '#4d6ef5',
  [PHASES.SHORT_BREAK]: '#10b981',
  [PHASES.LONG_BREAK]:  '#8b5cf6',
}

// ── Confetti helper ───────────────────────────────────────────────
function fireGoalConfetti() {
  const colors = ['#4d6ef5','#10b981','#8b5cf6','#f59e0b','#ec4899']
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.55 }, colors })
  setTimeout(() => confetti({ particleCount: 40, spread: 100, origin: { y: 0.5, x: 0.25 }, colors }), 200)
  setTimeout(() => confetti({ particleCount: 40, spread: 100, origin: { y: 0.5, x: 0.75 }, colors }), 400)
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  // Persisted state
  const [settings,      setSettings]      = useStorage(KEYS.SETTINGS,        DEFAULT_SETTINGS)
  const [sessions,      setSessions]      = useStorage(KEYS.SESSIONS,        [])
  const [tasks,         setTasks]         = useStorage(KEYS.TASKS,           [])
  const [activeTaskId,  setActiveTaskId]  = useStorage(KEYS.ACTIVE_TASK,     null)
  const [projects,      setProjects]      = useStorage(KEYS.PROJECTS,        DEFAULT_PROJECTS)
  const [goals,         setGoals]         = useStorage(KEYS.GOALS,           DEFAULT_GOALS)
  const [activeProject, setActiveProject] = useStorage(KEYS.ACTIVE_PROJECT,  'general')
  const [darkMode,      setDarkMode]      = useStorage(KEYS.DARK_MODE,       true)

  // UI state
  const [mobileTab,      setMobileTab]      = useState('timer')
  const [deepFocus,      setDeepFocus]      = useState(false)
  const [isFullscreen,   setIsFullscreen]   = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [xpToast,        setXpToast]        = useState(null)
  const goalFiredRef = useRef(false)

  const pip = usePiPTimer()
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings }
  const mergedGoals    = { ...DEFAULT_GOALS,    ...goals    }

  // Theme
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode) }, [darkMode])

  // Fullscreen
  useEffect(() => {
    const onChange = () => {
      const isFull = !!document.fullscreenElement
      setIsFullscreen(isFull)
      if (!isFull && deepFocus) setDeepFocus(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [deepFocus])

  const enterDeepFocus = useCallback(async () => {
    setDeepFocus(true)
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen() } catch {}
  }, [])
  const exitDeepFocus = useCallback(async () => {
    setDeepFocus(false)
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch {}
  }, [])

  // Gamification
  const {
    xp, level, achievements, progress: xpProgress,
    newAchievement, addXP, checkAchievements, resetGamification,
  } = useGamification(sessions)

  // Session complete
  const handleSessionComplete = useCallback((sessionData) => {
    const enriched = { ...sessionData, projectId: activeProject || 'general' }
    setSessions(prev => {
      const next = [...prev, enriched]
      // Check achievements on updated array
      checkAchievements(next)
      return next
    })
    setShowSuggestion(true)
    setTimeout(() => setShowSuggestion(false), 8000)

    if (sessionData.phase === PHASES.FOCUS) {
      const earned = addXP(sessionData.duration, sessionData.partial)
      if (earned > 0) {
        setXpToast(`+${earned} XP`)
        setTimeout(() => setXpToast(null), 2500)
      }
    }
  }, [activeProject, setSessions, checkAchievements, addXP])

  // Phase transition: notification + chime
  const handlePhaseComplete = useCallback(({ nextPhase, autoStarting }) => {
    const isNowBreak = nextPhase !== PHASES.FOCUS
    const title = isNowBreak
      ? (nextPhase === PHASES.LONG_BREAK ? '🎉 Long Break!' : '☕ Short Break!')
      : '🎯 Focus Time!'
    const body = isNowBreak
      ? `${autoStarting ? 'Break starting.' : 'Take a well-earned break.'}`
      : `${autoStarting ? 'Focus starting.' : "Let's get back to it!"}`
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, { body, icon: '/favicon.svg' })
      setTimeout(() => n.close(), 8000)
    }
    // 3-pulse chime
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const gain = ctx.createGain(); gain.connect(ctx.destination)
      for (let i = 0; i < 3; i++) {
        const t0 = ctx.currentTime + i * 1.0
        const osc = ctx.createOscillator(); osc.connect(gain); osc.type = 'sine'
        isNowBreak
          ? (osc.frequency.setValueAtTime(880, t0), osc.frequency.setValueAtTime(660, t0 + 0.25))
          : (osc.frequency.setValueAtTime(660, t0), osc.frequency.setValueAtTime(880, t0 + 0.25))
        gain.gain.setValueAtTime(0, t0)
        gain.gain.linearRampToValueAtTime(0.35, t0 + 0.05)
        gain.gain.linearRampToValueAtTime(0, t0 + 0.7)
        osc.start(t0); osc.stop(t0 + 0.75)
        if (i === 2) osc.onended = () => ctx.close()
      }
    } catch {}
  }, [])

  // Timer
  const {
    phase, timeLeft, running, sessionCount,
    distractions, pauses, progress, elapsedSeconds,
    start, pause, resume, reset, skipPhase, logDistraction, setPhaseManual,
  } = useTimer(mergedSettings, handleSessionComplete, handlePhaseComplete)

  // Analytics
  const stats = useAnalytics(sessions, projects)

  // Goal confetti — fire once when goal is reached
  useEffect(() => {
    if (stats.todayFocusMinutes >= mergedGoals.dailyGoalMinutes && sessions.length > 0) {
      if (!goalFiredRef.current) { fireGoalConfetti(); goalFiredRef.current = true }
    } else {
      goalFiredRef.current = false
    }
  }, [stats.todayFocusMinutes, mergedGoals.dailyGoalMinutes, sessions.length])

  // PiP sync
  useEffect(() => {
    if (!pip.isOpen) return
    pip.renderContent(
      <FloatingTimerContent timeLeft={timeLeft} phase={phase} running={running}
        elapsedSeconds={elapsedSeconds}
        onPlay={() => { if (elapsedSeconds > 0) resume(); else start() }}
        onPause={pause} onDistraction={logDistraction}
      />
    )
  }, [pip.isOpen, timeLeft, phase, running, elapsedSeconds])

  // Ambient + notifications
  const { activeSound, volume, play: playSound, updateVolume } = useAmbientSound()
  useNotifications(running, timeLeft, phase, distractions)

  // Keyboard
  useEffect(() => {
    const h = (e) => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return
      if (e.code === 'Space')  { e.preventDefault(); running ? pause() : elapsedSeconds > 0 ? resume() : start() }
      if (e.code === 'KeyF' && !e.ctrlKey) { e.preventDefault(); deepFocus ? exitDeepFocus() : enterDeepFocus() }
      if (e.code === 'KeyR' && !e.ctrlKey) { e.preventDefault(); reset() }
      if (e.code === 'Escape' && deepFocus) exitDeepFocus()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [running, elapsedSeconds, start, pause, resume, reset, deepFocus, enterDeepFocus, exitDeepFocus])

  const handlePrimary = () => { running ? pause() : elapsedSeconds > 0 ? resume() : start() }
  const activeTask = tasks.find(t => t.id === activeTaskId) || null
  const accent = PHASE_ACCENT[phase]

  const clearData = () => {
    setSessions([]); setTasks([]); setActiveTaskId(null)
    resetGamification(); clearTimerState(); reset()
  }

  const handleSeedData = () => {
    const demo = generateSeedSessions(30)
    setSessions(prev => {
      const ts = new Set(prev.map(s => s.completedAt))
      return [...prev, ...demo.filter(s => !ts.has(s.completedAt))].sort((a,b)=>a.completedAt-b.completedAt)
    })
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-fixed)', transition: 'background 0.4s ease' }}>

      {/* Deep focus overlay */}
      {deepFocus && (
        <DeepFocusMode timeLeft={timeLeft} progress={progress} phase={phase}
          running={running} elapsedSeconds={elapsedSeconds}
          onStart={start} onPause={pause} onResume={resume}
          onSkip={skipPhase} onDistraction={logDistraction}
          distractions={distractions} activeTask={activeTask} onExit={exitDeepFocus}
        />
      )}

      {/* XP toast */}
      <AnimatePresence>
        {xpToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.35)', color: '#fcd34d', boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}
          >
            ⚔ {xpToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement toast */}
      <AnimatePresence>
        {newAchievement && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className="fixed top-16 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur shadow-2xl"
            style={{ background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(245,158,11,0.3)', maxWidth: 260 }}
          >
            <span className="text-2xl">{newAchievement.icon}</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: '#fcd34d' }}>Achievement Unlocked!</p>
              <p className="text-xs text-white/60">{newAchievement.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────────── HEADER ────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
        style={{
          background: 'var(--header-bg)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--header-border)',
          transition: 'background 0.4s ease, border-color 0.3s ease',
        }}
      >
        {/* Logo + streak + level */}
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 10 }} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#4d6ef5,#8b5cf6)', boxShadow: '0 0 16px rgba(77,110,245,0.5)' }}>
            <div className="w-3 h-3 rounded-full bg-white/80" />
          </motion.div>
          <span className="font-semibold text-sm text-white tracking-tight hidden sm:block">DeepFocus</span>
          {stats.streak > 0 && (
            <span className="flex items-center gap-1 text-xs text-orange-400 rounded-full px-2 py-0.5"
              style={{ background:'rgba(251,146,60,0.12)', border:'1px solid rgba(251,146,60,0.2)' }}>
              <span className="flame-anim">🔥</span> {stats.streak}d
            </span>
          )}
          <LevelBadge level={level} />
        </div>

        {/* Goal ring + actions */}
        <div className="flex items-center gap-2">
          <GoalProgress
            todayMinutes={stats.todayFocusMinutes}
            goalMinutes={mergedGoals.dailyGoalMinutes}
            onSetGoal={(min) => setGoals(g => ({ ...g, dailyGoalMinutes: min }))}
            darkMode={true}
          />
          <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />
          {[
            { icon: darkMode ? <Sun size={15}/> : <Moon size={15}/>, onClick: () => setDarkMode(d=>!d), tip:'Toggle theme' },
            { icon: <PictureInPicture2 size={15}/>, onClick: pip.isOpen ? pip.close : pip.open, tip:'Float timer', active: pip.isOpen, disabled: !pip.isSupported },
            { icon: (deepFocus||isFullscreen) ? <Minimize2 size={15}/> : <Maximize2 size={15}/>, onClick: deepFocus?exitDeepFocus:enterDeepFocus, tip:'Deep focus (F)', active: deepFocus||isFullscreen },
          ].map((btn, i) => (
            <motion.button key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={btn.onClick} disabled={btn.disabled}
              data-tooltip={btn.tip}
              className={clsx('icon-btn', btn.active && 'active', btn.disabled && 'opacity-30 cursor-not-allowed')}
            >{btn.icon}</motion.button>
          ))}
        </div>
      </header>

      {/* ────────────────── 3-COLUMN LAYOUT ────────────────── */}
      <div className="flex h-[calc(100vh-57px)] overflow-hidden">

        {/* ══ LEFT COLUMN — Tasks (desktop only) ══ */}
        <aside
          className="hidden lg:flex flex-col gap-4 flex-shrink-0 p-4 overflow-y-auto"
          style={{
            width: 'clamp(240px, 22vw, 400px)',
            borderRight: '1px solid var(--border-col)',
          }}
        >

          {/* Phase tabs */}
          <div className="glass-card p-1.5 flex gap-1">
            {[PHASES.FOCUS, PHASES.SHORT_BREAK, PHASES.LONG_BREAK].map(p => (
              <motion.button key={p} id={`phase-tab-${p}`}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setPhaseManual(p)}
                className={clsx('flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-200',
                  phase === p ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                )}
              >{PHASE_LABELS[p]}</motion.button>
            ))}
          </div>

          {/* Project selector */}
          <div className="glass-card p-4">
            <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Project</p>
            <ProjectSelector projects={projects} activeProjectId={activeProject}
              onChange={setActiveProject} darkMode={true} />
          </div>

          {/* Tasks */}
          <div className="glass-card p-4 flex-1">
            <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Session Tasks</p>
            <TaskPanel tasks={tasks} setTasks={setTasks}
              activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
              projects={projects}
            />
          </div>
        </aside>

        {/* ══ CENTER COLUMN — Timer ══ */}
        <main className="flex-1 flex flex-col items-center justify-start overflow-y-auto">
          {/* Center content — fills available space, max-width adapts to screen */}
          <div
            className="w-full px-4 py-6 flex flex-col items-center gap-6"
            style={{ maxWidth: 'clamp(360px, 36vw, 580px)' }}
          >

            {/* Mobile phase tabs */}
            <div className="lg:hidden w-full glass-card p-1.5 flex gap-1">
              {[PHASES.FOCUS, PHASES.SHORT_BREAK, PHASES.LONG_BREAK].map(p => (
                <button key={p} onClick={() => setPhaseManual(p)}
                  className={clsx('flex-1 py-2 rounded-xl text-xs font-medium transition-all',
                    phase === p ? 'bg-white/12 text-white' : 'text-white/30 hover:text-white/60')}>
                  {PHASE_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Circular Timer */}
            <CircularTimer timeLeft={timeLeft} progress={progress} phase={phase} running={running} />

            {/* Active task chip */}
            <AnimatePresence>
              {activeTask && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm"
                  style={{ background: 'rgba(77,110,245,0.1)', border: '1px solid rgba(77,110,245,0.2)' }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    className="w-2 h-2 rounded-full"
                    style={{ background: accent }}
                  />
                  <span className="text-white/70 max-w-[260px] truncate">{activeTask.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Session dots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: mergedSettings.sessionsUntilLongBreak }).map((_, i) => (
                <motion.div key={i}
                  animate={{ scale: i < (sessionCount % mergedSettings.sessionsUntilLongBreak) ? 1.2 : 1 }}
                  className="w-2 h-2 rounded-full transition-colors duration-500"
                  style={{
                    background: i < (sessionCount % mergedSettings.sessionsUntilLongBreak)
                      ? accent : 'rgba(255,255,255,0.12)'
                  }}
                />
              ))}
              <span className="text-xs text-white/25 ml-1 font-mono">
                #{Math.floor(sessionCount/mergedSettings.sessionsUntilLongBreak)+1}.{(sessionCount%mergedSettings.sessionsUntilLongBreak)+1}
              </span>
            </div>

            {/* Mobile project selector */}
            <div className="lg:hidden">
              <ProjectSelector projects={projects} activeProjectId={activeProject}
                onChange={setActiveProject} darkMode={true} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={reset} className="icon-btn" data-tooltip="Reset (R)">
                <RotateCcw size={18} />
              </motion.button>

              <motion.button
                id="ctrl-primary" onClick={handlePrimary}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                className={clsx('flex items-center gap-2.5 px-10 py-4 rounded-2xl font-semibold text-sm text-white btn-ripple shadow-xl', PHASE_BTN[phase])}
                style={{ boxShadow: `0 8px 32px ${accent}40, 0 0 0 1px ${accent}30` }}
                aria-label={running ? 'Pause' : 'Start'}
              >
                <AnimatePresence mode="wait">
                  {running ? (
                    <motion.span key="pause"
                      initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.7 }}
                      className="flex items-center gap-2.5"
                    ><Pause size={18} strokeWidth={2.5} /> Pause</motion.span>
                  ) : (
                    <motion.span key="start"
                      initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.7 }}
                      className="flex items-center gap-2.5"
                    ><Play size={18} strokeWidth={2.5} /> {elapsedSeconds>0?'Resume':'Start'}</motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={skipPhase} className="icon-btn" data-tooltip="Skip phase">
                <SkipForward size={18} />
              </motion.button>
            </div>

            {/* Distraction button */}
            <AnimatePresence>
              {phase === PHASES.FOCUS && (
                <motion.button
                  id="log-distraction" onClick={logDistraction}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-2xl border transition-all"
                  style={distractions.length>0
                    ? { color:'#fb923c', background:'rgba(249,115,22,0.1)', borderColor:'rgba(249,115,22,0.25)' }
                    : { color:'rgba(255,255,255,0.25)', background:'transparent', borderColor:'rgba(255,255,255,0.08)' }
                  }
                >
                  <AlertCircle size={13} />
                  I got distracted
                  {distractions.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="rounded-full px-1.5 text-[10px] font-mono"
                      style={{ background:'rgba(249,115,22,0.2)', color:'#fb923c' }}
                    >{distractions.length}</motion.span>
                  )}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Keyboard hints */}
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-faint)' }}>
              <span><span className="kbd">Space</span> play/pause</span>
              <span><span className="kbd">F</span> fullscreen</span>
              <span><span className="kbd">R</span> reset</span>
            </div>

            {/* AI suggestion */}
            <AnimatePresence>
              {showSuggestion && stats.bestDurationRange && (
                <motion.div
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
                  className="w-full flex items-start gap-3 rounded-2xl border px-4 py-3"
                  style={{ background:'rgba(77,110,245,0.08)', borderColor:'rgba(77,110,245,0.2)' }}
                >
                  <Zap size={14} className="text-brand-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-brand-300 flex-1 leading-relaxed">
                    <strong>Insight:</strong> You focus best in {stats.bestDurationRange} sessions.
                    {stats.suggestedDuration !== mergedSettings.focusDuration && (
                      <button onClick={() => { setSettings(s=>({...s,focusDuration:stats.suggestedDuration})); setShowSuggestion(false) }}
                        className="ml-2 underline opacity-70 hover:opacity-100">
                        Apply {stats.suggestedDuration}min
                      </button>
                    )}
                  </div>
                  <button onClick={() => setShowSuggestion(false)} className="opacity-40 hover:opacity-80 text-xs text-brand-400">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile tab content */}
            <div className="lg:hidden w-full pb-20">
              <AnimatePresence mode="wait">
                {mobileTab === 'tasks' && (
                  <motion.div key="tasks" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="glass-card p-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Tasks</p>
                    <TaskPanel tasks={tasks} setTasks={setTasks} activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId} projects={projects} />
                  </motion.div>
                )}
                {mobileTab === 'analytics' && (
                  <motion.div key="analytics" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="glass-card p-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Analytics</p>
                    <AnalyticsDashboard sessions={sessions} projects={projects} onSeedData={handleSeedData} onClearData={clearData} />
                    <div className="mt-6">
                      <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Insights</p>
                      <InsightsPanel stats={stats} projects={projects} />
                    </div>
                  </motion.div>
                )}
                {mobileTab === 'stats' && (
                  <motion.div key="stats" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="glass-card p-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Stats & XP</p>
                    <GamificationPanel xp={xp} level={level} achievements={achievements} progress={xpProgress} newAchievement={newAchievement} />
                  </motion.div>
                )}
                {mobileTab === 'settings' && (
                  <motion.div key="settings" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="glass-card p-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Settings</p>
                    <SettingsPanel settings={mergedSettings} setSettings={setSettings} darkMode={darkMode} setDarkMode={setDarkMode}
                      sound={activeSound} onSoundChange={playSound} volume={volume} onVolumeChange={updateVolume} onClearData={clearData}
                      goals={mergedGoals} onGoalChange={(g)=>setGoals(p=>({...p,...g}))} projects={projects} onProjectsChange={setProjects} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* ══ RIGHT COLUMN — Stats (desktop only) ══ */}
        <aside
          className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden"
          style={{
            width: 'clamp(240px, 22vw, 400px)',
            borderLeft: '1px solid var(--border-col)',
          }}
        >

          {/* Tab switcher */}
          <div className="flex-shrink-0 p-3 pb-0">
            <div className="glass-card p-1.5 flex gap-1">
              {[
                { id:'analytics', label:'Charts',   icon:<BarChart2 size={13}/> },
                { id:'stats',     label:'Stats',    icon:<Trophy size={13}/> },
                { id:'settings',  label:'Settings', icon:<Settings size={13}/> },
              ].map(t => (
                <motion.button key={t.id}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setMobileTab(t.id)}
                  className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all',
                    mobileTab===t.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/30 hover:text-white/60'
                  )}
                >
                  {t.icon}
                  <span className="hidden xl:inline">{t.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Mini stat strip — always visible 1 row */}
          <div className="flex-shrink-0 px-3 py-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl text-xs"
              style={{ background:'var(--bg-strip)', border:'1px solid var(--border-strip)' }}>
              <span className="flex items-center gap-1.5 text-white/40">
                ⏱ <span className="font-mono text-white/60">{stats.todayFocusMinutes}m</span>
              </span>
              <span className="text-white/15">·</span>
              <span className="flex items-center gap-1.5 text-white/40">
                🎯 <span className="font-mono text-white/60">{stats.todaySessions}</span>
              </span>
              <span className="text-white/15">·</span>
              <span className="flex items-center gap-1.5 text-white/40">
                <span className="flame-anim text-xs">🔥</span>
                <span className="font-mono text-white/60">{stats.streak}d</span>
              </span>
              <span className="text-white/15">·</span>
              <span className="flex items-center gap-1.5"
                style={{ color:'#fcd34d66' }}>
                ⚔ <span className="font-mono" style={{ color:'#fcd34d99' }}>Lv{level}</span>
              </span>
            </div>
          </div>

          {/* Full tab content — owns all remaining height */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <AnimatePresence mode="wait">

              {/* Charts tab — Today 4-grid + Analytics + Insights */}
              {(mobileTab==='analytics' || mobileTab==='timer') && (
                <motion.div key="analytics-right"
                  initial={{opacity:0, x:10}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-10}}
                  transition={{ duration:0.2 }}
                  className="flex flex-col gap-4"
                >
                  {/* Today 4-grid */}
                  <div className="glass-card p-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Today</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label:'Focus',        value:`${stats.todayFocusMinutes}m`, icon:'⏱', color:'#4d6ef5' },
                        { label:'Sessions',     value:stats.todaySessions,           icon:'🎯', color:'#10b981' },
                        { label:'Streak',       value:`${stats.streak}d`,            icon:'🔥', color:'#f97316' },
                        { label:'Distractions', value:stats.todayDistractions,       icon:'⚡', color:'#8b5cf6' },
                      ].map(s => (
                        <motion.div key={s.label} whileHover={{ scale: 1.04, y:-1 }}
                          className="flex flex-col gap-1.5 p-3 rounded-2xl cursor-default"
                          style={{ background:'var(--bg-stat)', border:`1px solid ${s.color}20` }}>
                          <span>{s.icon}</span>
                          <span className="text-xl font-bold stat-number" style={{ color: s.color }}>{s.value}</span>
                          <span className="text-[10px] text-white/30">{s.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="glass-card p-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Analytics</p>
                    <AnalyticsDashboard sessions={sessions} projects={projects} onSeedData={handleSeedData} onClearData={clearData} compact />
                  </div>

                  {/* Insights */}
                  <div className="glass-card p-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Insights</p>
                    <InsightsPanel stats={stats} projects={projects} />
                  </div>
                </motion.div>
              )}

              {/* Stats tab — XP bar + Achievements taking the full column */}
              {mobileTab === 'stats' && (
                <motion.div key="stats-right"
                  initial={{opacity:0, x:10}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-10}}
                  transition={{ duration:0.2 }}
                  className="flex flex-col gap-4"
                >
                  {/* XP card */}
                  <div className="glass-card p-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Level & XP</p>
                    <div className="flex items-center gap-3 mb-3">
                      <motion.div whileHover={{ rotate: [-5,5,0], scale:1.1 }} transition={{ duration:0.4 }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white flex-shrink-0"
                        style={{ background:'linear-gradient(135deg,#f59e0b,#ea580c)', boxShadow:'0 4px 16px rgba(245,158,11,0.4)' }}>
                        {level}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-white/50">Level {level}</span>
                          <span className="font-mono text-white/35">{xp.toLocaleString()} XP</span>
                        </div>
                        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full relative overflow-hidden"
                            style={{ background:'linear-gradient(90deg,#f59e0b,#f97316)' }}
                            initial={{ width:0 }}
                            animate={{ width:`${Math.round(xpProgress.progress*100)}%` }}
                            transition={{ duration:1, ease:[0.34,1.56,0.64,1], delay:0.1 }}
                          >
                            <div className="absolute inset-0 xp-bar-shimmer" />
                          </motion.div>
                        </div>
                        <p className="text-[10px] text-white/20 mt-1">
                          {xpProgress.xpNeeded - xpProgress.xpInLevel} XP to Level {level+1}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Achievements full grid */}
                  <div className="glass-card p-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">
                      Achievements ({achievements.filter(a=>a.unlocked).length}/{achievements.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {achievements.map((a, i) => (
                        <motion.div key={a.id}
                          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                          transition={{ delay: i * 0.04 }}
                          whileHover={a.unlocked ? { scale:1.04, y:-2 } : {}}
                          className="flex flex-col gap-1.5 p-3 rounded-2xl border transition-all"
                          style={a.unlocked
                            ? { background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)', boxShadow:'0 2px 12px rgba(0,0,0,0.3)' }
                            : { background:'rgba(255,255,255,0.02)', borderColor:'rgba(255,255,255,0.05)', opacity:0.45 }
                          }
                        >
                          <span className={!a.unlocked ? 'grayscale opacity-50' : ''}>{a.unlocked ? a.icon : '🔒'}</span>
                          <p className="text-[11px] font-medium" style={{ color: a.unlocked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>{a.title}</p>
                          <p className="text-[9px] text-white/25 leading-tight">{a.desc}</p>
                          {a.unlocked && <span className="text-[9px] text-emerald-400/70">✓ Unlocked</span>}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Project breakdown */}
                  {Object.keys(stats.projectBreakdown||{}).length > 0 && (
                    <div className="glass-card p-4">
                      <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Time by Project</p>
                      <div className="flex flex-col gap-3">
                        {Object.entries(stats.projectBreakdown)
                          .sort((a,b)=>b[1]-a[1])
                          .map(([pid,mins]) => {
                            const p = projects.find(pr=>pr.id===pid)||{ name:pid, color:'#4d6ef5', icon:'⚡' }
                            const total = Object.values(stats.projectBreakdown).reduce((a,b)=>a+b,0)
                            const pct = total > 0 ? mins/total : 0
                            return (
                              <div key={pid}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="flex items-center gap-1.5 text-white/50">
                                    <span style={{color:p.color}}>{p.icon}</span>{p.name}
                                  </span>
                                  <span className="font-mono text-white/35">{Math.round(mins)}m</span>
                                </div>
                                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                  <motion.div className="h-full rounded-full"
                                    style={{ background:p.color }}
                                    initial={{ width:0 }}
                                    animate={{ width:`${Math.round(pct*100)}%` }}
                                    transition={{ duration:0.8, ease:'easeOut' }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Settings tab — full height settings panel */}
              {mobileTab === 'settings' && (
                <motion.div key="settings-right"
                  initial={{opacity:0, x:10}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-10}}
                  transition={{ duration:0.2 }}
                  className="glass-card p-4"
                >
                  <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-4">Settings</p>
                  <SettingsPanel settings={mergedSettings} setSettings={setSettings} darkMode={darkMode} setDarkMode={setDarkMode}
                    sound={activeSound} onSoundChange={playSound} volume={volume} onVolumeChange={updateVolume} onClearData={clearData}
                    goals={mergedGoals} onGoalChange={(g)=>setGoals(p=>({...p,...g}))} projects={projects} onProjectsChange={setProjects} />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </aside>

      </div>

      {/* ── Mobile bottom nav ────────────────────────────── */}
      <nav className="bottom-nav lg:hidden flex">
        {[
          { id:'timer',     label:'Timer',    icon:<Play size={18}/> },
          { id:'tasks',     label:'Tasks',    icon:<ListTodo size={18}/> },
          { id:'analytics', label:'Charts',   icon:<BarChart2 size={18}/> },
          { id:'stats',     label:'Stats',    icon:<Trophy size={18}/> },
          { id:'settings',  label:'Settings', icon:<Settings size={18}/> },
        ].map(t => (
          <motion.button key={t.id} whileTap={{ scale: 0.9 }}
            onClick={() => setMobileTab(t.id)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
            style={{ color: mobileTab===t.id ? accent : 'rgba(255,255,255,0.3)' }}
          >
            {t.icon}
            <span className="text-[10px] font-medium">{t.label}</span>
            {mobileTab === t.id && (
              <motion.div layoutId="mobile-nav-dot" className="w-1 h-1 rounded-full"
                style={{ background: accent }} />
            )}
          </motion.button>
        ))}
      </nav>
    </div>
  )
}
