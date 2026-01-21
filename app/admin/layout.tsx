'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Shield,
  Search,
  Bell,
  Activity,
  CreditCard,
  Banknote,
  Users,
  AlertCircle,
  Route,
  Package,
  PieChart,
  User,
  Settings,
  Wallet,
  Menu,
  X,
  LogOut,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Key,
  ChevronDown,
  CreditCard as CreditCardIcon
} from 'lucide-react'

interface Usuario {
  nombres: string
  apellidos: string
  correo: string
  telefono?: string
  rol: string
  fecha_creacion?: string
  direccion?: string
  ciudad?: string
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<Usuario | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const loadUserData = () => {
      try {
        const userData = localStorage.getItem('user')
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error)
      }
    }

    loadUserData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const getUserInitials = () => {
    if (!user) return 'U'
    const firstInitial = user.nombres?.charAt(0) || ''
    const lastInitial = user.apellidos?.charAt(0) || ''
    return (firstInitial + lastInitial).toUpperCase()
  }

  const getUserFullName = () => {
    if (!user) return 'Usuario'
    return `${user.nombres} ${user.apellidos}`
  }

  const getUserRoleName = () => {
    if (!user) return 'Administrador'
    
    const roleNames: Record<string, string> = {
      'SUPER_ADMINISTRADOR': 'Super Administrador',
      'COORDINADOR': 'Coordinador',
      'SUPERVISOR': 'Supervisor',
      'COBRADOR': 'Cobrador',
      'CONTADOR': 'Contador'
    }
    
    return roleNames[user.rol] || user.rol
  }

  const getRoleColor = () => {
    if (!user) return '#08557f'
    
    const roleColors: Record<string, string> = {
      'SUPER_ADMINISTRADOR': '#08557f',
      'COORDINADOR': '#10b981',
      'SUPERVISOR': '#8b5cf6',
      'COBRADOR': '#fb851b',
      'CONTADOR': '#6366f1'
    }
    
    return roleColors[user.rol] || '#08557f'
  }

  const getRoleIcon = () => {
    if (!user) return <Shield className="h-4 w-4" />
    
    const roleIcons: Record<string, React.ReactNode> = {
      'SUPER_ADMINISTRADOR': <Shield className="h-4 w-4" />,
      'COORDINADOR': <User className="h-4 w-4" />,
      'SUPERVISOR': <Activity className="h-4 w-4" />,
      'COBRADOR': <Wallet className="h-4 w-4" />,
      'CONTADOR': <CreditCardIcon className="h-4 w-4" />
    }
    
    return roleIcons[user.rol] || <User className="h-4 w-4" />
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <Activity className="h-4 w-4" /> },
    { name: 'Créditos', href: '/admin/prestamos', icon: <CreditCard className="h-4 w-4" /> },
    { name: 'Cobranza', href: '/admin/pagos/registro', icon: <Banknote className="h-4 w-4" /> },
    { name: 'Clientes', href: '/admin/clientes', icon: <Users className="h-4 w-4" /> },
    { name: 'Cuentas en mora', href: '/admin/cuentas-mora', icon: <AlertCircle className="h-4 w-4" /> },
    { name: 'Rutas', href: '/admin/rutas', icon: <Route className="h-4 w-4" /> },
    { name: 'Artículos', href: '/admin/articulos', icon: <Package className="h-4 w-4" /> },
    { name: 'Módulo contable', href: '/admin/contable', icon: <PieChart className="h-4 w-4" /> },
    { name: 'Usuarios', href: '/admin/users', icon: <User className="h-4 w-4" /> },
    { name: 'Roles y permisos', href: '/admin/roles-permisos', icon: <Shield className="h-4 w-4" /> },
    { name: 'Reportes operativos', href: '/admin/reportes/operativos', icon: <PieChart className="h-4 w-4" /> },
    { name: 'Reportes financieros', href: '/admin/reportes/financieros', icon: <PieChart className="h-4 w-4" /> },
    { name: 'Perfil', href: '/admin/perfil', icon: <User className="h-4 w-4" /> }
  ]

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-white">
      {/* Header ultra minimalista */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
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
                <div className="w-8 h-8 bg-linear-to-br from-[#08557f] to-[#063a58] rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h1 className="ml-3 text-lg font-light text-gray-800">
                  <span className="font-normal text-[#08557f]">Credi</span>Finanzas
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
                  className="pl-10 pr-4 py-2 w-40 md:w-56 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none text-sm placeholder-gray-400"
                />
              </div>

              {/* Notificaciones */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5 text-gray-500" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#fb851b] rounded-full"></span>
              </button>

              {/* Avatar de usuario con menú desplegable mejorado */}
              <div className="relative">
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
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      {/* Header mejorado */}
                      <div className="px-4 py-4 bg-linear-to-r from-[#08557f]/5 to-[#063a58]/5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div 
                            className="relative w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold shadow-lg"
                            style={{ 
                              background: `linear-gradient(135deg, ${getRoleColor()}, ${getRoleColor()}CC)`,
                              boxShadow: `0 4px 12px ${getRoleColor()}40`
                            }}
                          >
                            {getUserInitials()}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
                              <div className="text-xs" style={{ color: getRoleColor() }}>
                                {getRoleIcon()}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm truncate">
                              {getUserFullName()}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <div 
                                className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: getRoleColor() }}
                              >
                                {getUserRoleName()}
                              </div>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500 truncate">
                                {user?.correo}
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
                        <Link
                          href="/admin/configuracion"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-[#08557f]/10 transition-colors">
                            <Settings className="h-4 w-4 text-gray-600 group-hover:text-[#08557f]" />
                          </div>
                          <div>
                            <div className="font-medium">Configuración</div>
                            <div className="text-xs text-gray-500">Preferencias y ajustes del sistema</div>
                          </div>
                        </Link>
                      </div>

                      {/* Cerrar sesión */}
                      <div className="pt-2 border-t border-gray-100">
                        <button
                          onClick={handleLogout}
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

      {/* Sidebar elegante para desktop */}
      <aside className={`fixed left-0 top-16 bottom-0 w-64 bg-white/80 backdrop-blur-sm border-r border-gray-100 transition-all duration-300 z-40 ${
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

            {/* Navegación principal */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Principal</div>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                        isActive 
                          ? 'text-[#08557f] bg-gradient-to-r from-[#08557f]/10 to-[#063a58]/5 font-medium border border-[#08557f]/20' 
                          : 'text-gray-600 hover:text-[#08557f] hover:bg-gray-50 hover:border hover:border-gray-200'
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

            {/* Sección de sistema */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Sistema</div>
              <div className="space-y-1">
                <Link
                  href="/admin/sistema/configuracion"
                  className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border hover:border-gray-200 rounded-xl transition-all duration-200 group"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                  <span className="text-sm font-medium">Configuración</span>
                </Link>
                <Link
                  href="/admin/sistema/sincronizacion"
                  className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border hover:border-gray-200 rounded-xl transition-all duration-200 group"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Activity className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                  <span className="text-sm font-medium">Sincronización</span>
                </Link>
                <Link
                  href="/admin/sistema/backups"
                  className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border hover:border-gray-200 rounded-xl transition-all duration-200 group"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Wallet className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                  <span className="text-sm font-medium">Backups</span>
                </Link>
                <Link
                  href="/admin/auditoria"
                  className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border hover:border-gray-200 rounded-xl transition-all duration-200 group"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                  <span className="text-sm font-medium">Auditoría</span>
                </Link>
              </div>
            </div>

            {/* Resumen del mes elegante */}
            <div className="pt-8 border-t border-gray-100">
              <div className="p-4 bg-linear-to-br from-gray-900 to-gray-800 rounded-xl text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-300">Rendimiento</div>
                  <div className="text-xs text-gray-300 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#08557f] to-[#063a58] flex items-center justify-center text-xs">
                      {getUserInitials()}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-light mb-3">94.2%</div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-linear-to-r from-[#08557f] to-[#10b981] rounded-full"
                    style={{ width: '94.2%' }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>Meta: 95%</span>
                  <span className="text-green-400">+2.1%</span>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className={`pt-16 lg:pl-64 transition-all duration-300 ${isMenuOpen ? 'lg:pl-64' : ''}`}>
        {children}
      </main>

      {/* Sidebar móvil */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex items-center justify-around py-3 px-2">
          {[
             { name: 'Dashboard', href: '/admin', icon: <Activity className="h-5 w-5" /> },
             { name: 'Créditos', href: '/admin/prestamos', icon: <CreditCard className="h-5 w-5" /> },
             { name: 'Cobranza', href: '/admin/pagos/registro', icon: <Banknote className="h-5 w-5" /> },
             { name: 'Perfil', href: '/admin/perfil', icon: <User className="h-5 w-5" /> },
             { name: 'Más', href: '#', icon: <Menu className="h-5 w-5" />, action: () => setIsMenuOpen(true) }
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={item.action}
              className="flex flex-col items-center px-2 py-1 rounded-xl transition-all group"
            >
              <div className={`p-2 rounded-lg transition-all ${
                pathname === item.href 
                  ? 'bg-gradient-to-br from-[#08557f] to-[#063a58] text-white shadow-md' 
                  : 'text-gray-500 group-hover:bg-gray-100'
              }`}>
                {item.icon}
              </div>
              <span className={`text-xs mt-1 transition-colors ${
                pathname === item.href ? 'font-medium text-[#08557f]' : 'text-gray-600'
              }`}>
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

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
  )
}
