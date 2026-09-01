import { logger } from '@/lib/logger'
import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
import { conRespaldoOffline } from '@/lib/offline/conRespaldoOffline';
import { offlineStore } from '@/lib/offline/offlineDb';
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'

const generarIdempotencyKey = (prefix: string) => {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now()}-${random}`;
};

// Interfaces
export interface Caja {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'PRINCIPAL' | 'RUTA';
  rutaId?: string;
  rutaNombre?: string;
  responsable: string;
  responsableId: string;
  saldo: number;
  saldoMinimo?: number;
  saldoMaximo?: number;
  estado: 'ABIERTA' | 'CERRADA';
  transacciones?: number;
  ultimaActualizacion: string;
}

export interface Transaccion {
  id: string;
  numero: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  monto: number;
  descripcion: string;
  caja: string;
  responsable: string;
  estado: string;
  categoria?: string;
  origen?: 'EMPRESA' | 'COBRADOR';
  rutaId?: string;
  cajaId: string;
  cajaOrigenId?: string;
  cajaSaldo?: number;
  direction?: 'IN' | 'OUT';
  impactoCaja?: number;
  impactoResultado?: number;
  accountCode?: string;
  accountName?: string;
}

export interface MovimientoLedger {
  id: string;
  fecha: string;
  tipo: string;
  referenciaId: string;
  descripcion?: string;
  creadoPorId: string;
  totalDebito: number;
  totalCredito: number;
  direction?: 'IN' | 'OUT';
  impactoCaja?: number;
  impactoResultado?: number;
  accountCode?: string | null;
  accountName?: string | null;
  origenGestion?: string | null;
  fechaOperativaRuta?: string | null;
  caja?: string | null;
  cajaId?: string | null;
  cuadrado: boolean;
  lineas: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    cajaId?: string;
    caja?: string | null;
    direction?: 'IN' | 'OUT' | null;
  }>;
}

export interface ResumenFinanciero {
  ingresosHoy: number;
  entradasCajaHoy?: number;
  ingresosDevengadosHoy?: number;
  egresosHoy: number;
  costosVentasHoy?: number;
  ingresosArticulosHoy?: number;
  margenArticulosHoy?: number;
  interesHoy?: number;
  moraHoy?: number;
  otrosIngresosHoy?: number;
  cobranzaHoy?: number;
  gananciaNeta: number;
  utilidadReal?: number;
  capitalEnCalle: number;
  saldoCajas: number;
  cajasAbiertasCount: number;
  rutasTotales: number;
  rutasAbiertas: number;
  rutasPendientesConsolidacion: number;
  consolidacionesHoy: number;
  porcentajeCierre: number;
  fecha: string;
  porcentajeIngresosVsAyer?: number;
  porcentajeEgresosVsAyer?: number;
  esIngresoPositivo?: boolean;
  esEgresoPositivo?: boolean;
}

export interface Gasto {
  id: string;
  numero: string;
  fecha: string;
  tipo: string;
  monto: number;
  descripcion: string;
  cobradorId: string;
  cobrador: string;
  ruta: string;
  caja: string;
  categoriaId?: string | null;
  categoria: string | null;
  estado: string;
}

export interface SaldoDisponibleRuta {
  rutaId: string;
  cajaId?: string;
  fecha: string;
  saldoDisponible: number;
  recaudoDelDia: number;
  cobranzaDelDia: number;
  gastosDelDia: number;
  baseEfectivo: number;
  desembolsos: number;
  netoPeriodo: number;
  saldoCaja?: number;
  mensaje?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// =====================
// CAJAS
// =====================

export async function getCajas(): Promise<Caja[]> {
  try {
    return await apiRequest<Caja[]>('GET', '/accounting/cajas');
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logger.log('[Offline Mode] Cargando cajas desde cache local...');
      const cached = await offlineStore.getAll<Caja>('cajas');
      if (cached.length > 0) return cached;
    }
    const err: any = error as any;
    const statusCode = err?.statusCode;
    if (statusCode === 401 || statusCode === 403) {
      logger.log('[Contabilidad] getCajas omitido por permisos.');
      return [];
    }

    const errorDetails = {
      statusCode: err?.statusCode,
      message: err?.message,
      error: err?.error,
    };
    try {
      console.error(`Error fetching cajas: ${JSON.stringify(errorDetails)}`);
    } catch {
      console.error('Error fetching cajas');
    }
    return [];
  }
}

export async function getCajaById(id: string): Promise<Caja | null> {
  try {
    return await apiRequest<Caja>('GET', `/accounting/cajas/${id}`);
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
       logger.log('[Offline Mode] Buscando caja ID ' + id + ' en cache local...');
       const cached = await offlineStore.getById<Caja>('cajas', id);
       if (cached) return cached;
    }
    const err: any = error as any;
    const statusCode = err?.statusCode;
    if (statusCode === 401 || statusCode === 403) {
      logger.log('[Contabilidad] getCajaById omitido por permisos.');
      return null;
    }

    const errorDetails = {
      statusCode: err?.statusCode,
      message: err?.message,
      error: err?.error,
    };
    try {
      console.error(`Error fetching caja: ${JSON.stringify(errorDetails)}`);
    } catch {
      console.error('Error fetching caja');
    }
    return null;
  }
}

export async function createCaja(data: {
  nombre: string;
  tipo: 'PRINCIPAL' | 'RUTA';
  rutaId?: string;
  responsableId: string;
  saldoInicial?: number;
}): Promise<Caja | null> {
  try {
    return await apiRequest<Caja>('POST', '/accounting/cajas', data);
  } catch (error: any) {
    if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando creacion de caja en cola...');
        await syncService.enqueueOperation(
          'caja_crear',
          '/accounting/cajas',
          'POST',
          data,
          `Crear caja: ${data.nombre}`
        );
        return { ...data, id: `temp-caja-${Date.now()}`, estado: 'ABIERTA', saldo: data.saldoInicial || 0, ultimaActualizacion: toBogotaDateTimeOffsetIso(new Date()), responsable: 'Local', responsableId: data.responsableId, codigo: 'TEMP' } as any;
    }
    console.error('Error creating caja:', error);
    throw error;
  }
}

export async function updateCaja(id: string, data: {
  nombre?: string;
  responsableId?: string;
  activa?: boolean;
}): Promise<Caja | null> {
  try {
    return await apiRequest<Caja>('PATCH', `/accounting/cajas/${id}`, data);
  } catch (error: any) {
    if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando actualizacion de caja en cola...');
        await syncService.enqueueOperation(
          'caja_actualizar',
          `/accounting/cajas/${id}`,
          'PATCH',
          data,
          `Actualizar caja ID: ${id}`
        );
        return { id, ...data } as any;
    }
    throw error;
  }
}

export interface ConsolidarCajaResponse {
  origen: string;
  destino: string;
  monto: number;
  numeroRef: string;
  transacciones: string[];
  idempotente?: boolean;
}

export interface ConsolidarCajaOfflineResponse {
  esOffline: boolean;
  idempotente?: boolean;
}

export async function consolidarCaja(cajaId: string, monto?: number, idempotencyKey?: string): Promise<ConsolidarCajaResponse | ConsolidarCajaOfflineResponse> {
  const key = idempotencyKey || generarIdempotencyKey(`RECOLECCION-${cajaId}`);
  
  try {
    return await apiRequest('POST', `/accounting/cajas/${cajaId}/consolidar`, { 
      monto, 
      idempotencyKey: key 
    });
  } catch (error: any) {
    if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando consolidacion de caja en cola...');
        await syncService.enqueueOperation(
          'caja_consolidar',
          `/accounting/cajas/${cajaId}/consolidar`,
          'POST',
          { monto, idempotencyKey: key },
          `Consolidar caja ID: ${cajaId}`
        );
        return { esOffline: true };
    }
    console.error('Error consolidating caja:', error);
    throw error;
  }
}

export async function getDesglosePagosCaja(cajaId: string, fecha?: string): Promise<{
  efectivo: number;
  transferencia: number;
  total: number;
  cajaNombre?: string;
  fecha?: string | null;
}> {
  try {
    const params = fecha ? `?fecha=${fecha}` : '';
    return await apiRequest('GET', `/accounting/cajas/${cajaId}/desglose-pagos${params}`);
  } catch (error) {
    console.error('Error fetching desglose pagos caja:', error);
    return { efectivo: 0, transferencia: 0, total: 0 };
  }
}

// =====================
// TRANSACCIONES
// =====================

export async function getTransacciones(filtros?: {
  cajaId?: string;
  tipo?: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  fechaInicio?: string;
  fechaFin?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Transaccion>> {
  try {
    const params = new URLSearchParams();
    if (filtros?.cajaId) params.append('cajaId', filtros.cajaId);
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());

    const queryString = params.toString();
    const url = `/accounting/transacciones${queryString ? `?${queryString}` : ''}`;
    
    return await apiRequest<PaginatedResponse<Transaccion>>('GET', url);
  } catch (error) {
    const e: any = error as any;
    console.error('Error fetching transacciones:', {
      urlRequested: (() => {
        try {
          const params = new URLSearchParams();
          if (filtros?.cajaId) params.append('cajaId', filtros.cajaId);
          if (filtros?.tipo) params.append('tipo', filtros.tipo);
          if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
          if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
          if (filtros?.page) params.append('page', filtros.page.toString());
          if (filtros?.limit) params.append('limit', filtros.limit.toString());
          const qs = params.toString();
          return `/accounting/transacciones${qs ? `?${qs}` : ''}`;
        } catch {
          return '/accounting/transacciones';
        }
      })(),
      statusCode: e?.statusCode,
      message: e?.message,
      error: e?.error,
      rawType: typeof e,
      rawKeys: e && typeof e === 'object' ? Object.keys(e) : null,
    });
    return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }
}

export async function getMovimientosLedger(filtros?: {
  tipo?: string;
  cajaId?: string;
  accountCode?: string;
  accountPrefix?: string;
  fechaInicio?: string;
  fechaFin?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<MovimientoLedger>> {
  try {
    const params = new URLSearchParams();
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.cajaId) params.append('cajaId', filtros.cajaId);
    if (filtros?.accountCode) params.append('accountCode', filtros.accountCode);
    if (filtros?.accountPrefix) params.append('accountPrefix', filtros.accountPrefix);
    if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());

    const queryString = params.toString();
    return await apiRequest<PaginatedResponse<MovimientoLedger>>(
      'GET',
      `/accounting/ledger/movimientos${queryString ? `?${queryString}` : ''}`,
    );
  } catch (error) {
    console.error('Error fetching ledger movimientos:', error);
    return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }
}

export async function createTransaccion(data: {
  cajaId: string;
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  monto: number;
  descripcion: string;
  tipoReferencia?: string;
  referenciaId?: string;
  cajaOrigenId?: string;
  accountCode?: string;
  idempotencyKey?: string;
}): Promise<Transaccion | null> {
  const payload = {
    ...data,
    idempotencyKey: data.idempotencyKey || generarIdempotencyKey('trx'),
  };

  try {
    return await apiRequest<Transaccion>('POST', '/accounting/transacciones', payload);
  } catch (error: any) {
    if (
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error?.statusCode === 0 || 
      error?.message?.includes('network') ||
      error?.code === 'ERR_NETWORK'
    ) {
      logger.log('[Offline Mode] Guardando transacción en cola...');
      await syncService.enqueueOperation(
        'transaccion_crear', // Tipo más descriptivo
        '/accounting/transacciones',
        'POST',
        payload,
        `Transacción: ${payload.descripcion} ($${payload.monto})`
      );
      return {
        id: `temp-trx-${Date.now()}`,
        numero: 'OFFLINE',
        fecha: toBogotaDateTimeOffsetIso(new Date()),
        tipo: payload.tipo,
        monto: payload.monto,
        descripcion: payload.descripcion,
        cajaId: payload.cajaId,
        estado: 'PENDIENTE',
        caja: 'Caja Local'
      } as any;
    }
    console.error('Error creating transaccion:', error);
    throw error;
  }
}

export async function getTransaccionById(id: string): Promise<Transaccion | null> {
  try {
    return await apiRequest<Transaccion>('GET', `/accounting/transacciones/${id}`);
  } catch (error) {
    console.error('Error fetching transaccion by id:', error);
    return null;
  }
}

// =====================
// RESUMEN FINANCIERO
// =====================

export async function getResumenFinanciero(fechaInicio?: string, fechaFin?: string): Promise<ResumenFinanciero | null> {
  try {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);

    const queryString = params.toString();
    const url = `/accounting/resumen${queryString ? `?${queryString}` : ''}`;
    
    return await apiRequest<ResumenFinanciero>('GET', url);
  } catch (error) {
    const err: any = error as any
    const statusCode = err?.statusCode
    if (statusCode === 401 || statusCode === 403) {
      logger.log('[Contabilidad] getResumenFinanciero omitido por permisos.')
      return null
    }

    const details = {
      statusCode: err?.statusCode,
      message: err?.message,
      error: err?.error,
    }
    try {
      console.error(`Error fetching resumen financiero: ${JSON.stringify(details)}`)
    } catch {
      console.error('Error fetching resumen financiero')
    }
    return null;
  }
}

// =====================
// GASTOS
// =====================

export async function getGastos(filtros?: {
  rutaId?: string;
  estado?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Gasto>> {
  try {
    const params = new URLSearchParams();
    if (filtros?.rutaId) params.append('rutaId', filtros.rutaId);
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());

    const queryString = params.toString();
    const url = `/accounting/gastos${queryString ? `?${queryString}` : ''}`;
    
    return await apiRequest<PaginatedResponse<Gasto>>('GET', url);
  } catch (error) {
    console.error('Error fetching gastos:', error);
    return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }
}

// =====================
// CIERRES
// =====================

export async function getHistorialCierres(): Promise<any[]> {
    try {
        return await apiRequest<any[]>('GET', '/accounting/cierres');
    } catch (error) {
        console.error('Error fetching cierres:', error);
        return [];
    }
}

export async function getHistorialCierresFiltrado(filtros?: {
  tipo?: 'ARQUEO' | 'CONSOLIDACION' | 'TODOS';
  cajaId?: string;
  soloRutas?: boolean;
  estado?: 'CUADRADA' | 'DESCUADRADA' | 'TODOS';
  fechaInicio?: string;
  fechaFin?: string;
}): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (filtros?.tipo && filtros.tipo !== 'TODOS') params.append('tipo', filtros.tipo);
    if (filtros?.cajaId) params.append('cajaId', filtros.cajaId);
    if (typeof filtros?.soloRutas !== 'undefined') params.append('soloRutas', filtros.soloRutas ? '1' : '0');
    if (filtros?.estado && filtros.estado !== 'TODOS') params.append('estado', filtros.estado);
    if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
    const qs = params.toString();
    return await apiRequest<any[]>('GET', `/accounting/cierres${qs ? `?${qs}` : ''}`);
  } catch (error) {
    console.error('Error fetching cierres filtrados:', error);
    return [];
  }
}

export async function getArqueoPreview(cajaId: string, fechaOperativa?: string): Promise<any> {
  try {
    const params = fechaOperativa ? `?fechaOperativa=${fechaOperativa}` : '';
    logger.log('[getArqueoPreview] Requesting:', `/cajas/${cajaId}/arqueo/preview${params}`);
    return await apiRequest<any>('GET', `/cajas/${cajaId}/arqueo/preview${params}`);
  } catch (error: any) {
    console.error('[getArqueoPreview] Full error:', {
      message: error?.message,
      statusCode: error?.statusCode,
      error: error?.error,
      stack: error?.stack,
      fullError: JSON.stringify(error, null, 2)
    });
    throw error;
  }
}

export async function getArqueoById(arqueoId: string): Promise<any> {
  try {
    return await apiRequest<any>('GET', `/cajas/arqueos/${arqueoId}`);
  } catch (error: any) {
    console.error('[getArqueoById] Full error:', {
      message: error?.message,
      statusCode: error?.statusCode,
      error: error?.error,
      stack: error?.stack,
      fullError: JSON.stringify(error, null, 2)
    });
    throw error;
  }
}

export async function confirmarArqueo(cajaId: string, data: {
  fechaOperativa: string;
  efectivoContado: number;
  recibidoPorId?: string;
  denominaciones?: any;
  observaciones?: string;
}): Promise<any> {
  try {
    return await apiRequest<any>('POST', `/cajas/${cajaId}/arqueos`, data);
  } catch (error: any) {
    if (
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error?.statusCode === 0 || 
      error?.message?.includes('network') ||
      error?.code === 'ERR_NETWORK'
    ) {
      logger.log('[Offline Mode] Guardando arqueo en cola...');
      await syncService.enqueueOperation(
        'arqueo_registrar',
        `/cajas/${cajaId}/arqueos`,
        'POST',
        data,
        `Arqueo de Caja (Offline)`
      );
      return { id: `temp-arq-${Date.now()}`, esOffline: true };
    }
    console.error('Error registrando arqueo:', error);
    throw error;
  }
}

export async function registrarArqueo(cajaId: string, data: {
  efectivoReal: number;
  saldoSistema: number;
  diferencia: number;
  observaciones?: string;
}): Promise<any> {
  try {
    return await apiRequest<any>('POST', `/accounting/cajas/${cajaId}/arqueos`, data);
  } catch (error: any) {
    if (
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error?.statusCode === 0 || 
      error?.message?.includes('network') ||
      error?.code === 'ERR_NETWORK'
    ) {
      logger.log('[Offline Mode] Guardando arqueo en cola...');
      await syncService.enqueueOperation(
        'arqueo_registrar',
        `/accounting/cajas/${cajaId}/arqueos`,
        'POST',
        data,
        `Arqueo de Caja (Offline)`
      );
      return { id: `temp-arq-${Date.now()}`, esOffline: true };
    }
    console.error('Error registrando arqueo:', error);
    throw error;
  }
}

export async function obtenerSaldoDisponibleRuta(
  rutaId: string, 
  fecha?: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<SaldoDisponibleRuta> {
  const params = new URLSearchParams();
  if (fecha) params.append('fecha', fecha);
  if (fechaInicio) params.append('fechaInicio', fechaInicio);
  if (fechaFin) params.append('fechaFin', fechaFin);
  
  const qs = params.toString();
  return apiRequest<SaldoDisponibleRuta>('GET', `/accounting/rutas/${rutaId}/saldo-disponible${qs ? `?${qs}` : ''}`);
}

export async function obtenerSaldoCajaSupervisor(
  supervisorId: string,
  fecha?: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<SaldoDisponibleRuta> {
  const params = new URLSearchParams();
  if (fecha) params.append('fecha', fecha);
  if (fechaInicio) params.append('fechaInicio', fechaInicio);
  if (fechaFin) params.append('fechaFin', fechaFin);
  
  const qs = params.toString();
  return apiRequest<SaldoDisponibleRuta>('GET', `/accounting/supervisores/${supervisorId}/saldo-disponible${qs ? `?${qs}` : ''}`);
}

export async function getRutaCierreHoy(rutaId: string): Promise<{ rutaId: string; cerradaHoy: boolean; cierreId: string | null; fechaCierre: string | null }> {
  return apiRequest('GET', `/accounting/rutas/${rutaId}/cierre-hoy`);
}

export async function registrarGasto(data: {
  descripcion: string
  valor: number
  comprobante?: File | null
  comprobanteUrl?: string
  fotoRecibo?: string
  rutaId: string
  cobradorId: string
  categoriaId?: string
  esPersonal?: boolean
  idempotencyKey?: string
}): Promise<any> {
  const idempotencyKey = data.idempotencyKey || generarIdempotencyKey('gasto');

  try {
    const payload: any = {
      descripcion: data.descripcion,
      valor: data.valor,
      rutaId: data.rutaId,
      cobradorId: data.cobradorId,
      comprobanteUrl: data.comprobanteUrl,
      fotoRecibo: data.fotoRecibo,
      esPersonal: data.esPersonal,
      idempotencyKey,
      ...(data.categoriaId ? { categoriaId: data.categoriaId } : {}),
    };

    return await apiRequest('POST', '/accounting/gastos', payload);
  } catch (error: any) {
    if (
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error?.statusCode === 0 || 
      error?.message?.includes('network') ||
      error?.code === 'ERR_NETWORK'
    ) {
      logger.log('[Offline Mode] Guardando gasto en cola...');
      
      const payload: any = {
        descripcion: data.descripcion,
        valor: data.valor,
        rutaId: data.rutaId,
        cobradorId: data.cobradorId,
        comprobanteUrl: data.comprobanteUrl,
        fotoRecibo: data.fotoRecibo,
        esPersonal: data.esPersonal,
        idempotencyKey,
        ...(data.categoriaId ? { categoriaId: data.categoriaId } : {}),
      };

      await syncService.enqueueOperation(
        'gasto_registrar',
        '/accounting/gastos',
        'POST',
        payload,
        `Gasto: ${data.descripcion} ($${data.valor})`,
        data.comprobante || undefined
      );

      return { id: `temp-gasto-${Date.now()}`, esOffline: true };
    }
    throw error;
  }
}

export async function dryRunMigracionLedger(): Promise<any> {
  return conRespaldoOffline(
    () => apiRequest('POST', '/accounting/migration-ledger/dry-run'),
    { type: 'migracion_ledger_dryrun', endpoint: '/accounting/migration-ledger/dry-run', method: 'POST', description: `Simulación de migración de ledger` },
    { esOffline: true },
  );
}

export async function aplicarMigracionLedger(): Promise<any> {
  return conRespaldoOffline(
    () => apiRequest('POST', '/accounting/migration-ledger/apply'),
    { type: 'migracion_ledger_apply', endpoint: '/accounting/migration-ledger/apply', method: 'POST', description: `Aplicar migración de ledger` },
    { esOffline: true },
  );
}

export async function solicitarBase(data: { 
  monto: number
  descripcion: string
  cobradorId: string 
  rutaId: string 
}): Promise<any> {
  try {
    return await apiRequest('POST', '/accounting/base-requests', data);
  } catch (error: any) {
    if (
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error?.statusCode === 0 || 
      error?.message?.includes('network') ||
      error?.code === 'ERR_NETWORK'
    ) {
      logger.log('[Offline Mode] Guardando solicitud de base en cola...');
      await syncService.enqueueOperation(
        'base_solicitar',
        '/accounting/base-requests',
        'POST',
        data,
        `Solicitud de Base: $${data.monto}`
      );
      return { id: `temp-base-${Date.now()}`, esOffline: true };
    }
    throw error;
  }
}

// =====================================================
// DEUDAS DE COBRADORES
// =====================================================

export type DeudaEvento = {
  id: string;
  tipoReferencia: string;
  monto: number;
  fecha: string;
  cajaId: string;
  referenciaId?: string;
  descripcion?: string;
};

export type DeudaCobrador = {
  cobradorId: string;
  nombreCobrador: string;
  rol: string;
  totalDeuda: number;
  gastosPersonales: number;
  descuadres: number;
  efectivoBajoCustodia: number;
  totalEventos: number;
  eventos?: DeudaEvento[];
};

export async function getDeudoresCobrador(): Promise<DeudaCobrador[]> {
  try {
    return await apiRequest<DeudaCobrador[]>('GET', '/accounting/deudas-cobradores');
  } catch (error) {
    const err: any = error as any
    const statusCode = err?.statusCode
    if (statusCode === 401 || statusCode === 403) {
      logger.log('[Contabilidad] getDeudoresCobrador omitido por permisos.')
      return []
    }

    const details = {
      statusCode: err?.statusCode,
      message: err?.message,
      error: err?.error,
    }
    try {
      logger.error(`Error fetching deudas cobrador: ${JSON.stringify(details)}`)
    } catch {
      logger.error('Error fetching deudas cobrador')
    }
    return [];
  }
}

export async function registrarAbonoDeudaCobrador(
  cobradorId: string,
  monto: number,
  nota: string,
  cajaIdDestino?: string,
): Promise<Transaccion | null> {
  const payload = {
    monto,
    nota,
    cajaIdDestino,
    // Misma clave online y offline: un reintento tras sincronizar no duplica.
    idempotencyKey: `abono-${cobradorId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  };
  try {
    return await apiRequest<Transaccion>('POST', `/accounting/deudas-cobradores/${cobradorId}/abono`, payload);
  } catch (error: any) {
    if (
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error?.statusCode === 0 ||
      error?.message?.includes('network') ||
      error?.code === 'ERR_NETWORK'
    ) {
      logger.log('[Offline Mode] Guardando abono a deuda de cobrador en cola...');
      await syncService.enqueueOperation(
        'abono_deuda_cobrador',
        `/accounting/deudas-cobradores/${cobradorId}/abono`,
        'POST',
        payload,
        `Abono a deuda de cobrador (${cobradorId})`,
      );
      // La transacción se materializa al sincronizar.
      return null;
    }
    logger.error('Error al registrar el abono:', error);
    throw error;
  }
}
