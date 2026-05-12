'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardClient } from '@/app/admin/dashboard-client';
import { TimeFilterPeriod } from '@/components/ui/TimeFilter';
import {
  CreditCard,
  Target,
  AlertCircle,
  Banknote,
  Users,
  Wallet,
  PieChart,
  Route,
} from 'lucide-react';
import { dashboardService } from '@/services/dashboard-coordinador-service';
import { prestamosService } from '@/services/prestamos-service';
import { computeOperationalMetaTotalForTimeFilter } from '@/lib/dashboard-operational-meta';
import { useRealtimeData } from '@/hooks/useRealtimeData';

interface UserData {
  id: string;
  nombres: string;
  apellidos: string;
  rol: string;
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
  year: 'year',
};

const PERIOD_LABEL: Record<TimeFilterPeriod, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

export default function CoordinadorPage() {
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
    shouldRedirect: null,
  });

  const initializeDashboard = useCallback(async () => {
    let isMounted = true;
    const userStr = localStorage.getItem('user');

    if (!userStr) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userStr) as UserData;

      if (parsedUser.rol !== 'COORDINADOR') {
        const ROLE_REDIRECT_MAP: Record<string, string> = {
          SUPER_ADMINISTRADOR: '/admin',
          ADMIN: '/admin',
          SUPERVISOR: '/supervisor',
          COBRADOR: '/cobranzas',
          CONTADOR: '/contador/contable',
          PUNTO_DE_VENTA: '/punto-de-venta',
        };
        if (isMounted) {
          setState({
            isLoading: false,
            userData: parsedUser,
            dashboardData: null,
            shouldRedirect: ROLE_REDIRECT_MAP[parsedUser.rol] || '/login',
          });
        }
        return;
      }

        const [backendData, prestamosData] = await Promise.allSettled([
          dashboardService.getDashboardData(TIME_FILTER_MAP[period]),
          prestamosService.obtenerPrestamos({ limit: 5 }),
        ]);

        const dashboard = backendData.status === 'fulfilled' ? backendData.value : null;
        const prestamos = prestamosData.status === 'fulfilled' ? prestamosData.value : null;
        const stats = prestamos?.estadisticas;

        const moraPercent =
          stats && stats.montoTotal > 0
            ? ((stats.moraTotal / stats.montoTotal) * 100).toFixed(1)
            : '0';

        const mainMetrics: MetricItem[] = [
          {
            title: `Capital Prestado (${PERIOD_LABEL[period]})`,
            value: Number(dashboard?.metrics?.capitalPrestado ?? 0),
            isCurrency: true,
            change: 0,
            icon: <CreditCard className="h-4 w-4" />,
            color: '#3b82f6',
          },
          {
            title: 'Eficiencia de Cobro',
            value: dashboard ? `${dashboard.metrics.efficiency}%` : '0%',
            subValue: `${stats?.pagados || 0} pagados de ${stats?.total || 0}`,
            isCurrency: false,
            change: 0,
            icon: <Target className="h-4 w-4" />,
            color: '#8b5cf6',
          },
          {
            title: 'Cartera en Mora',
            value: stats?.moraTotal || 0,
            subValue: `${moraPercent}% del total · ${stats?.morosos || 0} cuentas`,
            isCurrency: true,
            change: 0,
            icon: <AlertCircle className="h-4 w-4" />,
            color: '#f43f5e',
          },
          {
            title: 'Saldo Pendiente',
            value: stats?.montoPendiente || 0,
            subValue: `${stats?.activos || 0} créditos activos`,
            isCurrency: true,
            change: 0,
            icon: <Banknote className="h-4 w-4" />,
            color: '#f59e0b',
          },
        ];

        const quickAccess: QuickAccessItem[] = [
          {
            title: 'Nuevo Crédito',
            subtitle: 'Definir tasas y cuotas',
            icon: <CreditCard className="h-5 w-5" />,
            color: '#0f172a',
            badge: dashboard?.metrics.pendingApprovals || undefined,
            href: '#',
          },
          {
            title: 'Cobranza',
            subtitle: 'Gestionar pagos',
            icon: <Wallet className="h-5 w-5" />,
            color: '#10b981',
            badge: dashboard?.metrics.delinquentAccounts || undefined,
            href: '/coordinador/pagos/registro',
          },
          {
            title: 'Rutas',
            subtitle: 'Asignación y supervisión',
            icon: <Route className="h-5 w-5" />,
            color: '#6366f1',
            href: '/coordinador/rutas',
          },
          {
            title: 'Clientes',
            subtitle: 'Base de datos',
            icon: <Users className="h-5 w-5" />,
            color: '#08557f',
            href: '/coordinador/clientes',
          },
          {
            title: 'Cuentas Vencidas',
            subtitle: 'Plazos expirados',
            icon: <AlertCircle className="h-5 w-5" />,
            color: '#e11d48',
            href: '/coordinador/cuentas-vencidas',
          },
          {
            title: 'Reportes',
            subtitle: 'Flujo de caja y rendimiento',
            icon: <PieChart className="h-5 w-5" />,
            color: '#f59e0b',
            href: '/coordinador/reportes',
          },
        ];

        const recentLoans = (prestamos?.prestamos || []).slice(0, 5).map((p: any) => {
          const clientName = p.cliente
            ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim()
            : 'Cliente';
          const dateStr = p.creadoEn
            ? new Date(p.creadoEn).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
            : '';
          return {
            client: clientName,
            amount: p.montoTotal || p.monto || 0,
            term: p.frecuenciaPago || 'Mensual',
            status: p.estado || 'PENDIENTE',
            date: dateStr,
          };
        });

        let metaOperativaTotal = 0
        try {
          metaOperativaTotal = await computeOperationalMetaTotalForTimeFilter(period as any)
        } catch {
          metaOperativaTotal = 0
        }

        const chartData = (dashboard?.trend || []).map((t) => ({
          label: t.label,
          value: t.value,
          target: metaOperativaTotal > 0 ? metaOperativaTotal : t.target,
        }));

        const topCollectors = (dashboard?.topCollectors || []).slice(0, 5).map((c: any) => ({
          name: c.name,
          collected: c.collected || 0,
          efficiency: c.efficiency || 0,
          trend: (c.trend || 'up') as 'up' | 'down',
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
              userRole: 'COORDINADOR',
            },
            shouldRedirect: null,
          });
        }
      } catch (error: any) {
        console.error('Error cargando dashboard coordinador:', error);
        // Solo hacer logout en error de autenticación (401), no en errores de red
        if (error?.response?.status === 401 || error?.statusCode === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.replace('/login');
        }
      }
      isMounted = false;
  }, [router, period])

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  // Tiempo real: refrescar dashboard cuando pagos o préstamos cambien
  useRealtimeData(['pagos_actualizados', 'prestamos_actualizados', 'rutas_actualizadas'], initializeDashboard)

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
