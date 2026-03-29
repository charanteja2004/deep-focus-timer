/**
 * seedData.js — Generate realistic demo focus sessions
 * Creates 30 days of plausible Pomodoro history with natural patterns:
 *  - Weekdays more active than weekends
 *  - Morning/evening peaks
 *  - Occasional low-focus days
 *  - Mix of 25 / 50 min sessions
 */

export function generateSeedSessions(daysBack = 30) {
  const sessions = []
  const now      = Date.now()
  const MS_DAY   = 86400000

  for (let d = daysBack; d >= 0; d--) {
    const dayStart  = new Date(now - d * MS_DAY)
    dayStart.setHours(0, 0, 0, 0)
    const dow       = dayStart.getDay() // 0=Sun,6=Sat
    const isWeekend = dow === 0 || dow === 6

    // How many sessions today? 0-6 on weekdays, 0-3 on weekends
    const maxSess   = isWeekend ? 3 : 6
    const minSess   = isWeekend ? 0 : 1
    const numSess   = randInt(minSess, maxSess)
    if (numSess === 0) continue

    // Sessions cluster around morning (8-10 AM) and evening (7-9 PM)
    const slots     = pickTimeSlots(numSess, dayStart.getTime())

    for (const slotMs of slots) {
      const durationMin = pickDuration()
      const distr       = randInt(0, durationMin > 40 ? 3 : 2)
      const paus        = randInt(0, 2)
      const partial     = Math.random() < 0.15  // 15% chance partial

      sessions.push({
        phase:          'focus',
        duration:       (partial ? randInt(5, durationMin - 1) : durationMin) * 60,
        distractions:   distr,
        pauses:         paus,
        completedAt:    slotMs + (durationMin * 60 * 1000),
        sessionNumber:  sessions.length + 1,
        elapsedSeconds: durationMin * 60,
        partial,
      })
    }
  }

  return sessions
}

function pickDuration() {
  const r = Math.random()
  if (r < 0.55) return randInt(22, 28)   // ~25 min
  if (r < 0.80) return randInt(45, 55)   // ~50 min
  return randInt(85, 95)                  // ~90 min
}

function pickTimeSlots(count, dayStartMs) {
  // Two clusters: morning 7-11 AM, afternoon/evening 2-10 PM
  const clusters = [
    { start: 7 * 3600, end: 11 * 3600 },
    { start: 14 * 3600, end: 22 * 3600 },
  ]
  const slots = []
  for (let i = 0; i < count; i++) {
    const cluster = clusters[i % clusters.length]
    const offset  = randInt(cluster.start, cluster.end) * 1000
    slots.push(dayStartMs + offset)
  }
  return slots.sort((a, b) => a - b)
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
