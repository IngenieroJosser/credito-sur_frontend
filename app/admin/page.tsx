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
  CheckCircle,
  Route,
  Map,
  Receipt,
  UserPlus,
  DollarSign,
  AlertTriangle,
  FileX,
  Percent,
  Package,
  Calculator,
  Inbox,
  FileCheck,
  CheckCircle as CheckCircleIcon,
  DollarSign as DollarSignIcon,
  AlertTriangle as AlertTriangleIcon,
  Map as MapIcon,
  Receipt as ReceiptIcon,
  UserPlus as UserPlusIcon,
  Banknote as BanknoteIcon,
  FileX as FileXIcon,
  Percent as PercentIcon,
  Package as PackageIcon,
  Calculator as CalculatorIcon,
  Inbox as InboxIcon,
  FileCheck as FileCheckIcon
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { obtenerPermisosUsuario, getIconComponent, Rol } from '@/lib/permissions';

interface MetricCard {
  title: string;
  value: number | string;
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
  const [mainMetrics, setMainMetrics] = useState<MetricCard[]>([]);
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([]);
  const router = useRouter();
  
  // Verificar sesión y cargar datos del usuario
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
      
      // Obtener permisos según el rol
      if (parsedUser.rol) {
        const permisos = obtenerPermisosUsuario(parsedUser.rol);
        
        // Convertir métricas del rol a formato de componente
        const metricsConverted = permisos.metricas.mainMetrics.map(metric => ({
          ...metric,
          icon: getIconComponent(metric.icon),
          value: metric.isCurrency ? Number(metric.value) : metric.value
        }));
        
        // Convertir accesos rápidos del rol a formato de componente
        const quickAccessConverted = permisos.metricas.quickAccess.map(item => ({
          ...item,
          icon: getIconComponent(item.icon)
        }));
        
        setMainMetrics(metricsConverted);
        setQuickAccess(quickAccessConverted);
      }
      
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

  // Obtener subtítulo según rol
  const getDashboardSubtitle = () => {
    if (!userData) return 'Dashboard principal';
    
    const subtitulos: Record<Rol, string> = {
      'SUPER_ADMINISTRADOR': 'Visión completa del sistema',
      'COORDINADOR': 'Gestión de créditos y rutas',
      'SUPERVISOR': 'Monitoreo operativo',
      'COBRADOR': 'Ruta diaria y cobros',
      'CONTADOR': 'Gestión financiera y contable'
    };
    
    return subtitulos[userData.rol] || 'Dashboard principal';
  };

  // Actividad reciente adaptada por rol
  const getRecentActivity = () => {
    if (!userData) return [];
    
    const actividades: Record<Rol, any[]> = {
      'SUPER_ADMINISTRADOR': [
        { id: 1, client: 'González M.', action: 'Pago completado', amount: 1250000, time: '09:42', status: 'success' },
        { id: 2, client: 'López C.', action: 'Renegociación', amount: 3500000, time: '10:15', status: 'pending' },
        { id: 3, client: 'Martínez A.', action: 'Mora detectada', amount: 750000, time: '11:30', status: 'alert' },
        { id: 4, client: 'Ramírez P.', action: 'Pago anticipado', amount: 2100000, time: '13:20', status: 'success' },
        { id: 5, client: 'Sánchez L.', action: 'Consulta saldo', amount: null, time: '14:45', status: 'info' }
      ],
      'COORDINADOR': [
        { id: 1, client: 'González M.', action: 'Crédito pendiente', amount: 2500000, time: '09:42', status: 'pending' },
        { id: 2, client: 'López C.', action: 'Solicitud de base', amount: 500000, time: '10:15', status: 'pending' },
        { id: 3, client: 'Martínez A.', action: 'Mora autorizada', amount: 750000, time: '11:30', status: 'success' },
        { id: 4, client: 'Ramírez P.', action: 'Ruta asignada', amount: null, time: '13:20', status: 'info' },
        { id: 5, client: 'Sánchez L.', action: 'Prórroga aprobada', amount: null, time: '14:45', status: 'success' }
      ],
      'SUPERVISOR': [
        { id: 1, client: 'González M.', action: 'Gasto pendiente', amount: 45000, time: '09:42', status: 'pending' },
        { id: 2, client: 'López C.', action: 'Visita completada', amount: null, time: '10:15', status: 'success' },
        { id: 3, client: 'Martínez A.', action: 'Cliente en mora', amount: 750000, time: '11:30', status: 'alert' },
        { id: 4, client: 'Cobrador R.', action: 'Reporte enviado', amount: null, time: '13:20', status: 'info' },
        { id: 5, client: 'Sánchez L.', action: 'Pago registrado', amount: 2100000, time: '14:45', status: 'success' }
      ],
      'COBRADOR': [
        { id: 1, client: 'González M.', action: 'Pago recibido', amount: 125000, time: '09:42', status: 'success' },
        { id: 2, client: 'López C.', action: 'Próxima visita', amount: null, time: '10:15', status: 'info' },
        { id: 3, client: 'Martínez A.', action: 'Cliente no encontrado', amount: null, time: '11:30', status: 'alert' },
        { id: 4, client: 'Ramírez P.', action: 'Gasto de ruta', amount: 25000, time: '13:20', status: 'pending' },
        { id: 5, client: 'Sánchez L.', action: 'Solicitud de base', amount: 300000, time: '14:45', status: 'pending' }
      ],
      'CONTADOR': [
        { id: 1, client: 'Transferencia', action: 'Ingreso bancario', amount: 3250000, time: '09:42', status: 'success' },
        { id: 2, client: 'López C.', action: 'Cuenta archivada', amount: 1500000, time: '10:15', status: 'alert' },
        { id: 3, client: 'Inventario', action: 'Producto actualizado', amount: null, time: '11:30', status: 'info' },
        { id: 4, client: 'Caja Principal', action: 'Gasto autorizado', amount: 450000, time: '13:20', status: 'success' },
        { id: 5, client: 'Reporte', action: 'Generado automático', amount: null, time: '14:45', status: 'info' }
      ]
    };
    
    return actividades[userData.rol] || actividades.SUPER_ADMINISTRADOR;
  };

