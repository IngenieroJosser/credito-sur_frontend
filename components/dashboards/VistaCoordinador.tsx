'use client'

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bell, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Users, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  ChevronRight, 
  RefreshCw, 
  Shield, 
  Wallet, 
  Route, 
  BarChart3, 
  FileText, 
  UserPlus, 
  CalendarClock, 
  Zap,
  Target,
  ArrowRight,
  PieChart,
  Search,
  Menu,
  X,
  LogOut,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ChevronDown,
  Eye,
  Settings,
  Banknote,
  User,
} from 'lucide-react';
import { ExportButton } from '@/components/ui/ExportButton';
import { Rol, obtenerModulosPorRol, getIconComponent } from '@/lib/permissions';

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

interface BaseRequest {
  id: number;
  collector: string;
  amount: number;
  reason: string;
  time: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  id?: string;
  submodulos?: NavigationItem[];
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<Usuario | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [navigation, setNavigation] = useState<NavigationItem[]>([])
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const pathname = usePathname()
  const router = useRouter()
  const currentDate = new Date();

  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => {
      const isCurrentlyOpen = prev[id] ?? navigation.find(n => n.id === id)?.submodulos?.some(s => pathname === s.href) ?? false
      return {
        ...prev,
        [id]: !isCurrentlyOpen
      }
    })
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const loadUserData = () => {
      try {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) {
          setUser(null)
          setNavigation([])
          setAuthChecked(true)
          router.replace('/login')
          return
        }

        if (userData) {
          const parsedUser = JSON.parse(userData) as Usuario
          setUser(parsedUser)
          
          // Obtener módulos según el rol del usuario
          if (parsedUser.rol) {
            const modulos = obtenerModulosPorRol(parsedUser.rol)
            
            // Convertir módulos a formato de navegación
            const navItems = modulos.map(modulo => ({
              name: modulo.nombre,
              href: modulo.path,
              icon: getIconComponent(modulo.icono),
              id: modulo.id,
              submodulos: modulo.submodulos?.map(sub => ({
                id: sub.id,
                name: sub.nombre,
                href: sub.path,
                icon: getIconComponent(sub.icono)
              }))
            }))
            
            setNavigation(navItems)
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error)
      } finally {
        setAuthChecked(true)
      }
    }

    loadUserData()
  }, [router])

  const requestLogout = () => {
    setShowUserMenu(false)
    setShowLogoutConfirm(true)
  }

  const handleLogout = () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    window.setTimeout(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }, 450)
  }

  function getUserInitials() {
    if (!user) return 'U'
    const firstInitial = user.nombres?.charAt(0) || ''
    const lastInitial = user.apellidos?.charAt(0) || ''
    return (firstInitial + lastInitial).toUpperCase()
  }

  function getUserFullName() {
    if (!user) return 'Usuario'
    return `${user.nombres} ${user.apellidos}`
  }

  function getUserRoleName() {
    if (!user) return 'Coordinador'

    const roleNames: Record<string, string> = {
      'SUPER_ADMINISTRADOR': 'Super Administrador',
      'COORDINADOR': 'Coordinador',
      'SUPERVISOR': 'Supervisor',
      'COBRADOR': 'Cobrador',
      'CONTADOR': 'Contador'
    }

    return roleNames[user.rol] || user.rol
  }

  function getRoleColor() {
    if (!user) return '#f97316'

    const roleColors: Record<string, string> = {
      'SUPER_ADMINISTRADOR': '#2563eb',
      'COORDINADOR': '#f97316',
      'SUPERVISOR': '#8b5cf6',
      'COBRADOR': '#f97316',
      'CONTADOR': '#6366f1'
    }

    return roleColors[user.rol] || '#f97316'
  }

  function getRoleIcon() {
    if (!user) return <User className="h-4 w-4" />

    const roleIcons: Record<string, React.ReactNode> = {
      'SUPER_ADMINISTRADOR': <Shield className="h-4 w-4" />,
      'COORDINADOR': <User className="h-4 w-4" />,
      'SUPERVISOR': <Eye className="h-4 w-4" />,
      'COBRADOR': <Wallet className="h-4 w-4" />,
      'CONTADOR': <CreditCard className="h-4 w-4" />
    }

    return roleIcons[user.rol] || <User className="h-4 w-4" />
  }

  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
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
      value: '$150K',
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

  // Solicitudes de base
  const baseRequests: BaseRequest[] = [
    { id: 1, collector: 'Juan Pérez', amount: 50000, reason: 'Cambio para clientes', time: '09:30', status: 'pending' },
    { id: 2, collector: 'Ana López', amount: 100000, reason: 'Nuevo préstamo inmediato', time: '11:00', status: 'pending' },
  ];

  // Actividad reciente
  const recentActivity = [
    { id: 1, client: 'González M.', action: 'Aprobación de crédito', amount: '$2.5M', time: '09:42', status: 'approved' },
    { id: 2, client: 'López C.', action: 'Prórroga autorizada', amount: '-', time: '10:15', status: 'approved' },
    { id: 3, client: 'Martínez A.', action: 'Cuenta en mora revisada', amount: '$750K', time: '11:30', status: 'alert' },
    { id: 4, client: 'Ramírez P.', action: 'Base de efectivo aprobada', amount: '$150K', time: '13:20', status: 'approved' },
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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-white">
      {/* Header ultra minimalista */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h1 className="ml-3 text-xl font-bold tracking-tight">
                  <span className="text-blue-600">Credi</span><span className="text-orange-500">Sur</span>
                </h1>
              </div>

              {/* Indicador de rol sutil */}
              {user && (
                <div className="hidden md:block">
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getRoleColor() }}
                  >
                    {getRoleIcon()}
                    <span>{getUserRoleName()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controles de la derecha */}
            <div className="flex items-center space-x-2">
              {/* Barra de búsqueda sutil */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 w-40 md:w-56 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none text-sm text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Notificaciones */}
              <div ref={notificationRef} className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell className={`h-5 w-5 ${showNotifications ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">3 Nuevas</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <div className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex gap-3">
                          <div className="mt-1 p-2 bg-green-50 rounded-full text-green-600 group-hover:scale-110 transition-transform">
                            <Banknote className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Pago Recibido</p>
                            <p className="text-xs text-gray-500 mt-0.5">Cliente #1456 ha realizado un pago</p>
                            <p className="text-xs text-blue-600 mt-1 font-medium">Hace 5 min</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex gap-3">
                          <div className="mt-1 p-2 bg-blue-50 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Nuevo Cliente</p>
                            <p className="text-xs text-gray-500 mt-0.5">Solicitud de registro pendiente</p>
                            <p className="text-xs text-blue-600 mt-1 font-medium">Hace 2 horas</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex gap-3">
                          <div className="mt-1 p-2 bg-amber-50 rounded-full text-amber-600 group-hover:scale-110 transition-transform">
                            <AlertCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Alerta de Mora</p>
                            <p className="text-xs text-gray-500 mt-0.5">3 cuentas han entrado en mora hoy</p>
                            <p className="text-xs text-blue-600 mt-1 font-medium">Hace 4 horas</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 border-t border-gray-100">
                      <button 
                        onClick={() => {
                          setShowNotifications(false)
                          router.push('/admin/notificaciones')
                        }}
                        className="w-full py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Ver todas las notificaciones
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar de usuario con menú desplegable mejorado */}
              <div ref={userMenuRef} className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-1 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div 
                    className="relative w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm"
                    style={{ 
                      background: `linear-gradient(135deg, ${getRoleColor()}, ${getRoleColor()}CC)`,
                      boxShadow: `0 0 0 2px white, 0 0 0 4px ${getRoleColor()}40`
                    }}
                  >
                    {getUserInitials()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-medium text-gray-800 group-hover:text-[#08557f] transition-colors">
                      {getUserFullName()}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{user?.correo}</span>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Menú desplegable del usuario mejorado */}
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      {/* Header mejorado */}
                      <div className="px-6 py-6 bg-linear-to-r from-slate-50 to-white border-b border-gray-100">
                        <div className="flex flex-col items-center text-center gap-3">
                          <div 
                            className="relative w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl mb-1"
                            style={{ 
                              background: `linear-gradient(135deg, ${getRoleColor()}, ${getRoleColor()}CC)`,
                              boxShadow: `0 8px 20px ${getRoleColor()}40`
                            }}
                          >
                            {getUserInitials()}
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-white">
                              <div style={{ color: getRoleColor() }}>
                                {getRoleIcon()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">
                              {getUserFullName()}
                            </h3>
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <span 
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                                style={{ backgroundColor: getRoleColor() }}
                              >
                                {getRoleIcon()}
                                {getUserRoleName()}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full">
                                {user?.correo?.split('@')[0] || 'usuario'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Información detallada */}
                      {user && (
                        <div className="px-4 py-3 space-y-3 border-b border-gray-100">
                          {/* Correo con icono */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <Mail className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-500">Correo electrónico</div>
                              <div className="text-sm font-medium text-gray-900 truncate" title={user.correo}>
                                {user.correo}
                              </div>
                            </div>
                          </div>

                          {/* Teléfono (si existe) */}
                          {user.telefono && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                <Phone className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500">Teléfono</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.telefono}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Ubicación (si existe) */}
                          {(user.ciudad || user.direccion) && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <MapPin className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500">Ubicación</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.ciudad}
                                  {user.ciudad && user.direccion && ' • '}
                                  {user.direccion && <span className="text-xs text-gray-500">{user.direccion}</span>}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Fecha de creación */}
                          {user.fecha_creacion && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <Calendar className="h-4 w-4 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500">Miembro desde</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(user.fecha_creacion).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Acciones rápidas */}
                      <div className="py-2">
                        <Link
                          href="/admin/perfil"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-[#08557f]/10 transition-colors">
                            <User className="h-4 w-4 text-gray-600 group-hover:text-[#08557f]" />
                          </div>
                          <div>
                            <div className="font-medium">Mi perfil</div>
                            <div className="text-xs text-gray-500">Ver y editar información personal</div>
                          </div>
                        </Link>
                      </div>

                      {/* Cerrar sesión */}
                      <div className="pt-2 border-t border-gray-100">
                        <button
                          onClick={requestLogout}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mr-3 group-hover:bg-red-200 transition-colors">
                            <LogOut className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">Cerrar sesión</div>
                            <div className="text-xs text-red-500">Salir del sistema</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Cerrar sesión</h3>
                  <p className="mt-1 text-sm text-slate-600">¿Seguro que deseas cerrar sesión?</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isLoggingOut) return
                    setShowLogoutConfirm(false)
                  }}
                  className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isLoggingOut) return
                    setShowLogoutConfirm(false)
                  }}
                  disabled={isLoggingOut}
                  className="flex-1 rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 rounded-xl bg-red-600 px-3 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar elegante para desktop */}
      <aside className={`fixed left-0 top-16 bottom-0 w-64 bg-white/80 backdrop-blur-sm border-r border-gray-100 transition-all duration-300 z-20 ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:block`}>
        <nav className="p-6 h-full overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {/* Info del usuario en sidebar móvil */}
            {user && (
              <div className="lg:hidden mb-6 p-4 bg-linear-to-r from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div 
                    className="relative w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-md"
                    style={{ 
                      background: `linear-gradient(135deg, ${getRoleColor()}, ${getRoleColor()}CC)`,
                      boxShadow: `0 0 0 2px white, 0 0 0 4px ${getRoleColor()}40`
                    }}
                  >
                    {getUserInitials()}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <div className="text-xs" style={{ color: getRoleColor() }}>
                        {getRoleIcon()}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {getUserFullName()}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <div 
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: getRoleColor() }}
                      >
                        {getUserRoleName()}
                      </div>
                      <span className="truncate">{user.correo}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navegación principal filtrada por rol */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Principal</div>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                  const hasSubmenu = item.submodulos && item.submodulos.length > 0
                  const isOpen = (item.id ? openMenus[item.id] : undefined) ?? (hasSubmenu && item.submodulos?.some(sub => pathname === sub.href))

                  if (hasSubmenu && item.id) {
                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleMenu(item.id!)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-75 border group ${
                            isOpen || isActive
                              ? 'text-[#08557f] bg-gray-50/50 font-medium border-gray-200' 
                              : 'text-gray-600 border-transparent hover:text-[#08557f] hover:bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`transition-colors ${isOpen || isActive ? 'text-[#08557f]' : 'text-gray-400 group-hover:text-[#08557f]'}`}>
                              {item.icon}
                            </div>
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="pl-4 space-y-1 mt-1 border-l-2 border-gray-100 ml-4">
                            {item.submodulos?.map((subItem) => {
                              const isSubActive = pathname === subItem.href
                              return (
                                <Link
                                  key={subItem.id}
                                  href={subItem.href}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-75 group ${
                                    isSubActive 
                                      ? 'text-[#08557f] font-medium bg-[#08557f]/5' 
                                      : 'text-gray-500 hover:text-[#08557f] hover:bg-gray-50'
                                  }`}
                                  onClick={() => setIsMenuOpen(false)}
                                >
                                  <div className={`transition-colors ${isSubActive ? 'text-[#08557f]' : 'text-gray-300 group-hover:text-[#08557f]'}`}>
                                    {subItem.icon}
                                  </div>
                                  <span className="text-sm">{subItem.name}</span>
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.id || item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-75 border group ${
                        isActive 
                          ? 'text-[#08557f] bg-gradient-to-r from-[#08557f]/10 to-[#063a58]/5 font-medium border-[#08557f]/20' 
                          : 'text-gray-600 border-transparent hover:text-[#08557f] hover:bg-gray-50 hover:border-gray-200'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className={`transition-colors ${isActive ? 'text-[#08557f]' : 'text-gray-400 group-hover:text-[#08557f]'}`}>
                        {item.icon}
                      </div>
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className={`pt-16 lg:pl-64 transition-all duration-300 ${isMenuOpen ? 'lg:pl-64' : ''}`}>
        <div className="min-h-screen bg-slate-50 relative pb-20">
          {/* Fondo arquitectónico */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-cyan-500 opacity-20 blur-[100px]" />
          </div>

          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* Encabezado del dashboard */}
        <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-[#08557f] to-[#063a58] rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-gray-800">Coordinación Central</h1>
                <p className="text-sm text-gray-500">Gestión operativa y aprobaciones</p>
              </div>
            </div>
            <p className="text-sm text-gray-500" suppressHydrationWarning>{formatDate(currentDate)}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <RefreshCw className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Actualizar</span>
            </button>
            <ExportButton 
              label="Exportar" 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </div>
        
        {/* Filtro de tiempo */}
        <div className="mt-4 flex items-center space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
          {['Hoy', 'Sem', 'Mes', 'Trim'].map((item, index) => {
            const values = ['today', 'week', 'month', 'quarter'] as const;
            return (
              <button
                key={item}
                onClick={() => setTimeFilter(values[index])}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  timeFilter === values[index] 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mainMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-lg transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color === '#08557f' ? 'from-[#08557f]/10 to-[#08557f]/5' : metric.color === '#ef4444' ? 'from-[#ef4444]/10 to-[#ef4444]/5' : metric.color === '#fb851b' ? 'from-[#fb851b]/10 to-[#fb851b]/5' : 'from-[#10b981]/10 to-[#10b981]/5'}`}>
                <div style={{ color: metric.color }}>
                  {metric.icon}
                </div>
              </div>
              <div className={`flex items-center space-x-1 text-sm ${
                metric.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{metric.change >= 0 ? '+' : ''}{metric.change}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-light text-gray-800">{metric.value}</div>
              <div className="text-sm text-gray-500">{metric.title}</div>
            </div>
            
            {/* Mini gráfico elegante */}
            <div className="mt-4 h-1 flex items-end space-x-px">
              {metric.trendData.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-full"
                  style={{
                    height: `${value * 0.6}%`,
                    backgroundColor: metric.color,
                    opacity: 0.3 + (i / metric.trendData.length) * 0.7
                  }}
                ></div>
              ))}
            </div>
          </div>
        ))}
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Columna izquierda: Aprobaciones y Acciones rápidas */}
          <div className="lg:col-span-2 space-y-6">
          {/* Bandeja de aprobaciones */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Bandeja de Aprobaciones</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{approvalItems.filter(item => item.status === 'pending').length} pendientes</span>
                <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Ver todos <ChevronRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {approvalItems.map((item) => (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${getStatusColor(item.priority)}10` }}>
                        <div style={{ color: getStatusColor(item.priority) }}>
                          {getTypeIcon(item.type)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-800">{item.description}</h3>
                          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ 
                            backgroundColor: `${getStatusColor(item.priority)}15`,
                            color: getStatusColor(item.priority)
                          }}>
                            {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{item.details}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {item.requestedBy}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.time}
                          </span>
                          {item.amount && (
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${item.amount.toLocaleString('es-CO')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleApprove(item.id, 'approval')}
                        className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                        title="Aprobar"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleReject(item.id, 'approval')}
                        className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                        title="Rechazar"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Acciones Rápidas</h2>
              <Zap className="h-5 w-5 text-[#fb851b]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickAccess.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="group p-4 border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all duration-300 text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${item.color}10` }}>
                      <div style={{ color: item.color }}>
                        {item.icon}
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: Cuentas en mora, Base de efectivo y Actividad */}
        <div className="space-y-6">
          {/* Cuentas en mora */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Cuentas en Mora</h2>
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {delinquentAccounts.map((account) => (
                <div key={account.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(account.status) }}></div>
                      <h3 className="font-medium text-gray-800">{account.client}</h3>
                    </div>
                    <span className="text-sm font-medium px-2 py-1 rounded-full" style={{ 
                      backgroundColor: `${getStatusColor(account.status)}15`,
                      color: getStatusColor(account.status)
                    }}>
                      {account.daysLate} días
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Monto:</span>
                      <span className="font-medium text-gray-800">${account.amountDue.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Cobrador:</span>
                      <span className="font-medium text-gray-800">{account.collector}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Ruta:</span>
                      <span className="font-medium text-gray-800">{account.route}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 py-2 text-sm bg-[#08557f] text-white rounded-lg hover:bg-[#063a58] transition-colors">
                      Revisar
                    </button>
                    <button className="flex-1 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solicitudes de base de efectivo */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-light text-amber-900">Base de Efectivo</h2>
                <p className="text-sm text-amber-700">Solicitudes pendientes</p>
              </div>
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
            
            <div className="space-y-4">
              {baseRequests.map((request) => (
                <div key={request.id} className="p-4 bg-white/80 border border-amber-300 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">{request.collector}</h3>
                      <p className="text-sm text-gray-600">{request.reason}</p>
                    </div>
                    <span className="text-lg font-medium text-[#fb851b]">
                      ${request.amount.toLocaleString('es-CO')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{request.time}</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                      Pendiente
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleApprove(request.id, 'base')}
                      className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar
                    </button>
                    <button 
                      onClick={() => handleReject(request.id, 'base')}
                      className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lógica de prórrogas */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CalendarClock className="h-5 w-5 text-[#fb851b]" />
              <h3 className="text-lg font-light text-gray-800">Lógica de Prórrogas</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Fecha actual</span>
                  <span className="text-sm font-medium text-gray-800">13 Enero</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Próximo corte</span>
                  <span className="text-sm font-medium text-[#08557f]">15 Enero</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reprogramación máxima</span>
                  <span className="text-sm font-medium text-[#fb851b]">14 Enero</span>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <AlertCircle className="h-4 w-4 inline mr-2 text-amber-500" />
                Las prórrogas no pueden exceder el día anterior al corte de caja.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-light text-gray-800">Actividad Reciente</h2>
          <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Ver todo <ChevronRight className="inline h-4 w-4 ml-1" />
          </button>
        </div>
        
        <div className="space-y-4">
          {recentActivity.map((item) => (
            <div key={item.id} className="group p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-800">{item.client}</div>
                  <div className="text-sm text-gray-500">{item.action}</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${
                  item.status === 'approved' ? 'bg-green-100 text-green-800' :
                  item.status === 'alert' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {item.amount}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{item.time}</span>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats adicionales */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Cobradores Activos', value: '8', icon: <Users className="h-5 w-5" />, color: '#08557f' },
            { label: 'Créditos Aprobados', value: '42', icon: <CreditCard className="h-5 w-5" />, color: '#10b981' },
            { label: 'Rutas Activas', value: '5', icon: <Route className="h-5 w-5" />, color: '#fb851b' },
            { label: 'Tasa de Aprobación', value: '94%', icon: <PieChart className="h-5 w-5" />, color: '#8b5cf6' }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`inline-flex p-3 rounded-xl mb-3`} style={{ backgroundColor: `${stat.color}10` }}>
                <div style={{ color: stat.color }}>
                  {stat.icon}
                </div>
              </div>
              <div className="text-2xl font-light text-gray-800 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

          {/* Footer sutil */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              Actualizado en tiempo real • Última sincronización:{" "}
              {new Date().toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          </div>
        </div>
        </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default VistaCoordinador;