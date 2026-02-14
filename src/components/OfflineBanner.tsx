import { useState, useEffect } from 'react'
import './OfflineBanner.css'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="offline-banner">
      <span className="offline-icon">📡</span>
      <span className="offline-text">오프라인 상태입니다. 일부 기능이 제한될 수 있어요.</span>
    </div>
  )
}
