import { logger } from '@/lib/logger'
'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineStore, OfflineCliente, OfflinePrestamo, OfflineCuota, OfflineRuta } from '@/lib/offline/offlineDb';
import { checkRealConnectivity } from '@/lib/offline/connectivity';

// Hook genérico para leer datos offline con fallback
function useOfflineStore<T>(
  storeName: 'clientes' | 'prestamos' | 'cuotas' | 'rutas',
  fetchOnline: (() => Promise<T[]>) | null,
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'online' | 'offline' | 'none'>('none');

  const load = useCallback(async () => {
    setLoading(true);

    // Verificar conectividad REAL antes de intentar el fetch online
    const isOnline = await checkRealConnectivity();

    if (isOnline && fetchOnline) {
      try {
        const onlineData = await fetchOnline();
        setData(onlineData);
        setSource('online');

        // Guardar en IndexedDB para uso offline
        if (onlineData.length > 0) {
          await offlineStore.saveMany(storeName, onlineData as any[]);
        }

        setLoading(false);
        return;
      } catch (err) {
        logger.warn(`[useOfflineData] Fallo online para ${storeName}, usando offline:`, err);
      }
    }

    // Fallback: leer de IndexedDB
    try {
      const offlineData = await offlineStore.getAll<T>(storeName);
      setData(offlineData);
      setSource(offlineData.length > 0 ? 'offline' : 'none');
    } catch {
      setData([]);
      setSource('none');
    }

    setLoading(false);
  }, [storeName, fetchOnline]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, source, reload: load };
}

// ─── Hooks específicos por entidad ───────────────────────────────

export function useOfflineClientes(fetchOnline?: () => Promise<OfflineCliente[]>) {
  return useOfflineStore<OfflineCliente>('clientes', fetchOnline || null);
}

export function useOfflinePrestamos(fetchOnline?: () => Promise<OfflinePrestamo[]>) {
  return useOfflineStore<OfflinePrestamo>('prestamos', fetchOnline || null);
}

export function useOfflineCuotas(prestamoId?: string) {
  const [data, setData] = useState<OfflineCuota[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (prestamoId) {
          const cuotas = await offlineStore.getByIndex<OfflineCuota>('cuotas', 'by-prestamoId', prestamoId);
          setData(cuotas.sort((a, b) => a.numeroCuota - b.numeroCuota));
        } else {
          const cuotas = await offlineStore.getAll<OfflineCuota>('cuotas');
          setData(cuotas);
        }
      } catch {
        setData([]);
      }
      setLoading(false);
    };
    load();
  }, [prestamoId]);

  return { data, loading };
}

export function useOfflineRutas(fetchOnline?: () => Promise<OfflineRuta[]>) {
  return useOfflineStore<OfflineRuta>('rutas', fetchOnline || null);
}

// Buscar un cliente por ID (offline)
export async function getOfflineCliente(id: string): Promise<OfflineCliente | undefined> {
  return offlineStore.getById<OfflineCliente>('clientes', id);
}

// Buscar préstamos de un cliente (offline)
export async function getOfflinePrestamosByCliente(clienteId: string): Promise<OfflinePrestamo[]> {
  return offlineStore.getByIndex<OfflinePrestamo>('prestamos', 'by-clienteId', clienteId);
}

// Buscar clientes por ruta (offline)
export async function getOfflineClientesByRuta(rutaId: string): Promise<OfflineCliente[]> {
  return offlineStore.getByIndex<OfflineCliente>('clientes', 'by-rutaId', rutaId);
}

