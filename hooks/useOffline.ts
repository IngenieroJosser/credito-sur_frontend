'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncManager, SyncResult } from '@/lib/offline/syncManager';
import { offlineQueue } from '@/lib/offline/offlineQueue';
import {
  checkRealConnectivity,
  checkRealConnectivityForce,
  setConnectivityResult,
} from '@/lib/offline/connectivity';

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
  // Estado inicial conservador: usar navigator.onLine como primer guess
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
        completedOps: completed,
      }));
    } catch {
      // IndexedDB puede no estar disponible en SSR
    }
  }, []);

  // Sincronizar: subir operaciones pendientes
  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    // Verificar conectividad REAL antes de intentar sincronizar
    const online = await checkRealConnectivity();
    if (syncInProgress.current || !online) return null;

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
    const online = await checkRealConnectivity();
    if (!online) return null;

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
    /**
     * El evento 'online' del navegador es poco confiable:
     * se dispara cuando la interfaz de red se activa, pero no
     * garantiza que haya internet real (ej: WiFi sin internet).
     *
     * Por eso hacemos un ping real al recibir el evento 'online'
     * antes de actualizar el estado. El evento 'offline' SÍ es
     * confiable: si se dispara, definitivamente no hay red.
     */
    const handleOnline = async () => {
      // Confirmar con ping real antes de asumir que hay internet
      const reallyOnline = await checkRealConnectivityForce();
      if (reallyOnline) {
        setState((prev) => ({ ...prev, isOnline: true }));
        setConnectivityResult(true);
        // Auto-sync cuando vuelve la conexión real
        syncNow();
      }
      // Si el ping falla, no cambiamos el estado (seguimos offline)
    };

    const handleOffline = () => {
      // El evento offline es confiable — siempre actualizar inmediatamente
      setState((prev) => ({ ...prev, isOnline: false }));
      setConnectivityResult(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', refreshCounts);

    // Verificar conectividad real al montar (navigator.onLine puede ser incorrecto)
    checkRealConnectivity().then((online) => {
      setState((prev) => ({ ...prev, isOnline: online }));
      setConnectivityResult(online);
    });

    // Cargar contadores iniciales
    refreshCounts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', refreshCounts);
    };
  }, [syncNow, refreshCounts]);

  // Polling cada 30s: verificar conectividad real + actualizar contadores
  useEffect(() => {
    const interval = setInterval(async () => {
      const online = await checkRealConnectivity();
      setState((prev) => {
        // Solo actualizar si cambió para evitar renders innecesarios
        if (prev.isOnline !== online) {
          setConnectivityResult(online);
          // Si acaba de reconectar, auto-sync
          if (online && !prev.isOnline) {
            syncNow();
          }
          return { ...prev, isOnline: online };
        }
        return prev;
      });
      refreshCounts();
    }, 30_000);

    return () => clearInterval(interval);
  }, [refreshCounts, syncNow]);

  return {
    ...state,
    syncNow,
    downloadForOffline,
    refreshCounts,
  };
}
