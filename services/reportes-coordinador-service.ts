import { apiRequest } from '@/lib/api/api';
import type { TimeFilterPeriod } from '@/components/ui/TimeFilter';

export interface OperationalReportFilters {
  period: TimeFilterPeriod;
  routeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface RoutePerformance {
  id: string;
  ruta: string;
  cobrador: string;
  cobradorId: string;
  meta: number;
  recaudado: number;
  eficiencia: number;
  nuevosPrestamos: number;
  nuevosClientes: number;
  montoNuevosPrestamos: number;
}

export interface OperationalReportResponse {
  totalRecaudo: number;
  totalMeta: number;
  porcentajeGlobal: number;
  totalPrestamosNuevos: number;
  totalAfiliaciones: number;
  efectividadPromedio: number;
  totalMontoPrestamosNuevos: number;
  rendimientoRutas: RoutePerformance[];
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface RouteDetailResponse {
  ruta: {
    id: string;
    nombre: string;
    codigo: string;
    zona: string;
    cobrador: {
      id: string;
      nombres: string;
      apellidos: string;
      telefono?: string;
    };
    supervisor?: {
      id: string;
      nombres: string;
      apellidos: string;
    };
  };
  periodo: {
    tipo: string;
    inicio: string;
    fin: string;
  };
  estadisticas: {
    totalClientes: number;
    totalRecaudado: number;
    totalPagos: number;
    promedioDiario: number;
    pagosPorDia: Array<{
      dia: string;
      cantidad: number;
      total: number;
    }>;
  };
  pagosRecientes: Array<{
    id: string;
    numeroPago: string;
    cliente: string;
    fecha: string;
    monto: number;
    metodo: string;
  }>;
  clientesConPrestamos: Array<{
    id: string;
    nombre: string;
    telefono: string;
    prestamosActivos: number;
    proximaCuota?: {
      id: string;
      numeroCuota: number;
      fechaVencimiento: string;
      monto: number;
      estado: string;
    };
  }>;
}

class ReportesCoordinadorService {
  async getOperationalReport(filters: OperationalReportFilters): Promise<OperationalReportResponse> {
    try {
      const params = new URLSearchParams();
      params.append('period', filters.period);
      
      if (filters.routeId) {
        params.append('routeId', filters.routeId);
      }
      
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await apiRequest<OperationalReportResponse>(
        'GET',
        `reports/operational/coordinator?${params.toString()}`,
        undefined,
        { cacheTTL: 5 * 60 * 1000 } // 5 minutos de cache
      );

      return response;
    } catch (error) {
      console.error('Error fetching operational report:', error);
      throw error;
    }
  }

  async getRouteDetail(
    routeId: string,
    period: TimeFilterPeriod,
    startDate?: string,
    endDate?: string
  ): Promise<RouteDetailResponse> {
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      
      if (startDate) {
        params.append('startDate', startDate);
      }
      
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await apiRequest<RouteDetailResponse>(
        'GET',
        `reports/operational/route-detail/${routeId}?${params.toString()}`
      );

      return response;
    } catch (error) {
      console.error('Error fetching route detail:', error);
      throw error;
    }
  }

  async exportReport(
    filters: OperationalReportFilters,
    format: 'excel' | 'pdf'
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      params.append('period', filters.period);
      params.append('format', format);
      
      if (filters.routeId) {
        params.append('routeId', filters.routeId);
      }
      
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      // CORREGIDO: Cambiado de '/reports/export/operational' a '/reports/operational/export'
      const response = await apiRequest<Blob>(
        'GET',
        `reports/operational/export?${params.toString()}`,
        undefined,
        {
          responseType: 'blob',
          headers: {
            'Accept': format === 'excel' 
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
              : 'application/pdf'
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }
}

export const reportesCoordinadorService = new ReportesCoordinadorService();