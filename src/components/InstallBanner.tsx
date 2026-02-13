import { useState, useEffect } from 'react'
import './InstallBanner.css'

export function InstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Check if dismissed recently
    const dismissed = localStorage.getItem('dalbit-install-dismissed')
    if (dismissed) {
      const dismissedAt = new Date(dismissed)
      const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) return
    }

    // Detect iOS
    const ua = navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua)
    setIsIOS(isIOSDevice)

    // Show banner after a delay
    const timer = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('dalbit-install-dismissed', new Date().toISOString())
  }

  if (!show) return null

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-banner-icon">🌙</span>
        <div className="install-banner-text">
          <strong>달빛을 홈 화면에 추가하세요</strong>
          <p>
            {isIOS
              ? '하단 공유 버튼(□↑) → "홈 화면에 추가"를 눌러주세요'
              : '메뉴(⋮) → "홈 화면에 추가"를 눌러주세요'}
          </p>
        </div>
        <button className="install-banner-close" onClick={handleDismiss}>
          ✕
        </button>
      </div>
    </div>
  )
}
