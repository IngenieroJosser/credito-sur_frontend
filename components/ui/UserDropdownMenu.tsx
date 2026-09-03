'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Shield,
  User,
  Settings,
  Wallet,
  LogOut,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ChevronDown,
  Eye,
  CreditCard,
  Banknote,
  X,
} from 'lucide-react'

// ─── Types ───
export interface UserDropdownUser {
  id?: string
  nombres?: string | null
  apellidos?: string | null
  nombre?: string | null
  nombreCompleto?: string | null
  correo?: string | null
  telefono?: string
  rol: string
  fecha_creacion?: string
  direccion?: string
  ciudad?: string
}

interface UserDropdownMenuProps {
  user: UserDropdownUser | null
  onLogout: () => void
}

// ─── Helpers ───
const ROLE_NAMES: Record<string, string> = {
  'SUPER_ADMINISTRADOR': 'Super Administrador',
  'ADMIN': 'Administrador',
  'COORDINADOR': 'Coordinador',
  'SUPERVISOR': 'Supervisor',
  'COBRADOR': 'Cobrador',
  'CONTADOR': 'Contador',
  'PUNTO_DE_VENTA': 'Punto de Venta',
}

const ROLE_COLORS: Record<string, string> = {
  'SUPER_ADMINISTRADOR': '#2563eb',
  'ADMIN': '#0891b2',
  'COORDINADOR': '#f97316',
  'SUPERVISOR': '#8b5cf6',
  'COBRADOR': '#f97316',
  'CONTADOR': '#6366f1',
  'PUNTO_DE_VENTA': '#10b981',
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  'SUPER_ADMINISTRADOR': <Shield className="h-4 w-4" />,
  'ADMIN': <User className="h-4 w-4" />,
  'COORDINADOR': <User className="h-4 w-4" />,
  'SUPERVISOR': <Eye className="h-4 w-4" />,
  'COBRADOR': <Wallet className="h-4 w-4" />,
  'CONTADOR': <CreditCard className="h-4 w-4" />,
  'PUNTO_DE_VENTA': <Banknote className="h-4 w-4" />,
}

const PROFILE_ROUTES: Record<string, string> = {
  'COBRADOR': '/cobranzas/perfil',
  'CONTADOR': '/contador/perfil',
  'PUNTO_DE_VENTA': '/punto-de-venta/perfil',
  'SUPERVISOR': '/supervisor/perfil',
  'COORDINADOR': '/coordinador/perfil',
}

export function formatRoleName(rol: string): string {
  return ROLE_NAMES[rol] || rol.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function getRoleColor(rol: string): string {
  return ROLE_COLORS[rol] || '#2563eb'
}

export function getRoleIcon(rol: string): React.ReactNode {
  return ROLE_ICONS[rol] || <User className="h-4 w-4" />
}

function getUserInitials(user: UserDropdownUser | null): string {
  if (!user) return 'U'
  const fullName = getUserFullName(user)
  const parts = fullName.split(/\s+/).filter(Boolean)
  const first = parts[0]?.charAt(0) || ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || '' : ''
  return (first + last || 'U').toUpperCase()
}

function getUserFullName(user: UserDropdownUser | null): string {
  if (!user) return 'Usuario'
  return [
    user.nombres,
    user.apellidos,
  ]
    .map(part => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    || String(user.nombreCompleto ?? user.nombre ?? user.correo ?? 'Usuario').trim()
    || 'Usuario'
}

function getProfileRoute(rol: string): string {
  return PROFILE_ROUTES[rol] || '/admin/perfil'
}

// ─── Component ───
export default function UserDropdownMenu({ user, onLogout }: UserDropdownMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const requestLogout = () => {
    setShowMenu(false)
    setShowLogoutConfirm(true)
  }

  const handleLogout = () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    window.setTimeout(() => {
      onLogout()
    }, 450)
  }

  if (!user) return null

  const color = getRoleColor(user.rol)
  const icon = getRoleIcon(user.rol)
  const roleName = formatRoleName(user.rol)
  const initials = getUserInitials(user)
  const fullName = getUserFullName(user)
  const profileRoute = getProfileRoute(user.rol)
  const isAdmin = user.rol === 'SUPER_ADMINISTRADOR' || user.rol === 'ADMIN'

  return (
    <>
      <div ref={menuRef} className="relative">
        {/* Trigger Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center space-x-3 p-1 hover:bg-gray-100 rounded-lg transition-colors group"
        >
          <div
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}CC)`,
              boxShadow: `0 0 0 2px white, 0 0 0 4px ${color}40`,
            }}
          >
            {initials}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-sm font-medium text-gray-800 group-hover:text-[#08557f] transition-colors">
              {fullName}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{user.correo || 'Sin correo'}</span>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="fixed sm:absolute right-0 sm:right-0 left-0 sm:left-auto top-16 sm:top-auto sm:mt-2 w-full sm:w-96 max-w-full sm:max-w-96 bg-white rounded-none sm:rounded-xl shadow-xl border-t sm:border border-gray-100 py-2 z-50 origin-top animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ease-out motion-reduce:animate-none max-h-[calc(100vh-4rem)] sm:max-h-[600px] overflow-y-auto">
              {/* Header */}
              <div className="px-6 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100">
                <div className="flex flex-col items-center text-center gap-3">
                  <div
                    className="relative w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl mb-1"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                      boxShadow: `0 8px 20px ${color}40`,
                    }}
                  >
                    {initials}
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-white">
                      <div style={{ color }}>{icon}</div>
                    </div>
                  </div>

                  <div className="w-full">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{fullName}</h3>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        {icon}
                        {roleName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="px-4 py-3 space-y-3 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">Correo electrónico</div>
                    <div className="text-sm font-medium text-gray-900 truncate" title={user.correo || 'Sin correo'}>
                      {user.correo || 'Sin correo'}
                    </div>
                  </div>
                </div>

                {user.telefono && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">Teléfono</div>
                      <div className="text-sm font-medium text-gray-900">{user.telefono}</div>
                    </div>
                  </div>
                )}

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
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="py-2">
                <Link
                  href={profileRoute}
                  className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                  onClick={() => setShowMenu(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-[#08557f]/10 transition-colors">
                    <User className="h-4 w-4 text-gray-600 group-hover:text-[#08557f]" />
                  </div>
                  <div>
                    <div className="font-medium">Mi perfil</div>
                    <div className="text-xs text-gray-500">Ver y editar información personal</div>
                  </div>
                </Link>

                {isAdmin && (
                  <Link
                    href="/sistema/configuracion"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                    onClick={() => setShowMenu(false)}
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

              {/* Logout */}
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

      {/* Logout Confirmation Modal — portaled to body to escape header stacking context */}
      {showLogoutConfirm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[2147483600] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">Cerrar sesión</h3>
                  <p className="mt-1 text-sm text-slate-600">¿Seguro que deseas cerrar sesión?</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isLoggingOut) return
                    setShowLogoutConfirm(false)
                  }}
                  className="shrink-0 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
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
        </div>,
        document.body
      )}
    </>
  )
}
