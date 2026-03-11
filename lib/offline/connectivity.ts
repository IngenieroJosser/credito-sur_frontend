/**
 * ============================================================
 * UTILIDAD DE CONECTIVIDAD REAL
 * ============================================================
 *
 * Problema: navigator.onLine solo detecta si la interfaz de red
 * está activa (cable/WiFi conectado), NO si hay internet real.
 * Si el router tiene WiFi pero no internet, onLine = true.
 *
 * Solución: hacer un HEAD a /api/ping (Vercel, ultra rápido)
 * para confirmar que hay conexión a internet real.
 *
 * Cache de 10s para evitar over-fetching.
 */

const PING_ENDPOINT = '/api/ping';
const PING_TIMEOUT_MS = 4000;
const CACHE_DURATION_MS = 10_000; // No re-pinguear más de 1 vez cada 10s

let lastCheckAt = 0;
let lastResult: boolean =
  typeof navigator !== 'undefined' ? navigator.onLine : true;

/**
 * Verifica conectividad real con internet (no solo onLine).
 * Cachea el resultado 10 segundos para evitar exceso de requests.
 */
export async function checkRealConnectivity(): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  // Cache: si el check es reciente, devolver el último resultado
  const now = Date.now();
  if (now - lastCheckAt < CACHE_DURATION_MS) {
    return lastResult;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    const response = await fetch(PING_ENDPOINT, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    lastCheckAt = Date.now();
    lastResult = response.ok;
    return lastResult;
  } catch {
    // AbortError (timeout) o NetworkError → sin internet real
    lastCheckAt = Date.now();
    lastResult = false;
    return false;
  }
}

/**
 * Fuerza un re-check ignorando el cache.
 * Usar solo cuando queremos confirmación inmediata (ej: al reconectar).
 */
export async function checkRealConnectivityForce(): Promise<boolean> {
  lastCheckAt = 0; // Invalidar cache
  return checkRealConnectivity();
}

/**
 * Registrar resultado externo para actualizar el cache
 * (cuando ya sabemos que estamos offline por otro medio).
 */
export function setConnectivityResult(online: boolean): void {
  lastResult = online;
  lastCheckAt = Date.now();
}
