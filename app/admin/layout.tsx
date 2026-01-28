'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Shield,
  Search,
  Bell,
  CreditCard,
  Banknote,
  Users,
  AlertCircle,
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
  ChevronDown,
  Eye,
  Home
} from 'lucide-react'
import { Rol, obtenerModulosPorRol, getIconComponent, tieneAcceso } from '@/lib/permissions'
import NotFoundPage from '../not-found'

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

export default function AdminLayout({
  children,
  hideSidebar = false,
}: {
  children: React.ReactNode;
  hideSidebar?: boolean;
}) {
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

  useEffect(() => {
    if (!authChecked) return
    if (!user?.rol) return

    if (user.rol === 'SUPERVISOR') {
      router.replace('/supervisor')
      return
    }

    if (user.rol === 'CONTADOR' && pathname?.startsWith('/admin')) {
      router.replace('/contador')
      return
    }
  }, [authChecked, pathname, router, user?.rol])

  if (!authChecked) return null

  if (pathname && user?.rol && !tieneAcceso(user.rol, pathname)) {
    return <NotFoundPage />
  }

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

  function getRoleColor() {
    if (!user) return '#2563eb'

    const roleColors: Record<string, string> = {
      'SUPER_ADMINISTRADOR': '#2563eb',
      'COORDINADOR': '#f97316',
      'SUPERVISOR': '#8b5cf6',
      'COBRADOR': '#f97316',
      'CONTADOR': '#6366f1'
    }

    return roleColors[user.rol] || '#2563eb'
  }

  function getRoleIcon() {
    if (!user) return <Shield className="h-4 w-4" />

    const roleIcons: Record<string, React.ReactNode> = {
      'SUPER_ADMINISTRADOR': <Shield className="h-4 w-4" />,
      'COORDINADOR': <User className="h-4 w-4" />,
      'SUPERVISOR': <Eye className="h-4 w-4" />,
      'COBRADOR': <Wallet className="h-4 w-4" />,
      'CONTADOR': <CreditCard className="h-4 w-4" />
    }

    return roleIcons[user.rol] || <User className="h-4 w-4" />
  }

  // Filtrar navegación móvil (solo 4 elementos principales)
  const getMobileNavigation = () => {
    if (!user) return []
    
    const modulos = obtenerModulosPorRol(user.rol)
    
    // Tomar los primeros 4 módulos importantes para móvil
    const importantModules = ['dashboard', 'prestamos-dinero', 'cobranza', 'perfil']
    
    return modulos
      .filter(modulo => importantModules.includes(modulo.id))
      .slice(0, 4)
      .map(modulo => ({
        name: modulo.nombre,
        href: modulo.path,
        icon: getIconComponent(modulo.icono),
      }))
  }

  const mobileNavItems = getMobileNavigation()

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
              {/* Barra de búsqueda sutil (solo para ciertos roles) */}
              {user?.rol && ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR'].includes(user.rol) && (
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="pl-10 pr-4 py-2 w-40 md:w-56 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
              )}

              {/* Notificaciones (solo para ciertos roles) */}
              {user?.rol && ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'COBRADOR', 'CONTADOR'].includes(user.rol) && (
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
                            router.push(user?.rol === 'CONTADOR' ? '/contador/notificaciones' : '/admin/notificaciones')
                          }}
                          className="w-full py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          Ver todas las notificaciones
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                        
                        {/* Configuración solo para admin */}
                        {user?.rol === 'SUPER_ADMINISTRADOR' && (
                          <Link
                            href="/admin/sistema/configuracion"
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
                        )}
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
      {!hideSidebar && (
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
      )}

      {/* Contenido principal */}
      <main className={`pt-16 ${hideSidebar ? '' : 'lg:pl-64'} transition-all duration-300 ${isMenuOpen && !hideSidebar ? 'lg:pl-64' : ''}`}>
        {children}
      </main>

      {/* Sidebar móvil */}
      {!hideSidebar && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
          <div className="flex items-center justify-around py-3 px-2">
            {mobileNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
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
                  {item.name.length > 10 ? `${item.name.substring(0, 9)}...` : item.name}
                </span>
              </Link>
            ))}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex flex-col items-center px-2 py-1 rounded-xl transition-all group"
            >
              <div className={`p-2 rounded-lg transition-all ${
                isMenuOpen
                  ? 'bg-gradient-to-br from-[#08557f] to-[#063a58] text-white shadow-md' 
                  : 'text-gray-500 group-hover:bg-gray-100'
              }`}>
                <Menu className="h-5 w-5" />
              </div>
              <span className={`text-xs mt-1 transition-colors ${
                isMenuOpen ? 'font-medium text-[#08557f]' : 'text-gray-600'
              }`}>
                Más
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Barra inferior móvil para COBRADOR cuando hideSidebar está activo */}
      {hideSidebar && user?.rol === 'COBRADOR' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
          <div className="flex items-center justify-around py-3 px-2">
            {/* Botón Notificaciones */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex flex-col items-center px-2 py-1 rounded-xl transition-all group"
            >
              <div className={`p-2 rounded-lg transition-all ${
                showNotifications
                  ? 'bg-gradient-to-br from-[#08557f] to-[#063a58] text-white shadow-md' 
                  : 'text-gray-500 group-hover:bg-gray-100'
              }`}>
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
              </div>
              <span className={`text-xs mt-1 transition-colors ${
                showNotifications ? 'font-medium text-[#08557f]' : 'text-gray-600'
              }`}>
                Notificaciones
              </span>
            </button>

            {/* Botón Inicio */}
            <Link
              href="/cobranzas"
              className="flex flex-col items-center px-2 py-1 rounded-xl transition-all group"
            >
              <div className={`p-2 rounded-lg transition-all ${
                pathname === '/cobranzas' 
                  ? 'bg-gradient-to-br from-[#08557f] to-[#063a58] text-white shadow-md' 
                  : 'text-gray-500 group-hover:bg-gray-100'
              }`}>
                <Home className="h-5 w-5" />
              </div>
              <span className={`text-xs mt-1 transition-colors ${
                pathname === '/cobranzas' ? 'font-medium text-[#08557f]' : 'text-gray-600'
              }`}>
                Inicio
              </span>
            </Link>

            {/* Botón Perfil */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex flex-col items-center px-2 py-1 rounded-xl transition-all group"
            >
              <div className={`p-2 rounded-lg transition-all ${
                showUserMenu
                  ? 'bg-gradient-to-br from-[#08557f] to-[#063a58] text-white shadow-md' 
                  : 'text-gray-500 group-hover:bg-gray-100'
              }`}>
                <User className="h-5 w-5" />
              </div>
              <span className={`text-xs mt-1 transition-colors ${
                showUserMenu ? 'font-medium text-[#08557f]' : 'text-gray-600'
              }`}>
                Perfil
              </span>
            </button>
          </div>
        </div>
      )}

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
