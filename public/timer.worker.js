/**
 * timer.worker.js — Background-thread countdown timer
 * 
 * Runs setInterval in a Web Worker so it is NEVER throttled by the browser,
 * even when the main tab is in the background or the user switches to another app.
 * Uses wall-clock time (Date.now()) for drift correction — so even if a tick
 * fires late, the displayed time is always accurate.
 *
 * Protocol:
 *   Main → Worker:  START | PAUSE | RESUME | RESET
 *   Worker → Main:  TICK { remaining }  |  COMPLETE
 */

let intervalId  = null
let targetTime  = null   // absolute ms when countdown reaches 0
let remaining   = 0      // current seconds left (snapshot)

self.onmessage = function (e) {
  const { type, durationSeconds } = e.data

  switch (type) {

    case 'START': {
      clearInterval(intervalId)
      remaining  = durationSeconds
      targetTime = Date.now() + remaining * 1000
      fireTick()
      intervalId = setInterval(fireTick, 500)   // 500ms for accuracy
      break
    }

    case 'PAUSE': {
      clearInterval(intervalId)
      intervalId = null
      // Snapshot current remaining using wall clock
      if (targetTime !== null) {
        remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000))
      }
      break
    }

    case 'RESUME': {
      clearInterval(intervalId)
      targetTime = Date.now() + remaining * 1000
      fireTick()
      intervalId = setInterval(fireTick, 500)
      break
    }

    case 'RESET': {
      clearInterval(intervalId)
      intervalId = null
      targetTime = null
      remaining  = 0
      break
    }

    default:
      break
  }
}

function fireTick () {
  if (targetTime === null) return

  const now          = Date.now()
  const newRemaining = Math.max(0, Math.round((targetTime - now) / 1000))

  // Only post when value actually changed (avoids redundant renders)
  if (newRemaining !== remaining) {
    remaining = newRemaining
    self.postMessage({ type: 'TICK', remaining: newRemaining })
  }

  if (newRemaining <= 0) {
    clearInterval(intervalId)
    intervalId = null
    targetTime = null
    self.postMessage({ type: 'COMPLETE' })
  }
}
