import { apiRequest, ApiRequestConfig } from '@/lib/api/api';
import { AxiosRequestConfig } from 'axios';

export interface Loan {
  id: string;
  numeroPrestamo: string;
  cliente: string;
  clienteId: string;
  clienteDni: string;
  clienteTelefono: string;
  producto: string;
  tipoProducto: 'efectivo' | 'electrodomestico' | 'mueble';
  montoTotal: number;
  montoPendiente: number;
  montoPagado: number;
  moraAcumulada: number;
  cuotasPagadas: number;
  cuotasTotales: number;
  cuotasVencidas: number;
  estado: string;
  riesgo: string;
  ruta: string;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
}

export interface LoansStatistics {
  total: number;
  activos: number;
  atrasados: number;
  morosos: number;
  pagados: number;
  cancelados: number;
  montoTotal: number;
  montoPendiente: number;
  moraTotal: number;
}

export interface LoansResponse {
  prestamos: Loan[];
  estadisticas: LoansStatistics;
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

export interface LoansFilters {
  estado?: string;
  ruta?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
export type EstadoPrestamo = 'EN_MORA' | 'INCUMPLIDO' | 'PERDIDA';

export interface ClienteInfo {
  nombre: string;
  documento: string;
  telefono: string;
  direccion: string;
}

export interface CuentaMora {
  id: string;
  numeroPrestamo: string;
  cliente: ClienteInfo;
  diasMora: number;
  montoMora: number;
  montoTotalDeuda: number;
  cuotasVencidas: number;
  ruta: string;
  cobrador: string;
  nivelRiesgo: NivelRiesgo;
  estado: EstadoPrestamo;
  ultimoPago?: string;
}

export interface PrestamosMoraFiltros {
  busqueda?: string;
  nivelRiesgo?: NivelRiesgo;
  rutaId?: string;
  cobradorId?: string;
}

export interface TotalesMora {
  totalMora: number;
  totalDeuda: number;
  totalCasosCriticos: number;
  totalRegistros: number;
}

export interface PrestamosMoraResponse {
  prestamos: CuentaMora[];
  totales: TotalesMora;
  total: number;
  pagina: number;
  limite: number;
}

export interface EstadisticasMora {
  totalPrestamosMora: number;
  casosCriticos: number;
  moraAcumulada: number;
  deudaTotal: number;
}

export const loansService = {
  getLoans: async (filters: LoansFilters = {}): Promise<LoansResponse> => {
    const config: AxiosRequestConfig = {
      params: filters,
    };
    return apiRequest('GET', '/loans', null, config);
  },

  getLoan: async (id: string): Promise<any> => {
    return apiRequest('GET', `/loans/${id}`);
  },

  deleteLoan: async (id: string, userId: string): Promise<void> => {
    await apiRequest('DELETE', `/loans/${id}`, { userId });
  },
};

export const loansService_ = {
  // Obtener préstamos en mora
  async obtenerPrestamosMora(
    filtros?: PrestamosMoraFiltros,
    pagina: number = 1,
    limite: number = 50,
    config?: ApiRequestConfig
  ): Promise<PrestamosMoraResponse> {
    const queryParams = new URLSearchParams();
    
    if (filtros?.busqueda) queryParams.append('busqueda', filtros.busqueda);
    if (filtros?.nivelRiesgo) queryParams.append('nivelRiesgo', filtros.nivelRiesgo);
    if (filtros?.rutaId) queryParams.append('rutaId', filtros.rutaId);
    if (filtros?.cobradorId) queryParams.append('cobradorId', filtros.cobradorId);
    
    queryParams.append('pagina', pagina.toString());
    queryParams.append('limite', limite.toString());
    
    const endpoint = `reports/prestamos-mora?${queryParams.toString()}`;
    
    return apiRequest<PrestamosMoraResponse>('GET', endpoint, undefined, {
      cacheTTL: 60000, // 1 minuto de cache
      ...config
    });
  },

  // Exportar reporte
  async exportarReporteMora(
    formato: 'excel' | 'pdf',
    filtros?: PrestamosMoraFiltros
  ) {
    return apiRequest('POST', 'reports/exportar-mora', {
      formato,
      filtros
    });
  },

  // Obtener estadísticas
  async obtenerEstadisticasMora(): Promise<EstadisticasMora> {
    return apiRequest<EstadisticasMora>('GET', 'reports/estadisticas-mora', undefined, {
      cacheTTL: 300000 // 5 minutos de cache
    });
  },

  // Obtener detalles específicos de un préstamo
  async obtenerDetallePrestamo(id: string) {
    return apiRequest('GET', `loans/${id}/detalle-mora`);
  }
};