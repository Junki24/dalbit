import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export function useNotifications() {
  const { userSettings } = useAuth()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
  }, [])

  const sendNotification = useCallback((title: string, body: string, icon = '🌙') => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'dalbit-reminder',
        data: { url: '/' },
      })
    } catch {
      // Notification constructor not supported (some mobile browsers)
      // Fall back to service worker notification if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          icon,
        })
      }
    }
  }, [])

  const scheduleReminder = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    // Check daily at the same time — every 6 hours when app is active
    intervalRef.current = setInterval(() => {
      const now = new Date()
      const hour = now.getHours()

      // Send reminder at 9 PM (21:00) if user hasn't recorded today
      if (hour === 21) {
        sendNotification(
          '달빛 기록 리마인더',
          '오늘의 증상과 컨디션을 기록해보세요 🌙'
        )
      }
    }, 60 * 60 * 1000) // Check every hour
  }, [sendNotification])

  // Setup notifications when enabled
  useEffect(() => {
    if (!userSettings?.notifications_enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    scheduleReminder()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [userSettings?.notifications_enabled, scheduleReminder])

  return {
    requestPermission,
    sendNotification,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
    permission: typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied' as NotificationPermission,
  }
}
