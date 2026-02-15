'use client';

import { useEffect } from 'react';
import { cleanExpired } from '@/lib/api/apiCache';

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

    return () => clearInterval(cleanupInterval);
  }, []);

  return null; // No renderiza nada
}