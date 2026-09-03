'use client'

import { User, Lock, Phone, Calendar, Clock, FileText, CheckCircle2, X, Eye, EyeOff, ChevronLeft, Loader2, AlertCircle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { usuariosService, type Usuario } from '@/services/usuarios-service'
import { obtenerPerfil } from '@/services/autenticacion-service'
import { formatRoleName, getRoleColor, getRoleIcon } from '@/components/ui/UserDropdownMenu'
import PushNotificationManager from '@/components/push/PushNotificationManager'
import { logger } from '@/lib/logger'

const VOLVER_RUTAS: Record<string, string> = {
  'SUPER_ADMINISTRADOR': '/admin',
  'ADMIN': '/admin',
  'COORDINADOR': '/coordinador',
  'SUPERVISOR': '/supervisor',
  'COBRADOR': '/cobranzas',
  'CONTADOR': '/contador/contable',
  'PUNTO_DE_VENTA': '/punto-de-venta',
}

const formatUserFullName = (user: Pick<Usuario, 'nombres' | 'apellidos' | 'correo'> | null) => {
  if (!user) return 'Usuario'
  return [user.nombres, user.apellidos]
    .map(part => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    || String(user.correo ?? 'Usuario').trim()
    || 'Usuario'
}

const getUserInitials = (user: Pick<Usuario, 'nombres' | 'apellidos' | 'correo'> | null) => {
  const fullName = formatUserFullName(user)
  const parts = fullName.split(/\s+/).filter(Boolean)
  const first = parts[0]?.charAt(0) || ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || '' : ''
  return (first + last || 'U').toUpperCase()
}

const PerfilUsuarioPage = () => {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendUser, setBackendUser] = useState<Usuario | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  })

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true)
      const perfil = await obtenerPerfil()
      let fullUser: Usuario | null = null
      // Solo pedimos el perfil completo a la BD si hay red. Offline nos
      // quedamos con lo del token/caché (evita la petición fallida y el
      // failover CORS en consola). Online sí trae los datos completos.
      const hayRed = typeof navigator === 'undefined' || navigator.onLine
      if (perfil.id && hayRed) {
        try { fullUser = await usuariosService.obtenerPorId(perfil.id) } catch {}
      }
      setBackendUser(fullUser || {
        id: perfil.id,
        correo: perfil.correo || '',
        nombres: perfil.nombres,
        apellidos: perfil.apellidos,
        telefono: perfil.telefono || null,
        rol: perfil.rol as any,
        estado: (perfil.estado || 'ACTIVO') as any,
        ultimoIngreso: null,
        intentosFallidos: 0,
        debeCambiarContrasena: false,
        creadoEn: '',
        actualizadoEn: '',
        eliminadoEn: null,
        permisos: perfil.permisos,
      })
      const cachedUser = localStorage.getItem('user')
      if (cachedUser && (fullUser || perfil)) {
        try {
          const parsed = JSON.parse(cachedUser)
          const updated = {
            ...parsed,
            nombres: fullUser?.nombres || perfil.nombres,
            apellidos: fullUser?.apellidos || perfil.apellidos,
            correo: fullUser?.correo || perfil.correo || parsed.correo,
            telefono: fullUser?.telefono || perfil.telefono || parsed.telefono,
            rol: fullUser?.rol || perfil.rol || parsed.rol,
          }
          localStorage.setItem('user', JSON.stringify(updated))
          window.dispatchEvent(new Event('userUpdated'))
        } catch (e) {
          logger.warn('Error sincronizando datos de perfil en caché.')
        }
      }
      setError(null)
    } catch (err) {
      logger.warn('Perfil: usando datos locales (sin red o backend no disponible).')
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const local = JSON.parse(userStr)
          setBackendUser({
            id: local.id || '',
            correo: local.correo || '',
            nombres: local.nombres || '',
            apellidos: local.apellidos || '',
            telefono: local.telefono || null,
            rol: local.rol || 'USUARIO',
            estado: local.estado || 'ACTIVO',
            ultimoIngreso: null,
            intentosFallidos: 0,
            debeCambiarContrasena: false,
            creadoEn: local.creadoEn || '',
            actualizadoEn: '',
            eliminadoEn: null,
          } as Usuario)
          setError(null)
          return
        }
      } catch { /* ignore */ }
      setError('No se pudo cargar la información del perfil.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadUserData() }, [loadUserData])

  // Tiempo real: si el admin actualiza este usuario desde otro panel, se refleja aquí
  useRealtimeData(['usuarios_actualizados'], loadUserData)

  const handleOpenPasswordModal = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setShowPassword({ current: false, new: false, confirm: false })
    setPasswordError(null)
    setPasswordSuccess(false)
    setIsPasswordModalOpen(true)
  }

  const handleChangePassword = async () => {
    if (!backendUser) return
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Todos los campos son obligatorios.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    try {
      setIsSavingPassword(true)
      setPasswordError(null)
      await usuariosService.cambiarContrasena(backendUser.id, {
        contrasenaActual: passwordForm.currentPassword,
        contrasenaNueva: passwordForm.newPassword,
      })
      setPasswordSuccess(true)
      setTimeout(() => setIsPasswordModalOpen(false), 1500)
    } catch (err: any) {
      setPasswordError(err?.message || 'Error al cambiar la contraseña. Verifica tu contraseña actual.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const volverRuta = backendUser ? (VOLVER_RUTAS[backendUser.rol] || '/admin') : '/admin'
  const roleColor = backendUser ? getRoleColor(backendUser.rol) : '#2563eb'
  const roleIcon = backendUser ? getRoleIcon(backendUser.rol) : <User className="h-4 w-4" />
  const roleName = backendUser ? formatRoleName(backendUser.rol) : 'Usuario'
  const userFullName = formatUserFullName(backendUser)
  const userInitials = getUserInitials(backendUser)

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Cargando perfil...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32">
            <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">{error}</h3>
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
              Reintentar
            </button>
          </div>
        ) : backendUser && (
          <>
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => router.push(volverRuta)}
                  className="mb-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Volver
                </button>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
                  <User className="h-3.5 w-3.5" />
                  <span>Mi Perfil</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  <span className="text-blue-600">Información personal </span><span className="text-orange-500">y de acceso</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                 <span className={`px-3 py-1 rounded-full text-xs font-bold border ${backendUser.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {backendUser.estado}
                 </span>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {/* Columna Izquierda: Tarjeta Principal */}
              <div className="lg:col-span-1 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-8 shadow-sm flex flex-col items-center text-center">
                  <div className="relative mb-6 group">
                    <div 
                      className="h-32 w-32 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}CC)` }}
                    >
                      {userInitials}
                    </div>
                    <div 
                      className="absolute bottom-0 right-0 p-2 text-white rounded-full shadow-lg"
                      style={{ backgroundColor: roleColor }}
                    >
                      {roleIcon}
                    </div>
                  </div>
                  
                  <h2 className="text-xl font-bold text-slate-900 break-words max-w-full">{userFullName}</h2>
                  <p className="text-sm text-slate-500 font-medium mb-4 break-all max-w-full" title={backendUser.correo || undefined}>{backendUser.correo}</p>
                  
                  <div className="w-full pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium flex items-center gap-2">
                        <span style={{ color: roleColor }}>{roleIcon}</span> Rol
                      </span>
                      <span 
                        className="font-bold text-white px-3 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: roleColor }}
                      >
                        {roleName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Miembro desde
                      </span>
                      <span className="font-bold text-slate-900">
                        {backendUser.creadoEn && !isNaN(new Date(backendUser.creadoEn).getTime())
                          ? new Date(backendUser.creadoEn).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
                          : 'No disponible'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Detalles y Configuración */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Información de Contacto */}
                <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-400" />
                    Detalles de Contacto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Teléfono Móvil
                      </label>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-900">{backendUser.telefono || 'No registrado'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Correo Electrónico
                      </label>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-0">
                        <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">@</div>
                        <span className="text-sm font-bold text-slate-900 truncate" title={backendUser.correo || undefined}>{backendUser.correo}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Seguridad y Acceso */}
                <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Lock className="h-5 w-5 text-slate-400" />
                      Seguridad y Acceso
                    </h3>
                    {backendUser.ultimoIngreso && (
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Último ingreso: {new Date(backendUser.ultimoIngreso).toLocaleString('es-ES')}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <Lock className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Contraseña</h4>
                          <p className="text-xs text-slate-500">Se recomienda cambiarla cada 90 días</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleOpenPasswordModal}
                        className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        Actualizar
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Estado de Cuenta</h4>
                          <p className="text-xs text-slate-500">
                            {backendUser.estado === 'ACTIVO' ? 'Tu cuenta está activa y sin restricciones' : 'Tu cuenta tiene restricciones'}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border ${
                        backendUser.estado === 'ACTIVO' 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                          : 'text-rose-700 bg-rose-50 border-rose-100'
                      }`}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {backendUser.estado === 'ACTIVO' ? 'Protegida' : backendUser.estado}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Notificaciones Push */}
                <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <FileText className="h-5 w-5 text-slate-400" />
                    Notificaciones Push
                  </h3>
                  <PushNotificationManager />
                </section>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Password Update Modal */}
      {mounted && isPasswordModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl p-8 transform scale-100 animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Cambiar <span className="font-light text-slate-500">Contraseña</span></h2>
            <p className="text-sm text-slate-500 mb-8">Asegúrese de usar una contraseña segura.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña Actual</label>
                <div className="relative">
                  <input
                    type={showPassword.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Contraseña actualizada correctamente
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isSavingPassword}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isSavingPassword || passwordSuccess}
                  className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
                >
                  {isSavingPassword ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default PerfilUsuarioPage
