'use client'

import { Settings, CreditCard, Bell, Shield, Users } from 'lucide-react'

const ConfiguracionSistemaPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Settings className="h-3.5 w-3.5" />
              <span>Configuración general</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="text-blue-600">Parámetros del </span><span className="text-orange-500">Sistema</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-sm max-w-2xl">
              Gestione las reglas de negocio, tasas de interés, configuraciones de notificaciones y permisos globales.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Reglas de Préstamos</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Tasas, plazos y políticas</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:border-slate-200 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 font-medium">Tasa de interés base</span>
                  <span className="text-sm font-bold text-slate-900">20%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div className="bg-slate-900 h-1.5 rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:border-slate-200 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 font-medium">Mora diaria</span>
                  <span className="text-sm font-bold text-rose-600">2.5%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
          </section>

          <section className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Seguridad</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Accesos y autenticación</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-slate-900">Expiración de sesión</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Tiempo de inactividad permitido</div>
                </div>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm">
                  8 horas
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-slate-900">Intentos fallidos</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Bloqueo temporal de cuenta</div>
                </div>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm">
                  3 intentos
                </span>
              </div>
            </div>
          </section>

          <section className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Notificaciones</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Alertas y avisos automáticos</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <span className="text-sm text-slate-700 font-medium">Alertas de mora</span>
                <button className="w-11 h-6 bg-emerald-500 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                  <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform translate-x-5 shadow-sm"></span>
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <span className="text-sm text-slate-700 font-medium">Reportes diarios</span>
                <button className="w-11 h-6 bg-emerald-500 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                  <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform translate-x-5 shadow-sm"></span>
                </button>
              </div>
            </div>
          </section>

          <section className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Roles por Defecto</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Permisos iniciales</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-900">Nuevos cobradores</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-100">
                    Estándar
                  </span>
                </div>
                <div className="text-xs text-slate-500 leading-relaxed font-medium">
                  Los nuevos cobradores tendrán acceso limitado a sus rutas asignadas y no podrán modificar configuraciones globales.
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default ConfiguracionSistemaPage