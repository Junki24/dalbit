import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string || ''

/**
 * Convert VAPID public key from URL-safe base64 to Uint8Array
 * (required by PushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function useNotifications() {
  const { user, userSettings } = useAuth()
  const subscriptionRef = useRef<PushSubscription | null>(null)

  // ── Permission ──
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
  }, [])

  // ── Subscribe to Web Push ──
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!user || !isSupabaseConfigured || !VAPID_PUBLIC_KEY) return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    try {
      const registration = await navigator.serviceWorker.ready

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        })
      }

      subscriptionRef.current = subscription

      // Extract keys
      const subJson = subscription.toJSON()
      const p256dh = subJson.keys?.p256dh ?? ''
      const auth = subJson.keys?.auth ?? ''

      // Save to Supabase (upsert by user_id + endpoint)
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        },
        { onConflict: 'user_id,endpoint' }
      )

      return true
    } catch (err) {
      console.error('[달빛] Push 구독 실패:', err)
      return false
    }
  }, [user])

  // ── Unsubscribe ──
  const unsubscribeFromPush = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)

        await subscription.unsubscribe()
      }

      subscriptionRef.current = null
    } catch (err) {
      console.error('[달빛] Push 구독 해제 실패:', err)
    }
  }, [user])

  // ── Auto-subscribe / unsubscribe based on user settings ──
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !VAPID_PUBLIC_KEY) return

    if (userSettings?.notifications_enabled && Notification.permission === 'granted') {
      subscribeToPush()
    } else if (!userSettings?.notifications_enabled) {
      unsubscribeFromPush()
    }
  }, [user, userSettings?.notifications_enabled, subscribeToPush, unsubscribeFromPush])

  return {
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    isSupported:
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window,
    permission:
      typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : ('denied' as NotificationPermission),
  }
}
