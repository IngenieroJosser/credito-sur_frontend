import { apiRequest } from '@/lib/api/api';

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
  tipo: 'INGRESO' | 'EGRESO';
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
    console.error('Error fetching cajas:', error);
    return [];
  }
}

export async function getCajaById(id: string): Promise<Caja | null> {
  try {
    return await apiRequest<Caja>('GET', `/accounting/cajas/${id}`);
  } catch (error) {
    console.error('Error fetching caja:', error);
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
  } catch (error) {
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
  } catch (error) {
    throw error;
  }
}

export async function consolidarCaja(cajaId: string) {
  try {
    return await apiRequest('POST', `/accounting/cajas/${cajaId}/consolidar`);
  } catch (error) {
    console.error('Error consolidating caja:', error);
    throw error;
  }
}

// =====================
// TRANSACCIONES
// =====================

export async function getTransacciones(filtros?: {
  cajaId?: string;
  tipo?: 'INGRESO' | 'EGRESO';
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
    console.error('Error fetching transacciones:', error);
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
  } catch (error) {
    console.error('Error creating transaccion:', error);
    throw error;
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
    console.error('Error fetching resumen financiero:', error);
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
