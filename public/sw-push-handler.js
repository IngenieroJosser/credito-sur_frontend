/**
 * Push Notification Handler para Service Worker
 * Este código se ejecuta en el contexto del Service Worker
 */

// Manejar evento push
self.addEventListener('push', function(event) {
  console.log('[SW] Push recibido:', event);

  let notificationData = {
    title: 'Credisur',
    body: 'Nueva notificación',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    tag: 'credisur-notification',
    requireInteraction: false,
  };

  // Parsear datos del push
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        data: data.data || {},
        requireInteraction: data.requireInteraction || false,
      };
    } catch (e) {
      console.error('[SW] Error parseando push data:', e);
      notificationData.body = event.data.text();
    }
  }

  // Mostrar notificación
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
    })
  );
});

// Manejar click en notificación
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notificación clickeada:', event);

  event.notification.close();

  // Determinar URL a abrir
  let urlToOpen = '/';
  
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  } else if (event.notification.data && event.notification.data.link) {
    urlToOpen = event.notification.data.link;
  }

  // Abrir o enfocar ventana
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Buscar si ya hay una ventana abierta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(function(focusedClient) {
            if (urlToOpen !== '/' && 'navigate' in focusedClient) {
              return focusedClient.navigate(urlToOpen);
            }
            return focusedClient;
          });
        }
      }
      
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Manejar cierre de notificación
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notificación cerrada:', event);
});

console.log('[SW] Push handler cargado');
