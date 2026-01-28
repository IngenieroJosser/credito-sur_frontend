'use client'

import { Database, Cloud, RefreshCw, HardDrive, ShieldCheck, Clock } from 'lucide-react'

const BackupsSistemaPage = () => {
  return (
    <div className="min-h-screen bg-slate-50/50 relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="p-8 space-y-8 max-w-[1600px] mx-auto relative z-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Database className="h-3.5 w-3.5" />
              <span>Gestión de backups</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Respaldo y </span><span className="text-orange-500">Recuperación</span>
            </h1>
          </div>
        </header>
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <HardDrive className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Servidor Local</h2>
                  <p className="text-xs text-slate-500 font-medium">Base de datos principal</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-600">Activo</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Último respaldo</span>
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="text-xl font-bold text-slate-900">Hoy, 14:30 PM</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Tamaño: 45.2 MB</div>
              </div>
              
              <button className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-300 flex items-center justify-center gap-2 group/btn">
                <RefreshCw className="h-4 w-4 group-hover/btn:rotate-180 transition-transform duration-500" />
                Forzar respaldo manual
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Nube VPS</h2>
                  <p className="text-xs text-slate-500 font-medium">Respaldo remoto</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-600">Conectado</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Última sincronización</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-xl font-bold text-slate-900">Hoy, 14:35 PM</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Estado: Sincronizado</div>
              </div>
              
              <button className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-300 flex items-center justify-center gap-2">
                <Cloud className="h-4 w-4" />
                Verificar integridad
              </button>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
             <h3 className="text-base font-bold text-slate-900">Historial de Operaciones</h3>
             <p className="text-sm text-slate-500 font-medium">Registro de las últimas actividades de respaldo.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Fecha</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Tipo</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Destino</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">19/01/2026 14:30</td>
                  <td className="px-6 py-4 text-slate-600">Automático</td>
                  <td className="px-6 py-4 text-slate-600">Local + Nube</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Exitoso</span></td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">19/01/2026 08:00</td>
                  <td className="px-6 py-4 text-slate-600">Programado</td>
                  <td className="px-6 py-4 text-slate-600">Local + Nube</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Exitoso</span></td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">18/01/2026 20:00</td>
                  <td className="px-6 py-4 text-slate-600">Cierre diario</td>
                  <td className="px-6 py-4 text-slate-600">Local</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Exitoso</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default BackupsSistemaPage