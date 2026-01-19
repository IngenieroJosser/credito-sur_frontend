'use client'

import { User, Shield, Lock } from 'lucide-react'
import { useState } from 'react'

const PerfilUsuarioPage = () => {
  const [nombre] = useState('Administrador General')
  const [correo] = useState('admin@sistema.local')
  const [rol] = useState('SUPER_ADMINISTRADOR')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
            <User className="h-3 w-3" />
            <span>Perfil de usuario</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
            Información personal y de acceso
          </h1>
        </header>

        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#08557f]/10">
                <User className="h-6 w-6 text-[#08557f]" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{nombre}</div>
                <div className="text-xs text-gray-500">{correo}</div>
                <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1 text-[10px] text-white tracking-[0.18em]">
                  <Shield className="h-3 w-3" />
                  <span>{rol}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
              <Lock className="h-3.5 w-3.5 text-gray-400" />
              <span>Cambio de contraseña</span>
            </div>
            <p className="text-sm text-gray-500">
              Aquí se ubicará el formulario para actualizar la contraseña actual, con políticas de seguridad alineadas al backend.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PerfilUsuarioPage

