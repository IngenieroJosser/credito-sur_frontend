import { logger } from '@/lib/logger'
import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
import { offlineStore } from '@/lib/offline/offlineDb';
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'

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
}

export interface ResumenFinanciero {
  ingresosHoy: number;
  egresosHoy: number;
  gananciaNeta: number;
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
  cobrador: string;
  ruta: string;
  caja: string;
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
  saldoActual?: number;
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

export async function consolidarCaja(cajaId: string, monto?: number) {
  try {
    return await apiRequest('POST', `/accounting/cajas/${cajaId}/consolidar`, monto ? { monto } : {});
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
          monto ? { monto } : null,
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

export async function createTransaccion(data: {
  cajaId: string;
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  descripcion: string;
  tipoReferencia?: string;
  referenciaId?: string;
  cajaOrigenId?: string;
}): Promise<Transaccion | null> {
  try {
    return await apiRequest<Transaccion>('POST', '/accounting/transacciones', data);
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
        data,
        `Transacción: ${data.descripcion} ($${data.monto})`
      );
      return {
        id: `temp-trx-${Date.now()}`,
        numero: 'OFFLINE',
        fecha: toBogotaDateTimeOffsetIso(new Date()),
        tipo: data.tipo,
        monto: data.monto,
        descripcion: data.descripcion,
        cajaId: data.cajaId,
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

export async function getRutaCierreHoy(rutaId: string): Promise<{ rutaId: string; cerradaHoy: boolean; cierreId: string | null; fechaCierre: string | null }> {
  return apiRequest('GET', `/accounting/rutas/${rutaId}/cierre-hoy`);
}

export async function registrarGasto(data: {
  descripcion: string
  valor: number
  comprobante?: File | null
  rutaId: string
  cobradorId: string
}): Promise<any> {
  try {
    const payload: any = {
      descripcion: data.descripcion,
      valor: data.valor,
      rutaId: data.rutaId,
      cobradorId: data.cobradorId
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
        cobradorId: data.cobradorId
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

export type DeudaCobrador = {
  cobradorId: string;
  nombreCobrador: string;
  rol: string;
  totalDeuda: number;
  gastosPersonales: number;
  descuadres: number;
  totalEventos: number;
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
  try {
    return await apiRequest<Transaccion>('POST', `/accounting/deudas-cobradores/${cobradorId}/abono`, {
      monto,
      nota,
      cajaIdDestino,
    });
  } catch (error) {
    logger.error('Error al registrar el abono:', error);
    throw error;
  }
}
