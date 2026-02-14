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

// PWA service worker: auto-update + reload on new version
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      // Check for updates every 5 minutes
      setInterval(() => reg.update(), 5 * 60 * 1000)
    } catch {
      // SW registration failed silently
    }
  })

  // Auto-reload when a new SW takes control (deploy happened)
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
