'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertCircle,
  Banknote,
  Bell,
  ChevronDown,
  Eye,
  Menu,
  LogOut,
  Mail,
  Shield,
  UserCircle,
  Users,
  LayoutDashboard,
  Route,
  X,
} from 'lucide-react'

interface Usuario {
  id?: string
  nombres: string
  apellidos: string
  correo: string
  rol: string
}

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

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
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (!token || !userData) {
        setUser(null)
        setAuthChecked(true)
        router.replace('/login')
        return
      }

      const parsedUser = JSON.parse(userData) as Usuario
      setUser(parsedUser)

      if (parsedUser.rol !== 'SUPERVISOR') {
        const ROLE_REDIRECT_MAP: Record<string, string> = {
          SUPER_ADMINISTRADOR: '/admin',
          COORDINADOR: '/coordinador',
          COBRADOR: '/cobranzas',
          CONTADOR: '/admin',
        }

        router.replace(ROLE_REDIRECT_MAP[parsedUser.rol] ?? '/admin')
        return
      }
    } catch {
      setUser(null)
      router.replace('/login')
    } finally {
      setAuthChecked(true)
    }
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

  if (!authChecked) return null

  const navItems = [
    { href: '/supervisor', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/supervisor/clientes', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { href: '/supervisor/rutas', label: 'Rutas', icon: <Route className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-white">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>

              <div className="flex items-center">
                <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h1 className="ml-3 text-xl font-bold tracking-tight">
                  <span className="text-blue-600">Credi</span>
                  <span className="text-orange-500">Sur</span>
                </h1>
              </div>

              <div className="hidden md:block">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-orange-500">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Supervisor</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
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
                            <p className="text-sm font-medium text-gray-900">Cliente en mora</p>
                            <p className="text-xs text-gray-500 mt-0.5">1 cuenta pasó a mora crítica</p>
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
                            <p className="text-sm font-medium text-gray-900">Gasto pendiente</p>
                            <p className="text-xs text-gray-500 mt-0.5">Solicitud de gasto para revisión</p>
                            <p className="text-xs text-blue-600 mt-1 font-medium">Hace 4 horas</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setShowNotifications(false)
                          router.push('/supervisor/notificaciones')
                        }}
                        className="w-full py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Ver todas las notificaciones
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-1 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className="relative w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm bg-linear-to-br from-blue-600 to-blue-800">
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
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-6 py-6 bg-linear-to-r from-slate-50 to-white border-b border-gray-100">
                        <div className="flex flex-col items-center text-center gap-3">
                          <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl mb-1 bg-linear-to-br from-blue-600 to-blue-800">
                            {getUserInitials()}
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-white">
                              <div className="text-blue-600">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                          </div>

                          <div className="w-full">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{getUserFullName()}</h3>
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm bg-orange-500">
                                <Eye className="h-3.5 w-3.5" />
                                Supervisor
                              </span>
                              <span className="text-xs text-gray-500">ID: {user?.id}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        <Link
                          href="/supervisor/perfil"
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <UserCircle className="h-4 w-4" />
                          Mi perfil
                        </Link>
                        <button
                          onClick={requestLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Cerrar sesión
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

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl border-r border-gray-100">
            <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div className="font-bold text-gray-900">
                  <span className="text-blue-600">Credi</span>
                  <span className="text-orange-500">Sur</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <nav className="p-4">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border group ${
                        isActive
                          ? 'text-[#08557f] bg-gradient-to-r from-[#08557f]/10 to-[#063a58]/5 font-medium border-[#08557f]/20'
                          : 'text-gray-600 border-transparent hover:text-[#08557f] hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className={`transition-colors ${isActive ? 'text-[#08557f]' : 'text-gray-400 group-hover:text-[#08557f]'}`}>
                        {item.icon}
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>
          </aside>
        </div>
      )}

      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white/80 backdrop-blur-sm border-r border-gray-100 hidden lg:block">
        <nav className="p-6 h-full overflow-y-auto">
          <div className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border group ${
                    isActive
                      ? 'text-[#08557f] bg-gradient-to-r from-[#08557f]/10 to-[#063a58]/5 font-medium border-[#08557f]/20'
                      : 'text-gray-600 border-transparent hover:text-[#08557f] hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className={`transition-colors ${isActive ? 'text-[#08557f]' : 'text-gray-400 group-hover:text-[#08557f]'}`}>
                    {item.icon}
                  </div>
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </aside>

      <main className="pt-16 lg:pl-64">{children}</main>

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

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
