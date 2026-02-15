import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Clear chunk-reload flag on successful load (prevents stale flag)
sessionStorage.removeItem('dalbit-chunk-reload')

// ── PWA Update System ──
// Dispatches 'dalbit-sw-update' CustomEvent when a new version is ready.
// UpdateBanner listens for this event and shows UI + auto-reloads.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      // When a new SW is found waiting, notify the app
      const notifyUpdate = () => {
        if (reg.waiting) {
          window.dispatchEvent(new CustomEvent('dalbit-sw-update', { detail: { reg } }))
        }
      }

      // Detect new SW entering 'waiting' state
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // New version installed but old one still controls → notify
            notifyUpdate()
          }
        })
      })

      // Check for updates: on load, every 2 minutes, and on app focus
      reg.update()
      setInterval(() => reg.update(), 2 * 60 * 1000)

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update()
        }
      })

      // If a SW is already waiting on page load (e.g. update happened in background)
      notifyUpdate()
    } catch {
      // SW registration failed silently
    }
  })

  // Auto-reload when a new SW takes control
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
