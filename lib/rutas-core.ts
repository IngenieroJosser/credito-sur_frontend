import { mapFrecuenciaToPeriodo, type PeriodoRuta } from '@/lib/types/cobranza';

// -----------------------------------------------------------------------------
// Núcleo compartido de lógica para Rutas (Cobrador / Supervisor / Admin)
// -----------------------------------------------------------------------------
// Este archivo centraliza utilidades puras (sin efectos secundarios) que se
// reutilizan en distintas vistas para evitar duplicación y divergencias.
//
// Principios importantes:
// - Todas las comparaciones de fechas "por día" deben hacerse con una llave
//   YYYY-MM-DD en zona horaria de Bogotá.
// - Para un préstamo en mora (cuotas vencidas o atrasadas), el monto exigible
//   del día puede ser la suma de todas las cuotas no pagadas con vencimiento
//   efectivo <= HOY.
// - La lógica de "aparece hoy" y "pagado" se comparte para no romper reglas
//   de negocio entre roles.

const BOGOTA_TZ = 'America/Bogota';

type BogotaParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

// Obtiene (en formato de partes) la fecha/hora en zona horaria Bogotá.
// Se usa para construir strings ISO con offset -05:00 de forma determinista.
const getBogotaParts = (date: Date | string | number): BogotaParts | null => {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: BOGOTA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = p.value;
    }
    if (!map.year || !map.month || !map.day || !map.hour || !map.minute || !map.second) return null;
    return {
      year: map.year,
      month: map.month,
      day: map.day,
      hour: map.hour,
      minute: map.minute,
      second: map.second,
    };
  } catch {
    return null;
  }
};

