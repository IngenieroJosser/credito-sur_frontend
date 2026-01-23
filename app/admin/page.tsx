'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Users,
  CreditCard,
  Banknote,
  PieChart,
  Target,
  Download,
  Calendar,
  ArrowUpRight,
  Activity,
  Wallet,
  CheckCircle2,
  Route,
  Map,
  Receipt,
  ShoppingBag,
  Archive,
  FileText,
  DollarSign,
  Percent,
  Package,
  Calculator,
  Inbox,
  Filter,
  BarChart3,
  Shield,
  LayoutDashboard
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ExportButton } from '@/components/ui/ExportButton';
import { Rol, obtenerModulosPorRol, getIconComponent } from '@/lib/permissions';
import VistaCobradorPage from '../cobranzas/page';

interface UserData {
  id: string;
  nombres: string;
  apellidos: string;
  rol: Rol;
  correo?: string;
  telefono?: string;
  nombreCompleto?: string;
}

const DashboardPage = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [quickAccess, setQuickAccess] = useState<any[]>([]);
  const [mainMetrics, setMainMetrics] = useState<any[]>([]);
  const router = useRouter();
  
  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
  }
  
  // Verificar sesión
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      router.replace('/');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(user) as UserData;
      setUserData(parsedUser);
      
      // Configurar métricas y accesos rápidos según el rol
      configurarDashboardPorRol(parsedUser.rol);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error al parsear datos del usuario:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/');
    }
  }, [router]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentDate(new Date());
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  
  const configurarDashboardPorRol = (rol: Rol) => {
    // Configurar métricas según el rol
    const metricsConfig: Record<Rol, any[]> = {
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
          subValue: '$12.5M / $13.2M',
          isCurrency: false,
          change: 2.1,
          icon: <Target className="h-4 w-4" />,
          color: '#10b981'
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
          title: 'Aprobaciones',
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
          title: 'Rutas Activas',
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
          value: '₡185M',
          isCurrency: false,
          change: 8.7,
          icon: <Package className="h-4 w-4" />,
          color: '#f59e0b'
        }
      ]
    };

    // Configurar accesos rápidos según el rol
    const quickAccessConfig: Record<Rol, any[]> = {
      SUPER_ADMINISTRADOR: [
        {
          title: 'Nuevo Crédito',
          subtitle: 'Registro rápido',
          icon: <CreditCard className="h-5 w-5" />,
          color: '#0f172a',
          badge: 3,
          href: '/admin/prestamos/nuevo'
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
          title: 'Aprobaciones',
          subtitle: 'Pendientes de revisión',
          icon: <Inbox className="h-5 w-5" />,
          color: '#0f172a',
          badge: 8,
          href: '/admin/aprobaciones'
        },
        {
          title: 'Nuevo Crédito',
          subtitle: 'Crear préstamo',
          icon: <CreditCard className="h-5 w-5" />,
          color: '#10b981',
          href: '/admin/prestamos/nuevo'
        },
        {
          title: 'Rutas',
          subtitle: 'Gestión de cobradores',
          icon: <Route className="h-5 w-5" />,
          color: '#6366f1',
          href: '/admin/rutas'
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
          icon: <Activity className="h-5 w-5" />,
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
          href: '/admin/contable'
        },
        {
          title: 'Tesorería',
          subtitle: 'Ingresos y transferencias',
          icon: <Banknote className="h-5 w-5" />,
          color: '#10b981',
          href: '/admin/tesoreria'
        },
        {
          title: 'Inventario',
          subtitle: 'Gestión de productos',
          icon: <Package className="h-5 w-5" />,
          color: '#8b5cf6',
          href: '/admin/articulos'
        },
        {
          title: 'Reportes Financieros',
          subtitle: 'Análisis detallado',
          icon: <BarChart3 className="h-5 w-5" />,
          color: '#fb851b',
          href: '/admin/reportes/financieros'
        }
      ]
    };

    setMainMetrics(metricsConfig[rol] || []);
    setQuickAccess(quickAccessConfig[rol] || []);
  };

  // Formatear fecha elegante
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-CO', options);
  };

  // Obtener título del dashboard según rol
  const getDashboardTitle = () => {
    if (!userData) return 'Panel de Control';
    
    const titulos: Record<Rol, string> = {
      'SUPER_ADMINISTRADOR': 'Panel de Control',
      'COORDINADOR': 'Coordinación de Operaciones',
      'SUPERVISOR': 'Supervisión de Campo',
      'COBRADOR': 'Mi Gestión de Cobranza',
      'CONTADOR': 'Control Financiero'
    };
    
    return titulos[userData.rol] || 'Panel de Control';
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/');
  };

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si el usuario es COBRADOR, mostrar el componente específico
  if (userData?.rol === 'COBRADOR') {
    return <VistaCobradorPage />;
  }

  // Para otros roles, mostrar el dashboard normal
  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-6 lg:p-12 space-y-12">
        {/* Header Standard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-blue-600">Panel</span> <span className="text-orange-500">Principal</span>
              </h1>
            </div>
            <p className="text-slate-500 mt-1 font-medium text-sm flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {currentDate ? formatDate(currentDate) : ''}
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold border border-slate-200">
                {userData?.rol?.replace('_', ' ') || 'Usuario'}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
              {['Hoy', 'Sem', 'Mes', 'Trim'].map((item, index) => {
                const values = ['today', 'week', 'month', 'quarter'] as const;
                return (
                  <button
                    key={item}
                    onClick={() => setTimeFilter(values[index])}
                    className={`px-5 py-2 text-sm rounded-lg transition-all font-medium ${
                      timeFilter === values[index] 
                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                        : 'text-slate-500 hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            
            <ExportButton 
              label="Exportar" 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </div>
        
        {/* Filtro móvil */}
        <div className="md:hidden flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
          {['Hoy', 'Semana', 'Mes', 'Trimestre'].map((item, index) => {
             const values = ['today', 'week', 'month', 'quarter'] as const;
             return (
               <button
                 key={item}
                 onClick={() => setTimeFilter(values[index])}
                 className={`px-4 py-2 text-sm rounded-full whitespace-nowrap transition-all font-medium ${
                   timeFilter === values[index] 
                     ? 'bg-primary text-white' 
                     : 'bg-white text-slate-600 border border-slate-200'
                 }`}
               >
                 {item}
               </button>
             );
           })}
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainMetrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="p-3 rounded-xl transition-all duration-300"
                  style={{ backgroundColor: `${metric.color}10`, color: metric.color }}
                >
                  {metric.icon}
                </div>
                <div className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-full ${
                  metric.change >= 0 
                    ? 'text-emerald-700 bg-emerald-50' 
                    : 'text-rose-700 bg-rose-50'
                }`}>
                  {metric.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{metric.change >= 0 ? '+' : ''}{metric.change}%</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-2xl font-bold text-slate-800 tracking-tight truncate" title={metric.isCurrency ? formatCurrency(Number(metric.value)) : String(metric.value)}>
                  {metric.isCurrency ? formatCurrency(Number(metric.value)) : metric.value}
                </div>
                {metric.subValue && (
                  <div className="text-xs font-medium text-slate-500">{metric.subValue}</div>
                )}
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{metric.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Principal (Izquierda) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Gráfico Principal: Tendencia de Cobros */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tendencia de Cobros</h3>
                  <p className="text-slate-500 text-sm">Últimos 7 días vs Meta Diaria</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    Real
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300 border-dashed"></div>
                    Meta
                  </div>
                </div>
              </div>
              
              <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2">
                {[
                  { day: 'Lun', real: 85, meta: 100, val: 2500000 },
                  { day: 'Mar', real: 92, meta: 100, val: 2800000 },
                  { day: 'Mie', real: 65, meta: 100, val: 1900000 },
                  { day: 'Jue', real: 110, meta: 100, val: 3200000 },
                  { day: 'Vie', real: 98, meta: 100, val: 2950000 },
                  { day: 'Sab', real: 120, meta: 100, val: 3500000 },
                  { day: 'Dom', real: 45, meta: 60, val: 1200000 },
                ].map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full max-w-[40px] h-full flex items-end">
                      {/* Meta Bar (Ghost) */}
                      <div 
                        className="absolute bottom-0 w-full rounded-t-lg border-2 border-dashed border-slate-200 bg-transparent z-0"
                        style={{ height: `${item.meta}%` }}
                      ></div>
                      {/* Real Bar */}
                      <div 
                        className={`relative w-full rounded-t-md transition-all duration-500 z-10 ${
                          item.real >= item.meta ? 'bg-emerald-500' : 'bg-blue-500'
                        } group-hover:opacity-90`}
                        style={{ height: `${Math.min(item.real, 100)}%` }}
                      >
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap transition-opacity z-20">
                          {formatCurrency(item.val)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Listado: Últimos Préstamos Aprobados */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Últimos Préstamos Aprobados</h3>
                <Link href="/admin/prestamos" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                  Ver todos
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Monto</th>
                      <th className="px-4 py-3 font-medium">Plazo</th>
                      <th className="px-4 py-3 font-medium text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { client: 'Ana María Polo', amount: 1500000, term: 'Mensual', status: 'APROBADO', date: 'Hace 2h' },
                      { client: 'Carlos Vives', amount: 5000000, term: 'Quincenal', status: 'PENDIENTE', date: 'Hace 4h' },
                      { client: 'Juanes', amount: 800000, term: 'Diario', status: 'APROBADO', date: 'Hace 5h' },
                      { client: 'Shakira Mebarak', amount: 12000000, term: 'Mensual', status: 'APROBADO', date: 'Hace 1d' },
                    ].map((loan, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{loan.client}</div>
                          <div className="text-xs text-slate-500">{loan.date}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{formatCurrency(loan.amount)}</td>
                        <td className="px-4 py-3 text-slate-600">{loan.term}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            loan.status === 'APROBADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Columna Lateral (Derecha) */}
          <div className="space-y-8">
            
            {/* Listado: Top 5 Cobradores */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Top 5 Cobradores</h3>
                <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-full">Mes Actual</span>
              </div>
              <div className="space-y-5">
                {[
                  { name: 'Juan Pérez', collected: 15400000, efficiency: 98, trend: 'up' },
                  { name: 'Maria Gonzalez', collected: 12800000, efficiency: 95, trend: 'up' },
                  { name: 'Pedro Coral', collected: 11200000, efficiency: 92, trend: 'down' },
                  { name: 'Betty Pinzon', collected: 9800000, efficiency: 89, trend: 'up' },
                  { name: 'Armando Mendoza', collected: 8500000, efficiency: 85, trend: 'down' },
                ].map((collector, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 text-sm">{collector.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          Eficiencia: 
                          <span className={collector.efficiency >= 95 ? 'text-emerald-600 font-semibold' : 'text-slate-600'}>
                            {collector.efficiency}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800 text-sm">{formatCurrency(collector.collected)}</div>
                      {collector.trend === 'up' ? (
                        <div className="text-[10px] text-emerald-600 flex items-center justify-end gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          <span>Excelente</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-600 flex items-center justify-end gap-0.5">
                          <TrendingDown className="h-3 w-3" />
                          <span>Regular</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href="/admin/reportes/operativos" className="block w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Ver reporte completo
                </Link>
              </div>
            </div>

            {/* Accesos Rápidos (Reducido) */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Accesos Rápidos</h3>
              <div className="grid grid-cols-1 gap-3">
                {quickAccess.slice(0, 3).map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm group-hover:text-blue-700">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.subtitle}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>



        {/* Footer sutil */}
        <div className="mt-8 text-center pb-6">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">
            CrediSur • Sistema de Gestión v1.0 • Sesión activa
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
