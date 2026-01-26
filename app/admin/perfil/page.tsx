'use client'

import { User, Shield, Lock, Phone, Calendar, Clock, FileText, CheckCircle2, X, Eye, EyeOff, ChevronLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

const PerfilUsuarioPage = () => {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [volverRuta, setVolverRuta] = useState('/admin')
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
    setMounted(true)
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return
      const user = JSON.parse(userStr) as { rol?: string }
      setVolverRuta(user.rol === 'COBRADOR' ? '/cobranzas' : '/admin')
    } catch {
      // ignore
    }
  }, [])

  const handleOpenPasswordModal = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setShowPassword({ current: false, new: false, confirm: false })
    setIsPasswordModalOpen(true)
  }

  // Mock data based on Prisma Schema (Usuario model)
  const [userData] = useState({
    nombres: 'Administrador',
    apellidos: 'General',
    correo: 'admin@sistema.local',
    telefono: '+57 300 123 4567',
    rol: 'SUPER_ADMINISTRADOR',
    estado: 'ACTIVO',
    fechaCreacion: '2024-01-15',
    ultimoIngreso: 'Hoy, 08:30 AM',
    intentosFallidos: 0,
    // Mock stats
    clientesRegistrados: 15,
    prestamosAprobados: 42,
    efectividadCobro: '98%'
  })

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <button
              type="button"
              onClick={() => router.push(volverRuta)}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 mb-3"
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
             <span className={`px-3 py-1 rounded-full text-xs font-bold border ${userData.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {userData.estado}
             </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Tarjeta Principal */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-8 shadow-sm flex flex-col items-center text-center">
              <div className="relative mb-6 group">
                <div className="h-32 w-32 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 border-4 border-white shadow-lg overflow-hidden">
                   <User className="h-16 w-16" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors shadow-lg">
                  <Shield className="h-4 w-4" />
                </button>
              </div>
              
              <h2 className="text-xl font-bold text-slate-900">{userData.nombres} {userData.apellidos}</h2>
              <p className="text-sm text-slate-500 font-medium mb-4">{userData.correo}</p>
              
              <div className="w-full pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Rol
                  </span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                    {userData.rol.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Miembro desde
                  </span>
                  <span className="font-bold text-slate-900">{userData.fechaCreacion}</span>
                </div>
              </div>
            </div>

            {/* Resumen de Actividad */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Impacto Operativo
              </h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-2xl font-bold text-slate-900">{userData.clientesRegistrados}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Clientes</div>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-2xl font-bold text-slate-900">{userData.prestamosAprobados}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Préstamos</div>
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
                    <span className="text-sm font-bold text-slate-900">{userData.telefono}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Correo Electrónico
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">@</div>
                    <span className="text-sm font-bold text-slate-900">{userData.correo}</span>
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
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Último ingreso: {userData.ultimoIngreso}
                </span>
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
                      <Shield className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Estado de Cuenta</h4>
                      <p className="text-xs text-slate-500">Tu cuenta está activa y sin restricciones</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Protegida
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
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

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  Guardar Cambios
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

