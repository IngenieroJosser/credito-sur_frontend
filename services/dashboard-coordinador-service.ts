import { apiRequest } from '@/lib/api/api';
import { conRespaldoOffline } from '@/lib/offline/conRespaldoOffline';
import { AxiosRequestConfig } from 'axios';

export interface DashboardMetrics {
  pendingApprovals: number;
  /** Cuantas cuentas estan en mora. Contadas en SQL, sin tope. */
  delinquentAccounts: number;
  /**
   * Cuanto suman esas cuentas, con la MISMA regla que el conteo.
   *
   * La pantalla lo sacaba sumando la lista de detalle, que el servidor
   * recorta a diez filas: con mas de diez cuentas en mora el importe y el
   * contador de la misma tarjeta no se correspondian.
   */
  delinquentAmount?: number;
  /**
   * La cartera pendiente completa, que es contra lo que se mide la mora.
   *
   * El porcentaje se calculaba sobre `capitalPrestado`, que va filtrado por
   * periodo mientras la mora es un estado actual: con «hoy» daba 0 -y salia
   * un «> 0% del capital»- y con mes o año daba 115,5%.
   */
  carteraPendiente?: number;
  requestedBase: number;
  efficiency: number;
  capitalPrestado?: number;
  recaudo?: number;
  loanCompletion?: {
    pagados: number;
    activos: number;
    total: number;
    porcentaje: number;
  };
}

export interface TrendData {
  label: string;
  value: number;
  target: number;
}

export interface ApprovalItem {
  id: string;
  type: 'cliente' | 'credito' | 'gasto' | 'base-dinero' | 'prorroga';
  description: string;
  requestedBy: string;
  time: string;
  amount?: number;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
}

export interface DelinquentAccount {
  id: string;
  client: string;
  daysLate: number;
  amountDue: number;
  collector: string;
  route: string;
  status: 'critical' | 'moderate' | 'mild';
}

export interface RecentActivity {
  id: string;
  client: string;
  action: string;
  amount: string;
  time: string;
  status: 'approved' | 'alert' | 'pending';
}

export interface TopCollector {
  name: string;
  collected: number;
  efficiency: number;
  trend: 'up' | 'down';
}

export interface DashboardData {
  metrics: DashboardMetrics;
  trend: TrendData[];
  pendingApprovals: ApprovalItem[];
  delinquentAccounts: DelinquentAccount[];
  recentActivity: RecentActivity[];
  topCollectors?: TopCollector[];
}

export const dashboardService = {
  getDashboardData: async (timeFilter: string = 'month'): Promise<DashboardData> => {
    // El backend maneja la seguridad por rol en el endpoint /dashboard
    const config: AxiosRequestConfig = {
      params: { timeFilter },
    };
    return apiRequest('GET', '/dashboard', null, config);
  },

  handleApprove: async (id: string, type: string) => {
    return conRespaldoOffline(
      () => apiRequest('POST', `/approvals/${id}/approve`, { type }),
      { type: 'aprobacion_aprobar', endpoint: `/approvals/${id}/approve`, method: 'POST', data: { type }, description: `Aprobar ${type} ${id}` },
      { esOffline: true },
    );
  },

  handleReject: async (id: string, type: string) => {
    return conRespaldoOffline(
      () => apiRequest('POST', `/approvals/${id}/reject`, { type }),
      { type: 'aprobacion_rechazar', endpoint: `/approvals/${id}/reject`, method: 'POST', data: { type }, description: `Rechazar ${type} ${id}` },
      { esOffline: true },
    );
  },
};


