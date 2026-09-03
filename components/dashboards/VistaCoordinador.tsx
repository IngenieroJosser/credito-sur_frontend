'use client'

import PantallaCarga from '@/components/ui/PantallaCarga'

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { 
  Bell, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Users,
  CreditCard, 
  Wallet, 
  BarChart3, 
  CalendarClock, 
  Target,
  Shield,
  UserPlus,
  ChevronRight,
  Route,
  FileText,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Rol } from '@/lib/permissions';
import { formatCurrency } from '@/lib/utils';
import { TransactionalHighDetailChart } from '@/components/ui/TransactionalHighDetailChart'
import { dashboardService, type DashboardData } from '@/services/dashboard-coordinador-service'
import { formatErrorForComponent } from '@/lib/api/api'
import { computeOperationalMetaTotalForTimeFilter } from '@/lib/dashboard-operational-meta'
import { offlineStore } from '@/lib/offline/offlineDb';
import { TimeFilter, TimeFilterPeriod } from '@/components/ui/TimeFilter';
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal';
import { prestamosService } from '@/services/prestamos-service';
import { exportService } from '@/services/export-service';
import { buildCrearPrestamoPayload } from '@/lib/creditos/crear-prestamo-payload';
import { toast } from 'sonner';

interface Usuario {
  id?: string
  nombres: string
  apellidos: string
  correo: string
  telefono?: string
  rol: Rol
  fecha_creacion?: string
  direccion?: string
  ciudad?: string
}

interface MetricCard {
  title: string;
  value: string;
  change: number | null;
  icon: React.ReactNode;
  color: string;
  trendData?: number[];
}

interface QuickAccessItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  badge?: number;
  href: string;
}

