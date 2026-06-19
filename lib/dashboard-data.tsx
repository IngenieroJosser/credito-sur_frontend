import { cookies } from 'next/headers';
import { 
  CreditCard,
  Target,
  AlertCircle,
  Banknote,
  Users,
  CheckCircle2,
  Route,
  Wallet,
  Receipt,
  Map,
  FileText,
  Percent,
  Package,
  TrendingUp,
  PieChart,
  Bell,
  Eye,
  Filter,
  Calculator,
  BarChart3,
  Landmark
} from 'lucide-react';
import { Rol } from '@/lib/permissions';
import { formatCurrency } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

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

/**
 * Obtiene los datos del Dashboard desde el backend
 * Se ejecuta en el servidor
 */
export async function getDashboardData(rol: Rol) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  // El dashboard real está conectado en tiempo real mediante useRealtimeData (dashboard-client.tsx)
  // Esta función retorna datos de configuración por rol para la estructura estática de la página servidor
  return configurarDashboardPorRol(rol);
}

/**
 * Configura los datos del dashboard según el rol del usuario
 * Esta lógica debería moverse al backend eventualmente
 */
function configurarDashboardPorRol(rol: Rol) {
  const metricsConfig: Record<Rol, MetricItem[]> = {
    SUPER_ADMINISTRADOR: [
      {
        title: 'Total Prestado (Mes)',
        value: 125000000,
        isCurrency: true,
        change: 12.5,
        icon: <CreditCard className="h-4 w-4" />,
        color: '#3b82f6'
      },
      {
        title: 'Recaudo Real vs Esperado',
        value: '94.2%',
        subValue: `${formatCurrency(12500000)} / ${formatCurrency(13200000)}`,
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
    ADMIN: [
      {
        title: 'Total Prestado (Mes)',
        value: 125000000,
        isCurrency: true,
        change: 12.5,
        icon: <CreditCard className="h-4 w-4" />,
        color: '#3b82f6'
      },
      {
        title: 'Recaudo Real vs Esperado',
        value: '94.2%',
        subValue: `${formatCurrency(12500000)} / ${formatCurrency(13200000)}`,
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
    COORDINADOR: [
      {
        title: 'Préstamos Pendientes',
        value: 15,
        isCurrency: false,
        change: 8.2,
        icon: <CreditCard className="h-4 w-4" />,
        color: '#0f172a'
      },
      {
        title: 'Revisiones',
        value: 8,
        isCurrency: false,
        change: -2.1,
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: '#10b981'
      },
      {
        title: 'Cuentas en Mora',
        value: 23,
        isCurrency: false,
        change: -3.4,
        icon: <AlertCircle className="h-4 w-4" />,
        color: '#f43f5e'
      },
      {
        title: 'Rutas habilitadas',
        value: 12,
        isCurrency: false,
        change: 1.8,
        icon: <Route className="h-4 w-4" />,
        color: '#f59e0b'
      }
    ],
    SUPERVISOR: [
      {
        title: 'Clientes Atendidos',
        value: 89,
        isCurrency: false,
        change: 5.2,
        icon: <Users className="h-4 w-4" />,
        color: '#0f172a'
      },
      {
        title: 'Gastos Aprobados',
        value: 2350000,
        isCurrency: true,
        change: -1.3,
        icon: <Receipt className="h-4 w-4" />,
        color: '#10b981'
      },
      {
        title: 'Mora Crítica',
        value: 12,
        isCurrency: false,
        change: -3.4,
        icon: <AlertCircle className="h-4 w-4" />,
        color: '#f43f5e'
      },
      {
        title: 'Cobertura Ruta',
        value: '89.7%',
        isCurrency: false,
        change: 2.1,
        icon: <Map className="h-4 w-4" />,
        color: '#f59e0b'
      }
    ],
    COBRADOR: [
      {
        title: 'Clientes por Visitar',
        value: 24,
        isCurrency: false,
        change: -2,
        icon: <Users className="h-4 w-4" />,
        color: '#0f172a'
      },
      {
        title: 'Recaudo Hoy',
        value: 1250000,
        isCurrency: true,
        change: 15.3,
        icon: <Wallet className="h-4 w-4" />,
        color: '#10b981'
      },
      {
        title: 'Gastos de Ruta',
        value: 45000,
        isCurrency: true,
        change: -5.2,
        icon: <Receipt className="h-4 w-4" />,
        color: '#f43f5e'
      },
      {
        title: 'Eficiencia Personal',
        value: '94.2%',
        isCurrency: false,
        change: 2.8,
        icon: <Target className="h-4 w-4" />,
        color: '#f59e0b'
      }
    ],
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
    COORDINADOR: [
      {
        title: 'Centro de Control',
        subtitle: 'Notificaciones y Revisiones',
        icon: <Bell className="h-5 w-5" />,
        color: '#0f172a',
        badge: 8,
        href: '/notificaciones'
      },
      {
        title: 'Nuevo Crédito',
        subtitle: 'Crear préstamo',
        icon: <CreditCard className="h-5 w-5" />,
        color: '#10b981',
        href: '/admin/creditos/nuevo'
      },
      {
        title: 'Rutas',
        subtitle: 'Gestión de cobradores',
        icon: <Route className="h-5 w-5" />,
        color: '#6366f1',
        href: '/coordinador/rutas'
      },
      {
        title: 'Reportes',
        subtitle: 'Métricas diarias',
        icon: <PieChart className="h-5 w-5" />,
        color: '#f59e0b',
        href: '/admin/reportes/operativos'
      }
    ],
    SUPERVISOR: [
      {
        title: 'Monitoreo Cartera',
        subtitle: 'Clientes atrasados',
        icon: <Eye className="h-5 w-5" />,
        color: '#0f172a',
        href: '/admin/cuentas-mora'
      },
      {
        title: 'Gastos Pendientes',
        subtitle: 'Aprobar gastos de ruta',
        icon: <Filter className="h-5 w-5" />,
        color: '#10b981',
        badge: 5,
        href: '/admin/gastos-ruta'
      },
      {
        title: 'Reportes',
        subtitle: 'Métricas por ruta',
        icon: <PieChart className="h-5 w-5" />,
        color: '#6366f1',
        href: '/admin/reportes/operativos'
      },
      {
        title: 'Clientes',
        subtitle: 'Consulta de cartera',
        icon: <Users className="h-5 w-5" />,
        color: '#f59e0b',
        href: '/admin/clientes'
      }
    ],
    COBRADOR: [
      {
        title: 'Mi Ruta',
        subtitle: 'Clientes del día',
        icon: <Map className="h-5 w-5" />,
        color: '#0f172a',
        badge: 24,
        href: '/admin/ruta-diaria'
      },
      {
        title: 'Registrar Pago',
        subtitle: 'Cobranza inmediata',
        icon: <Wallet className="h-5 w-5" />,
        color: '#10b981',
        href: '/admin/pagos/registro'
      },
      {
        title: 'Nuevo Cliente',
        subtitle: 'Registro rápido',
        icon: <Users className="h-5 w-5" />,
        color: '#6366f1',
        href: '/admin/clientes/nuevo'
      },
      {
        title: 'Base de Efectivo',
        subtitle: 'Solicitar dinero',
        icon: <Banknote className="h-5 w-5" />,
        color: '#f59e0b',
        href: '/admin/base-dinero'
      }
    ],
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
      { name: 'Juan Pérez', collected: 15400000, efficiency: 98, trend: 'up' as const },
      { name: 'Maria Gonzalez', collected: 12800000, efficiency: 95, trend: 'up' as const },
      { name: 'Pedro Coral', collected: 11200000, efficiency: 92, trend: 'down' as const },
      { name: 'Betty Pinzon', collected: 9800000, efficiency: 89, trend: 'up' as const },
      { name: 'Armando Mendoza', collected: 8500000, efficiency: 85, trend: 'down' as const },
    ],
    chartData: [
      { label: 'Lun', value: 2500000, target: 3000000 },
      { label: 'Mar', value: 2800000, target: 3000000 },
      { label: 'Mie', value: 1900000, target: 3000000 },
      { label: 'Jue', value: 3400000, target: 3000000 },
      { label: 'Vie', value: 2950000, target: 3000000 },
      { label: 'Sab', value: 3800000, target: 3000000 },
      { label: 'Dom', value: 1200000, target: 1500000 },
    ]
  };
}
