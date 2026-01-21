'use client'

import { Settings, CreditCard, Bell, Shield, Users } from 'lucide-react'

const ConfiguracionSistemaPage = () => {
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

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide mb-4">
            <Settings className="h-3 w-3" />
            <span>Configuración general</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight mb-2">
            Parámetros del Sistema
          </h1>
          <p className="text-sm text-gray-500 max-w-xl font-light">
            Gestione las reglas de negocio, tasas de interés, configuraciones de notificaciones y permisos globales.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="group rounded-2xl border border-gray-200/50 bg-white p-6 hover:shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#08557f]/5 text-[#08557f]">
                <CreditCard className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-medium text-gray-800">Reglas de Préstamos</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4 font-light">
              Configure tasas de interés, plazos permitidos y políticas de mora.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-700">Tasa de interés base</span>
                <span className="text-sm font-medium text-gray-900">20%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-700">Mora diaria</span>
                <span className="text-sm font-medium text-gray-900">2.5%</span>
              </div>
            </div>
          </section>

          <section className="group rounded-2xl border border-gray-200/50 bg-white p-6 hover:shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Shield className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-medium text-gray-800">Seguridad</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4 font-light">
              Políticas de contraseñas, sesiones y autenticación de dos factores.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-700">Expiración de sesión</span>
                <span className="text-sm font-medium text-gray-900">8 horas</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-700">Intentos fallidos</span>
                <span className="text-sm font-medium text-gray-900">3 intentos</span>
              </div>
            </div>
          </section>

          <section className="group rounded-2xl border border-gray-200/50 bg-white p-6 hover:shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-medium text-gray-800">Notificaciones</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4 font-light">
              Configuración de alertas automáticas para cobros y aprobaciones.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-700">Alertas de mora</span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Activo</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-700">Reportes diarios</span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Activo</span>
              </div>
            </div>
          </section>

          <section className="group rounded-2xl border border-gray-200/50 bg-white p-6 hover:shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#08557f]/5 text-[#08557f]">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-medium text-gray-800">Roles por Defecto</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4 font-light">
              Permisos predeterminados para nuevos usuarios del sistema.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-700">Nuevos cobradores</span>
                <span className="text-sm font-medium text-gray-900">Lectura limitada</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default ConfiguracionSistemaPage