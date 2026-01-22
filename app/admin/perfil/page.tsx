'use client'

import { User, Shield, Lock } from 'lucide-react'
import { useState } from 'react'

const PerfilUsuarioPage = () => {
  const [nombre] = useState('Administrador General')
  const [correo] = useState('admin@sistema.local')
  const [rol] = useState('SUPER_ADMINISTRADOR')

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <User className="h-3.5 w-3.5" />
              <span>Perfil de usuario</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Información personal </span><span className="text-orange-500">y de acceso</span>
            </h1>
          </div>
        </header>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <User className="h-8 w-8" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{nombre}</div>
                <div className="text-sm text-slate-500 font-medium">{correo}</div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] text-white tracking-wide font-bold shadow-lg shadow-slate-900/20">
                  <Shield className="h-3 w-3" />
                  <span>{rol}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-2 text-xs text-slate-900 uppercase tracking-widest font-bold mb-3">
              <Lock className="h-3.5 w-3.5" />
              <span>Cambio de contraseña</span>
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Aquí se ubicará el formulario para actualizar la contraseña actual, con políticas de seguridad alineadas al backend.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PerfilUsuarioPage

