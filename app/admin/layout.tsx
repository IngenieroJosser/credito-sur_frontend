'use client'
import { logger } from '@/lib/logger'

/**
 * ============================================================================
 * LAYOUT PRINCIPAL DE ADMINISTRACIÓN (SHELL)
 * ============================================================================
 * 
 * @description
 * Estructura base para todas las páginas autenticadas (/admin/*, /coordinador/*, etc).
 * Proporciona elementos comunes como:
 * - Sidebar de navegación dinámico basado en Roles (Permissions-driven).
 * - Header con perfil de usuario y notificaciones.
 * - Validación de sesión (Simple Route Guard).
 * 
 * @security
 * Implementa protección de rutas client-side verificando la existencia del usuario
 * en localStorage. Si no existe, redirige al Login.
 */

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { 
  Shield,
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
import { Rol, obtenerModulos, getIconComponent, tieneAcceso } from '@/lib/permissions'
import NotFoundPage from '../not-found'
import { notificacionesService, type Notificacion } from '@/services/notificaciones-service'
import UserDropdownMenu, { formatRoleName, getRoleColor, getRoleIcon } from '@/components/ui/UserDropdownMenu'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider';
import PushNotificationPrompt from '@/components/push/PushNotificationPrompt';
import { aprobacionesService } from '@/services/aprobaciones-service';
import { isTokenExpired } from '@/lib/auth/offlineAuth';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  id?: string;
  isNew?: boolean;
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
}: {
  children: React.ReactNode;
}) {
  const hideSidebar = false;
  // Manejo de estado visual (menú lateral, notificaciones, confirmaciones)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false) // Efecto visual de entrada suave
  
  // Datos y estado de autenticación
  const [user, setUser] = useState<Usuario | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  
  // Proveedor global WebSocket
  const { socket, notificaciones, unreadCount, showDropdown: showNotifications, setShowDropdown: setShowNotifications, isBellRinging, marcarTodasComoLeidas, marcarComoLeida } = useNotificaciones();
  
  const [isLoadingNotificaciones, setIsLoadingNotificaciones] = useState(false)
  
  // Paginación de notificaciones en el dropdown
  const [notifPage, setNotifPage] = useState(1)
  const notifPerPage = 5
  const totalNotifPages = Math.ceil(notificaciones.length / notifPerPage)
  const currentNotificaciones = notificaciones.slice((notifPage - 1) * notifPerPage, notifPage * notifPerPage)

  // Estado para modal de confirmación de "Marcar todas como leídas"
  const [showMarkAllConfirm, setShowMarkAllConfirm] = useState(false)
  
  // Construcción dinámica del menú lateral
  const [navigation, setNavigation] = useState<NavigationItem[]>([])
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({}) // Controla qué submenús están expandidos
  const [seenModules, setSeenModules] = useState<string[]>([]) // Rastrea qué módulos "Nuevos" ya vio el usuario

  // Estado para badge de revisiones pendientes
  const [pendingRevisiones, setPendingRevisiones] = useState<number>(0)

  const pathname = usePathname()
  const router = useRouter()

  const notificationRef = useRef<HTMLDivElement>(null)

  // Abre o cierra los submenús del sidebar
  const toggleMenu = (id: string) => {
    setOpenMenus(prev => {
      // Si ya estaba abierto o si es la ruta actual, invertimos el estado
      const isCurrentlyOpen = prev[id] ?? navigation.find(n => n.id === id)?.submodulos?.some(s => pathname === s.href) ?? false
      return {
        ...prev,
        [id]: !isCurrentlyOpen
      }
    })
  }
  
  // Marca un módulo nuevo como "visto" para que deje de brillar
  const handleModuleClick = (moduleId?: string, isNew?: boolean) => {
    if (moduleId && isNew && !seenModules.includes(moduleId)) {
      const newSeen = [...seenModules, moduleId]
      setSeenModules(newSeen)
      localStorage.setItem('seenModules', JSON.stringify(newSeen))
    }
    // En móvil cerramos el menú al navegar
    setIsMenuOpen(false)
  }

  // Cierra los menús flotantes si haces clic fuera de ellos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Polling de revisiones pendientes cada 30 segundos (solo roles con acceso)
  useEffect(() => {
    const ROLES_CON_REVISIONES = ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'SUPERVISOR']
    if (!user?.rol || !ROLES_CON_REVISIONES.includes(user.rol)) return

    const fetchPending = async () => {
      try {
        const res = await aprobacionesService.obtenerPendientes()
        setPendingRevisiones(res?.total ?? 0)
      } catch (err) { logger.warn('[Revisiones] No se pudo actualizar el badge de revisiones pendientes:', err) }
    }

    fetchPending()
    const interval = setInterval(fetchPending, 30_000)
    return () => clearInterval(interval)
  }, [user?.rol])

  // Tiempo real: cuando el backend emite eventos de aprobaciones/clientes/préstamos, refrescamos el badge al instante
  useEffect(() => {
    const ROLES_CON_REVISIONES = ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'SUPERVISOR']
    if (!user?.rol || !ROLES_CON_REVISIONES.includes(user.rol)) return
    if (!socket) return

    const fetchPending = async () => {
      try {
        const res = await aprobacionesService.obtenerPendientes()
        setPendingRevisiones(res?.total ?? 0)
      } catch (err) {
        logger.warn('[Revisiones/WS] Error al actualizar badge desde WebSocket:', err);
      }
    }

    const handler = () => {
      fetchPending()
    }

    socket.on('aprobaciones_actualizadas', handler)
    socket.on('clientes_actualizados', handler)
    socket.on('prestamos_actualizados', handler)
    socket.on('dashboards_actualizados', handler)

    // sync inmediato al engancharse (por si el polling aún no corrió)
    fetchPending()

    return () => {
      socket.off('aprobaciones_actualizadas', handler)
      socket.off('clientes_actualizados', handler)
      socket.off('prestamos_actualizados', handler)
      socket.off('dashboards_actualizados', handler)
    }
  }, [socket, user?.rol])

  // Carga inicial de datos del usuario y configuración del menú
  useEffect(() => {
    const loadUserData = () => {
      try {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        const seenModulesStored = localStorage.getItem('seenModules')
        
        // Recuperamos qué novedades ya vio el usuario
        if (seenModulesStored) {
          try {
            setSeenModules(JSON.parse(seenModulesStored))
          } catch {
            setSeenModules([])
          }
        }

        // Validación de sesión: verificar si hay usuario Y si el token no expiró
        if (!userData) {
          setUser(null)
          setNavigation([])
          setAuthChecked(true)
          router.replace('/login')
          return
        }

        // Si el token expiró, limpiar sesión y redirigir con aviso
        if (token && isTokenExpired(token)) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
          setNavigation([])
          setAuthChecked(true)
          router.replace('/login?expired=1')
          return
        }

        if (userData) {
          const parsedUser = JSON.parse(userData) as Usuario
          setUser(parsedUser)
          
          // Generamos el menú lateral: primero intenta sidebar dinámico del backend, luego fallback estático
          if (parsedUser.rol) {
            const modulos = obtenerModulos(parsedUser.rol, (parsedUser as any).sidebar)
            
            // Transformamos los módulos de permisos a items de navegación visual
            const navItems = modulos.map(modulo => ({
              name: modulo.nombre,
              href: modulo.path,
              icon: getIconComponent(modulo.icono),
              id: modulo.id,
              isNew: modulo.isNew,
              submodulos: modulo.submodulos?.map(sub => ({
                id: sub.id,
                name: sub.nombre,
                href: sub.path,
                isNew: sub.isNew,
                icon: getIconComponent(sub.icono)
              }))
            }))
            
            setNavigation(navItems)
          }
        }
      } catch (error) {
        console.error('No pudimos cargar tu perfil:', error)
      } finally {
        setAuthChecked(true)
        // Pequeño retardo para que la transición de entrada sea suave y se sienta premium
        setTimeout(() => setIsPageLoaded(true), 300)
      }
    }

    loadUserData()

    // Escuchar actualizaciones de perfil en tiempo real (mismo tab)
    const handleUserUpdate = () => {
      loadUserData();
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, [router])

  // Seguridad Proactiva: Redirección automática si estás en el lugar equivocado
  useEffect(() => {
    if (!authChecked || !user?.rol) return

    // Si un usuario con rol específico intenta entrar al admin general, lo movemos a su dashboard
    const roleRedirects: Record<string, string> = {
      'COBRADOR': '/cobranzas',
      'COORDINADOR': '/coordinador',
      'SUPERVISOR': '/supervisor',
      'CONTADOR': '/contable',
      'PUNTO_DE_VENTA': '/punto-de-venta'
    }

    const hasAllowedAdminRoute = (() => {
      if (!pathname?.startsWith('/admin')) return false

      const allHrefs = navigation.flatMap((n) => [n.href, ...(n.submodulos?.map((s) => s.href) ?? [])])
      const allowedAdminBases = allHrefs.filter((h) => typeof h === 'string' && h.startsWith('/admin'))

      // Also check if the current /admin path has a matching clean URL in the sidebar
      // e.g. /admin/creditos is allowed if /creditos is in the sidebar (via rewrites)
      const cleanPath = pathname.replace(/^\/admin/, '')
      const allowedCleanBases = allHrefs.filter((h) => typeof h === 'string' && !h.startsWith('/admin') && h !== '#' && h !== '/')

      return allowedAdminBases.some((base) => pathname === base || pathname.startsWith(`${base}/`)) ||
             allowedCleanBases.some((base) => cleanPath === base || cleanPath.startsWith(`${base}/`))
    })()

    if (roleRedirects[user.rol] && pathname?.startsWith('/admin') && !hasAllowedAdminRoute) {
      router.replace(roleRedirects[user.rol])
    }
  }, [authChecked, navigation, pathname, router, user?.rol])
  // Mientras verificamos la sesión, no mostramos nada para evitar parpadeos
  if (!authChecked) return null

  // Última línea de defensa: Validación básica de rol.
  // NOTA: Hemos relajado esta validación para permitir que el sistema de permisos granular (Feature-first)
  // decida si el usuario puede o no ver el contenido específico.
  // El componente de la página (ej: ClientesFeature) es responsable de mostrar "Acceso Denegado" si falta el permiso.
  /* 
  if (pathname && user?.rol && !tieneAcceso(user.rol, pathname)) {
    return <NotFoundPage />
  } 
  */

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const userRoleColor = user ? getRoleColor(user.rol) : '#2563eb'
  const userRoleIcon = user ? getRoleIcon(user.rol) : <Shield className="h-4 w-4" />
  const userRoleName = user ? formatRoleName(user.rol) : 'Administrador'

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

  // Filtrar navegación móvil (solo 4 elementos principales)
  const getMobileNavigation = () => {
    if (!user) return []
    
    const modulos = obtenerModulos(user.rol, (user as any).sidebar)
    
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
  const showSidebar = !hideSidebar && user?.rol !== 'COBRADOR' && (user?.rol !== 'PUNTO_DE_VENTA' || navigation.length > 1);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-white relative">

      {/* Header ultra minimalista */}
      <header 
        className={`fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm transition-opacity duration-300 ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ opacity: isPageLoaded ? 1 : 0 }}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              {showSidebar && (
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              )}
              
              <div className="flex items-center">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/10 overflow-hidden bg-white border border-gray-100 p-1.5 transition-transform hover:scale-105 relative"
                  style={{ width: '48px', height: '48px', flexShrink: 0, position: 'relative' }}
                >
                  <Image src="/favicon.ico" alt="Logo" width={48} height={48} className="object-contain w-full h-full" priority />
                </div>
                <h1 className="ml-3 text-xl font-bold tracking-tight">
                  <span className="text-blue-600">Credi</span><span className="text-orange-500">Sur</span>
                </h1>
              </div>

              {/* Indicador de rol sutil */}
              {user && (
                <div className="hidden md:block">
                  <span className="ml-3 px-2.5 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100 rounded-lg uppercase tracking-wider">
                    {user.rol.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Acciones del header */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notificaciones */}
              {user && (
                <div className="relative">
                   <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all relative group"
                  >
                    <Bell className={`h-5 w-5 transition-transform ${isBellRinging ? 'bell-ringing' : ''}`} />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 border-2 border-white rounded-full animate-pulse" />
                    )}
                  </button>

                  {/* Panel de notificaciones */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[60]" ref={notificationRef}>
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="font-bold text-gray-900">Notificaciones</h3>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full">{unreadCount} NUEVAS</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notificaciones.length > 0 ? (
                          <div className="divide-y divide-gray-50">
                            {currentNotificaciones.map((n) => (
                              <div 
                                key={n.id} 
                                onClick={() => {
                                  if (!n.leida) marcarComoLeida(n.id);
                                  if (n.link) router.push(n.link);
                                }}
                                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group relative ${!n.leida ? 'bg-blue-50/40 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div 
                                    className={`p-2 rounded-lg transition-colors ${
                                      n.tipo === 'PAGO' 
                                        ? 'bg-emerald-50 text-emerald-600' 
                                        : n.tipo === 'CLIENTE'
                                          ? 'bg-blue-50 text-blue-600'
                                          : n.tipo === 'MORA'
                                            ? 'bg-amber-50 text-amber-600'
                                            : 'bg-gray-50 text-gray-600'
                                    }`}
                                  >
                                    {n.tipo === 'PAGO' ? <Banknote className="h-4 w-4" /> : n.tipo === 'CLIENTE' ? <Users className="h-4 w-4" /> : n.tipo === 'MORA' ? <AlertCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                                  </div>
                                  <div className="flex-1 pr-4">
                                    <p className={`text-sm ${!n.leida ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{n.titulo}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                                    <div className="flex items-center justify-between mt-2">
                                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                       
                                      </p>
                                      {!n.leida && (
                                        <span className="flex h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] animate-pulse"></span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-xs text-gray-500">Sin notificaciones</div>
                        )}
                      </div>
                      {/* Paginador simple */}
                      {totalNotifPages > 1 && (
                        <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-white">
                          <button 
                            disabled={notifPage === 1}
                            onClick={(e) => { e.stopPropagation(); setNotifPage(p => Math.max(1, p - 1))}}
                            className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-500"
                          >
                            Anterior
                          </button>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Página {notifPage} de {totalNotifPages}
                          </span>
                          <button 
                            disabled={notifPage === totalNotifPages}
                            onClick={(e) => { e.stopPropagation(); setNotifPage(p => Math.min(totalNotifPages, p + 1))}}
                            className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-500"
                          >
                            Siguiente
                          </button>
                        </div>
                      )}

                      <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-2">
                        {unreadCount > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMarkAllConfirm(true);
                            }}
                            className="w-full py-2.5 text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-100 hover:border-blue-600 shadow-sm"
                          >
                            Marcar todas como leídas
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setShowNotifications(false)
                            let target = '/notificaciones'
                            if (user?.rol === 'COORDINADOR') target = '/coordinador/notificaciones'
                            if (user?.rol === 'SUPERVISOR') target = '/supervisor/notificaciones'
                            if (user?.rol === 'CONTADOR') target = '/contador/notificaciones'
                            if (user?.rol === 'COBRADOR') target = '/cobranzas/notificaciones'
                            if (user?.rol === 'PUNTO_DE_VENTA') target = '/punto-de-venta/notificaciones'
                            router.push(target)
                          }}
                          className="w-full py-2 text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          Ver historial de notificaciones
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Avatar de usuario con menú desplegable reutilizable */}
              <UserDropdownMenu user={user} onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar elegante para desktop */}
      {showSidebar && (
        <aside 
          className={`fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-100 transition-all duration-300 z-20 ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 lg:block ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ opacity: isPageLoaded ? 1 : 0 }}
        >
          <nav className="p-6 h-full overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              {/* Info del usuario en sidebar móvil */}
              {null}

              {/* Navegación principal filtrada por rol */}
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Principal</div>
                <div className="space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                    const hasSubmenu = item.submodulos && item.submodulos.length > 0
                    const isSubRouteActive = !!(
                      hasSubmenu &&
                      item.submodulos?.some(
                        (sub) => pathname === sub.href || pathname?.startsWith(`${sub.href}/`),
                      )
                    )
                    const isOpen = isSubRouteActive || ((item.id ? openMenus[item.id] : undefined) ?? false)

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
                                const isNew = subItem.isNew && subItem.id &&!seenModules.includes(subItem.id);
                                return (
                                  <Link
                                    key={subItem.id}
                                    href={subItem.href}
                                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all duration-75 group ${
                                      isSubActive 
                                        ? 'text-[#08557f] bg-blue-50 font-medium' 
                                        : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
                                    }`}
                                    onClick={() => handleModuleClick(subItem.id, subItem.isNew)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`transition-colors ${isSubActive ? 'text-[#08557f]' : 'text-gray-300 group-hover:text-[#08557f]'}`}>
                                        {subItem.icon}
                                      </div>
                                      <span className="text-sm">{subItem.name}</span>
                                    </div>
                                    {isNew && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-[8px] font-black text-orange-600 uppercase border border-orange-200">
                                        NUEVO
                                      </span>
                                    )}
                                  </Link>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    const isNew = item.isNew && item.id && !seenModules.includes(item.id);

                    return (
                      <Link
                        key={item.id || item.name}
                        href={item.href}
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-75 border group ${
                          isActive 
                            ? 'text-[#08557f] bg-gray-50/50 font-bold border-gray-200 shadow-sm' 
                            : 'text-gray-600 border-transparent hover:text-[#08557f] hover:bg-gray-50 hover:border-gray-200'
                        }`}
                        onClick={() => handleModuleClick(item.id, item.isNew)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`transition-colors ${isActive ? 'text-[#08557f]' : 'text-gray-400 group-hover:text-[#08557f]'}`}>
                            {item.icon}
                          </div>
                          <span className="text-sm">{item.name}</span>
                        </div>
                        {/* Badge revisiones pendientes */}
                        {typeof item.href === 'string' && item.href.includes('/revisiones') && pendingRevisiones > 0 ? (
                          <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-black text-white bg-rose-500 rounded-full shadow-sm animate-pulse">
                            {pendingRevisiones > 99 ? '99+' : pendingRevisiones}
                          </span>
                        ) : isNew ? (
                          <span className="text-[10px] font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                            NUEVO
                          </span>
                        ) : null}
                      </Link>
                    )
                  })}
                </div>
              </div>
              
              <div className="mt-8 px-4 pb-4 border-t border-gray-50 pt-4">
                <p className="text-[10px] text-gray-400 font-medium text-center uppercase tracking-widest bg-gray-50/50 py-1 rounded-full">
                  Versión Alpha 1.0
                </p>
              </div>
            </div>
          </nav>
        </aside>
      )}

      {/* Contenido principal animado */}
      <main 
        className={`pt-16 ${showSidebar ? 'lg:pl-64' : ''} transition-all duration-700 ease-out ${(isMenuOpen && showSidebar) ? 'lg:pl-64' : ''} ${isPageLoaded ? 'opacity-100 transform-none' : 'translate-y-4 opacity-0 scale-[0.99]'}`}
        style={{ opacity: isPageLoaded ? 1 : 0 }}
      >
        {children}
      </main>

      {/* Sidebar móvil */}
      {!hideSidebar && showSidebar && (
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
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {/* Overlay de Transición Anti-FOUC (Blanco Puro para transición invisible desde Login) */}
      <div 
        role="presentation"
        className="fixed inset-0 bg-white transition-opacity duration-1000 ease-out z-[9999] flex flex-col items-center justify-center"
        style={{ 
            opacity: isPageLoaded ? 0 : 1,
            pointerEvents: isPageLoaded ? 'none' : 'all',
            position: 'fixed',
            top: 0, 
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#ffffff',
            zIndex: 9999
        }}
      >
         {/* Spinner de respaldo minimalista, solo visible si tarda mucho */}
         {/* Overlay Simplificado (Blanco + Spinner Robusto) para evitar FOUC de logo complejo */}
         <div 
            className={`flex items-center justify-center transition-all duration-700 ${isPageLoaded ? 'opacity-0' : 'opacity-100'}`}
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
         >
            <div 
                className="w-12 h-12 border-4 border-slate-100 border-t-[#08557f] border-r-[#08557f] rounded-full animate-spin" 
                style={{ 
                    width: '48px', 
                    height: '48px', 
                    border: '4px solid #f1f5f9', 
                    borderTop: '4px solid #08557f', 
                    borderRight: '4px solid #08557f', 
                    borderRadius: '50%' 
                }}
            ></div>
         </div>
      </div>
      {/* Modal Confirmación Marcar Todas */}
      {showMarkAllConfirm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[2rem] bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bell className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Marcar todas como leídas</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                ¿Estás seguro de que deseas marcar todas las notificaciones como leídas? Esta acción no se puede deshacer.
              </p>
              
              <div className="mt-8 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await marcarTodasComoLeidas();
                    setShowMarkAllConfirm(false);
                  }}
                  className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]"
                >
                  Sí, marcar todas
                </button>
                <button
                  type="button"
                  onClick={() => setShowMarkAllConfirm(false)}
                  className="w-full rounded-2xl bg-slate-50 py-4 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Aviso de suscripción a notificaciones push */}
      <PushNotificationPrompt />
    </div>
  )
}

