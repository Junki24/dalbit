import { useState, useEffect, useCallback } from 'react'
import './UpdateBanner.css'

/**
 * Listens for 'dalbit-sw-update' events from main.tsx.
 * Shows a banner when a new version is available, then auto-reloads after 3 seconds.
 * User can click to reload immediately.
 */
export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    } else {
      window.location.reload()
    }
  }, [registration])

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setRegistration(detail?.reg ?? null)
      setUpdateAvailable(true)
    }

    window.addEventListener('dalbit-sw-update', handleUpdate)
    return () => window.removeEventListener('dalbit-sw-update', handleUpdate)
  }, [])

  // Countdown → auto-reload
  useEffect(() => {
    if (!updateAvailable) return

    if (countdown <= 0) {
      applyUpdate()
      return
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [updateAvailable, countdown, applyUpdate])

  if (!updateAvailable) return null

  return (
    <div className="update-banner" onClick={applyUpdate} role="button" tabIndex={0}>
      <span className="update-icon">✨</span>
      <span className="update-text">
        새 버전이 있어요! {countdown > 0 ? `${countdown}초 후 업데이트...` : '업데이트 중...'}
      </span>
      <button className="update-btn" onClick={applyUpdate}>
        지금 업데이트
      </button>
    </div>
  )
}
