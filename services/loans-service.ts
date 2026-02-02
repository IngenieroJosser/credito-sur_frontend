import { apiRequest } from '@/lib/api/api';
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