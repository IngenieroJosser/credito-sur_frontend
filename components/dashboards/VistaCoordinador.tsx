'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  FileText
} from 'lucide-react';
import { Rol } from '@/lib/permissions';
import { formatCurrency } from '@/lib/utils';
import { Sparkline, PremiumBarChart } from '@/components/ui/PremiumCharts';

interface MetricCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  trendData: number[];
}

interface QuickAccessItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  badge?: number;
  href: string;
}

interface ApprovalItem {
  id: number;
  type: 'cliente' | 'credito' | 'gasto' | 'base-dinero' | 'prorroga';
  description: string;
  requestedBy: string;
  time: string;
  amount?: number;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
}

interface DelinquentAccount {
  id: number;
  client: string;
  daysLate: number;
  amountDue: number;
  collector: string;
  route: string;
  status: 'critical' | 'moderate' | 'mild';
}

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

const VistaCoordinador = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [user, setUser] = useState<Usuario | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
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

  // Métricas principales
  const mainMetrics: MetricCard[] = [
    {
      title: 'Aprobaciones Pendientes',
      value: '12',
      change: 8.2,
      icon: <Bell className="h-4 w-4" />,
      color: '#08557f',
      trendData: [65, 70, 75, 78, 82, 85, 88, 90, 92, 95, 96, 98]
    },
    {
      title: 'Cuentas en Mora',
      value: '24',
      change: -3.4,
      icon: <AlertCircle className="h-4 w-4" />,
      color: '#ef4444',
      trendData: [12, 11, 10, 9, 8, 7, 6, 5.5, 5, 4.8, 4.5, 4.5]
    },
    {
      title: 'Base Solicitada',
      value: formatCurrency(150000),
      change: 12.5,
      icon: <Wallet className="h-4 w-4" />,
      color: '#fb851b',
      trendData: [85, 87, 88, 89, 90, 91, 92, 93, 93.5, 94, 94.2, 94.2]
    },
    {
      title: 'Eficiencia',
      value: '92.3%',
      change: 1.8,
      icon: <Target className="h-4 w-4" />,
      color: '#10b981',
      trendData: [80, 81, 82, 83, 84, 85, 86, 86.5, 87, 87.2, 87.3, 87.3]
    }
  ];

  // Accesos rápidos
  const quickAccess: QuickAccessItem[] = [
    {
      title: 'Crear Crédito',
      subtitle: 'Definir tasas y cuotas',
      icon: <CreditCard className="h-5 w-5" />,
      color: '#08557f',
      href: '/coordinador/creditos/nuevo'
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

  // Datos de aprobaciones
  const approvalItems: ApprovalItem[] = [
    { id: 1, type: 'cliente', description: 'Nuevo cliente', requestedBy: 'Carlos R.', time: '09:30', details: 'Juan Pérez - Documento 12345678', status: 'pending', priority: 'high' },
    { id: 2, type: 'credito', description: 'Solicitud de crédito', requestedBy: 'María G.', time: '10:15', amount: 2500000, details: 'Refrigerador LG 320L - 12 meses', status: 'pending', priority: 'high' },
    { id: 3, type: 'gasto', description: 'Gasto operativo', requestedBy: 'Pedro S.', time: '11:45', amount: 35000, details: 'Combustible y mantenimiento', status: 'pending', priority: 'medium' },
    { id: 4, type: 'base-dinero', description: 'Base de efectivo', requestedBy: 'Ana L.', time: '12:20', amount: 150000, details: 'Para cambio a clientes', status: 'pending', priority: 'high' },
    { id: 5, type: 'prorroga', description: 'Prórroga de cuota', requestedBy: 'Luis M.', time: '13:10', details: 'Reprogramación hasta 14/01', status: 'pending', priority: 'medium' },
  ];

  // Cuentas en mora
  const delinquentAccounts: DelinquentAccount[] = [
    { id: 1, client: 'González M.', daysLate: 15, amountDue: 750000, collector: 'Juan Pérez', route: 'Norte', status: 'critical' },
    { id: 2, client: 'Rodríguez C.', daysLate: 8, amountDue: 450000, collector: 'María González', route: 'Centro', status: 'moderate' },
    { id: 3, client: 'Sánchez L.', daysLate: 5, amountDue: 250000, collector: 'Pedro Sánchez', route: 'Sur', status: 'mild' },
  ];


  // Actividad reciente
  const recentActivity = [
    { id: 1, client: 'González M.', action: 'Aprobación de crédito', amount: formatCurrency(2500000), time: '09:42', status: 'approved' },
    { id: 2, client: 'López C.', action: 'Prórroga autorizada', amount: '-', time: '10:15', status: 'approved' },
    { id: 3, client: 'Martínez A.', action: 'Cuenta en mora revisada', amount: formatCurrency(750000), time: '11:30', status: 'alert' },
    { id: 4, client: 'Ramírez P.', action: 'Base de efectivo aprobada', amount: formatCurrency(150000), time: '13:20', status: 'approved' },
    { id: 5, client: 'Sánchez L.', action: 'Nuevo cliente aprobado', amount: '-', time: '14:45', status: 'approved' }
  ];

  // Funciones de aprobación/rechazo
  const handleApprove = (id: number, type: 'approval' | 'base') => {
    console.log(`Aprobado ${type} con id: ${id}`);
    // Aquí iría la lógica de aprobación
  };

  const handleReject = (id: number, type: 'approval' | 'base') => {
    console.log(`Rechazado ${type} con id: ${id}`);
    // Aquí iría la lógica de rechazo
  };

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
            <p className="text-xs font-black text-[#fb851b] uppercase tracking-[0.2em] bg-orange-50 px-4 py-2 rounded-xl border border-orange-100" suppressHydrationWarning>
              {formatDate(currentDate)}
            </p>
          </div>
          
          {/* Filtro de tiempo */}
          <div className="mt-6 flex items-center space-x-1 bg-slate-200/50 backdrop-blur-sm rounded-xl p-1 w-fit">
            {['Hoy', 'Sem', 'Mes', 'Trim'].map((item, index) => {
              const values = ['today', 'week', 'month', 'quarter'] as const;
              return (
                <button
                  key={item}
                  onClick={() => setTimeFilter(values[index])}
                  className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    timeFilter === values[index] 
                      ? 'bg-white text-[#08557f] shadow-md border border-slate-100' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {mainMetrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:text-[#08557f] group-hover:bg-blue-50 transition-colors border border-slate-100 shadow-sm">
                  {metric.icon}
                </div>
                <div className={`flex flex-col items-end gap-2`}>
                   <div className={`flex items-center font-black text-[10px] px-3 py-1 rounded-full ${
                     metric.change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                   }`}>
                     {metric.change >= 0 ? '+' : ''}{metric.change}%
                   </div>
                   <Sparkline data={metric.trendData} color={metric.color} height={30} />
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
          ))}
        </div>

        {/* Layout en Dos Columnas (2/3 - 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Gráfico de Tendencia (Premium) */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Tendencia de Cobros</h2>
                    <p className="text-sm text-slate-500 font-medium">Rendimiento semanal vs objetivos</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 group">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real</span>
                    </div>
                    <div className="flex items-center gap-2 group">
                      <div className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500 bg-amber-50"></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meta</span>
                    </div>
                  </div>
                </div>
                
                <PremiumBarChart 
                  showTarget
                  data={[
                    { label: 'Lun', value: 2100000, target: 2500000 },
                    { label: 'Mar', value: 2400000, target: 2500000 },
                    { label: 'Mie', value: 1500000, target: 2500000 },
                    { label: 'Jue', value: 2800000, target: 2500000 },
                    { label: 'Vie', value: 2200000, target: 2500000 },
                    { label: 'Sab', value: 3100000, target: 2500000 },
                    { label: 'Dom', value: 900000, target: 1200000 },
                  ]}
                />
            </div>

            {/* Bandeja de Aprobaciones */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Bandeja de Aprobaciones</h2>
                  <p className="text-sm text-slate-500 font-medium">Solicitudes pendientes de validación</p>
                </div>
                <div className="px-4 py-1.5 bg-blue-50 text-[#08557f] rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
                  {approvalItems.length} PENDIENTES
                </div>
              </div>
              
              <div className="space-y-4">
                {approvalItems.map((item) => (
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
                          onClick={() => handleApprove(item.id, 'approval')}
                          className="w-12 h-12 flex items-center justify-center bg-white text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm border border-emerald-100"
                        >
                          <CheckCircle className="h-6 w-6" />
                        </button>
                        <button 
                          onClick={() => handleReject(item.id, 'approval')}
                          className="w-12 h-12 flex items-center justify-center bg-white text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-rose-100"
                        >
                          <XCircle className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actividad Reciente */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Actividad del Sistema</h2>
                <Link href="/coordinador/reportes" className="text-xs font-black text-[#fb851b] hover:underline uppercase tracking-[0.2em] bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 transition-all hover:bg-orange-100">
                  Ver más
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentActivity.map((item) => (
                  <div key={item.id} className="p-5 border border-slate-50 rounded-3xl hover:bg-slate-50 transition-all flex items-center justify-between group shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${item.status === 'alert' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <div>
                          <div className="text-sm font-black text-slate-900">{item.client}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.action}</div>
                        </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-[#08557f]">{item.amount !== '-' ? item.amount : 'VÁLIDO'}</div>
                      <div className="text-[10px] text-slate-400 font-bold tracking-tighter">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna Derecha / Sidebar (1/3) */}
          <div className="space-y-8">
            {/* Atajos Rápidos */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
              <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest text-[10px] text-slate-400">Acciones Directas</h2>
              <div className="space-y-4">
                {quickAccess.map((item, index) => (
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
                ))}
              </div>
            </div>

            {/* Cuentas en Mora */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Mora Crítica</h2>
                <AlertCircle className="h-5 w-5 text-rose-500" />
              </div>
              <div className="space-y-4">
                {delinquentAccounts.map((account) => (
                  <div key={account.id} className="p-5 border border-rose-100 rounded-[1.5rem] bg-rose-50/30 group relative transition-all hover:bg-white hover:shadow-lg hover:shadow-rose-100">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-black text-slate-900 text-sm tracking-tight">{account.client}</h3>
                        <span className="text-[10px] font-black text-white bg-rose-500 px-3 py-1 rounded-full shadow-sm shadow-rose-200 uppercase tracking-tighter">
                          {account.daysLate} DÍAS
                        </span>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
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