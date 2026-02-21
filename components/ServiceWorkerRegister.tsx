'use client';

import { useEffect } from 'react';
import { cleanExpired } from '@/lib/api/apiCache';
import { syncManager } from '@/lib/offline/syncManager';
import { startOfflineTimer, stopOfflineTimer } from '@/lib/offline/offlineAnalytics';
import { renewOfflineSession, hasValidOfflineSession, shouldShowExpirationWarning, getOfflineSessionDaysRemaining } from '@/lib/auth/offlineAuth';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Registro de Service Worker para PWA y Push Notifications
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        // En desarrollo, nos aseguramos de que NO haya un service worker activo
        // para evitar errores de bad-precaching-response
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            registration.unregister();
            console.log('Service Worker desregistrado en desarrollo.');
          }
        });
      } else {
        navigator.serviceWorker.register("/sw.js")
          .then(reg => {
            console.log('Service Worker registrado con éxito:', reg.scope);
          })
          .catch(err => {
            console.error('Error al registrar Service Worker:', err);
          });
      }
    }

    // Limpiar entradas expiradas de IndexedDB cada 5 minutos
    cleanExpired();
    const cleanupInterval = setInterval(cleanExpired, 5 * 60 * 1000);

    // Descargar datos para offline si hay sesión activa
    const token = localStorage.getItem('token');
    if (token && navigator.onLine) {
      syncManager.downloadAll().catch(() => {});

      // Procesar cola pendiente al cargar
      syncManager.processQueue().catch(() => {});

      // Auto-suscribir a push notifications si están soportadas y no está suscrito
      import('@/lib/push/pushNotifications').then(({ isPushSupported, isPushSubscribed, subscribeToPush }) => {
        if (isPushSupported()) {
          isPushSubscribed().then((isSubscribed) => {
            if (!isSubscribed) {
              subscribeToPush().then((subscription) => {
                if (subscription) {
                  import('@/lib/push/pushService').then(({ savePushSubscription }) => {
                    savePushSubscription(subscription).catch(() => {});
                  });
                }
              }).catch(() => {});
            }
          });
        }
      });
    }

    // Verificar y notificar si la sesión offline está por expirar
    if (hasValidOfflineSession() && shouldShowExpirationWarning()) {
      const daysRemaining = getOfflineSessionDaysRemaining();
      // Sesión offline expira en ${daysRemaining} días. Conéctate para renovarla.
      
      // Mostrar notificación al usuario
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Sesión Offline por Expirar', {
          body: `Tu sesión offline expira en ${daysRemaining} días. Conéctate a Internet para renovarla.`,
          icon: '/android-chrome-192x192.png',
          tag: 'offline-session-expiring',
        });
      }
    }

    // Auto-sync cuando vuelve la conexión
    const handleOnline = () => {
      stopOfflineTimer();
      
      // Renovar sesión offline automáticamente al reconectar
      if (hasValidOfflineSession()) {
        const renewed = renewOfflineSession();
        if (renewed) {
          // Sesión offline renovada automáticamente
        }
      }
      
      syncManager.processQueue().catch(() => {});
    };

    // Track tiempo offline
    const handleOffline = () => {
      startOfflineTimer();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(cleanupInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null; // No renderiza nada
}