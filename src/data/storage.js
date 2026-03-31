/**
 * src/data/storage.js — Unified storage layer
 *
 * Currently uses localStorage. All read/write goes through this module
 * so swapping to Firebase/Supabase requires only changing the functions below.
 *
 * ─────────────────────────────────────────────────────────────────
 * FIREBASE MIGRATION GUIDE (when ready):
 *
 * 1. Install:  npm install firebase
 * 2. Create src/data/firebase.js:
 *      import { initializeApp } from 'firebase/app'
 *      import { getFirestore }  from 'firebase/firestore'
 *      const app = initializeApp({ ...your config })
 *      export const db = getFirestore(app)
 *
 * 3. Replace each function below with Firestore equivalents:
 *      getItem(key)       → getDoc(doc(db, 'users', uid, 'data', key))
 *      setItem(key, val)  → setDoc(doc(db, 'users', uid, 'data', key), val)
 *      removeItem(key)    → deleteDoc(...)
 *
 * 4. The hook  useStorage()  in hooks/useStorage.js already wraps these
 *    functions — update that hook to be async and use Firestore getDoc/setDoc.
 *
 * For offline-first behaviour, use Firestore's enableIndexedDbPersistence()
 * so the app works without a network connection and syncs when back online.
 * ─────────────────────────────────────────────────────────────────
 */

// ── Key registry — all localStorage keys in one place ────────────
export const KEYS = {
  SESSIONS:     'df_sessions',
  TASKS:        'df_tasks',
  SETTINGS:     'df_settings',
  DARK_MODE:    'df_dark',
  ACTIVE_TASK:  'df_active_task',
  TIMER_STATE:  'df_timer_state',   // persistent timer (reload-safe)
  PROJECTS:     'df_projects',      // user-created project categories
  GOALS:        'df_goals',         // daily/weekly focus goals
  GAMIFICATION: 'df_gamification',  // XP, level, achievements
  ACTIVE_PROJECT: 'df_active_project',
}

// ── Low-level helpers ─────────────────────────────────────────────
// Replace these 3 functions to swap storage backends.

export function storageGet(key) {
  // FIREBASE: return (await getDoc(doc(db, 'users', uid, 'data', key))).data()?.value
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function storageSet(key, value) {
  // FIREBASE: await setDoc(doc(db, 'users', uid, 'data', key), { value })
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* storage quota exceeded */ }
}

export function storageRemove(key) {
  // FIREBASE: await deleteDoc(doc(db, 'users', uid, 'data', key))
  try {
    localStorage.removeItem(key)
  } catch { /**/ }
}

// ── Timer persistence ─────────────────────────────────────────────
/**
 * Call when timer STARTS.
 * Stores enough info to reconstruct remaining time after a page reload.
 */
export function saveTimerRunning(phase, durationSeconds) {
  storageSet(KEYS.TIMER_STATE, {
    running:           true,
    phase,
    durationSeconds,
    startedAt:         Date.now(),
    pausedAt:          null,
    remainingAtPause:  null,
  })
}

/**
 * Call when timer PAUSES.
 */
export function saveTimerPaused(phase, remainingSeconds) {
  const prev = storageGet(KEYS.TIMER_STATE) || {}
  storageSet(KEYS.TIMER_STATE, {
    ...prev,
    running:          false,
    phase,
    pausedAt:         Date.now(),
    remainingAtPause: remainingSeconds,
  })
}

/**
 * Call on reset / phase complete — wipes the persisted state.
 */
export function clearTimerState() {
  storageRemove(KEYS.TIMER_STATE)
}

/**
 * Called on app mount to check if a session was interrupted.
 * Returns: { phase, remaining, shouldResume } or null.
 */
export function loadTimerState() {
  const state = storageGet(KEYS.TIMER_STATE)
  if (!state) return null

  if (state.running && state.startedAt) {
    const elapsedSec = Math.round((Date.now() - state.startedAt) / 1000)
    const remaining  = Math.max(0, state.durationSeconds - elapsedSec)
    return {
      phase:        state.phase,
      remaining,
      shouldResume: remaining > 5,  // only resume if >5s left (avoids ghost sessions)
    }
  }

  if (!state.running && state.remainingAtPause != null) {
    return {
      phase:        state.phase,
      remaining:    state.remainingAtPause,
      shouldResume: false,
    }
  }

  return null
}

