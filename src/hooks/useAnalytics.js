/**
 * useAnalytics — Compute focus insights from session history
 * Covers ALL days from the very first session to today.
 */
import { useMemo } from 'react'

const MS_PER_DAY = 86400000

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function addDays(isoDate, n) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function diffDays(a, b) {
  // Days from isoDate a to isoDate b (b - a)
  return Math.round((new Date(b) - new Date(a)) / MS_PER_DAY)
}

export function useAnalytics(sessions = []) {
  return useMemo(() => {
    if (!sessions.length) return emptyAnalytics()

    // ── Build daily map for all sessions ─────────────────
    const dailyMap = {}
    for (const s of sessions) {
      const key = dayKey(s.completedAt)
      if (!dailyMap[key]) dailyMap[key] = { focusMinutes: 0, sessions: 0, distractions: 0, partial: 0 }
      dailyMap[key].focusMinutes  += Math.round(s.duration / 60)
      dailyMap[key].sessions      += 1
      dailyMap[key].distractions  += s.distractions || 0
      if (s.partial) dailyMap[key].partial += 1
    }

    const today        = todayKey()
    const sortedKeys   = Object.keys(dailyMap).sort()
    const firstDay     = sortedKeys[0]  // earliest day with data

    // ── Build FULL day array from first session → today ──
    const totalDays  = diffDays(firstDay, today) + 1
    const allDays    = []
    for (let i = 0; i < totalDays; i++) {
      const k   = addDays(firstDay, i)
      const d   = new Date(k)
      allDays.push({
        date:         k,
        day:          d.toLocaleDateString('en', { weekday: 'short' }),
        month:        d.toLocaleDateString('en', { month: 'short' }),
        monthNum:     d.getMonth(),
        year:         d.getFullYear(),
        weekDay:      d.getDay(),       // 0=Sun … 6=Sat
        focusMinutes: dailyMap[k]?.focusMinutes  || 0,
        sessions:     dailyMap[k]?.sessions      || 0,
        distractions: dailyMap[k]?.distractions  || 0,
      })
    }

    // ── Last 7 days (for weekly chart) ───────────────────
    const weekly = []
    for (let i = 6; i >= 0; i--) {
      const k = addDays(today, -i)
      const d = new Date(k)
      weekly.push({
        day:          d.toLocaleDateString('en', { weekday: 'short' }),
        date:         k,
        focusMinutes: dailyMap[k]?.focusMinutes  || 0,
        sessions:     dailyMap[k]?.sessions      || 0,
        distractions: dailyMap[k]?.distractions  || 0,
      })
    }

    // ── Today stats ───────────────────────────────────────
    const todayData = dailyMap[today] || { focusMinutes: 0, sessions: 0, distractions: 0 }

    // ── All-time totals ───────────────────────────────────
    const totalFocusMinutes = sessions.reduce((a, s) => a + Math.round(s.duration / 60), 0)
    const totalSessions     = sessions.length
    const totalDistractions = sessions.reduce((a, s) => a + (s.distractions || 0), 0)
    const distractionRatio  = totalSessions > 0
      ? Math.round((totalDistractions / totalSessions) * 10) / 10 : 0

    // ── Streak ────────────────────────────────────────────
    let streak = 0
    let checkDate = today
    for (let i = sortedKeys.length - 1; i >= 0; i--) {
      if (sortedKeys[i] === checkDate) {
        streak++
        checkDate = addDays(checkDate, -1)
      } else if (sortedKeys[i] < checkDate) {
        break
      }
    }

    // ── Rule-based insights ───────────────────────────────
    const cleanSessions = sessions.filter(s => !s.partial && (s.distractions || 0) <= 1)
    let bestDurationRange = null
    if (cleanSessions.length >= 3) {
      const durs = cleanSessions.map(s => Math.round(s.duration / 60))
      const avg  = Math.round(durs.reduce((a, b) => a + b, 0) / durs.length)
      bestDurationRange = `${Math.max(10, avg - 10)}–${avg + 10} min`
    }

    const recentSessions  = sessions.slice(-5)
    const avgDistractions = recentSessions.length
      ? recentSessions.reduce((a, s) => a + (s.distractions || 0), 0) / recentSessions.length : 0
    const avgPauses = recentSessions.length
      ? recentSessions.reduce((a, s) => a + (s.pauses || 0), 0) / recentSessions.length : 0
    const lowFocusAlert = avgDistractions > 3 || avgPauses > 2

    let suggestedDuration = 25
    if (cleanSessions.length >= 2) {
      const avgMin = cleanSessions.reduce((a, s) => a + Math.round(s.duration / 60), 0) / cleanSessions.length
      suggestedDuration = avgMin < 30 ? 25 : avgMin < 60 ? 50 : 90
    }

    const hourBuckets = Array(24).fill(0)
    for (const s of cleanSessions) hourBuckets[new Date(s.completedAt).getHours()]++
    const bestHour = hourBuckets.indexOf(Math.max(...hourBuckets))
    const bestTimeLabel = bestHour >= 0 && Math.max(...hourBuckets) > 0
      ? formatHour(bestHour) : null

    // ── Best day of week ──────────────────────────────────
    const dowBuckets = Array(7).fill(0)
    for (const d of allDays) if (d.focusMinutes > 0) dowBuckets[d.weekDay] += d.focusMinutes
    const bestDow = dowBuckets.indexOf(Math.max(...dowBuckets))
    const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const bestDayLabel = Math.max(...dowBuckets) > 0 ? DOW_NAMES[bestDow] : null

    // ── Personal bests ────────────────────────────────────
    const bestDayMinutes = Math.max(...allDays.map(d => d.focusMinutes), 0)
    const bestDaySessions = Math.max(...allDays.map(d => d.sessions), 0)

    return {
      allDays,
      weekly,
      firstDay,
      todayFocusMinutes:  todayData.focusMinutes,
      todaySessions:      todayData.sessions,
      todayDistractions:  todayData.distractions,
      totalFocusMinutes,
      totalSessions,
      totalDistractions,
      distractionRatio,
      streak,
      bestDurationRange,
      lowFocusAlert,
      suggestedDuration,
      bestTimeLabel,
      bestDayLabel,
      bestDayMinutes,
      bestDaySessions,
      dailyMap,
    }
  }, [sessions])
}

function emptyAnalytics() {
  const weekly = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    weekly.push({
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      date: d.toISOString().slice(0, 10),
      focusMinutes: 0, sessions: 0, distractions: 0,
    })
  }
  return {
    allDays: [], weekly, firstDay: null,
    todayFocusMinutes: 0, todaySessions: 0, todayDistractions: 0,
    totalFocusMinutes: 0, totalSessions: 0, totalDistractions: 0,
    distractionRatio: 0, streak: 0, bestDurationRange: null,
    lowFocusAlert: false, suggestedDuration: 25, bestTimeLabel: null,
    bestDayLabel: null, bestDayMinutes: 0, bestDaySessions: 0, dailyMap: {},
  }
}

function formatHour(h) {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}
