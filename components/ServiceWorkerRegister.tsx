'use client';

import { useEffect } from 'react';
import { cleanExpired } from '@/lib/api/apiCache';
import { syncManager } from '@/lib/offline/syncManager';
import { startOfflineTimer, stopOfflineTimer } from '@/lib/offline/offlineAnalytics';
import { renewOfflineSession, hasValidOfflineSession, shouldShowExpirationWarning, getOfflineSessionDaysRemaining } from '@/lib/auth/offlineAuth';
import { checkRealConnectivity } from '@/lib/offline/connectivity';
import { subscribeToPush } from '@/lib/push/pushNotifications';
import { savePushSubscription } from '@/lib/push/pushService';

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
    if (token) {
      checkRealConnectivity().then((isOnline) => {
        if (isOnline) {
          syncManager.downloadAll().catch(() => {});
          syncManager.processQueue().catch(() => {});
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

    // Sincronizar suscripción push si ya tenemos permiso (Silenciosamente)
    if (token && "Notification" in window && Notification.permission === "granted") {
      const syncPush = async () => {
        try {
          const sub = await subscribeToPush();
          if (sub) {
            await savePushSubscription(sub);
            console.log('[Push] Suscripción sincronizada automáticamente');
          }
        } catch (err) {
          console.warn('[Push] Error en sincronización automática:', err);
        }
      };
      // Pequeño delay para no interferir con la carga inicial
      setTimeout(syncPush, 5000);
    }

    // Auto-sync cuando vuelve la conexión (confirmado con ping real)
    const handleOnline = async () => {
      const reallyOnline = await checkRealConnectivity();
      if (!reallyOnline) return; // WiFi sin internet real

      stopOfflineTimer();

      // Renovar sesión offline automáticamente al reconectar
      if (hasValidOfflineSession()) {
        renewOfflineSession();
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