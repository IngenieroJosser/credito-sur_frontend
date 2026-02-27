'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncManager, SyncResult } from '@/lib/offline/syncManager';
import { offlineQueue } from '@/lib/offline/offlineQueue';

export interface OfflineState {
  isOnline: boolean;
  pendingOps: number;
  failedOps: number;
  syncingOps: number;
  completedOps: number;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingOps: 0,
    failedOps: 0,
    syncingOps: 0,
    completedOps: 0,
    isSyncing: false,
    lastSyncResult: null,
  });

  const syncInProgress = useRef(false);

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
        completedOps: completed
      }));
    } catch {
      // IndexedDB puede no estar disponible
    }
  }, []);

  // Sincronizar: subir operaciones pendientes
  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    if (syncInProgress.current || !navigator.onLine) return null;

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
    if (!navigator.onLine) return null;

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
      setState((prev) => ({ ...prev, isOnline: true }));
      // Auto-sync cuando vuelve la conexión
      syncNow();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', refreshCounts);

    // Cargar contadores iniciales
    refreshCounts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', refreshCounts);
    };
  }, [syncNow, refreshCounts]);

  // Polling de contadores cada 30s
  useEffect(() => {
    const interval = setInterval(refreshCounts, 30_000);
    return () => clearInterval(interval);
  }, [refreshCounts]);

  return {
    ...state,
    syncNow,
    downloadForOffline,
    refreshCounts,
  };
}
