/**
 * usePiPTimer — Document Picture-in-Picture floating window
 *
 * Uses the Document Picture-in-Picture API (Chrome 116 / Edge 116+) to open
 * a real OS-level always-on-top window. It stays visible above VSCode, Figma,
 * YouTube — any other app — just like YouTube's mini video player.
 *
 * React renders directly into the PiP window's DOM via ReactDOM.createRoot,
 * so the floating timer reuses all existing components with live props.
 *
 * Falls back gracefully on unsupported browsers with a clear message.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

export function usePiPTimer() {
  const [isOpen,      setIsOpen]      = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  const pipWinRef = useRef(null)
  const rootRef   = useRef(null)

  // Check support on mount (window object required)
  useEffect(() => {
    setIsSupported('documentPictureInPicture' in window)
  }, [])

  // ── Copy all CSS from the main document into the PiP window ──
  const copyStyles = useCallback((pipDoc) => {
    // 1. Copy all <style> and <link rel=stylesheet> tags
    for (const sheet of document.styleSheets) {
      try {
        // Inline rules (Tailwind, our index.css)
        const css = [...sheet.cssRules].map(r => r.cssText).join('\n')
        const el  = pipDoc.createElement('style')
        el.textContent = css
        pipDoc.head.appendChild(el)
      } catch {
        // Cross-origin (e.g. Google Fonts CDN) — link instead
        if (sheet.href) {
          const link = pipDoc.createElement('link')
          link.rel   = 'stylesheet'
          link.href  = sheet.href
          pipDoc.head.appendChild(link)
        }
      }
    }

    // 2. Also add Google Fonts directly (in case crossOrigin blocked it above)
    const fontsLink      = pipDoc.createElement('link')
    fontsLink.rel        = 'stylesheet'
    fontsLink.href       = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
    pipDoc.head.appendChild(fontsLink)
  }, [])

  // ── Open PiP window ───────────────────────────────────
  const open = useCallback(async () => {
    if (!isSupported) {
      alert(
        'Picture-in-Picture is not supported in this browser.\n\n' +
        'Please use Chrome 116+ or Edge 116+ for the floating timer.'
      )
      return
    }

    // If already open, just focus it
    if (pipWinRef.current && !pipWinRef.current.closed) {
      pipWinRef.current.focus?.()
      return
    }

    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width:  260,
        height: 150,
        disallowReturnToOpener: false,
      })

      pipWinRef.current = pipWin

      // Copy all styles so Tailwind class names work in the pip doc
      copyStyles(pipWin.document)

      // Base body styles (dark background, no margin)
      Object.assign(pipWin.document.body.style, {
        margin:      '0',
        padding:     '0',
        overflow:    'hidden',
        background:  '#0d1117',
        color:       '#fff',
        fontFamily:  'Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      })

      // Mount point for React
      const container = pipWin.document.createElement('div')
      container.style.height = '100%'
      pipWin.document.body.appendChild(container)

      // Create a React root inside the PiP window
      rootRef.current = ReactDOM.createRoot(container)

      setIsOpen(true)

      // Clean up when user closes the PiP window
      pipWin.addEventListener('pagehide', () => {
        rootRef.current = null
        pipWinRef.current = null
        setIsOpen(false)
      })

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        // User denied — silently ignore
        console.warn('[DeepFocus] PiP permission denied')
      } else {
        console.error('[DeepFocus] PiP error:', err)
      }
    }
  }, [isSupported, copyStyles])

  // ── Close PiP window ──────────────────────────────────
  const close = useCallback(() => {
    if (pipWinRef.current && !pipWinRef.current.closed) {
      pipWinRef.current.close()
    }
    rootRef.current   = null
    pipWinRef.current = null
    setIsOpen(false)
  }, [])

  // ── Render / update content inside the PiP window ─────
  // Call this whenever timer state changes to push fresh props into the window
  const renderContent = useCallback((content) => {
    rootRef.current?.render(content)
  }, [])

  // Cleanup on main tab unmount
  useEffect(() => () => close(), [close])

  return { open, close, renderContent, isOpen, isSupported }
}
