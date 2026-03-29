/**
 * useStorage — localStorage hook with JSON serialization
 * Persists state across page reloads.
 */
import { useState, useEffect, useCallback } from 'react'

export function useStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setStoredValue = useCallback((newValue) => {
    setValue(prev => {
      const next = typeof newValue === 'function' ? newValue(prev) : newValue
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch { /* quota exceeded – ignore */ }
      return next
    })
  }, [key])

  return [value, setStoredValue]
}

export function removeStorage(key) {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}
