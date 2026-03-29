/**
 * useAnalytics — Compute focus insights from session history
 * Rule-based "AI-like" suggestions, streak tracking, weekly trends.
 */
import { useMemo } from 'react'

const MS_PER_DAY = 86400000

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10)
}

export function useAnalytics(sessions = []) {
  return useMemo(() => {
    if (!sessions.length) return emptyAnalytics()

    // ── Daily totals ────────────────────────────────────
    const dailyMap = {}
    for (const s of sessions) {
      const key = dayKey(s.completedAt)
      if (!dailyMap[key]) dailyMap[key] = { focusMinutes: 0, sessions: 0, distractions: 0 }
      dailyMap[key].focusMinutes  += Math.round(s.duration / 60)
      dailyMap[key].sessions      += 1
      dailyMap[key].distractions  += s.distractions || 0
    }

    // ── Weekly data (last 7 days) ────────────────────────
    const weekly = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * MS_PER_DAY)
      const k = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('en', { weekday: 'short' })
      weekly.push({
        day: label,
        date: k,
        focusMinutes: dailyMap[k]?.focusMinutes || 0,
        sessions: dailyMap[k]?.sessions || 0,
        distractions: dailyMap[k]?.distractions || 0,
      })
    }

    // ── Today stats ──────────────────────────────────────
    const todayData = dailyMap[todayKey()] || { focusMinutes: 0, sessions: 0, distractions: 0 }

    // ── All-time totals ──────────────────────────────────
    const totalFocusMinutes = sessions.reduce((a, s) => a + Math.round(s.duration / 60), 0)
    const totalSessions     = sessions.length
    const totalDistractions = sessions.reduce((a, s) => a + (s.distractions || 0), 0)

    // ── Distraction ratio ────────────────────────────────
    const distractionRatio = totalSessions > 0
      ? Math.round((totalDistractions / totalSessions) * 10) / 10
      : 0

    // ── Streak calculation ───────────────────────────────
    const sortedDays = Object.keys(dailyMap).sort().reverse()
    let streak = 0
    const today = todayKey()
    let checkDate = today
    for (const key of sortedDays) {
      if (key === checkDate) {
        streak++
        const d = new Date(checkDate)
        d.setDate(d.getDate() - 1)
        checkDate = d.toISOString().slice(0, 10)
      } else if (key < checkDate) {
        break
      }
    }

    // ── Best focus duration insight ──────────────────────
    // Low-distraction sessions → find modal duration bucket
    const cleanSessions = sessions.filter(s => (s.distractions || 0) <= 1 && (s.pauses || 0) <= 1)
    let bestDurationRange = null
    if (cleanSessions.length >= 3) {
      const durations = cleanSessions.map(s => Math.round(s.duration / 60))
      const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      const min = Math.max(10, avg - 10)
      const max = avg + 10
      bestDurationRange = `${min}–${max} min`
    }

    // ── Low-focus session detection ──────────────────────
    const recentSessions = sessions.slice(-5)
    const avgDistractions = recentSessions.length
      ? recentSessions.reduce((a, s) => a + (s.distractions || 0), 0) / recentSessions.length
      : 0
    const avgPauses = recentSessions.length
      ? recentSessions.reduce((a, s) => a + (s.pauses || 0), 0) / recentSessions.length
      : 0
    const lowFocusAlert = avgDistractions > 3 || avgPauses > 2

    // ── Suggested duration ───────────────────────────────
    let suggestedDuration = 25
    if (cleanSessions.length >= 2) {
      const avgMin = cleanSessions.reduce((a, s) => a + Math.round(s.duration / 60), 0) / cleanSessions.length
      if (avgMin < 30) suggestedDuration = 25
      else if (avgMin < 60) suggestedDuration = 50
      else suggestedDuration = 90
    }

    // ── Best time of day ────────────────────────────────
    const hourBuckets = Array(24).fill(0)
    for (const s of cleanSessions) {
      const h = new Date(s.completedAt).getHours()
      hourBuckets[h]++
    }
    const bestHour = hourBuckets.indexOf(Math.max(...hourBuckets))
    const bestTimeLabel = bestHour >= 0 && Math.max(...hourBuckets) > 0
      ? formatHour(bestHour)
      : null

    return {
      weekly,
      todayFocusMinutes: todayData.focusMinutes,
      todaySessions: todayData.sessions,
      todayDistractions: todayData.distractions,
      totalFocusMinutes,
      totalSessions,
      totalDistractions,
      distractionRatio,
      streak,
      bestDurationRange,
      lowFocusAlert,
      suggestedDuration,
      bestTimeLabel,
      dailyMap,
    }
  }, [sessions])
}

function emptyAnalytics() {
  const weekly = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    weekly.push({
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      date: d.toISOString().slice(0, 10),
      focusMinutes: 0, sessions: 0, distractions: 0,
    })
  }
  return {
    weekly, todayFocusMinutes: 0, todaySessions: 0, todayDistractions: 0,
    totalFocusMinutes: 0, totalSessions: 0, totalDistractions: 0,
    distractionRatio: 0, streak: 0, bestDurationRange: null,
    lowFocusAlert: false, suggestedDuration: 25, bestTimeLabel: null, dailyMap: {},
  }
}

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}
