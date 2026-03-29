/**
 * useNotifications — Browser Notification API + tab visibility tracking
 * Shows timer status when user switches tabs, triggers gentle reminders.
 */
import { useEffect, useRef, useCallback } from 'react'
import { formatTime, PHASE_LABELS } from './useTimer'

export function useNotifications(running, timeLeft, phase, distractions) {
  const permissionRef = useRef('default')

  // Request permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => { permissionRef.current = p })
      }
    }
  }, [])

  const notify = useCallback((title, body, opts = {}) => {
    if (permissionRef.current !== 'granted') return
    const n = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      silent: false,
      ...opts,
    })
    setTimeout(() => n.close(), 6000)
  }, [])

  // When user comes back to tab after being away
  useEffect(() => {
    let hiddenAt = null

    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
        // Update document title with timer countdown
        document.title = running
          ? `⏱ ${formatTime(timeLeft)} — ${PHASE_LABELS[phase]}`
          : `⏸ Paused — DeepFocus`
      } else {
        // User returned
        if (hiddenAt && running) {
          const awaySeconds = Math.round((Date.now() - hiddenAt) / 1000)
          if (awaySeconds > 30) {
            notify(
              '👋 Welcome back!',
              `You were away for ${Math.round(awaySeconds / 60)} min. Timer is still running.`
            )
          }
          document.title = 'DeepFocus — Deep Work Timer'
        }
        hiddenAt = null
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [running, timeLeft, phase, notify])

  // Update title continuously while running
  useEffect(() => {
    if (running && document.hidden) {
      document.title = `⏱ ${formatTime(timeLeft)} — ${PHASE_LABELS[phase]}`
    } else if (!running && document.hidden) {
      document.title = '⏸ Paused — DeepFocus'
    } else {
      document.title = 'DeepFocus — Deep Work Timer'
    }
  }, [running, timeLeft, phase])

  // Distraction warning notification
  const lastDistractionCount = useRef(0)
  useEffect(() => {
    const count = distractions?.length || 0
    if (count > lastDistractionCount.current && count === 4) {
      notify(
        '🔔 Heads up',
        'You\'ve been distracted 4 times this session. Consider taking a break.',
      )
    }
    lastDistractionCount.current = count
  }, [distractions, notify])

  return { notify }
}

/** Gentle reminder: if user started but hasn't continued for a while */
export function useAbandonmentReminder(running, sessionCount, lastSessionTime) {
  useEffect(() => {
    if (!running && lastSessionTime) {
      const id = setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('💡 Ready to focus?', {
            body: 'Your DeepFocus session is waiting. Let\'s get back on track!',
            icon: '/favicon.svg',
          })
        }
      }, 10 * 60 * 1000) // 10 minutes
      return () => clearTimeout(id)
    }
  }, [running, lastSessionTime])
}
