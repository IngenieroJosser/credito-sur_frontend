import { apiRequest, ApiRequestConfig } from '@/lib/api/api';
import { conRespaldoOffline, esErrorDeRed } from '@/lib/offline/conRespaldoOffline';

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
    return conRespaldoOffline(
      () => apiRequest<DecisionCastigoResponse>('POST', 'reports/cuentas-vencidas/decision', decision),
      { type: 'vencidas_decision', endpoint: 'reports/cuentas-vencidas/decision', method: 'POST', data: decision, description: `Decisión sobre cuenta vencida` },
      { esOffline: true } as any,
    );
  },

  // Exportar reporte (el servidor genera el archivo: requiere conexión).
  async exportarReporteVencidas(
    formato: 'excel' | 'pdf',
    filtros?: CuentasVencidasFiltros
  ) {
    try {
      return await apiRequest('POST', 'reports/cuentas-vencidas/exportar', {
        formato,
        filtros
      });
    } catch (error: any) {
      if (esErrorDeRed(error)) {
        throw new Error('La exportación de reportes requiere conexión. Vuelve a intentarlo cuando tengas red.');
      }
      throw error;
    }
  },

  // Calcular interés sugerido (15% del saldo pendiente)
  calcularInteresSugerido(saldoPendiente: number): number {
    return Math.round(saldoPendiente * 0.15);
  },

  // Formatear fecha para input date
  formatearFechaParaInput(fecha: string | Date): string {
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  // Calcular nueva fecha de vencimiento (prórroga de 30 días)
  calcularNuevaFechaVencimiento(): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return this.formatearFechaParaInput(fecha);
  }
};