  // Stats adicionales por rol
  const getAdditionalStats = () => {
    if (!userData) return [];
    
    const stats: Record<Rol, any[]> = {
      'SUPER_ADMINISTRADOR': [
        { label: 'Clientes Activos', value: '1,247', icon: <Users className="h-5 w-5" />, color: 'text-[#08557f]', bg: 'bg-[#08557f]/10' },
        { label: 'Préstamos Activos', value: '856', icon: <CreditCard className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Cobros Hoy', value: 4582000, isCurrency: true, icon: <Banknote className="h-5 w-5" />, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'En Morosidad', value: '3.6%', icon: <AlertCircle className="h-5 w-5" />, color: 'text-rose-600', bg: 'bg-rose-50' }
      ],
      'COORDINADOR': [
        { label: 'Créditos Pendientes', value: '15', icon: <CreditCard className="h-5 w-5" />, color: 'text-[#08557f]', bg: 'bg-[#08557f]/10' },
        { label: 'Solicitudes Base', value: '3', icon: <Wallet className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Cuentas Reprogramadas', value: '7', icon: <Calendar className="h-5 w-5" />, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Rutas Activas', value: '12', icon: <Route className="h-5 w-5" />, color: 'text-rose-600', bg: 'bg-rose-50' }
      ],
      'SUPERVISOR': [
        { label: 'Visitas Completadas', value: '89', icon: <CheckCircle className="h-5 w-5" />, color: 'text-[#08557f]', bg: 'bg-[#08557f]/10' },
        { label: 'Gastos Pendientes', value: '5', icon: <Receipt className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Clientes en Mora', value: '23', icon: <AlertTriangle className="h-5 w-5" />, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Cobradores Activos', value: '8', icon: <Users className="h-5 w-5" />, color: 'text-rose-600', bg: 'bg-rose-50' }
      ],
      'COBRADOR': [
        { label: 'Clientes por Visitar', value: '24', icon: <Users className="h-5 w-5" />, color: 'text-[#08557f]', bg: 'bg-[#08557f]/10' },
        { label: 'Pagos Realizados', value: '18', icon: <CheckCircle className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Recaudo Total', value: 1250000, isCurrency: true, icon: <Wallet className="h-5 w-5" />, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Gastos Reportados', value: 45000, isCurrency: true, icon: <Receipt className="h-5 w-5" />, color: 'text-rose-600', bg: 'bg-rose-50' }
      ],
      'CONTADOR': [
        { label: 'Ingresos del Día', value: 12500000, isCurrency: true, icon: <DollarSign className="h-5 w-5" />, color: 'text-[#08557f]', bg: 'bg-[#08557f]/10' },
        { label: 'Cuentas Archivadas', value: '3', icon: <FileX className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Productos Activos', value: '156', icon: <Package className="h-5 w-5" />, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Transferencias', value: '7', icon: <Banknote className="h-5 w-5" />, color: 'text-rose-600', bg: 'bg-rose-50' }
      ]
    };
    
    return stats[userData.rol] || stats.SUPER_ADMINISTRADOR;
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
          <div className="w-8 h-8 border-2 border-[#08557f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const recentActivity = getRecentActivity();
  const additionalStats = getAdditionalStats();

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10 p-6 lg:p-12 space-y-12">
        {/* Header Minimalista con título según rol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-light text-slate-900 tracking-tight mb-2">
              {getDashboardTitle()}
            </h1>
            <p className="text-slate-500 font-medium flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-[#08557f]/60" />
              {currentDate ? formatDate(currentDate) : ''}
              <span className="ml-2 px-2 py-1 bg-slate-100 rounded text-xs">
                {userData?.rol?.replace('_', ' ') || 'Usuario'}
              </span>
            </p>
            <p className="text-slate-400 text-sm mt-1">{getDashboardSubtitle()}</p>
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
                        ? 'bg-[#08557f] text-white shadow-md shadow-[#08557f]/20' 
                        : 'text-slate-500 hover:text-[#08557f] hover:bg-[#08557f]/5'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            
            {userData?.rol === 'SUPER_ADMINISTRADOR' || userData?.rol === 'CONTADOR' ? (
              <button className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm border border-slate-200 hover:border-[#08557f]/30 transition-all font-medium group">
                <Download className="h-4 w-4 text-slate-400 group-hover:text-[#08557f] transition-colors" />
                <span>Exportar</span>
              </button>
            ) : null}
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
                     ? 'bg-[#08557f] text-white' 
                     : 'bg-white text-slate-600 border border-slate-200'
                 }`}
               >
                 {item}
               </button>
             );
           })}
        </div>

        {/* Métricas principales según rol */}
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
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{metric.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Principal (Izquierda) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Accesos Rápidos según rol */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {quickAccess.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="group relative overflow-hidden rounded-2xl p-6 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 border border-slate-100"
                >
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="p-3 rounded-xl shadow-sm transition-transform group-hover:scale-110 duration-300" style={{ backgroundColor: item.color }}>
                      <div className="text-white">
                        {item.icon}
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#08557f]/10 transition-colors">
                      <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-[#08557f]" />
                    </div>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-[#08557f] transition-colors">{item.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{item.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Resumen de Rendimiento (solo para ciertos roles) */}
            {(userData?.rol === 'SUPER_ADMINISTRADOR' || userData?.rol === 'COORDINADOR' || userData?.rol === 'SUPERVISOR') && (
              <div className="rounded-2xl bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Rendimiento Mensual</h2>
                    <p className="text-slate-400 text-xs mt-1">Métricas clave de operación</p>
                  </div>
                  <button className="text-xs font-semibold text-[#08557f] hover:text-[#063a58] bg-[#08557f]/5 px-3 py-1.5 rounded-lg transition-colors">
                    Ver reporte detallado
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
                  {[
                    { label: 'Tasa de Recuperación', value: 94, color: '#10b981', desc: 'Excelente ritmo de cobro' },
                    { label: 'Eficiencia Operativa', value: 87, color: '#fb851b', desc: 'Dentro del rango esperado' },
                    { label: 'Satisfacción Cliente', value: 92, color: '#8b5cf6', desc: 'Basado en encuestas' },
                    { label: 'Cumplimiento Metas', value: 96, color: '#08557f', desc: 'Proyección positiva' }
                  ].map((item, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-slate-600">{item.label}</span>
                        <span className="text-lg font-bold text-slate-800">{item.value}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 relative"
                          style={{ 
                            width: `${item.value}%`,
                            backgroundColor: item.color,
                          }}
                        >
                          <div className="absolute inset-0 bg-white/20"></div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Lateral (Derecha) */}
          <div className="space-y-8">
            {/* Actividad Reciente */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden flex flex-col h-full">
              <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50">
                <h2 className="text-lg font-bold text-slate-800">Actividad Reciente</h2>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">En vivo</span>
                </div>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-200">
                <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                  {recentActivity.map((item) => (
                    <div key={item.id} className="relative pl-8 group">
                      {/* Punto de tiempo */}
                      <div className={`absolute left-[9px] top-1.5 h-3 w-3 rounded-full border-2 border-white ring-2 ring-slate-100 bg-white group-hover:scale-125 transition-transform duration-300 z-10`}>
                        <div className={`h-full w-full rounded-full ${
                           item.status === 'success' ? 'bg-emerald-500' :
                           item.status === 'pending' ? 'bg-orange-500' :
                           item.status === 'alert' ? 'bg-rose-500' :
                           'bg-blue-500'
                        }`}></div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-slate-800 group-hover:text-[#08557f] transition-colors">{item.client}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.time}</span>
                        </div>
                        <p className="text-xs text-slate-500">{item.action}</p>
                        {item.amount && (
                           <span className="inline-flex text-[10px] font-mono font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded w-fit mt-1">
                             {formatCurrency(item.amount)}
                           </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-50 bg-slate-50/30">
                <button className="w-full py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-[#08557f]/30 hover:text-[#08557f] transition-all shadow-sm">
                  Ver todo el historial
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats adicionales según rol */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {additionalStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex items-center space-x-4 border border-slate-100 hover:border-[#08557f]/20 transition-all">
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {stat.isCurrency ? formatCurrency(Number(stat.value)) : stat.value}
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer sutil */}
        <div className="mt-8 text-center pb-6">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">
            CrediSur • Sistema de Gestión v1.0 • {userData?.rol?.replace('_', ' ') || 'Usuario'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
