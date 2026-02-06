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
  FileText,
  Percent,
  Package,
  TrendingUp,
  PieChart,
  Calculator,
  BarChart3,
  Landmark
} from 'lucide-react';
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

interface DashboardData {
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
    target: number;
  }>;
  userFullName: string;
  userRole: string;
}

/**
 * ============================================================================
 * DASHBOARD PRINCIPAL DEL SISTEMA (HÍBRIDO CSR/SSR)
 * ============================================================================
 * 
 * @description
 * Versión temporal que usa localStorage mientras migramos a cookies.
 * Refactorizado para evitar hydration mismatches y antipatrones de React.
 * 
 * TODO: Migrar completamente a SSR cuando el login use cookies.
 */

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get('period') as TimeFilterPeriod) || 'month';
  
  // Estado consolidado para evitar múltiples renders
  const [state, setState] = useState<{
    isLoading: boolean;
    userData: UserData | null;
    dashboardData: DashboardData | null;
    shouldRedirect: string | null;
  }>({
    isLoading: true,
    userData: null,
    dashboardData: null,
    shouldRedirect: null
  });

  useEffect(() => {
    let isMounted = true;

    // Función para inicializar el dashboard
    const initializeDashboard = () => {
      console.log('Inicializando Dashboard con periodo:', period);
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      // Validamos solo user. El token ahora viaja en cookies HttpOnly y no es accesible por JS.
      // La seguridad real la da el backend al rechazar peticiones sin cookie.
      if (!user) {
        console.log('No hay usuario en localStorage, redirigiendo a login');
        router.replace('/');
        return;
      }

      try {
        const parsedUser = JSON.parse(user) as UserData;
        console.log('Usuario parseado:', parsedUser.rol);

        // Verificar si necesita redirección
        if (['COBRADOR', 'COORDINADOR', 'SUPERVISOR'].includes(parsedUser.rol)) {
          const routes: Record<string, string> = {
            COBRADOR: '/cobranzas',
            COORDINADOR: '/coordinador',
            SUPERVISOR: '/supervisor'
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

        // Cargar datos del dashboard filtrados por periodo
        const data = configurarDashboardPorRol(parsedUser.rol, period);
        
        if (isMounted) {
          setState({
            isLoading: false,
            userData: parsedUser,
            dashboardData: {
              ...data,
              userFullName: `${parsedUser.nombres} ${parsedUser.apellidos}`,
              userRole: parsedUser.rol?.replace('_', ' ') || 'Usuario'
            },
            shouldRedirect: null
          });
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.replace('/');
      }
    };

    initializeDashboard();

    return () => {
        isMounted = false;
    };
  }, [router, period]); // Se recarga cuando cambia el periodo en la URL

  // Efecto separado para manejar redirecciones
  useEffect(() => {
    if (state.shouldRedirect) {
      router.replace(state.shouldRedirect);
    }
  }, [state.shouldRedirect, router]);

  // Estados de carga
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Estado de redirección
  if (state.shouldRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Redirigiendo a su panel...</p>
        </div>
      </div>
    );
  }

  // Verificar que tengamos datos antes de renderizar
  if (!state.dashboardData) {
    return null;
  }

  return <DashboardClient data={state.dashboardData} />;
}

/**
 * Configurar datos del dashboard según rol y periodo seleccionado
 * Temporal hasta migrar a SSR con fetch real del backend
 */
function configurarDashboardPorRol(rol: Rol, period: TimeFilterPeriod = 'month'): Omit<DashboardData, 'userFullName' | 'userRole'> {
  // Factores de simulación para que los números cambien según el periodo
  const factor = {
    today: 0.1,    // Aprox 1/10 del mes (un poco más que 1/30)
    week: 0.25,    // 1/4 del mes
    month: 1,      // Base
    quarter: 3     // 3 meses
  }[period];

  const metricsConfig: Record<Rol, MetricItem[]> = {
    SUPER_ADMINISTRADOR: [
      {
        title: `Total Prestado (${period === 'today' ? 'Hoy' : period === 'week' ? 'Sem' : period === 'month' ? 'Mes' : 'Trim'})`,
        value: 125000000 * factor,
        isCurrency: true,
        change: 12.5,
        icon: <CreditCard className="h-4 w-4" />,
        color: '#3b82f6'
      },
      {
        title: 'Recaudo Real vs Esperado',
        value: period === 'today' ? '98.5%' : '94.2%',
        subValue: `${formatCurrency(12500000 * factor)} / ${formatCurrency(13200000 * factor)}`,
        isCurrency: false,
        change: 2.1,
        icon: <Target className="h-4 w-4" />,
        color: '#8b5cf6'
      },
      {
        title: 'Cartera en Mora',
        value: 45000000, // La mora suele ser un acumulado, no cambia tanto por periodo de vista
        subValue: '8.5% del total',
        isCurrency: true,
        change: -3.4,
        icon: <AlertCircle className="h-4 w-4" />,
        color: '#f43f5e'
      },
      {
        title: 'Capital Activo',
        value: 2850000000,
        isCurrency: true,
        change: 5.8,
        icon: <Banknote className="h-4 w-4" />,
        color: '#f59e0b'
      }
    ],
    ADMIN: [
      {
        title: `Total Prestado (${period === 'today' ? 'Hoy' : period === 'week' ? 'Sem' : period === 'month' ? 'Mes' : 'Trim'})`,
        value: 125000000 * factor,
        isCurrency: true,
        change: 12.5,
        icon: <CreditCard className="h-4 w-4" />,
        color: '#3b82f6'
      },
      {
        title: 'Recaudo Real vs Esperado',
        value: period === 'today' ? '98.5%' : '94.2%',
        subValue: `${formatCurrency(12500000 * factor)} / ${formatCurrency(13200000 * factor)}`,
        isCurrency: false,
        change: 2.1,
        icon: <Target className="h-4 w-4" />,
        color: '#8b5cf6'
      },
      {
        title: 'Cartera en Mora',
        value: 45000000,
        subValue: '8.5% del total',
        isCurrency: true,
        change: -3.4,
        icon: <AlertCircle className="h-4 w-4" />,
        color: '#f43f5e'
      },
      {
        title: 'Capital Activo',
        value: 2850000000,
        isCurrency: true,
        change: 5.8,
        icon: <Banknote className="h-4 w-4" />,
        color: '#f59e0b'
      }
    ],
    COORDINADOR: [],
    SUPERVISOR: [],
    COBRADOR: [],
    CONTADOR: [
      {
        title: 'Flujo de Caja',
        value: 32500000,
        isCurrency: true,
        change: 12.5,
        icon: <TrendingUp className="h-4 w-4" />,
        color: '#0f172a'
      },
      {
        title: 'Cuentas Incobrables',
        value: 3,
        isCurrency: false,
        change: -1.2,
        icon: <FileText className="h-4 w-4" />,
        color: '#f43f5e'
      },
      {
        title: 'Margen Utilidad',
        value: '42.3%',
        isCurrency: false,
        change: 3.1,
        icon: <Percent className="h-4 w-4" />,
        color: '#10b981'
      },
      {
        title: 'Inventario Activo',
        value: 185000000,
        isCurrency: true,
        change: 8.7,
        icon: <Package className="h-4 w-4" />,
        color: '#f59e0b'
      }
    ]
  };

  const quickAccessConfig: Record<Rol, QuickAccessItem[]> = {
    SUPER_ADMINISTRADOR: [
      {
        title: 'Nuevo Crédito',
        subtitle: 'Registro rápido',
        icon: <CreditCard className="h-5 w-5" />,
        color: '#0f172a',
        badge: 3,
        href: '/admin/creditos/nuevo'
      },
      {
        title: 'Cobranza',
        subtitle: 'Gestionar pagos',
        icon: <Wallet className="h-5 w-5" />,
        color: '#10b981',
        badge: 12,
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
    ],
    ADMIN: [
      {
        title: 'Nuevo Crédito',
        subtitle: 'Registro rápido',
        icon: <CreditCard className="h-5 w-5" />,
        color: '#0f172a',
        badge: 3,
        href: '/admin/creditos/nuevo'
      },
      {
        title: 'Cobranza',
        subtitle: 'Gestionar pagos',
        icon: <Wallet className="h-5 w-5" />,
        color: '#10b981',
        badge: 12,
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
      }
    ],
    COORDINADOR: [],
    SUPERVISOR: [],
    COBRADOR: [],
    CONTADOR: [
      {
        title: 'Control de Cajas',
        subtitle: 'Caja principal y ruta',
        icon: <Calculator className="h-5 w-5" />,
        color: '#08557f',
        href: '/contador/contable'
      },
      {
        title: 'Reportes Financieros',
        subtitle: 'Análisis detallado',
        icon: <BarChart3 className="h-5 w-5" />,
        color: '#fb851b',
        href: '/contador/reportes/financieros'
      }
    ]
  };

  return {
    mainMetrics: metricsConfig[rol] || [],
    quickAccess: quickAccessConfig[rol] || [],
    recentLoans: [
      { client: 'Ana María Polo', amount: 1500000, term: 'Mensual', status: 'APROBADO', date: 'Hace 2h' },
      { client: 'Carlos Vives', amount: 5000000, term: 'Quincenal', status: 'PENDIENTE', date: 'Hace 4h' },
      { client: 'Juanes', amount: 800000, term: 'Diario', status: 'APROBADO', date: 'Hace 5h' },
      { client: 'Shakira Mebarak', amount: 12000000, term: 'Mensual', status: 'APROBADO', date: 'Hace 1d' },
    ],
    topCollectors: [
      { name: 'Juan Pérez', collected: 15400000 * factor, efficiency: 98, trend: 'up' as const },
      { name: 'Maria Gonzalez', collected: 12800000 * factor, efficiency: 95, trend: 'up' as const },
      { name: 'Pedro Coral', collected: 11200000 * factor, efficiency: 92, trend: 'down' as const },
      { name: 'Betty Pinzon', collected: 9800000 * factor, efficiency: 89, trend: 'up' as const },
      { name: 'Armando Mendoza', collected: 8500000 * factor, efficiency: 85, trend: 'down' as const },
    ],
    chartData: period === 'today' ? [
      { label: '8am', value: 250000, target: 300000 },
      { label: '10am', value: 580000, target: 500000 },
      { label: '12pm', value: 490000, target: 500000 },
      { label: '2pm', value: 840000, target: 700000 },
      { label: '4pm', value: 295000, target: 400000 },
    ] : [
      { label: 'Sem 1', value: 25000000 * factor, target: 30000000 * factor },
      { label: 'Sem 2', value: 28000000 * factor, target: 30000000 * factor },
      { label: 'Sem 3', value: 19000000 * factor, target: 30000000 * factor },
      { label: 'Sem 4', value: 34000000 * factor, target: 30000000 * factor },
    ]
  };
}
