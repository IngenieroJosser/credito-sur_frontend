'use client'

import { User, Shield, Lock } from 'lucide-react'
import { useState } from 'react'

const PerfilUsuarioPage = () => {
  const [nombre] = useState('Administrador General')
  const [correo] = useState('admin@sistema.local')
  const [rol] = useState('SUPER_ADMINISTRADOR')

  return (
    <div className="min-h-screen bg-white">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10 mx-auto max-w-3xl space-y-6 px-4 py-6">
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
          <div className="rounded-2xl border border-gray-200/50 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#08557f]/10">
                <User className="h-6 w-6 text-[#08557f]" />
              </div>
              <div>
                <div className="text-lg font-light text-gray-900">{nombre}</div>
                <div className="text-sm text-gray-500 font-light">{correo}</div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#08557f] px-3 py-1 text-[10px] text-white tracking-wide font-medium">
                  <Shield className="h-3 w-3" />
                  <span>{rol}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/50 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2 text-xs text-[#08557f] uppercase tracking-widest font-medium mb-3">
              <Lock className="h-3.5 w-3.5" />
              <span>Cambio de contraseña</span>
            </div>
            <p className="text-sm text-gray-500 font-light leading-relaxed">
              Aquí se ubicará el formulario para actualizar la contraseña actual, con políticas de seguridad alineadas al backend.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PerfilUsuarioPage

