import { apiRequest } from '@/lib/api/api';

export interface FinancialSummary {
  ingresos: number;
  egresos: number;
  utilidad: number;
  margen: number;
}

export interface MonthlyEvolution {
  mes: string;
  ingresos: number;
  egresos: number;
  utilidad: number;
}

export interface ExpenseDistribution {
  categoria: string;
  monto: number;
}

export const getFinancialSummary = async (startDate?: string, endDate?: string) => {
  const query = new URLSearchParams();
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);
  
  return apiRequest<FinancialSummary>('GET', `/reports/financial/summary?${query.toString()}`);
};

export const getMonthlyEvolution = async (year?: number) => {
  const query = new URLSearchParams();
  if (year) query.append('year', year.toString());
  
  return apiRequest<MonthlyEvolution[]>('GET', `/reports/financial/monthly?${query.toString()}`);
};

export const getExpenseDistribution = async (startDate?: string, endDate?: string) => {
  const query = new URLSearchParams();
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);
  
  return apiRequest<ExpenseDistribution[]>('GET', `/reports/financial/expenses?${query.toString()}`);
};
