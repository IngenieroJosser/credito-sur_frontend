'use client'
import { logger } from '@/lib/logger'

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
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
import { getResumenFinanciero } from '@/services/contabilidad-service';
import { formatCurrency } from '@/lib/utils';

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
  change: number | null;
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

/**
 * Calcula las fechas de inicio y fin según el período seleccionado
 */
function calculateDatesFromPeriod(period: TimeFilterPeriod): { fechaInicio: string; fechaFin: string } {
  const today = new Date();
  let fechaInicio: Date;
  let fechaFin: Date = new Date(today);
  fechaFin.setHours(23, 59, 59, 999);

  switch (period) {
    case 'today':
      fechaInicio = new Date(today);
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin = new Date(today);
      fechaFin.setHours(23, 59, 59, 999);
      break;
    case 'week':
      fechaInicio = new Date(today);
      // Inicio de semana (domingo = 0)
      const day = today.getDay();
      // Calcular diferencia para llegar al domingo (día 0)
      const diff = day === 0 ? 0 : -day; // Si es domingo, diff = 0; si no, retrocedemos días
      fechaInicio.setDate(today.getDate() + diff);
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin = new Date(today);
      fechaFin.setHours(23, 59, 59, 999);
      break;
    case 'month':
      fechaInicio = new Date(today.getFullYear(), today.getMonth(), 1);
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'year':
      fechaInicio = new Date(today.getFullYear(), 0, 1);
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      fechaInicio = new Date(today.getFullYear(), today.getMonth(), 1);
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // Formatear fechas en formato YYYY-MM-DD sin convertir a UTC
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    fechaInicio: formatDateLocal(fechaInicio),
    fechaFin: formatDateLocal(fechaFin),
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get('period') as TimeFilterPeriod) || 'today';
  
  // Ref para almacenar el período activo actual
  const activePeriodRef = useRef<TimeFilterPeriod>(period);
  useEffect(() => {
    activePeriodRef.current = period;
  }, [period]);
  
  // Contador de peticiones para identificar la más reciente
  const requestCounterRef = useRef(0);
  
  // Map para asociar cada requestId con su período solicitado
  const requestPeriodMapRef = useRef<Map<number, TimeFilterPeriod>>(new Map());

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
    // Generar un ID único para esta petición
    const requestId = ++requestCounterRef.current;
    const requestedPeriod = period;
    
    // Registrar este requestId con su período
    requestPeriodMapRef.current.set(requestId, requestedPeriod);
    
    let isMounted = true;
    
    // Al cambiar período: mostrar loading y borrar datos anteriores para no mostrar datos de otro período
    setState(prev => ({
      ...prev,
      isLoading: true,
      dashboardData: null
    }));

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
          // Verificar que el período actual sigue siendo el mismo que pedimos y que esta es la petición más reciente
          if (isMounted && activePeriodRef.current === requestedPeriod && requestId === requestCounterRef.current) {
            setState({
              isLoading: false,
              userData: parsedUser,
              dashboardData: null,
              shouldRedirect: routes[parsedUser.rol]
            });
          }
          return;
        }

        // Calcular fechas según el período para usar en resumen financiero
        const { fechaInicio, fechaFin } = calculateDatesFromPeriod(requestedPeriod);

        // Fetch real data from backend in parallel (siempre para el período que pedimos)
        const [backendData, prestamosData, resumenFinanciero] = await Promise.allSettled([
          dashboardService.getDashboardData(TIME_FILTER_MAP[requestedPeriod]),
          prestamosService.obtenerPrestamos({ limit: 5 }),
          getResumenFinanciero(fechaInicio, fechaFin),
        ]);

        const dashboard = backendData.status === 'fulfilled' ? backendData.value : null;
        const prestamos = prestamosData.status === 'fulfilled' ? prestamosData.value : null;
        const resumen = resumenFinanciero.status === 'fulfilled' ? resumenFinanciero.value : null;

        // Convertir valores a números explícitamente (Decimal de Prisma viene como objeto)
        const capitalPrestado = Number(dashboard?.metrics?.capitalPrestado ?? 0);
        // Recaudo: viene directamente del backend filtrado por período (agrega pagos del período)
        const recaudo = Number(dashboard?.metrics?.recaudo ?? 0);
        // Mora: número de préstamos EN_MORA ACTUALMENTE (sin filtro de fecha porque la mora
        // ocurre en cualquier momento, no sólo en el período de creación del préstamo)
        const moraCount = Number(dashboard?.metrics?.delinquentAccounts ?? 0);
        // Monto en mora: suma de saldoPendiente de los préstamos en mora
        const moraMonto = (dashboard?.delinquentAccounts || []).reduce(
          (acc: number, item: any) => acc + Number(item.amountDue || 0),
          0,
        );
        const moraPercent = capitalPrestado > 0 && moraMonto > 0
          ? ((moraMonto / capitalPrestado) * 100).toFixed(1)
          : moraCount > 0 ? '> 0' : '0';
        // Gastos operativos del período (excluye DEUDA_COBRADOR)
        const gastosPeriodo = resumen?.egresosHoy || 0;
        const utilidadPeriodo = typeof (resumen as any)?.utilidadReal === 'number'
          ? Number((resumen as any).utilidadReal || 0)
          : (resumen?.gananciaNeta || 0);

        const mainMetrics: MetricItem[] = [
          {
            title: `Capital Prestado (${PERIOD_LABEL[requestedPeriod]})`,
            value: capitalPrestado,
            isCurrency: true,
            change: null, // El backend no provee variación de capital vs período anterior
            icon: <CreditCard className="h-4 w-4" />,
            color: '#3b82f6'
          },
          {
            title: `Recaudo (${PERIOD_LABEL[requestedPeriod]})`,
            value: recaudo,
            subValue: recaudo > 0 ? `${formatCurrency(recaudo)} cobrado` : 'Sin pagos en el período',
            isCurrency: true,
            // Solo disponible cuando period=today y el backend devuelve un porcentaje != 0
            // (0 puede ser el valor por defecto cuando no hay datos de ayer para comparar)
            change: requestedPeriod === 'today' ? (resumen?.porcentajeIngresosVsAyer || null) : null,
            icon: <Target className="h-4 w-4" />,
            color: '#8b5cf6'
          },
          {
            title: `Cartera en Mora`,
            value: moraMonto,
            subValue: `${moraPercent}% del capital · ${moraCount} cuentas en mora`,
            isCurrency: true,
            change: null, // La mora es un estado actual, no tiene variación vs período anterior
            icon: <AlertCircle className="h-4 w-4" />,
            color: '#f43f5e'
          },
          {
            title: `Gastos (${PERIOD_LABEL[requestedPeriod]})`,
            value: gastosPeriodo,
            subValue: `Utilidad: ${formatCurrency(utilidadPeriodo)}`,
            isCurrency: true,
            // Solo disponible cuando period=today y el backend devuelve un porcentaje != 0
            change: requestedPeriod === 'today' ? (resumen?.porcentajeEgresosVsAyer || null) : null,
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

        // CRÍTICO: Solo aplicar la respuesta si el período actual coincide EXACTAMENTE con el período solicitado
        // Esta es la verificación más importante: si el usuario cambió de período, ignoramos esta respuesta
        const currentPeriod = activePeriodRef.current;
        const isPeriodStillActive = currentPeriod === requestedPeriod;
        
        // Verificación secundaria: que sea la petición más reciente (evita condiciones de carrera)
        const isLatestRequest = requestId === requestCounterRef.current;
        
        if (!isMounted || !isPeriodStillActive) {
          logger.log(`[FRONTEND] Ignorando respuesta: período cambió`, {
            isMounted,
            isPeriodStillActive,
            requestId,
            currentPeriod,
            requestedPeriod
          });
          requestPeriodMapRef.current.delete(requestId);
          return;
        }
        
        // Si no es la petición más reciente pero el período coincide, también la ignoramos para evitar sobreescribir datos más nuevos
        if (!isLatestRequest) {
          logger.log(`[FRONTEND] Ignorando respuesta: no es la petición más reciente`, {
            requestId,
            latestRequestId: requestCounterRef.current,
            currentPeriod,
            requestedPeriod
          });
          requestPeriodMapRef.current.delete(requestId);
          return;
        }
        
        logger.log(`[FRONTEND] Aplicando datos para período: ${requestedPeriod} (requestId: ${requestId})`);
        
        // Limpiar el registro de esta petición después de aplicarla
        requestPeriodMapRef.current.delete(requestId);

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
  }, [router, period]); // Agregado period a las dependencias para recargar cuando cambia

  // Función liviana de refresco para eventos RT (no resetea dashboardData, evita parpadeos)
  const refreshDashboard = useCallback(async () => {
    if (!state.userData) return
    try {
      const { fechaInicio, fechaFin } = calculateDatesFromPeriod(period)
      const [backendData, resumenFinanciero] = await Promise.allSettled([
        dashboardService.getDashboardData(TIME_FILTER_MAP[period]),
        getResumenFinanciero(fechaInicio, fechaFin),
      ])
      const dashboard = backendData.status === 'fulfilled' ? backendData.value : null
      const resumen = resumenFinanciero.status === 'fulfilled' ? resumenFinanciero.value : null
      if (!dashboard) return
      const capitalPrestado = Number(dashboard?.metrics?.capitalPrestado ?? 0)
      const recaudo = Number(dashboard?.metrics?.recaudo ?? 0)
      const moraCount = Number(dashboard?.metrics?.delinquentAccounts ?? 0)
      const moraMonto = (dashboard?.delinquentAccounts || []).reduce((acc: number, item: any) => acc + Number(item.amountDue || 0), 0)
      const moraPercent = capitalPrestado > 0 && moraMonto > 0 ? ((moraMonto / capitalPrestado) * 100).toFixed(1) : moraCount > 0 ? '> 0' : '0'
      const gastosPeriodo = resumen?.egresosHoy || 0
      const utilidadPeriodo = resumen?.gananciaNeta || 0
      const mainMetrics: MetricItem[] = [
        { title: `Capital Prestado (${PERIOD_LABEL[period]})`, value: capitalPrestado, isCurrency: true, change: null, icon: <CreditCard className="h-4 w-4" />, color: '#3b82f6' },
        { title: `Recaudo (${PERIOD_LABEL[period]})`, value: recaudo, subValue: recaudo > 0 ? `${formatCurrency(recaudo)} cobrado` : 'Sin pagos en el período', isCurrency: true, change: period === 'today' ? (resumen?.porcentajeIngresosVsAyer || null) : null, icon: <Target className="h-4 w-4" />, color: '#8b5cf6' },
        { title: 'Cartera en Mora', value: moraMonto, subValue: `${moraPercent}% del capital · ${moraCount} cuentas en mora`, isCurrency: true, change: null, icon: <AlertCircle className="h-4 w-4" />, color: '#f43f5e' },
        { title: `Gastos (${PERIOD_LABEL[period]})`, value: gastosPeriodo, subValue: `Utilidad: ${formatCurrency(utilidadPeriodo)}`, isCurrency: true, change: period === 'today' ? (resumen?.porcentajeEgresosVsAyer || null) : null, icon: <Banknote className="h-4 w-4" />, color: '#f59e0b' },
      ]
      const chartData = (dashboard?.trend || []).map((t) => ({ label: t.label, value: t.value }))
      const topCollectors = (dashboard?.topCollectors || []).map(c => ({ name: c.name, collected: c.collected, efficiency: c.efficiency, trend: c.trend }))
      setState(prev => prev.dashboardData ? ({
        ...prev,
        dashboardData: { ...prev.dashboardData, mainMetrics, chartData, topCollectors }
      }) : prev)
    } catch {
      // Silencioso: el refresco RT no debe interrumpir la vista actual
    }
  }, [state.userData, period])

  useRealtimeData(
    ['dashboards_actualizados', 'pagos_actualizados', 'prestamos_actualizados'],
    refreshDashboard,
  )

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

