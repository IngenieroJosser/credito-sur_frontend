'use client';

import { useEffect } from 'react';
import { cleanExpired } from '@/lib/api/apiCache';
import { syncManager } from '@/lib/offline/syncManager';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => console.log("Service Worker registrado:", reg))
        .catch(err => console.error("SW error:", err));
    }

    if (process.env.NODE_ENV === "development" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(r => r.unregister());
      });
    }

    // Limpiar entradas expiradas de IndexedDB cada 5 minutos
    cleanExpired();
    const cleanupInterval = setInterval(cleanExpired, 5 * 60 * 1000);

    // Descargar datos para offline si hay sesión activa
    const token = localStorage.getItem('token');
    if (token && navigator.onLine) {
      syncManager.downloadAll().then((result) => {
        console.log('[Offline] Datos descargados:', result);
      }).catch(() => {});

      // Procesar cola pendiente al cargar
      syncManager.processQueue().then((result) => {
        if (result.processed > 0) {
          console.log('[Offline] Cola procesada:', result);
        }
      }).catch(() => {});
    }

    // Auto-sync cuando vuelve la conexión
    const handleOnline = () => {
      console.log('[Offline] Conexión restaurada, sincronizando...');
      syncManager.processQueue().then((result) => {
        if (result.processed > 0) {
          console.log('[Offline] Sync completado:', result);
        }
      }).catch(() => {});
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(cleanupInterval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null; // No renderiza nada
}