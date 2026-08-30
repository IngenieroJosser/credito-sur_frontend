import { logger } from '@/lib/logger'
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'
/**
 * Sistema de Autenticación Offline
 * Permite continuar usando el sistema PWA sin conexión después de haber iniciado sesión previamente
 */

interface CachedSession {
  token: string;
  user: any;
  cachedAt: string;
  expiresAt: string;
}

const SESSION_CACHE_KEY = 'offline_session_cache';
// Al cerrar sesion no se borra la cache al instante: se programa una purga
// para 8 h despues. Si el usuario vuelve a entrar antes, se cancela.
const PURGE_DEADLINE_KEY = 'offline_purge_deadline';
const PURGE_GRACE_MS = 8 * 60 * 60 * 1000;

/** Programa la purga de la cache offline para dentro de 8 h (al cerrar sesion). */
export function programarPurgaDatosOffline(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PURGE_DEADLINE_KEY, String(Date.now() + PURGE_GRACE_MS));
  } catch {
    /* localStorage no disponible */
  }
}

/** Cancela una purga pendiente (al volver a iniciar sesion dentro de las 8 h). */
export function cancelarPurgaDatosOffline(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PURGE_DEADLINE_KEY);
  } catch {
    /* localStorage no disponible */
  }
}

/**
 * Si hay una purga programada y ya vencio, borra la cache de datos sensibles
 * (conservando la cola offline) y limpia la marca. Se llama al arrancar la app.
 */
export async function purgarDatosOfflineSiVencio(): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(PURGE_DEADLINE_KEY);
    if (!raw) return;
    const deadline = Number(raw);
    if (!Number.isFinite(deadline) || Date.now() < deadline) return;

    // Limpieza completa (equivale a lo que antes se hacia al instante en el
    // logout, ahora diferido): datos offline + cache de API + caches del
    // navegador/PWA. La cola offline (offline-queue) se conserva.
    const { offlineStore } = await import('@/lib/offline');
    await offlineStore.clearAll();
    try {
      const { clearCache } = await import('@/lib/api/apiCache');
      await clearCache();
    } catch {
      /* apiCache no disponible */
    }
    try {
      if ('caches' in window) {
        const nombres = await caches.keys();
        await Promise.all(nombres.map((n) => caches.delete(n)));
      }
    } catch {
      /* Cache API no disponible */
    }
    localStorage.removeItem(PURGE_DEADLINE_KEY);
    logger.log('[Offline Auth] Cache offline purgada tras el periodo de gracia');
  } catch {
    /* IndexedDB no disponible: no es critico */
  }
}
const SESSION_VALIDITY_DAYS = 30; // La sesion offline dura 30 dias

/**
 * Guardar sesión en caché para uso offline
 */
export function cacheSession(token: string, user: any): void {
  try {
    if (typeof window === 'undefined') return;
    
    // La sesión offline tiene una ventana limitada y debe renovarse online.
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    const cachedSession: CachedSession = {
      token,
      user,
      cachedAt: toBogotaDateTimeOffsetIso(now),
      expiresAt: toBogotaDateTimeOffsetIso(expiresAt),
    };

    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cachedSession));
    // El usuario esta activo: si habia una purga programada por un logout
    // anterior, se cancela.
    cancelarPurgaDatosOffline();
    logger.log('[Offline Auth] Sesión cacheada para uso offline');
  } catch (error) {
    console.error('[Offline Auth] Error cacheando sesión:', error);
  }
}

/**
 * Obtener sesión cacheada si es válida
 */
export function getCachedSession(): CachedSession | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const cached = localStorage.getItem(SESSION_CACHE_KEY);
    if (!cached) return null;

    const session: CachedSession = JSON.parse(cached);

    // Verificar si la sesión ha expirado
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (now > expiresAt) {
      logger.log('[Offline Auth] Sesión offline expirada');
      clearCachedSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('[Offline Auth] Error obteniendo sesión cacheada:', error);
    return null;
  }
}

/**
 * Verificar si hay una sesión offline válida
 */
export function hasValidOfflineSession(): boolean {
  const cached = getCachedSession();
  return cached !== null;
}

/**
 * Limpiar sesión cacheada
 */
