import { logger } from '@/lib/logger'
/**
 * Analytics y métricas de uso offline
 * Registra estadísticas de operación offline para monitoreo y optimización
 */

import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'

import { getOfflineDb } from './offlineDb';

export interface OfflineMetrics {
  id: string;
  timestamp: string;
  eventType: 'sync' | 'download' | 'queue' | 'error' | 'cache_hit' | 'cache_miss';
  details: {
    duration?: number;
    recordCount?: number;
    storeName?: string;
    errorMessage?: string;
    success?: boolean;
  };
}

interface OfflineStats {
  totalSyncs: number;
  totalDownloads: number;
  totalQueuedOps: number;
  totalErrors: number;
  cacheHitRate: number;
  avgSyncDuration: number;
  lastSyncAt: string | null;
  offlineTime: number; // milliseconds
}

// Store para métricas
const METRICS_STORE = 'offline-metrics';
const STATS_KEY = 'offline-stats';

/**
 * Registrar un evento de analytics
 */
export async function trackOfflineEvent(
  eventType: OfflineMetrics['eventType'],
  details: OfflineMetrics['details'] = {}
): Promise<void> {
  try {
    const db = await getOfflineDb();
    
    const metric: OfflineMetrics = {
      id: `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: toBogotaDateTimeOffsetIso(new Date()),
      eventType,
      details,
    };

    // Guardar métrica (si el store existe)
    // Por ahora solo lo logueamos en desarrollo
    if (process.env.NODE_ENV === 'development') {
      logger.log('[Offline Analytics]', eventType, details);
    }

    // Actualizar estadísticas en localStorage
    updateStats(eventType, details);
  } catch (error) {
    // Silenciar errores de analytics para no afectar la operación
    console.error('[Offline Analytics] Error:', error);
  }
}

/**
 * Actualizar estadísticas agregadas
 */
function updateStats(
  eventType: OfflineMetrics['eventType'],
  details: OfflineMetrics['details']
): void {
  try {
    const statsJson = localStorage.getItem(STATS_KEY);
    const stats: OfflineStats = statsJson
      ? JSON.parse(statsJson)
      : {
          totalSyncs: 0,
          totalDownloads: 0,
          totalQueuedOps: 0,
          totalErrors: 0,
          cacheHitRate: 0,
          avgSyncDuration: 0,
          lastSyncAt: null,
          offlineTime: 0,
        };

    // Actualizar contadores según tipo de evento
    switch (eventType) {
      case 'sync':
        stats.totalSyncs++;
        stats.lastSyncAt = toBogotaDateTimeOffsetIso(new Date());
        if (details.duration) {
          stats.avgSyncDuration =
            (stats.avgSyncDuration * (stats.totalSyncs - 1) + details.duration) /
            stats.totalSyncs;
        }
        break;
      case 'download':
        stats.totalDownloads++;
        break;
      case 'queue':
        stats.totalQueuedOps++;
        break;
      case 'error':
        stats.totalErrors++;
        break;
      case 'cache_hit':
      case 'cache_miss':
        // Calcular hit rate
        const totalCacheAccess = stats.cacheHitRate * 100 || 0;
        const newTotal = totalCacheAccess + 1;
        const hits = eventType === 'cache_hit' ? totalCacheAccess + 1 : totalCacheAccess;
        stats.cacheHitRate = hits / newTotal;
        break;
    }

    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('[Offline Analytics] Error updating stats:', error);
  }
}

/**
 * Obtener estadísticas de uso offline
 */
export function getOfflineStats(): OfflineStats {
  try {
    const statsJson = localStorage.getItem(STATS_KEY);
    if (!statsJson) {
      return {
        totalSyncs: 0,
        totalDownloads: 0,
        totalQueuedOps: 0,
        totalErrors: 0,
        cacheHitRate: 0,
        avgSyncDuration: 0,
        lastSyncAt: null,
        offlineTime: 0,
      };
    }
    return JSON.parse(statsJson);
  } catch (error) {
    console.error('[Offline Analytics] Error getting stats:', error);
    return {
      totalSyncs: 0,
      totalDownloads: 0,
      totalQueuedOps: 0,
      totalErrors: 0,
      cacheHitRate: 0,
      avgSyncDuration: 0,
      lastSyncAt: null,
      offlineTime: 0,
    };
  }
}

/**
 * Resetear estadísticas
 */
export function resetOfflineStats(): void {
  try {
    localStorage.removeItem(STATS_KEY);
  } catch (error) {
    console.error('[Offline Analytics] Error resetting stats:', error);
  }
}

/**
 * Registrar tiempo offline
 */
let offlineStartTime: number | null = null;

export function startOfflineTimer(): void {
  if (!offlineStartTime) {
    offlineStartTime = Date.now();
  }
}

export function stopOfflineTimer(): void {
  if (offlineStartTime) {
    const duration = Date.now() - offlineStartTime;
    const stats = getOfflineStats();
    stats.offlineTime += duration;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    offlineStartTime = null;
  }
}

/**
 * Formatear duración en formato legible
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

