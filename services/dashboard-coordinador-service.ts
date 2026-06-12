import { apiRequest } from '@/lib/api/api';
import { AxiosRequestConfig } from 'axios';

export interface DashboardMetrics {
  pendingApprovals: number;
  delinquentAccounts: number;
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
    return apiRequest('POST', `/approvals/${id}/approve`, { type });
  },

  handleReject: async (id: string, type: string) => {
    return apiRequest('POST', `/approvals/${id}/reject`, { type });
  },
};