export function clearCachedSession(): void {
  try {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(SESSION_CACHE_KEY);
    logger.log('[Offline Auth] Sesión offline limpiada');
  } catch (error) {
    console.error('[Offline Auth] Error limpiando sesión:', error);
  }
}

/**
 * Restaurar sesión desde caché (para uso offline)
 */
export function restoreOfflineSession(): { token: string; user: any } | null {
  if (typeof window === 'undefined') return null;
  
  const cached = getCachedSession();
  if (!cached) return null;

  // Restaurar en localStorage para que el sistema funcione normalmente
  localStorage.setItem('token', cached.token);
  localStorage.setItem('user', JSON.stringify(cached.user));

  logger.log('[Offline Auth] Sesión restaurada desde caché offline');
  return { token: cached.token, user: cached.user };
}

/**
 * Verificar si el token JWT ha expirado (sin validar firma)
 * Nota: Esta es una validación básica, no verifica la firma del token
 */
export function isTokenExpired(token: string): boolean {
  try {
    // Decodificar el payload del JWT (segunda parte)
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decodificar base64url de forma segura
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(base64 + padding));
    
    // Verificar si tiene campo 'exp' (expiration)
    if (!payload.exp) return false; // Si no tiene exp, asumimos que no expira

    // Comparar con tiempo actual (exp está en segundos, Date.now() en milisegundos)
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (error) {
    console.error('[Offline Auth] Error verificando expiración de token:', error);
    return true; // Si hay error, asumimos que está expirado
  }
}

/**
 * Obtener información del token sin validar (solo lectura)
 */
export function decodeToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(base64 + padding));
  } catch (error) {
    console.error('[Offline Auth] Error decodificando token:', error);
    return null;
  }
}

/**
 * Verificar si el sistema puede funcionar offline
 */
export function canWorkOffline(): boolean {
  // Verificar si hay datos en IndexedDB
  const hasToken = !!localStorage.getItem('token');
  const hasUser = !!localStorage.getItem('user');
  const hasOfflineCache = hasValidOfflineSession();

  return (hasToken && hasUser) || hasOfflineCache;
}

/**
 * Obtener días restantes de sesión offline
 */
export function getOfflineSessionDaysRemaining(): number {
  const cached = getCachedSession();
  if (!cached) return 0;

  const now = new Date();
  const expiresAt = new Date(cached.expiresAt);
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Verificar si la sesión offline está por expirar (menos de 3 días)
 */
export function isSessionExpiringSoon(): boolean {
  const daysRemaining = getOfflineSessionDaysRemaining();
  return daysRemaining > 0 && daysRemaining <= 3;
}

/**
 * Renovar sesión offline (actualizar fecha de expiración)
 */
export function renewOfflineSession(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    
    const cached = getCachedSession();
    if (!cached) return false;

    // Actualizar fecha de expiración
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    const renewed: CachedSession = {
      ...cached,
      cachedAt: toBogotaDateTimeOffsetIso(now),
      expiresAt: toBogotaDateTimeOffsetIso(expiresAt),
    };

    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(renewed));
    logger.log('[Offline Auth] Sesión offline renovada');
    return true;
  } catch (error) {
    console.error('[Offline Auth] Error renovando sesión:', error);
    return false;
  }
}

/**
 * Verificar si se debe mostrar notificación de expiración
 */
export function shouldShowExpirationWarning(): boolean {
  if (typeof window === 'undefined') return false;
  
  const warningShownKey = 'offline_expiration_warning_shown';
  const lastWarning = localStorage.getItem(warningShownKey);
  
  if (!isSessionExpiringSoon()) {
    // Limpiar flag si ya no está por expirar
    localStorage.removeItem(warningShownKey);
    return false;
  }

  // Mostrar warning una vez por día
  if (lastWarning) {
    const lastWarningDate = new Date(lastWarning);
    const now = new Date();
    const hoursSinceLastWarning = (now.getTime() - lastWarningDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastWarning < 24) {
      return false; // Ya se mostró en las últimas 24 horas
    }
  }

  // Marcar que se mostró el warning
  localStorage.setItem(warningShownKey, toBogotaDateTimeOffsetIso(new Date()));
  return true;
}
