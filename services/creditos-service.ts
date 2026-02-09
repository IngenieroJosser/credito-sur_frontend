import { apiRequest } from '@/lib/api/api';

export interface CreateCreditDto {
  clienteId: string;
  productoId?: string;
  precioProductoId?: string;
  tipoPrestamo: string;
  monto: number;
  tasaInteres: number;
  tasaInteresMora: number;
  plazoMeses: number;
  frecuenciaPago: string;
  fechaInicio: string;
  creadoPorId: string;
}

export interface LoanResponse {
  id: string;
  numeroPrestamo: string;
  clienteId: string;
  cliente: string;
  clienteDni: string;
  clienteTelefono: string;
  producto: string;
  tipoProducto: string;
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
  rutaNombre: string;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
}

export interface LoansStats {
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
  prestamos: LoanResponse[];
  estadisticas: LoansStats;
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

class CreditosService {
  async crearCredito(creditData: CreateCreditDto) {
    try {
      const response = await apiRequest<any>('POST', 'loans', creditData);
      return response;
    } catch (error) {
      console.error('Error creating credit:', error);
      throw error;
    }
  }

  async obtenerCreditos(filters: {
    estado?: string;
    ruta?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<LoansResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.ruta) params.append('ruta', filters.ruta);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await apiRequest<LoansResponse>(
        'GET',
        `loans?${params.toString()}`,
        undefined,
        { cacheTTL: 2 * 60 * 1000 } // 2 minutos de cache
      );

      return response;
    } catch (error) {
      console.error('Error fetching credits:', error);
      throw error;
    }
  }

  async obtenerCreditoPorId(id: string) {
    try {
      const response = await apiRequest<any>('GET', `loans/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching credit:', error);
      throw error;
    }
  }

  async aprobarCredito(id: string, aprobadoPorId: string) {
    try {
      const response = await apiRequest<any>('POST', `loans/${id}/approve`, {
        aprobadoPorId
      });
      return response;
    } catch (error) {
      console.error('Error approving credit:', error);
      throw error;
    }
  }

  async rechazarCredito(id: string, rechazadoPorId: string, motivo?: string) {
    try {
      const response = await apiRequest<any>('POST', `loans/${id}/reject`, {
        rechazadoPorId,
        motivo
      });
      return response;
    } catch (error) {
      console.error('Error rejecting credit:', error);
      throw error;
    }
  }

  async obtenerCuotas(prestamoId: string) {
    try {
      const response = await apiRequest<any>('GET', `loans/${prestamoId}/cuotas`);
      return response;
    } catch (error) {
      console.error('Error fetching cuotas:', error);
      throw error;
    }
  }

  async eliminarCredito(id: string, userId: string) {
    try {
      const response = await apiRequest<any>('DELETE', `loans/${id}`, {
        userId
      });
      return response;
    } catch (error) {
      console.error('Error deleting credit:', error);
      throw error;
    }
  }

  async restaurarCredito(id: string, userId: string) {
    try {
      const response = await apiRequest<any>('PATCH', `loans/${id}/restore`, {
        userId
      });
      return response;
    } catch (error) {
      console.error('Error restoring credit:', error);
      throw error;
    }
  }
}

export const creditosService = new CreditosService();