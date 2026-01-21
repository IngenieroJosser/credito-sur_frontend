'use client'

import { Database, Cloud, RefreshCw, HardDrive, ShieldCheck, Clock } from 'lucide-react'

const BackupsSistemaPage = () => {
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
            <Database className="h-3 w-3" />
            <span>Gestión de backups</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight mb-2">
            Respaldo y Recuperación
          </h1>
          <p className="text-sm text-gray-500 max-w-xl font-light">
            Supervise el estado de los respaldos locales y en la nube. Asegure la integridad de los datos de CrediSur.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="rounded-2xl border border-gray-200/50 bg-white p-6 hover:shadow-sm transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#08557f]/5 text-[#08557f]">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-800">Servidor Local</h2>
                  <p className="text-xs text-gray-400">Base de datos principal</p>
                </div>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Último respaldo</span>
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <div className="text-lg font-light text-gray-900">Hoy, 14:30 PM</div>
                <div className="text-xs text-gray-400 mt-1">Tamaño: 45.2 MB</div>
              </div>
              
              <button className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Forzar respaldo manual
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/50 bg-white p-6 hover:shadow-sm transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-800">Nube VPS</h2>
                  <p className="text-xs text-gray-400">Respaldo remoto</p>
                </div>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Última sincronización</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-lg font-light text-gray-900">Hoy, 14:35 PM</div>
                <div className="text-xs text-gray-400 mt-1">Estado: Sincronizado</div>
              </div>
              
              <button className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Cloud className="h-4 w-4" />
                Verificar integridad
              </button>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200/50 bg-white p-6">
          <h3 className="text-sm font-medium text-gray-800 mb-4 uppercase tracking-wider">Historial de Operaciones</h3>
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Destino</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-white">
                  <td className="px-4 py-3 text-gray-900">19/01/2026 14:30</td>
                  <td className="px-4 py-3 text-gray-600">Automático</td>
                  <td className="px-4 py-3 text-gray-600">Local + Nube</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">Exitoso</span></td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-gray-900">19/01/2026 08:00</td>
                  <td className="px-4 py-3 text-gray-600">Programado</td>
                  <td className="px-4 py-3 text-gray-600">Local + Nube</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">Exitoso</span></td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-gray-900">18/01/2026 20:00</td>
                  <td className="px-4 py-3 text-gray-600">Cierre diario</td>
                  <td className="px-4 py-3 text-gray-600">Local</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">Exitoso</span></td>
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