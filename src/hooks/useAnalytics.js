/**
 * useAnalytics — Compute focus insights from session history
 * v2: adds session trend vs prior week, project breakdown, avg session minutes
 */
import { useMemo } from 'react'

const MS_PER_DAY = 86400000

function todayKey() { return new Date().toISOString().slice(0, 10) }
function dayKey(date) { return new Date(date).toISOString().slice(0, 10) }
function addDays(isoDate, n) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / MS_PER_DAY)
}

export function useAnalytics(sessions = [], projects = []) {
  return useMemo(() => {
    if (!sessions.length) return emptyAnalytics()

    // ── Build daily map ───────────────────────────────────────
    const dailyMap = {}
    for (const s of sessions) {
      const key = dayKey(s.completedAt)
      if (!dailyMap[key]) dailyMap[key] = { focusMinutes: 0, sessions: 0, distractions: 0 }
      dailyMap[key].focusMinutes  += Math.round(s.duration / 60)
      dailyMap[key].sessions      += 1
      dailyMap[key].distractions  += s.distractions || 0
    }

    const today      = todayKey()
    const sortedKeys = Object.keys(dailyMap).sort()
    const firstDay   = sortedKeys[0]

    // ── Full day array: first session → today ────────────────
    const totalDays = diffDays(firstDay, today) + 1
    const allDays   = []
    for (let i = 0; i < totalDays; i++) {
      const k = addDays(firstDay, i)
      const d = new Date(k)
      allDays.push({
        date:         k,
        day:          d.toLocaleDateString('en', { weekday: 'short' }),
        month:        d.toLocaleDateString('en', { month: 'short' }),
        monthNum:     d.getMonth(),
        year:         d.getFullYear(),
        weekDay:      d.getDay(),
        focusMinutes: dailyMap[k]?.focusMinutes  || 0,
        sessions:     dailyMap[k]?.sessions      || 0,
        distractions: dailyMap[k]?.distractions  || 0,
      })
    }

    // ── Last 7 days ───────────────────────────────────────────
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

    // ── Session trend: last 7 days vs prior 7 days ────────────
    const last7Sessions  = weekly.reduce((a, d) => a + d.sessions, 0)
    const prior7Sessions = (() => {
      let total = 0
      for (let i = 13; i >= 7; i--) {
        const k = addDays(today, -i)
        total += dailyMap[k]?.sessions || 0
      }
      return total
    })()
    const sessionTrend = prior7Sessions === 0
      ? null
      : Math.round(((last7Sessions - prior7Sessions) / prior7Sessions) * 100)

    // ── Today ─────────────────────────────────────────────────
    const todayData = dailyMap[today] || { focusMinutes: 0, sessions: 0, distractions: 0 }

    // ── All-time totals ───────────────────────────────────────
    const totalFocusMinutes = sessions.reduce((a, s) => a + Math.round(s.duration / 60), 0)
    const totalSessions     = sessions.length
    const totalDistractions = sessions.reduce((a, s) => a + (s.distractions || 0), 0)
    const distractionRatio  = totalSessions > 0
      ? Math.round((totalDistractions / totalSessions) * 10) / 10 : 0

    // ── Rolling 10-session average duration ───────────────────
    const recent10 = sessions.slice(-10)
    const avgSessionMinutes = recent10.length > 0
      ? recent10.reduce((a, s) => a + s.duration / 60, 0) / recent10.length
      : null

    // ── Project breakdown ─────────────────────────────────────
    const projectBreakdown = {} // { projectId: totalMinutes }
    for (const s of sessions) {
      if (!s.partial) {
        const pid = s.projectId || 'general'
        projectBreakdown[pid] = (projectBreakdown[pid] || 0) + Math.round(s.duration / 60)
      }
    }

    // ── Streak ────────────────────────────────────────────────
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

    // ── Best focus duration range ─────────────────────────────
    const cleanSessions = sessions.filter(s => !s.partial && (s.distractions || 0) <= 1)
    let bestDurationRange = null
    if (cleanSessions.length >= 3) {
      const avg = cleanSessions.reduce((a, s) => a + Math.round(s.duration / 60), 0) / cleanSessions.length
      bestDurationRange = `${Math.max(10, Math.round(avg) - 10)}–${Math.round(avg) + 10} min`
    }

    const recentSessions = sessions.slice(-5)
    const avgDistractions = recentSessions.length
      ? recentSessions.reduce((a, s) => a + (s.distractions || 0), 0) / recentSessions.length : 0
    const lowFocusAlert = avgDistractions > 3

    let suggestedDuration = 25
    if (cleanSessions.length >= 2) {
      const avgMin = cleanSessions.reduce((a, s) => a + Math.round(s.duration / 60), 0) / cleanSessions.length
      suggestedDuration = avgMin < 30 ? 25 : avgMin < 60 ? 50 : 90
    }

    // ── Peak hour ─────────────────────────────────────────────
    const hourBuckets = Array(24).fill(0)
    for (const s of cleanSessions) hourBuckets[new Date(s.completedAt).getHours()]++
    const bestHour = hourBuckets.indexOf(Math.max(...hourBuckets))
    const bestTimeLabel = bestHour >= 0 && Math.max(...hourBuckets) > 0
      ? formatHour(bestHour) : null

    // ── Best day of week ──────────────────────────────────────
    const dowBuckets = Array(7).fill(0)
    for (const d of allDays) if (d.focusMinutes > 0) dowBuckets[d.weekDay] += d.focusMinutes
    const bestDow = dowBuckets.indexOf(Math.max(...dowBuckets))
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const bestDayLabel = Math.max(...dowBuckets) > 0 ? DOW[bestDow] : null

    // ── Personal bests ────────────────────────────────────────
    const bestDayMinutes  = Math.max(...allDays.map(d => d.focusMinutes), 0)
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
      // v2 additions:
      sessionTrend,       // % vs prior 7 days (null if no prior data)
      avgSessionMinutes,  // rolling 10 session mean
      projectBreakdown,   // { projectId: minutes }
    }
  }, [sessions, projects])
}

function emptyAnalytics() {
  const weekly = []
  const today  = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * MS_PER_DAY)
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
    sessionTrend: null, avgSessionMinutes: null, projectBreakdown: {},
  }
}

function formatHour(h) {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}
