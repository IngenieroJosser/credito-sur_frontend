'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardClient } from './dashboard-client';
import { Rol } from '@/lib/permissions';
import { TimeFilterPeriod } from '@/components/ui/TimeFilter';
import {
  CreditCard,
  Target,
  AlertCircle,
  Banknote,
  Users,
  Wallet,
  PieChart,
  Landmark
} from 'lucide-react';
import { dashboardService } from '@/services/dashboard-coordinador-service';
import { prestamosService } from '@/services/prestamos-service';

interface UserData {
  id: string;
  nombres: string;
  apellidos: string;
  rol: Rol;
  correo?: string;
  telefono?: string;
}

interface MetricItem {
  title: string;
  value: number | string;
  subValue?: string;
  isCurrency: boolean;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface QuickAccessItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  badge?: number;
  href: string;
}

interface FrontendDashboardData {
  mainMetrics: MetricItem[];
  quickAccess: QuickAccessItem[];
  recentLoans: Array<{
    client: string;
    amount: number;
    term: string;
    status: string;
    date: string;
  }>;
  topCollectors: Array<{
    name: string;
    collected: number;
    efficiency: number;
    trend: 'up' | 'down';
  }>;
  chartData: Array<{
    label: string;
    value: number;
    target?: number;
    date?: string;
    time?: string;
  }>;
  userFullName: string;
  userRole: string;
}

const TIME_FILTER_MAP: Record<TimeFilterPeriod, string> = {
  today: 'today',
  week: 'week',
  month: 'month',
  quarter: 'quarter',
};

