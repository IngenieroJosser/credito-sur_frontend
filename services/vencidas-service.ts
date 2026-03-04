import { apiRequest, ApiRequestConfig } from '@/lib/api/api';

export type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
export type EstadoPrestamo = 'EN_MORA' | 'INCUMPLIDO' | 'PERDIDA';
export type DecisionCastigo = 'CASTIGAR' | 'PRORROGAR' | 'DEJAR_QUIETO';

export interface ClienteInfo {
  nombre: string;
  documento: string;
  telefono?: string;
  direccion?: string;
}

export interface CuentaVencida {
  id: string;
  numeroPrestamo: string;
  cliente: ClienteInfo;
  fechaVencimiento: string;
  diasVencidos: number;
  saldoPendiente: number;
  montoOriginal: number;
  ruta: string;
  nivelRiesgo: NivelRiesgo;
  estado: EstadoPrestamo;
  interesesMora?: number;
}

export interface CuentasVencidasFiltros {
  busqueda?: string;
  nivelRiesgo?: NivelRiesgo;
  rutaId?: string;
}

export interface TotalesVencidas {
  totalVencido: number;
  totalRegistros: number;
  diasPromedioVencimiento: number;
}

export interface CuentasVencidasResponse {
  cuentas: CuentaVencida[];
  totales: TotalesVencidas;
  total: number;
  pagina: number;
  limite: number;
}

export interface DecisionCastigoRequest {
  prestamoId: string;
  decision: DecisionCastigo;
  montoInteres?: number;
  comentarios?: string;
  nuevaFechaVencimiento?: string;
}

export interface DecisionCastigoResponse {
  mensaje: string;
  aprobacionId: string;
  nuevoEstado: EstadoPrestamo;
}

export const vencidasService = {
  // Obtener cuentas vencidas
  async obtenerCuentasVencidas(
    filtros?: CuentasVencidasFiltros,
    pagina: number = 1,
    limite: number = 50,
    config?: ApiRequestConfig
  ): Promise<CuentasVencidasResponse> {
    const queryParams = new URLSearchParams();
    
    if (filtros?.busqueda) queryParams.append('busqueda', filtros.busqueda);
    if (filtros?.nivelRiesgo) queryParams.append('nivelRiesgo', filtros.nivelRiesgo);
    if (filtros?.rutaId) queryParams.append('rutaId', filtros.rutaId);
    
    queryParams.append('pagina', pagina.toString());
    queryParams.append('limite', limite.toString());
    
    const endpoint = `reports/cuentas-vencidas?${queryParams.toString()}`;
    
    return apiRequest<CuentasVencidasResponse>('GET', endpoint, undefined, {
      cacheTTL: 60000, // 1 minuto de cache
      ...config
    });
  },

  // Procesar decisión de castigo
  async procesarDecision(decision: DecisionCastigoRequest): Promise<DecisionCastigoResponse> {
    return apiRequest<DecisionCastigoResponse>('POST', 'reports/cuentas-vencidas/decision', decision);
  },

  // Exportar reporte
  async exportarReporteVencidas(
    formato: 'excel' | 'pdf',
    filtros?: CuentasVencidasFiltros
  ) {
    return apiRequest('POST', 'reports/cuentas-vencidas/exportar', {
      formato,
      filtros
    });
  },

  // Calcular interés sugerido (15% del saldo pendiente)
  calcularInteresSugerido(saldoPendiente: number): number {
    return Math.round(saldoPendiente * 0.15);
  },

  // Formatear fecha para input date
  formatearFechaParaInput(fecha: string | Date): string {
    const date = new Date(fecha);
    return date.toISOString().split('T')[0];
  },

  // Calcular nueva fecha de vencimiento (prórroga de 30 días)
  calcularNuevaFechaVencimiento(): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return this.formatearFechaParaInput(fecha);
  }
};