import { mapFrecuenciaToPeriodo, type PeriodoRuta } from '@/lib/types/cobranza';

const BOGOTA_TZ = 'America/Bogota';

type BogotaParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

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
  const p = getBogotaParts(date);
  if (!p) return '';
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000-05:00`;
};

export const toBogotaDateTimeLocalInputValue = (date: Date | string | number): string => {
  const p = getBogotaParts(date);
  if (!p) return '';
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

export const getBogotaNowKey = (): string => getBogotaDateKey(new Date());

export const getBogotaRangeByPeriod = (period: 'HOY' | 'SEM' | 'MES' | 'AÑO'): { inicio: string; fin: string } => {
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
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getBogotaDateKey = (date: Date | string | number): string => {
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
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const fromIso = s.includes('T') ? s.split('T')[0] : '';
  if (fromIso && /^\d{4}-\d{2}-\d{2}$/.test(fromIso)) return fromIso;
  return getBogotaDateKey(s);
};

export const isDateKeyOnOrBefore = (aKey: string, bKey: string): boolean => {
  if (!aKey || !bKey) return false;
  const [ay, am, ad] = aKey.split('-').map(Number);
  const [by, bm, bd] = bKey.split('-').map(Number);
  if (!ay || !am || !ad || !by || !bm || !bd) return false;
  const a = new Date(ay, am - 1, ad, 0, 0, 0, 0).getTime();
  const b = new Date(by, bm - 1, bd, 0, 0, 0, 0).getTime();
  return a <= b;
};

export const isTodayOrPastBogota = (raw: string | Date | null | undefined): boolean => {
  const key = typeof raw === 'string' ? normalizeDateKey(raw) : raw instanceof Date ? getBogotaDateKey(raw) : '';
  if (!key) return true;
  const today = getBogotaDateKey(new Date());
  if (!today) return true;
  return isDateKeyOnOrBefore(key, today);
};

export const frecuenciaToPeriodoRuta = (frecuencia: string | null | undefined): PeriodoRuta => {
  return mapFrecuenciaToPeriodo(String(frecuencia || '').toUpperCase());
};

export const resolveFechaEfectivaCuota = (cuota: any): string => {
  if (!cuota) return '';
  const estado = String(cuota?.estado || '').toUpperCase();
  const raw = (estado === 'PRORROGADA' && cuota?.fechaVencimientoProrroga)
    ? cuota.fechaVencimientoProrroga
    : cuota?.fechaVencimiento;
  return raw ? String(raw) : '';
};

export const resolveProximaCuotaFromPrestamo = (prestamo: any): { cuota: any | null; fechaEfectiva: string } => {
  if (!prestamo) return { cuota: null, fechaEfectiva: '' };

  const backendProx = prestamo?.proximaCuota ?? null;
  if (backendProx) {
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

  const noPagada = (c: any) => {
    const s = String(c?.estado || '').toUpperCase();
    return s !== 'PAGADA' && s !== 'PAGADO' && s !== 'ANULADA' && s !== 'ANULADO';
  };
  const cuota = cuotasSorted.find(noPagada) || cuotasSorted[0] || null;
  const fechaEfectiva = cuota ? (resolveFechaEfectivaCuota(cuota) || String(cuota?.fechaVencimiento || '')) : '';
  return { cuota, fechaEfectiva };
};

export const resolveNextPagoFromPrestamo = (prestamo: any): { monto: number | null; fecha: string | null; cuota: any | null; fechaEfectiva: string } => {
  const { cuota, fechaEfectiva } = resolveProximaCuotaFromPrestamo(prestamo);
  if (!cuota) return { monto: null, fecha: null, cuota: null, fechaEfectiva: '' };
  const monto = Number((cuota as any)?.montoNominal ?? (cuota as any)?.monto ?? 0);
  const fecha = String(fechaEfectiva || (cuota as any)?.fechaVencimiento || '') || null;
  return { monto, fecha, cuota, fechaEfectiva: String(fechaEfectiva || '') };
};

export const resolveCuotaProgressFromPrestamo = (prestamo: any): { cuotaActual: number | null; cuotasTotales: number | null } => {
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