const PERIOD_LABEL: Record<TimeFilterPeriod, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
  quarter: 'Trimestre',
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get('period') as TimeFilterPeriod) || 'today';
  
  const [state, setState] = useState<{
    isLoading: boolean;
    userData: UserData | null;
    dashboardData: FrontendDashboardData | null;
    shouldRedirect: string | null;
  }>({
    isLoading: true,
    userData: null,
    dashboardData: null,
    shouldRedirect: null
  });

  useEffect(() => {
    let isMounted = true;

    const initializeDashboard = async () => {
      const user = localStorage.getItem('user');

      if (!user) {
        router.replace('/');
        return;
      }

      try {
        const parsedUser = JSON.parse(user) as UserData;
        
        if (['COBRADOR', 'COORDINADOR', 'SUPERVISOR', 'CONTADOR', 'PUNTO_DE_VENTA'].includes(parsedUser.rol)) {
          const routes: Record<string, string> = {
            COBRADOR: '/cobranzas',
            COORDINADOR: '/coordinador',
            SUPERVISOR: '/supervisor',
            CONTADOR: '/contador/contable',
            PUNTO_DE_VENTA: '/punto-de-venta',
          };
          
          if (isMounted) {
            setState({
              isLoading: false,
              userData: parsedUser,
              dashboardData: null,
              shouldRedirect: routes[parsedUser.rol]
            });
          }
          return;
        }

        // Fetch real data from backend in parallel
        const [backendData, prestamosData] = await Promise.allSettled([
          dashboardService.getDashboardData(TIME_FILTER_MAP[period]),
          prestamosService.obtenerPrestamos({ limit: 5 }),
        ]);

        const dashboard = backendData.status === 'fulfilled' ? backendData.value : null;
        const prestamos = prestamosData.status === 'fulfilled' ? prestamosData.value : null;
        const stats = prestamos?.estadisticas;

        // Build metrics from real backend data
        const moraPercent = stats && stats.montoTotal > 0
          ? ((stats.moraTotal / stats.montoTotal) * 100).toFixed(1)
          : '0';

        const mainMetrics: MetricItem[] = [
          {
            title: `Capital Prestado (${PERIOD_LABEL[period]})`,
            value: stats?.montoTotal || 0,
            isCurrency: true,
            change: 0,
            icon: <CreditCard className="h-4 w-4" />,
            color: '#3b82f6'
          },
          {
            title: 'Eficiencia de Cobro',
            value: dashboard ? `${dashboard.metrics.efficiency}%` : '0%',
            subValue: `${stats?.pagados || 0} pagados de ${stats?.total || 0}`,
            isCurrency: false,
            change: 0,
            icon: <Target className="h-4 w-4" />,
            color: '#8b5cf6'
          },
          {
            title: 'Cartera en Mora',
            value: stats?.moraTotal || 0,
            subValue: `${moraPercent}% del total · ${stats?.morosos || 0} cuentas`,
            isCurrency: true,
            change: 0,
            icon: <AlertCircle className="h-4 w-4" />,
            color: '#f43f5e'
          },
          {
            title: 'Saldo Pendiente',
            value: stats?.montoPendiente || 0,
            subValue: `${stats?.activos || 0} créditos activos`,
            isCurrency: true,
            change: 0,
            icon: <Banknote className="h-4 w-4" />,
            color: '#f59e0b'
          }
        ];

        // Build quick access (static, no mock data needed)
        const quickAccess: QuickAccessItem[] = [
          {
            title: 'Nuevo Crédito',
            subtitle: 'Registro rápido',
            icon: <CreditCard className="h-5 w-5" />,
            color: '#0f172a',
            badge: dashboard?.metrics.pendingApprovals || undefined,
            href: '#'
          },
          {
            title: 'Cobranza',
            subtitle: 'Gestionar pagos',
            icon: <Wallet className="h-5 w-5" />,
            color: '#10b981',
            badge: dashboard?.metrics.delinquentAccounts || undefined,
            href: '/admin/pagos/registro'
          },
          {
            title: 'Clientes',
            subtitle: 'Base de datos',
            icon: <Users className="h-5 w-5" />,
            color: '#6366f1',
            href: '/admin/clientes'
          },
          {
            title: 'Análisis',
            subtitle: 'Reportes avanzados',
            icon: <PieChart className="h-5 w-5" />,
            color: '#f59e0b',
            href: '/admin/reportes/operativos'
          },
          {
            title: 'Tesorería',
            subtitle: 'Caja Fuerte / Bancos',
            icon: <Landmark className="h-5 w-5" />,
            color: '#08557f',
            href: '/admin/tesoreria'
          }
        ];

        // Build recent loans from real prestamos data
        const recentLoans = (prestamos?.prestamos || []).slice(0, 5).map((p: any) => {
          const clientName = p.cliente
            ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim()
            : 'Cliente';
          const dateStr = p.creadoEn ? new Date(p.creadoEn).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '';
          return {
            client: clientName,
            amount: p.montoTotal || p.monto || 0,
            term: p.frecuenciaPago || 'Mensual',
            status: p.estado || 'PENDIENTE',
            date: dateStr,
          };
        });

        // Build chart data from backend trend
        const chartData = (dashboard?.trend || []).map((t) => ({
          label: t.label,
          value: t.value,
          target: t.target,
        }));

        // Build top collectors from real backend data
        const topCollectors = (dashboard?.topCollectors || []).map(c => ({
          name: c.name,
          collected: c.collected,
          efficiency: c.efficiency,
          trend: c.trend
        }));

        if (isMounted) {
          setState({
            isLoading: false,
            userData: parsedUser,
            dashboardData: {
              mainMetrics,
              quickAccess,
              recentLoans,
              topCollectors,
              chartData,
              userFullName: `${parsedUser.nombres} ${parsedUser.apellidos}`,
              userRole: parsedUser.rol?.replace('_', ' ') || 'Usuario'
            },
            shouldRedirect: null
          });
        }
      } catch (error) {
        console.error('Error cargando dashboard:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.replace('/');
      }
    };

    initializeDashboard();

    return () => {
        isMounted = false;
    };
  }, [router, period]);

  useEffect(() => {
    if (state.shouldRedirect) {
      router.replace(state.shouldRedirect);
    }
  }, [state.shouldRedirect, router]);

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Preparando tu dashboard...</p>
        </div>
      </div>
    );
  }

  if (state.shouldRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Te estamos redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (!state.dashboardData) {
    return null;
  }

  return <DashboardClient data={state.dashboardData} />;
}
