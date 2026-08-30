/**
 * ============================================================================
 * REMAPEO DE IDs TEMPORALES (offline → real)
 * ============================================================================
 *
 * Problema: cuando se crea una entidad sin conexión (p. ej. un cliente), la UI
 * recibe un id temporal `temp-...`. Si acto seguido, aún offline, se crea otra
 * entidad que la referencia (p. ej. un crédito con `clienteId: temp-...`), esa
 * referencia apunta al id temporal. Al sincronizar, el servidor crea el cliente
 * con un id REAL, pero el crédito seguiría enviando el `temp-...` → el servidor
 * lo rechaza y la operación cae al pipeline de fallos.
 *
 * Solución: cuando una operación de creación se sincroniza con éxito, guardamos
 * el mapeo `temp-... → idReal`. Antes de reenviar cada operación pendiente,
 * reescribimos cualquier referencia al id temporal (en el endpoint y en el
 * cuerpo) por el id real ya conocido.
 *
 * El mapa vive en localStorage para sobrevivir entre corridas de sync (una
 * creación puede sincronizarse en una corrida y su dependiente en otra).
 */

const STORAGE_KEY = 'offline-id-map';

/**
 * Formato EXACTO de los ids temporales que genera la app:
 *   `temp-<timestamp>`        (clientes)
 *   `temp-loan-<timestamp>`   (préstamos)
 * El timestamp de `Date.now()` tiene 13 dígitos; exigimos ≥10 para no confundir
 * un id temporal con un texto del usuario que empiece por "temp-" (p. ej. un
 * nombre "Temp-Store" o una nota "temp-fix").
 */
const TEMP_ID_RE = /^temp-(loan-)?\d{10,}$/i;

const esIdTemporal = (valor: unknown): valor is string =>
  typeof valor === 'string' && TEMP_ID_RE.test(valor);

function leerMapa(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function escribirMapa(mapa: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));
  } catch {
    /* cuota de localStorage llena o bloqueada: no es crítico */
  }
}

/** Registra que un id temporal corresponde a un id real del servidor. */
export function registrarMapeo(tempId: string, idReal: string): void {
  if (!tempId || !idReal || tempId === idReal || !esIdTemporal(tempId)) return;
  const mapa = leerMapa();
  mapa[tempId] = idReal;
  escribirMapa(mapa);
}

/** ¿Hay algún mapeo pendiente? */
export function hayMapeos(): boolean {
  return Object.keys(leerMapa()).length > 0;
}

/** Limpia todo el mapa (usar cuando la cola queda vacía). */
export function limpiarMapeos(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Reescribe un string reemplazándolo por su id real SOLO si coincide de forma
 * exacta con un id temporal conocido (evita reemplazos parciales peligrosos).
 */
function remapearString(valor: string, mapa: Record<string, string>): string {
  return mapa[valor] ?? valor;
}

/**
 * Recorre en profundidad un valor (objeto/array/string) y reemplaza cualquier
 * string que sea EXACTAMENTE un id temporal conocido por su id real. No toca
 * strings que solo contengan el id como subcadena (por seguridad).
 */
export function remapearProfundo<T>(valor: T): T {
  const mapa = leerMapa();
  if (Object.keys(mapa).length === 0) return valor;
  return remapear(valor, mapa) as T;
}

function remapear(valor: unknown, mapa: Record<string, string>): unknown {
  if (typeof valor === 'string') return remapearString(valor, mapa);
  if (Array.isArray(valor)) return valor.map((v) => remapear(v, mapa));
  if (valor && typeof valor === 'object') {
    const salida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      salida[k] = remapear(v, mapa);
    }
    return salida;
  }
  return valor;
}

/**
 * Remapea un endpoint: reemplaza cada segmento de la ruta que sea EXACTAMENTE
 * un id temporal conocido (p. ej. `/clients/temp-123` → `/clients/idReal`).
 */
export function remapearEndpoint(endpoint: string): string {
  const mapa = leerMapa();
  if (Object.keys(mapa).length === 0) return endpoint;
  const [ruta, query] = endpoint.split('?');
  const remapeada = ruta
    .split('/')
    .map((seg) => mapa[seg] ?? seg)
    .join('/');
  return query ? `${remapeada}?${query}` : remapeada;
}

/**
 * Extrae el id real de la respuesta de una creación. Cubre las formas comunes:
 * el cuerpo es la entidad (`{id}`), o viene envuelta (`{data|cliente|prestamo|
 * loan|pago: {id}}`).
 */
/**
 * ¿El endpoint o el cuerpo todavía contienen una referencia a un id temporal
 * SIN resolver? (usado para diferir una operación dependiente cuya creación aún
 * no se ha sincronizado). Detecta solo ids temporales con el formato exacto,
 * nunca texto del usuario que empiece por "temp-".
 */
export function contieneTempIdSinResolver(endpoint: string, data: unknown): boolean {
  const enEndpoint = endpoint.split(/[/?=&]/).some((seg) => esIdTemporal(seg));
  if (enEndpoint) return true;
  return contieneTempEnValor(data);
}

function contieneTempEnValor(valor: unknown): boolean {
  if (typeof valor === 'string') return esIdTemporal(valor);
  if (Array.isArray(valor)) return valor.some(contieneTempEnValor);
  if (valor && typeof valor === 'object') {
    return Object.values(valor as Record<string, unknown>).some(contieneTempEnValor);
  }
  return false;
}

export function extraerIdReal(cuerpo: unknown): string | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const c = cuerpo as Record<string, any>;
  const candidatos = [
    c.id,
    c.data?.id,
    c.cliente?.id,
    c.prestamo?.id,
    c.loan?.id,
    c.pago?.id,
    c.result?.id,
    c.data?.data?.id,
  ];
  for (const cand of candidatos) {
    if (typeof cand === 'string' && cand.length > 0) return cand;
  }
  return null;
}