const VistaCoordinador = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilterPeriod>('today');
  const [user, setUser] = useState<Usuario | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [showCrearCreditoModal, setShowCrearCreditoModal] = useState(false)
  const router = useRouter()
  const currentDate = new Date();

  useEffect(() => {
    const loadUserData = () => {
      try {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) {
          router.replace('/login')
          return
        }

        if (userData) {
          const parsedUser = JSON.parse(userData) as Usuario
          
          // Verificar que el rol sea COORDINADOR
          if (parsedUser.rol !== 'COORDINADOR') {
            const ROLE_REDIRECT_MAP: Record<string, string> = {
              'SUPER_ADMINISTRADOR': '/admin',
              'ADMIN': '/admin',
              'COORDINADOR': '/coordinador',
              'SUPERVISOR': '/supervisor',
              'COBRADOR': '/cobranzas',
              'CONTADOR': '/contador/contable',
            };
            
            const redirectPath = ROLE_REDIRECT_MAP[parsedUser.rol] || '/';
            router.replace(redirectPath);
            return;
          }

          setUser(parsedUser)
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error)
      } finally {
        setAuthChecked(true)
      }
    }

    loadUserData()
  }, [router])

  const loadDashboardData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true)
      setError(null)

    const data = await dashboardService.getDashboardData(timeFilter)

    const trend = Array.isArray((data as any)?.trend)
      ? (data as any).trend.map((t: any) => {
          const value = Number(t?.value || 0);
          const target = Number(t?.target || 0);

          return {
            ...t,
            value,
            target,
            efficiency:
              target > 0
                ? Math.min(100, Math.max(0, Number(((value / target) * 100).toFixed(2))))
                : 0,
          };
        })
      : [];

    setDashboardData({
      ...(data as any),
      trend,
    });
    } catch (err) {
      setError(formatErrorForComponent(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  // BUG-16 FIX: quitar refreshing de deps evita el ciclo:
  // handleRefresh → setRefreshing(true) → callback recreado → doble disparo del useEffect.
  }, [timeFilter])

  useEffect(() => {
    if (authChecked) {
      loadDashboardData()
    }
  }, [authChecked, timeFilter, loadDashboardData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  // Tiempo real: refrescar cuando haya pagos, créditos o cambios de rutas
  useRealtimeData(['pagos_actualizados', 'prestamos_actualizados', 'rutas_actualizadas', 'dashboards_actualizados'], loadDashboardData)

  const handleApprove = async (id: string, type: string) => {
    try {
      setApprovingId(id)
      await dashboardService.handleApprove(id, type)
      await loadDashboardData()
      // Aquí podrías agregar un toast de éxito
    } catch (err) {
      const errorMessage = formatErrorForComponent(err)
      setError(errorMessage)
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (id: string, type: string) => {
    try {
      setRejectingId(id)
      await dashboardService.handleReject(id, type)
      await loadDashboardData()
      // Aquí podrías agregar un toast de éxito
    } catch (err) {
      const errorMessage = formatErrorForComponent(err)
      setError(errorMessage)
    } finally {
      setRejectingId(null)
    }
  }

  // Formatear fecha elegante
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-ES', options);
  };

  // Métricas principales basadas en datos reales
  const mainMetrics: MetricCard[] = dashboardData ? [
    {
      title: 'Aprobaciones Pendientes',
      value: dashboardData.metrics.pendingApprovals.toString(),
      change: null, // El backend no provee variación vs período anterior
      icon: <Bell className="h-4 w-4" />,
      color: '#08557f'
    },
    {
      title: 'Cuentas en Mora',
      value: dashboardData.metrics.delinquentAccounts.toString(),
      change: null,
      icon: <AlertCircle className="h-4 w-4" />,
      color: '#ef4444'
    },
    {
      title: 'Base Solicitada',
      value: formatCurrency(dashboardData.metrics.requestedBase),
      change: null,
      icon: <Wallet className="h-4 w-4" />,
      color: '#fb851b'
    },
    {
      title: 'Eficiencia',
      value: `${(dashboardData.metrics?.efficiency ?? 0).toFixed(1)}%`,
      change: null,
      icon: <Target className="h-4 w-4" />,
      color: '#10b981'
    }
  ] : [];

  // Accesos rápidos
  const quickAccess: QuickAccessItem[] = [
    {
      title: 'Crear Crédito',
      subtitle: 'Definir tasas y cuotas',
      icon: <CreditCard className="h-5 w-5" />,
      color: '#08557f',
      href: '#'
    },
    {
      title: 'Asignar Rutas',
      subtitle: 'Supervisión de cobro',
      icon: <Route className="h-5 w-5" />,
      color: '#10b981',
      href: '/coordinador/rutas'
    },
    {
      title: 'Gestionar Prórrogas',
      subtitle: 'Autorización de reprogramación',
      icon: <CalendarClock className="h-5 w-5" />,
      color: '#fb851b',
      href: '/coordinador/prorrogas'
    },
    {
      title: 'Reportes',
      subtitle: 'Flujo de caja y rendimiento',
      icon: <BarChart3 className="h-5 w-5" />,
      color: '#8b5cf6',
      href: '/coordinador/reportes'
    }
  ];

  // Función para obtener el color según el estado/prioridad
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'moderate': return '#f59e0b';
      case 'mild': return '#10b981';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Función para obtener el icono según el tipo
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cliente': return <UserPlus className="h-4 w-4" />;
      case 'credito': return <CreditCard className="h-4 w-4" />;
      case 'gasto': return <FileText className="h-4 w-4" />;
      case 'base-dinero': return <Wallet className="h-4 w-4" />;
      case 'prorroga': return <CalendarClock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (!authChecked) return null

  // Estado de carga inicial
  if (loading && !dashboardData) {
    return (
      <PantallaCarga texto="Cargando panel de coordinación..." />
    )
  }

  // Estado de error
  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="p-4 rounded-3xl bg-white border border-rose-100 shadow-lg inline-block mb-6">
            <AlertCircle className="h-12 w-12 text-rose-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Error al cargar datos</h3>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-2 bg-[#08557f] text-white font-bold rounded-xl hover:bg-[#063a58] transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-cyan-500 opacity-20 blur-[100px]" />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* Encabezado del dashboard */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-[#08557f] to-[#063a58] rounded-2xl shadow-lg shadow-blue-900/20">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-slate-800 tracking-tight">
                  Hola, <span className="font-black text-[#08557f]">{user?.nombres || 'Coordinador'}</span>
                </h1>
                <p className="text-sm text-slate-500 font-medium">Gestión operativa y aprobaciones de crédito</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCw className={`h-4 w-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <p className="text-xs font-black text-[#fb851b] uppercase tracking-[0.2em] bg-orange-50 px-4 py-2 rounded-xl border border-orange-100" suppressHydrationWarning>
                {formatDate(currentDate)}
              </p>
            </div>
          </div>
          
          {/* Filtro de tiempo */}
          <TimeFilter
            activePeriod={timeFilter}
            onPeriodChange={(p) => setTimeFilter(p)}
            className="mt-6"
          />
        </div>

        {/* Estado de carga durante refresh */}
        {refreshing && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-[#08557f] animate-spin" />
              <span className="text-xs font-bold text-slate-600">Actualizando datos...</span>
            </div>
          </div>
        )}

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {loading && !dashboardData ? (
            // Skeleton para métricas
            Array(4).fill(0).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-slate-100 rounded-[2rem] p-6 animate-pulse"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-2xl bg-slate-100"></div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="w-16 h-6 bg-slate-100 rounded-full"></div>
                    <div className="w-24 h-8 bg-slate-100 rounded"></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-8 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                </div>
              </div>
            ))
          ) : (
            mainMetrics.map((metric, index) => (
              <div
                key={index}
                className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:text-[#08557f] group-hover:bg-blue-50 transition-colors border border-slate-100 shadow-sm">
                    {metric.icon}
                  </div>
                  <div className={`flex flex-col items-end gap-2`}>
                     {metric.change !== null && (
                       <div className={`flex items-center font-black text-[10px] px-3 py-1 rounded-full ${
                         metric.change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                       }`}>
                         {metric.change >= 0 ? '+' : ''}{metric.change}%
                       </div>
                     )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-black text-slate-900 tracking-tighter">
                    {metric.value}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
                    {metric.title}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Layout en Dos Columnas (2/3 - 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Columna Izquierda (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Gráfico de Tendencia (Premium) */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Tendencia de Cobros</h2>
                    <p className="text-sm text-slate-500 font-medium">Rendimiento semanal</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 group">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real</span>
                    </div>
                  </div>
                </div>
                
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-full h-48 bg-slate-100 rounded-2xl animate-pulse"></div>
                  </div>
                ) : (
                  <TransactionalHighDetailChart 
                    data={dashboardData?.trend || []}
                  />
                )}
            </div>

            {/* Bandeja de Aprobaciones */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Bandeja de Aprobaciones</h2>
                  <p className="text-sm text-slate-500 font-medium">Solicitudes pendientes de validación</p>
                </div>
                <div className="px-4 py-1.5 bg-blue-50 text-[#08557f] rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100">
                  {dashboardData?.pendingApprovals.length || 0} PENDIENTES
                </div>
              </div>
              
              {loading ? (
                // Skeleton para aprobaciones
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-6 border border-slate-100 rounded-3xl bg-slate-50 animate-pulse">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-5">
                          <div className="p-4 rounded-2xl bg-slate-200"></div>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="h-4 bg-slate-200 rounded w-32"></div>
                              <div className="h-4 bg-slate-200 rounded w-20"></div>
                            </div>
                            <div className="h-3 bg-slate-200 rounded w-48"></div>
                            <div className="flex items-center space-x-6">
                              <div className="h-6 bg-slate-200 rounded w-24"></div>
                              <div className="h-6 bg-slate-200 rounded w-20"></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                          <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.pendingApprovals && dashboardData.pendingApprovals.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.pendingApprovals.map((item) => (
                    <div key={item.id} className="p-6 border border-slate-100 rounded-3xl hover:border-blue-200 transition-all hover:bg-blue-50/30 group bg-white shadow-sm hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-5">
                          <div className="p-4 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-[#08557f] group-hover:shadow-md transition-all border border-slate-100">
                            {getTypeIcon(item.type)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-3 mb-1">
                              <h3 className="font-bold text-slate-900">{item.description}</h3>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border" style={{ 
                                backgroundColor: `${getStatusColor(item.priority)}10`,
                                color: getStatusColor(item.priority),
                                borderColor: `${getStatusColor(item.priority)}20`
                              }}>
                                {item.priority === 'high' ? 'PRIORIDAD ALTA' : 'PRIORIDAD MEDIA'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium mb-4">{item.details}</p>
                            <div className="flex items-center space-x-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <span className="flex items-center bg-slate-100 px-2 py-1 rounded-lg">
                                <Users className="h-3 w-3 mr-2" />
                                {item.requestedBy}
                              </span>
                              <span className="flex items-center bg-slate-100 px-2 py-1 rounded-lg">
                                <Clock className="h-3 w-3 mr-2" />
                                {item.time}
                              </span>
                              {item.amount && (
                                <span className="text-[#08557f] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                  {formatCurrency(item.amount)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={() => handleApprove(item.id, item.type)}
                            disabled={approvingId === item.id || rejectingId === item.id}
                            className="w-12 h-12 flex items-center justify-center bg-white text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm border border-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {approvingId === item.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-6 w-6" />
                            )}
                          </button>
                          <button 
                            onClick={() => handleReject(item.id, item.type)}
                            disabled={rejectingId === item.id || approvingId === item.id}
                            className="w-12 h-12 flex items-center justify-center bg-white text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {rejectingId === item.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <XCircle className="h-6 w-6" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="shrink-0 p-4 rounded-3xl bg-slate-50 border border-slate-100 inline-block mb-4">
                    <CheckCircle className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">¡Todo al día!</h3>
                  <p className="text-sm text-slate-500">No hay aprobaciones pendientes en este momento.</p>
                </div>
              )}
            </div>

            {/* Actividad Reciente */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Actividad del Sistema</h2>
                <Link href="/coordinador/reportes" className="text-xs font-black text-[#fb851b] hover:underline uppercase tracking-[0.2em] bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 transition-all hover:bg-orange-100">
                  Ver más
                </Link>
              </div>
              
              {loading ? (
                // Skeleton para actividad reciente
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="p-5 border border-slate-50 rounded-3xl bg-slate-50 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                          <div>
                            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                          <div className="h-3 bg-slate-200 rounded w-12"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboardData.recentActivity.map((item) => (
                    <div key={item.id} className="p-5 border border-slate-50 rounded-3xl hover:bg-slate-50 transition-all flex items-center justify-between group shadow-sm">
                      <div className="flex items-center space-x-4">
                          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${item.status === 'alert' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                          <div>
                            <div className="text-sm font-black text-slate-900">{item.client}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.action}</div>
                          </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-[#08557f]">{item.amount}</div>
                        <div className="text-[10px] text-slate-400 font-bold tracking-tighter">{item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">No hay actividad reciente para mostrar.</p>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha / Sidebar (1/3) */}
          <div className="space-y-8">
            {/* Atajos Rápidos */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
              <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest text-[10px] text-slate-400">Acciones Directas</h2>
              <div className="space-y-4">
                {quickAccess.map((item, index) => {
                  const modalAction = item.title === 'Crear Crédito' ? () => setShowCrearCreditoModal(true) : null;

                  if (modalAction) {
                    return (
                      <button
                        key={index}
                        onClick={modalAction}
                        className="w-full flex items-center p-5 rounded-[1.5rem] border border-slate-100 hover:border-[#08557f]/30 hover:bg-blue-50/20 transition-all group shadow-sm bg-white text-left"
                      >
                        <div className="p-3 rounded-2xl mr-4 transition-all group-hover:scale-110 shadow-sm border border-slate-100 bg-white" style={{ color: item.color }}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{item.title}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">{item.subtitle}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#08557f] group-hover:translate-x-1 transition-all" />
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={index}
                      href={item.href}
                      className="flex items-center p-5 rounded-[1.5rem] border border-slate-100 hover:border-[#08557f]/30 hover:bg-blue-50/20 transition-all group shadow-sm bg-white"
                    >
                      <div className="p-3 rounded-2xl mr-4 transition-all group-hover:scale-110 shadow-sm border border-slate-100 bg-white" style={{ color: item.color }}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{item.title}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">{item.subtitle}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#08557f] group-hover:translate-x-1 transition-all" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Cuentas en Mora */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Mora Crítica</h2>
                <AlertCircle className="h-5 w-5 text-rose-500" />
              </div>
              
              {loading ? (
                // Skeleton para cuentas en mora
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-5 border border-rose-100 rounded-[1.5rem] bg-rose-50/30 animate-pulse">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-4 bg-rose-100 rounded w-24"></div>
                        <div className="h-6 bg-rose-100 rounded w-16"></div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="space-y-2">
                          <div className="h-3 bg-rose-100 rounded w-20"></div>
                          <div className="h-5 bg-rose-100 rounded w-28"></div>
                        </div>
                        <div className="p-2 bg-white rounded-xl"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.delinquentAccounts && dashboardData.delinquentAccounts.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.delinquentAccounts.map((account) => (
                    <div key={account.id} className="p-5 border border-rose-100 rounded-[1.5rem] bg-rose-50/30 group relative transition-all hover:bg-white hover:shadow-lg hover:shadow-rose-100">
                      <div className="flex items-center justify-between mb-3">
                          <h3 className="font-black text-slate-900 text-sm tracking-tight">{account.client}</h3>
                          <span className="text-[10px] font-black text-white bg-rose-500 px-3 py-1 rounded-full shadow-sm shadow-rose-200 uppercase tracking-tighter">
                            {account.daysLate} DÍAS
                          </span>
                      </div>
                      <div className="flex justify-between items-end">
                          <div className="min-w-0">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Saldo Pendiente</p>
                            <p className="text-base font-black text-rose-600">{formatCurrency(account.amountDue)}</p>
                          </div>
                          <Link href={`/coordinador/cuentas-mora/${account.id}`} className="p-2 bg-white text-[#08557f] hover:bg-[#08557f] hover:text-white rounded-xl shadow-sm border border-slate-100 transition-all">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="shrink-0 p-4 rounded-3xl bg-emerald-50 border border-emerald-100 inline-block mb-4">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 mb-1">¡Excelente!</h3>
                  <p className="text-xs text-slate-500">No hay cuentas en mora crítica.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Refinado */}
        <div className="mt-20 flex flex-col items-center">
          <div className="flex items-center space-x-8 mb-8">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-slate-200" />
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xl rotate-3 hover:rotate-0 transition-all duration-700 hover:scale-110">
              <Shield className="h-8 w-8 text-[#08557f]" />
            </div>
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-slate-200" />
          </div>
          <div className="text-center space-y-3">
            <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.5em]">
              Sincronizado: <span className="text-[#fb851b]">{new Date().toLocaleTimeString()}</span> • CrediSur v2.4 
            </p>
            <div className="flex items-center justify-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span>Terminal de Coordinación Central Autenticada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Crear Crédito */}
      <CrearCreditoModal
        isOpen={showCrearCreditoModal}
        onClose={() => setShowCrearCreditoModal(false)}
        onConfirm={async (data) => {
          try {
            const esContado = Boolean((data as any).ventaContado)
            const isArticulo = data.creditType === 'articulo'
            const payload = buildCrearPrestamoPayload(data, user?.id)

            const prestamo = await prestamosService.crearPrestamo(payload)
            
            toast.success('Crédito Creado', {
              description: 'El crédito ha sido registrado exitosamente.'
            })
            setShowCrearCreditoModal(false)

            if (isArticulo && prestamo?.id) {
              try {
                await exportService.exportContrato(prestamo.id)
              } catch (err) {
                console.error('Error al descargar contrato:', err)
              }
            }
            
            loadDashboardData()
          } catch (error: any) {
            toast.error('Error al crear crédito', {
              description: error?.message || 'Ocurrió un error inesperado.'
            })
          }
        }}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
};

export default VistaCoordinador;