// ── Default data ──────────────────────────────────────────────────
export const DEFAULT_PROJECTS = [
  { id: 'general', name: 'General',  color: '#4d6ef5', icon: '⚡' },
  { id: 'study',   name: 'Study',    color: '#10b981', icon: '📚' },
  { id: 'coding',  name: 'Coding',   color: '#8b5cf6', icon: '💻' },
  { id: 'health',  name: 'Health',   color: '#f97316', icon: '🏋️' },
]

export const DEFAULT_GOALS = {
  dailyGoalMinutes:  240,   // 4 hours
}

export const DEFAULT_GAMIFICATION = {
  xp:           0,
  level:        1,
  achievements: [],
}

// ── XP / Level constants ──────────────────────────────────────────
// XP per minute of focus (full session vs partial)
export const XP_PER_MINUTE_FULL    = 1.0
export const XP_PER_MINUTE_PARTIAL = 0.5

// XP thresholds per level (index = level - 1)
export const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 800, 1200, 1800, 2600, 3600, 5000]

/** Returns level (1-based) for a given XP total */
export function xpToLevel(xp) {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  return Math.min(level, LEVEL_THRESHOLDS.length)
}

/** Returns { current, next, progress 0-1 } for XP bar rendering */
export function xpProgress(xp) {
  const level   = xpToLevel(xp)
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0
  const next    = LEVEL_THRESHOLDS[level]      ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  return {
    level,
    current,
    next,
    progress: next > current ? (xp - current) / (next - current) : 1,
    xpInLevel: xp - current,
    xpNeeded:  next - current,
  }
}

// ── Achievement definitions ───────────────────────────────────────
export const ACHIEVEMENT_DEFS = [
  {
    id:    'first_session',
    title: 'First Step',
    desc:  'Complete your first focus session',
    icon:  '🎯',
    check: (sessions) => sessions.filter(s => !s.partial).length >= 1,
  },
  {
    id:    'focus_hour',
    title: 'One-Hour Club',
    desc:  'Focus for 60 min in a single day',
    icon:  '⏰',
    check: (sessions) => hasDayWithMinutes(sessions, 60),
  },
  {
    id:    'five_hour_day',
    title: 'In The Zone',
    desc:  'Focus for 5 hours in a single day',
    icon:  '🔥',
    check: (sessions) => hasDayWithMinutes(sessions, 300),
  },
  {
    id:    'week_streak_3',
    title: '3-Day Streak',
    desc:  'Focus 3 days in a row',
    icon:  '⚡',
    check: (sessions) => getStreak(sessions) >= 3,
  },
  {
    id:    'week_streak_7',
    title: 'Week Warrior',
    desc:  'Focus 7 consecutive days',
    icon:  '🏆',
    check: (sessions) => getStreak(sessions) >= 7,
  },
  {
    id:    'no_distraction',
    title: 'Pure Focus',
    desc:  'Complete a session with zero distractions',
    icon:  '🧘',
    check: (sessions) => sessions.some(s => !s.partial && (s.distractions || 0) === 0),
  },
  {
    id:    'century',
    title: 'Century',
    desc:  'Complete 100 focus sessions',
    icon:  '💯',
    check: (sessions) => sessions.filter(s => !s.partial).length >= 100,
  },
  {
    id:    'flow_state',
    title: 'Flow State',
    desc:  'Complete 5 sessions in one day',
    icon:  '🌊',
    check: (sessions) => hasDayWithSessions(sessions, 5),
  },
]

// ── Helpers used by achievement checks ───────────────────────────
function dayKey(ts) {
  return new Date(ts).toISOString().slice(0, 10)
}

function hasDayWithMinutes(sessions, minMinutes) {
  const byDay = {}
  for (const s of sessions) {
    if (s.partial) continue
    const k = dayKey(s.completedAt)
    byDay[k] = (byDay[k] || 0) + Math.round(s.duration / 60)
  }
  return Object.values(byDay).some(m => m >= minMinutes)
}

function hasDayWithSessions(sessions, minCount) {
  const byDay = {}
  for (const s of sessions) {
    if (s.partial) continue
    const k = dayKey(s.completedAt)
    byDay[k] = (byDay[k] || 0) + 1
  }
  return Object.values(byDay).some(c => c >= minCount)
}

function getStreak(sessions) {
  const days = [...new Set(sessions.map(s => dayKey(s.completedAt)))].sort()
  let streak = 0
  const today = dayKey(Date.now())
  let check = today
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i] === check) {
      streak++
      const d = new Date(check)
      d.setDate(d.getDate() - 1)
      check = d.toISOString().slice(0, 10)
    } else if (days[i] < check) break
  }
  return streak
}
