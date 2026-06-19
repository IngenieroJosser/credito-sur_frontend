'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncManager, SyncResult } from '@/lib/offline/syncManager';
import {
  checkRealConnectivity,
  setConnectivityResult,
} from '@/lib/offline/connectivity';

export interface OfflineState {
  isOnline: boolean;
  browserOnline: boolean;
  backendReachable: boolean;
  pendingOps: number;
  failedOps: number;
  syncingOps: number;
  completedOps: number;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
}

export function useOffline() {
  // Estado inicial: browserOnline usa navigator.onLine, backendReachable inicia en true
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    backendReachable: true,
    pendingOps: 0,
    failedOps: 0,
    syncingOps: 0,
    completedOps: 0,
    isSyncing: false,
    lastSyncResult: null,
  });

  const syncInProgress = useRef(false);
  const browserOnlineRef = useRef(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  // Mantener el ref sincronizado con el estado
  useEffect(() => {
    browserOnlineRef.current = state.browserOnline;
  }, [state.browserOnline]);

  // Actualizar contadores de la cola
  const refreshCounts = useCallback(async () => {
    try {
      const db = (await import('@/lib/offline/offlineQueue')).offlineQueue;
      const [pending, failed, syncing, completed] = await Promise.all([
        db.countPending(),
        db.countFailed(),
        (db as any).countSyncing(),
        (db as any).countCompleted(),
      ]);
      setState((prev) => ({
        ...prev,
        pendingOps: pending,
        failedOps: failed,
        syncingOps: syncing,
        completedOps: completed,
      }));
    } catch {
      // IndexedDB puede no estar disponible en SSR
    }
  }, []);

  // Sincronizar: subir operaciones pendientes
  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    // Verificar conectividad del navegador antes de intentar sincronizar
    if (syncInProgress.current || !browserOnlineRef.current) return null;

    syncInProgress.current = true;
    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await syncManager.processQueue();
      setState((prev) => ({ ...prev, isSyncing: false, lastSyncResult: result }));
      await refreshCounts();
      return result;
    } catch (err) {
      console.error('[useOffline] Error en sync:', err);
      setState((prev) => ({ ...prev, isSyncing: false }));
      return null;
    } finally {
      syncInProgress.current = false;
    }
  }, [refreshCounts]);

  // Descargar datos para uso offline
  const downloadForOffline = useCallback(async () => {
    if (!browserOnlineRef.current) return null;

    setState((prev) => ({ ...prev, isSyncing: true }));
    try {
      const result = await syncManager.downloadAll();
      setState((prev) => ({ ...prev, isSyncing: false }));
      return result;
    } catch (err) {
      console.error('[useOffline] Error descargando datos:', err);
      setState((prev) => ({ ...prev, isSyncing: false }));
      return null;
    }
  }, []);

  // Escuchar cambios de conectividad
  useEffect(() => {
    const handleOnline = () => {
      // Actualizar el ref inmediatamente antes del setState
      browserOnlineRef.current = true;

      // Marcar que el navegador está online, pero NO asumir que el backend está disponible
      setState((prev) => ({ ...prev, browserOnline: true, isOnline: true }));

      // Validar conectividad real del backend antes de sincronizar
      void checkRealConnectivity().then((backendOk) => {
        setState((prev) => ({
          ...prev,
          backendReachable: backendOk,
        }));

        setConnectivityResult(backendOk);

        // Solo sincronizar si el backend responde
        if (backendOk) {
          void syncNow();
        }
      });
    };

    const handleOffline = () => {
      // Actualizar el ref inmediatamente antes del setState
      browserOnlineRef.current = false;

      // El evento offline actualiza browserOnline inmediatamente
      setState((prev) => ({ ...prev, browserOnline: false, isOnline: false, backendReachable: false }));
      setConnectivityResult(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', refreshCounts);

    // Verificar conectividad real del backend al montar
    checkRealConnectivity().then((backendOk) => {
      setState((prev) => ({ ...prev, backendReachable: backendOk }));
      setConnectivityResult(backendOk);
    });

    // Cargar contadores iniciales
    refreshCounts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', refreshCounts);
    };
  }, [syncNow, refreshCounts]);

  // Polling cada 30s: verificar conectividad del backend + actualizar contadores
  useEffect(() => {
    const interval = setInterval(async () => {
      // Si el navegador está offline, no hacer ping al backend
      if (!browserOnlineRef.current) {
        setState((prev) => {
          if (!prev.backendReachable) return prev;

          setConnectivityResult(false);
          return {
            ...prev,
            backendReachable: false,
          };
        });

        await refreshCounts();
        return;
      }

      // Si el navegador está online, verificar conectividad del backend
      const backendOk = await checkRealConnectivity();

      setState((prev) => {
        if (prev.backendReachable !== backendOk) {
          setConnectivityResult(backendOk);
          return { ...prev, backendReachable: backendOk };
        }

        return prev;
      });

      await refreshCounts();
    }, 30_000);

    return () => clearInterval(interval);
  }, [refreshCounts]);

  return {
    ...state,
    syncNow,
    downloadForOffline,
    refreshCounts,
  };
}
