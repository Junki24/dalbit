// Web Push event handler — imported into Workbox-generated SW via importScripts
// Handles push notifications when app is closed/background

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}

  const title = data.title || '달빛'
  const options = {
    body: data.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-144.png',
    tag: data.tag || 'dalbit-notification',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open new window
      return clients.openWindow(url)
    })
  )
})
