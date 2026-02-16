/**
 * Push Notification Handler Premium para Service Worker
 * Notificaciones ricas con imágenes, acciones, vibración y estilos personalizados
 */

// Configuraciones de notificaciones por tipo
const NOTIFICATION_CONFIGS = {
  PAGO: {
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'Ver Detalles', icon: '/android-chrome-192x192.png' },
      { action: 'dismiss', title: 'Entendido', icon: '/android-chrome-192x192.png' }
    ],
    requireInteraction: true,
  },
  MORA: {
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [300, 100, 300, 100, 300],
    actions: [
      { action: 'view', title: 'Ver Cliente', icon: '/android-chrome-192x192.png' },
      { action: 'dismiss', title: 'Cerrar', icon: '/android-chrome-192x192.png' }
    ],
    requireInteraction: true,
  },
  CLIENTE: {
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'Ver Perfil', icon: '/android-chrome-192x192.png' },
      { action: 'dismiss', title: 'Cerrar', icon: '/android-chrome-192x192.png' }
    ],
    requireInteraction: false,
  },
  PRESTAMO: {
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'Ver Préstamo', icon: '/android-chrome-192x192.png' },
      { action: 'dismiss', title: 'Cerrar', icon: '/android-chrome-192x192.png' }
    ],
    requireInteraction: false,
  },
  SISTEMA: {
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [100],
    actions: [
      { action: 'view', title: 'Ver', icon: '/android-chrome-192x192.png' },
      { action: 'dismiss', title: 'Cerrar', icon: '/android-chrome-192x192.png' }
    ],
    requireInteraction: false,
  },
  SOLICITUD: {
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: 'approve', title: 'Aprobar', icon: '/android-chrome-192x192.png' },
      { action: 'view', title: 'Revisar', icon: '/android-chrome-192x192.png' },
      { action: 'dismiss', title: 'Después', icon: '/android-chrome-192x192.png' }
    ],
    requireInteraction: true,
  },
};

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
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  };

  // Parsear datos del push
  if (event.data) {
    try {
      const data = event.data.json();
      const tipo = data.tipo || data.type || 'SISTEMA';
      const config = NOTIFICATION_CONFIGS[tipo] || NOTIFICATION_CONFIGS.SISTEMA;

      notificationData = {
        title: data.title || data.titulo || 'Credisur',
        body: data.body || data.message || data.mensaje || notificationData.body,
        icon: data.icon || config.icon,
        badge: data.badge || config.badge,
        tag: data.tag || `credisur-${tipo.toLowerCase()}-${Date.now()}`,
        data: {
          url: data.url || data.link || '/',
          tipo: tipo,
          ...data.data,
        },
        requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : config.requireInteraction,
        vibrate: data.vibrate || config.vibrate,
        actions: data.actions || config.actions,
        timestamp: Date.now(),
        // Imagen grande si está disponible
        image: data.image || data.imagen || undefined,
        // Dirección del texto (útil para RTL)
        dir: 'ltr',
        // Idioma
        lang: 'es-ES',
        // Sonido silencioso o no
        silent: data.silent || false,
        // Renotify si es la misma tag
        renotify: data.renotify || false,
      };
    } catch (e) {
      console.error('[SW] Error parseando push data:', e);
      notificationData.body = event.data.text();
    }
  }

  // Mostrar notificación con todas las opciones
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      actions: notificationData.actions,
      timestamp: notificationData.timestamp,
      image: notificationData.image,
      dir: notificationData.dir,
      lang: notificationData.lang,
      silent: notificationData.silent,
      renotify: notificationData.renotify,
    })
  );
});

// Manejar click en notificación (incluyendo acciones)
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notificación clickeada:', event);
  console.log('[SW] Acción:', event.action);

  event.notification.close();

  // Determinar URL según la acción
  let urlToOpen = '/';
  const notifData = event.notification.data || {};
  
  // Manejar acciones específicas
  if (event.action === 'approve') {
    // Acción de aprobar - ir a la página de aprobaciones
    urlToOpen = notifData.approveUrl || '/notificaciones';
    console.log('[SW] Acción: Aprobar');
  } else if (event.action === 'view') {
    // Acción de ver - ir a la URL específica
    urlToOpen = notifData.url || notifData.link || '/';
    console.log('[SW] Acción: Ver detalles');
  } else if (event.action === 'dismiss') {
    // Acción de cerrar - solo cerrar la notificación
    console.log('[SW] Acción: Cerrar');
    return;
  } else {
    // Click en el cuerpo de la notificación
    urlToOpen = notifData.url || notifData.link || '/';
    console.log('[SW] Click en notificación, navegando a:', urlToOpen);
  }

  // Abrir o enfocar ventana
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Buscar si ya hay una ventana abierta de la app
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('[SW] Ventana encontrada, enfocando y navegando...');
          return client.focus().then(function(focusedClient) {
            if (urlToOpen !== '/' && 'navigate' in focusedClient) {
              return focusedClient.navigate(urlToOpen);
            }
            return focusedClient;
          });
        }
      }
      
      // Si no hay ventana abierta, abrir una nueva
      console.log('[SW] Abriendo nueva ventana...');
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
