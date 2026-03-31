/**
 * useGamification — XP, levels, achievements, and achievement notifications
 *
 * Reads sessions + streak from the analytics layer to compute achievements.
 * All state persisted in localStorage under 'df_gamification'.
 */
import { useState, useCallback, useEffect } from 'react'
import {
  KEYS, storageGet, storageSet,
  DEFAULT_GAMIFICATION, ACHIEVEMENT_DEFS,
  XP_PER_MINUTE_FULL, XP_PER_MINUTE_PARTIAL,
  xpToLevel, xpProgress,
} from '../data/storage'

export { xpProgress }

export function useGamification(sessions) {
  const [gamification, setGamification] = useState(() => {
    return storageGet(KEYS.GAMIFICATION) || { ...DEFAULT_GAMIFICATION }
  })
  const [newAchievement, setNewAchievement] = useState(null)  // for toast

  // Persist whenever gamification changes
  useEffect(() => {
    storageSet(KEYS.GAMIFICATION, gamification)
  }, [gamification])

  // ── Add XP for a completed session ───────────────────────────
  const addXP = useCallback((durationSeconds, partial = false) => {
    const minutes  = durationSeconds / 60
    const rate     = partial ? XP_PER_MINUTE_PARTIAL : XP_PER_MINUTE_FULL
    const earned   = Math.round(minutes * rate)
    if (earned <= 0) return earned

    setGamification(prev => {
      const newXP    = prev.xp + earned
      const newLevel = xpToLevel(newXP)
      return { ...prev, xp: newXP, level: newLevel }
    })
    return earned
  }, [])

  // ── Check and unlock achievements ─────────────────────────────
  const checkAchievements = useCallback((allSessions) => {
    setGamification(prev => {
      const unlocked  = new Set(prev.achievements)
      const newUnlocks = []

      for (const def of ACHIEVEMENT_DEFS) {
        if (unlocked.has(def.id)) continue
        if (def.check(allSessions)) {
          unlocked.add(def.id)
          newUnlocks.push(def)
        }
      }

      if (newUnlocks.length === 0) return prev

      // Show toast for the first new achievement
      setNewAchievement(newUnlocks[0])
      setTimeout(() => setNewAchievement(null), 4000)

      return { ...prev, achievements: [...unlocked] }
    })
  }, [])

  // ── Reset (for clear-data) ────────────────────────────────────
  const resetGamification = useCallback(() => {
    const fresh = { ...DEFAULT_GAMIFICATION }
    setGamification(fresh)
    storageSet(KEYS.GAMIFICATION, fresh)
  }, [])

  // Derived
  const progress = xpProgress(gamification.xp)
  const unlockedSet = new Set(gamification.achievements)
  const allAchievements = ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    unlocked: unlockedSet.has(def.id),
  }))

  return {
    xp:               gamification.xp,
    level:            gamification.level,
    achievements:     allAchievements,
    unlockedCount:    gamification.achievements.length,
    totalCount:       ACHIEVEMENT_DEFS.length,
    progress,         // { level, current, next, progress 0-1, xpInLevel, xpNeeded }
    newAchievement,   // non-null for ~4s after unlocking
    addXP,
    checkAchievements,
    resetGamification,
  }
}