export const toBogotaDateTimeOffsetIso = (date: Date | string | number): string => {
  // Convierte cualquier fecha a un ISO string con offset Bogotá (-05:00)
  // manteniendo los componentes (Y-M-D H:M:S) correspondientes a Bogotá.
  const p = getBogotaParts(date);
  if (!p) return '';
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000-05:00`;
};

export const toBogotaDateTimeLocalInputValue = (date: Date | string | number): string => {
  // Formato compatible con <input type="datetime-local">.
  // Importante: es un string local, no incluye offset.
  const p = getBogotaParts(date);
  if (!p) return '';
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

export const getBogotaNowKey = (): string => getBogotaDateKey(new Date());

export const getBogotaRangeByPeriod = (period: 'HOY' | 'SEM' | 'MES' | 'AÑO'): { inicio: string; fin: string } => {
  // Rango (inicio/fin) en ISO con offset Bogotá para filtros rápidos:
  // HOY, SEMANA (lunes-domingo), MES (del 1 al día actual), AÑO (del 1/1 al día actual).
  const todayKey = getBogotaDateKey(new Date());
  if (!todayKey) return { inicio: '', fin: '' };
  const [yStr, mStr, dStr] = todayKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return { inicio: '', fin: '' };

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const asIso = (yy: number, mm: number, dd: number, hh: number, mi: number, ss: number, ms: number) => {
    const mms = String(ms).padStart(3, '0');
    return `${yy}-${pad2(mm)}-${pad2(dd)}T${pad2(hh)}:${pad2(mi)}:${pad2(ss)}.${mms}-05:00`;
  };

  if (period === 'HOY') {
    return {
      inicio: asIso(y, m, d, 0, 0, 0, 0),
      fin: asIso(y, m, d, 23, 59, 59, 999),
    };
  }

  const bogotaNoon = new Date(`${todayKey}T12:00:00-05:00`);
  const jsDow = bogotaNoon.getDay();
  const diffToMonday = jsDow === 0 ? -6 : 1 - jsDow;
  const monday = new Date(bogotaNoon);
  monday.setDate(bogotaNoon.getDate() + diffToMonday);
  const mondayKey = getBogotaDateKey(monday);
  if (!mondayKey) return { inicio: '', fin: '' };
  const [myStr, mmStr, mdStr] = mondayKey.split('-');
  const my = Number(myStr);
  const mm = Number(mmStr);
  const md = Number(mdStr);

  if (period === 'SEM') {
    const sunday = new Date(`${mondayKey}T12:00:00-05:00`);
    sunday.setDate(sunday.getDate() + 6);
    const sundayKey = getBogotaDateKey(sunday);
    if (!sundayKey) return { inicio: '', fin: '' };
    const [syStr, smStr, sdStr] = sundayKey.split('-');
    return {
      inicio: asIso(my, mm, md, 0, 0, 0, 0),
      fin: asIso(Number(syStr), Number(smStr), Number(sdStr), 23, 59, 59, 999),
    };
  }

  if (period === 'MES') {
    return {
      inicio: asIso(y, m, 1, 0, 0, 0, 0),
      fin: asIso(y, m, d, 23, 59, 59, 999),
    };
  }

  return {
    inicio: asIso(y, 1, 1, 0, 0, 0, 0),
    fin: asIso(y, m, d, 23, 59, 59, 999),
  };
};

export const buildBogotaOffsetIsoFromKey = (
  key: string,
  time: { hh: number; mm: number; ss?: number; ms?: number },
): string => {
  // Construye un ISO con offset Bogotá (-05:00) a partir de una llave YYYY-MM-DD.
  // Útil para armar rangos a medianoche sin depender de Date() local.
  if (!key) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const [yStr, mStr, dStr] = key.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return '';
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const ss = time.ss ?? 0;
  const ms = time.ms ?? 0;
  const mms = String(ms).padStart(3, '0');
  return `${y}-${pad2(m)}-${pad2(d)}T${pad2(time.hh)}:${pad2(time.mm)}:${pad2(ss)}.${mms}-05:00`;
};

export const getBogotaRangeForFinancialPeriod = (
  period: 'DIARIO' | 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL',
  now: Date = new Date(),
): { inicio: string; fin: string } => {
  // Rango de fechas para reportes/contabilidad.
  // - DIARIO: desde 00:00 Bogotá hasta "now".
  // - MENSUAL: desde el día 1 del mes hasta "now".
  // - TRIMESTRAL: desde 3 meses atrás (día 1) hasta "now".
  // - ANUAL: desde 01-01 hasta "now".
  const nowKey = getBogotaDateKey(now);
  if (!nowKey) return { inicio: '', fin: '' };

  const baseNoon = new Date(`${nowKey}T12:00:00-05:00`);
  const y = baseNoon.getFullYear();
  const m = baseNoon.getMonth();
  const d = baseNoon.getDate();

  if (period === 'DIARIO') {
    return {
      inicio: buildBogotaOffsetIsoFromKey(nowKey, { hh: 0, mm: 0, ss: 0, ms: 0 }),
      fin: toBogotaDateTimeOffsetIso(now),
    };
  }

  if (period === 'MENSUAL') {
    const start = new Date(y, m, 1, 12, 0, 0, 0);
    const startKey = getBogotaDateKey(start);
    return {
      inicio: buildBogotaOffsetIsoFromKey(startKey, { hh: 0, mm: 0, ss: 0, ms: 0 }),
      fin: toBogotaDateTimeOffsetIso(now),
    };
  }

  if (period === 'TRIMESTRAL') {
    const start = new Date(y, m - 3, 1, 12, 0, 0, 0);
    const startKey = getBogotaDateKey(start);
    return {
      inicio: buildBogotaOffsetIsoFromKey(startKey, { hh: 0, mm: 0, ss: 0, ms: 0 }),
      fin: toBogotaDateTimeOffsetIso(now),
    };
  }

  const startYearKey = `${y}-01-01`;
  return {
    inicio: buildBogotaOffsetIsoFromKey(startYearKey, { hh: 0, mm: 0, ss: 0, ms: 0 }),
    fin: toBogotaDateTimeOffsetIso(now),
  };
};

export const getLocalDateKey = (d: Date): string => {
  // Llave YYYY-MM-DD pero en zona horaria local del dispositivo.
  // Evitar usarla en comparaciones de negocio si se requiere semántica Bogotá.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getBogotaDateKey = (date: Date | string | number): string => {
  // Llave YYYY-MM-DD interpretada en zona horaria Bogotá.
  // Esta es la representación canónica para comparaciones por día.
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const parts = d
      .toLocaleDateString('en-CA', { timeZone: BOGOTA_TZ })
      .split('-');
    if (parts.length !== 3) return '';
    const [yyyy, mm, dd] = parts;
    if (!yyyy || !mm || !dd) return '';
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return '';
  }
};

export const normalizeDateKey = (raw: string | null | undefined): string => {
  // Normaliza un valor (YYYY-MM-DD, ISO string o Date-like) a llave Bogotá YYYY-MM-DD.
  // Si es ISO, toma el componente de fecha; si no, intenta parsear a Date.
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const fromIso = s.includes('T') ? s.split('T')[0] : '';
  if (fromIso && /^\d{4}-\d{2}-\d{2}$/.test(fromIso)) return fromIso;
  return getBogotaDateKey(s);
};

export const isDateKeyOnOrBefore = (aKey: string, bKey: string): boolean => {
  // Comparación inclusiva entre llaves YYYY-MM-DD.
  // Nota: hace parsing a Date() sin TZ explícita; por eso se asume que las llaves ya
  // fueron normalizadas (Bogotá) y solo se compara el orden del calendario.
  if (!aKey || !bKey) return false;
  const [ay, am, ad] = aKey.split('-').map(Number);
  const [by, bm, bd] = bKey.split('-').map(Number);
  if (!ay || !am || !ad || !by || !bm || !bd) return false;
  const a = new Date(ay, am - 1, ad, 0, 0, 0, 0).getTime();
  const b = new Date(by, bm - 1, bd, 0, 0, 0, 0).getTime();
  return a <= b;
};

export const isTodayOrPastBogota = (raw: string | Date | null | undefined): boolean => {
  // Devuelve true si la fecha (interpretada en Bogotá) es HOY o anterior.
  // Si no se puede resolver, se comporta de forma permisiva (true) para no bloquear flujos.
  const key = typeof raw === 'string' ? normalizeDateKey(raw) : raw instanceof Date ? getBogotaDateKey(raw) : '';
  if (!key) return true;
  const today = getBogotaDateKey(new Date());
  if (!today) return true;
  return isDateKeyOnOrBefore(key, today);
};

export const frecuenciaToPeriodoRuta = (frecuencia: string | null | undefined): PeriodoRuta => {
  // Mapea frecuencia de pago (DIARIO/SEMANAL/QUINCENAL/MENSUAL) a PeriodoRuta.
  return mapFrecuenciaToPeriodo(String(frecuencia || '').toUpperCase());
};

export const resolveFechaEfectivaCuota = (cuota: any): string => {
  // Determina la "fecha efectiva" de una cuota.
  // Si la cuota está PRORROGADA y trae fechaVencimientoProrroga, esa fecha manda.
  // En caso contrario usa fechaVencimiento.
  if (!cuota) return '';
  const estado = String(cuota?.estado || '').toUpperCase();
  const raw = (estado === 'PRORROGADA' && cuota?.fechaVencimientoProrroga)
    ? cuota.fechaVencimientoProrroga
    : cuota?.fechaVencimiento;
  return raw ? String(raw) : '';
};

export const resolveProximaCuotaFromPrestamo = (prestamo: any): { cuota: any | null; fechaEfectiva: string } => {
  // Resuelve la próxima cuota exigible de un préstamo.
  // Preferencia:
  // 1) prestamo.proximaCuota (si el backend la entrega)
  // 2) primera cuota no pagada del array prestamo.cuotas (ordenadas por fecha efectiva)
  if (!prestamo) return { cuota: null, fechaEfectiva: '' };

  const noPagada = (c: any) => {
    const s = String(c?.estado || '').toUpperCase();
    return s !== 'PAGADA' && s !== 'PAGADO' && s !== 'ANULADA' && s !== 'ANULADO';
  };

  const backendProx = prestamo?.proximaCuota ?? null;
  // Solo confiar en proximaCuota si realmente es exigible (no pagada/anulada).
  // En algunos registros el backend puede entregar una proximaCuota desactualizada.
  if (backendProx && noPagada(backendProx)) {
    const fechaEfectiva = resolveFechaEfectivaCuota(backendProx) || String(backendProx?.fechaVencimiento || '');
    return { cuota: backendProx, fechaEfectiva };
  }

  const cuotas = Array.isArray(prestamo?.cuotas) ? prestamo.cuotas : [];
  if (cuotas.length === 0) return { cuota: null, fechaEfectiva: '' };

  const cuotasSorted = [...cuotas].sort((a, b) => {
    const aKey = normalizeDateKey(resolveFechaEfectivaCuota(a));
    const bKey = normalizeDateKey(resolveFechaEfectivaCuota(b));
    if (aKey && bKey) return aKey.localeCompare(bKey);
    if (aKey) return -1;
    if (bKey) return 1;
    return 0;
  });

  const cuota = cuotasSorted.find(noPagada) || cuotasSorted[0] || null;
  const fechaEfectiva = cuota ? (resolveFechaEfectivaCuota(cuota) || String(cuota?.fechaVencimiento || '')) : '';
  return { cuota, fechaEfectiva };
};

export const resolveNextPagoFromPrestamo = (prestamo: any): { monto: number | null; fecha: string | null; cuota: any | null; fechaEfectiva: string } => {
  // Wrapper que devuelve (monto, fecha) de la cuota próxima, más la cuota y su fecha efectiva.
  // Se usa para mostrar "próximo pago" en UI.
  const { cuota, fechaEfectiva } = resolveProximaCuotaFromPrestamo(prestamo);
  if (!cuota) return { monto: null, fecha: null, cuota: null, fechaEfectiva: '' };
  const monto = Number((cuota as any)?.montoNominal ?? (cuota as any)?.monto ?? 0);
  const fecha = String(fechaEfectiva || (cuota as any)?.fechaVencimiento || '') || null;
  return { monto, fecha, cuota, fechaEfectiva: String(fechaEfectiva || '') };
};

export const resolveCuotaProgressFromPrestamo = (prestamo: any): { cuotaActual: number | null; cuotasTotales: number | null } => {
  // Devuelve el progreso del plan de pagos:
  // - cuotaActual: número de la primera cuota no pagada (o la primera cuota si no hay estado)
  // - cuotasTotales: cantidad total de cuotas (preferencia: prestamo.cantidadCuotas)
  if (!prestamo) return { cuotaActual: null, cuotasTotales: null };

  const cuotas = Array.isArray(prestamo?.cuotas) ? prestamo.cuotas : [];
  const cuotasTotales = Number(prestamo?.cantidadCuotas ?? cuotas.length ?? 0) || null;

  const noPagada = (c: any) => {
    const s = String(c?.estado || '').toUpperCase();
    return s !== 'PAGADA' && s !== 'PAGADO' && s !== 'ANULADA' && s !== 'ANULADO';
  };

  if (cuotas.length > 0) {
    const cuotasSorted = [...cuotas].sort((a, b) => {
      const aKey = normalizeDateKey(resolveFechaEfectivaCuota(a));
      const bKey = normalizeDateKey(resolveFechaEfectivaCuota(b));
      if (aKey && bKey) return aKey.localeCompare(bKey);
      if (aKey) return -1;
      if (bKey) return 1;
      return 0;
    });
    const cuota = cuotasSorted.find(noPagada) || cuotasSorted[0] || null;
    const cuotaActual = cuota?.numeroCuota != null ? Number(cuota.numeroCuota) : null;
    return { cuotaActual, cuotasTotales };
  }

  const backendProx = prestamo?.proximaCuota ?? null;
  const cuotaActual = backendProx?.numeroCuota != null ? Number(backendProx.numeroCuota) : null;
  return { cuotaActual, cuotasTotales };
};

export const getPagoBogotaDateKey = (raw: unknown): string => {
  // Normaliza fecha de pago (fechaPago/creadoEn, etc.) a llave Bogotá YYYY-MM-DD.
  // Acepta string YYYY-MM-DD directo o cualquier valor parseable por Date.
  if (!raw) return '';
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  try {
    return getBogotaDateKey(new Date(raw as any));
  } catch {
    return '';
  }
};

export const isVisitaExigibleHoy = (visita: any, hoyBogotaKey: string): boolean => {
  // Regla compartida: determina si una "visita" debe aparecer hoy.
  // - Si está en mora, aparece siempre.
  // - Si es ruta DIARIA, aparece siempre.
  // - Si no, solo aparece cuando proximaVisita == HOY (llave Bogotá).
  if (!visita) return false;
  const estadoRaw = String(visita?.estado || '').toLowerCase();
  const estado = estadoRaw.replace(/\s+/g, '_');
  if (estado === 'en_mora' || estado.includes('mora')) return true;
  const proximaKey = visita?.proximaVisita ? normalizeDateKey(String(visita.proximaVisita)) : '';
  if (!proximaKey) return true;
  return proximaKey <= hoyBogotaKey;
};

export const shouldMarkVisitaAsPagado = (params: {
  saldoTotal?: unknown;
  recaudadoHoy?: unknown;
  montoCuotaExigible?: unknown;
  estadoActual?: unknown;
}): boolean => {
  // Regla compartida: una visita se marca como pagada si:
  // - el saldoTotal ya es 0 (o menor), o
  // - ya venía en estado "pagado", o
  // - recaudadoHoy cubre el monto exigible (con tolerancia de 1 unidad).
  const saldoTotal = Number(params?.saldoTotal || 0);
  if (saldoTotal <= 0) return true;

  const recaudadoHoy = Number(params?.recaudadoHoy || 0);
  const cuota = Number(params?.montoCuotaExigible || 0);
  if (!(cuota > 0)) return false;

  return recaudadoHoy > 0 && recaudadoHoy >= cuota;
};

export const shouldShowVisitaEnRutaHoy = (visita: any, hoyBogotaKey: string): boolean => {
  // Regla unica para las vistas de ruta: no mostrar cobros futuros ni cuotas ya cubiertas.
  if (!visita) return false;
  const estado = String(visita?.estado || '').toLowerCase().replace(/\s+/g, '_');
  if (estado === 'pagado') return false;

  if (shouldMarkVisitaAsPagado({
    saldoTotal: visita?.saldoTotal,
    recaudadoHoy: visita?.recaudadoDelDia,
    montoCuotaExigible: visita?.montoCuotaPendiente ?? visita?.montoCuota,
    estadoActual: visita?.estado,
  })) {
    return false;
  }

  return isVisitaExigibleHoy(visita, hoyBogotaKey);
};

export const computeMetaHoyFromVisitas = (visitas: any[], hoyBogotaKey: string): number => {
  // Calcula la "meta" del día: suma de montoCuota de las visitas exigibles hoy
  // excluyendo las que ya están pagadas.
  if (!Array.isArray(visitas) || visitas.length === 0) return 0;
  return visitas.reduce((sum: number, v: any) => {
    if (!isVisitaExigibleHoy(v, hoyBogotaKey)) return sum;
    if (String(v?.estado || '').toLowerCase() === 'pagado') return sum;
    const saldo = Number((v as any)?.saldoTotal ?? 0);
    if (saldo <= 0) return sum;

    const cuotaBase = Number(((v as any)?.montoCuotaPendiente ?? v?.montoCuota) || 0);
    const recHoy = Number((v as any)?.recaudadoDelDia || 0);
    const cuotaPendiente = Math.max(0, cuotaBase - recHoy);
    const cuotaUI = Math.min(cuotaPendiente, saldo > 0 ? saldo : cuotaPendiente);
    return sum + Number(cuotaUI || 0);
  }, 0);
};

export const isCuotaNoPagada = (cuota: any): boolean => {
  // Predicado normalizado de "cuota no pagada" (incluye pendientes, vencidas, prorrogadas, etc.).
  const st = String(cuota?.estado || '').toUpperCase();
  return st !== 'PAGADA' && st !== 'PAGADO' && st !== 'ANULADA' && st !== 'ANULADO';
};

export const computeDiasMoraFromCuotas = (
  cuotas: any[],
  hoyBogotaKey: string,
  frecuenciaPagoRaw?: string | null,
): number => {
  if (!Array.isArray(cuotas) || cuotas.length === 0) return 0;
  if (!hoyBogotaKey) return 0;

  const frecuencia = String(frecuenciaPagoRaw || '').toUpperCase();
  const vencidasKeys = (cuotas || [])
    .filter((c: any) => c && isCuotaNoPagada(c))
    .map((c: any) => normalizeDateKey(resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')))
    .filter((k: any) => !!k && k < hoyBogotaKey) as string[];

  if (vencidasKeys.length === 0) return 0;
  const oldestKey = vencidasKeys.reduce((min, k) => (k < min ? k : min), vencidasKeys[0]);
  if (!oldestKey) return 0;

  const parseKeyToBogotaMidday = (key: string) => new Date(`${key}T12:00:00-05:00`);
  const start = parseKeyToBogotaMidday(oldestKey);
  const end = parseKeyToBogotaMidday(hoyBogotaKey);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  if (frecuencia === 'DIARIO') {
    let count = 0;
    const cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    while (cur.getTime() <= end.getTime()) {
      if (cur.getDay() !== 0) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

export const computeMontoExigibleHastaHoyFromCuotas = (cuotas: any[], hoyBogotaKey: string): number => {
  // Regla de negocio clave (mora / abonos parciales):
  // Devuelve el total exigible acumulado hasta HOY (inclusive):
  // suma de todas las cuotas NO PAGADAS cuyo vencimiento efectivo <= hoyBogotaKey.
  //
  // Esto permite que, si el cliente está en mora o viene pagando incompleto,
  // el "montoCuota" mostrado sea la suma de lo pendiente hasta hoy.
  if (!Array.isArray(cuotas) || cuotas.length === 0) return 0;
  if (!hoyBogotaKey) return 0;

  return cuotas.reduce((sum: number, c: any) => {
    if (!c || !isCuotaNoPagada(c)) return sum;
    const vtoRaw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '');
    const vtoKey = normalizeDateKey(vtoRaw);
    if (!vtoKey) return sum;
    if (vtoKey > hoyBogotaKey) return sum;

    const montoDirecto = (c as any)?.montoNominal ?? (c as any)?.monto
    const montoFallback = Number((c as any)?.montoCapital || 0) + Number((c as any)?.montoInteres || 0)
    const monto = Number(montoDirecto ?? montoFallback ?? 0)
    const pagado = Number((c as any)?.montoPagado ?? 0)
    const pendiente = monto - pagado
    return sum + (pendiente > 0 ? pendiente : 0);
  }, 0);
};

export const computeMontoNominalHastaHoyFromCuotas = (cuotas: any[], hoyBogotaKey: string): number => {
  if (!Array.isArray(cuotas) || cuotas.length === 0) return 0;
  if (!hoyBogotaKey) return 0;

  return cuotas.reduce((sum: number, c: any) => {
    if (!c || !isCuotaNoPagada(c)) return sum;
    const vtoRaw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '');
    const vtoKey = normalizeDateKey(vtoRaw);
    if (!vtoKey) return sum;
    if (vtoKey > hoyBogotaKey) return sum;

    const montoDirecto = (c as any)?.montoNominal ?? (c as any)?.monto;
    const montoFallback = Number((c as any)?.montoCapital || 0) + Number((c as any)?.montoInteres || 0);
    const monto = Number(montoDirecto ?? montoFallback ?? 0);
    return sum + (monto > 0 ? monto : 0);
  }, 0);
};

export const resolveCobradorIdForRouteAction = (
  rutaCobradorId?: string | null,
  sessionUserId?: string | null,
): string => {
  const fromRoute = String(rutaCobradorId || '').trim();
  if (fromRoute) return fromRoute;
  return String(sessionUserId || '').trim();
};
