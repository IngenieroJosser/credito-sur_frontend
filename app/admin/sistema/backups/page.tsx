'use client'

import { Database, Cloud, RefreshCw } from 'lucide-react'

const BackupsSistemaPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
            <Database className="h-3 w-3" />
            <span>Gestión de backups</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
            Respaldo local y en la nube
          </h1>
          <p className="text-sm text-gray-500 max-w-xl">
            Vista conceptual para supervisar el estado de los respaldos en el servidor local y el VPS, con opciones de ejecución manual y restauración controlada.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
                <Database className="h-3.5 w-3.5 text-gray-400" />
                <span>Servidor local</span>
              </div>
              <p className="text-sm text-gray-500">
                Sección reservada para mostrar la fecha y hora del último respaldo exitoso en la oficina.
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
                <Cloud className="h-3.5 w-3.5 text-gray-400" />
                <span>Servidor en la nube</span>
              </div>
              <p className="text-sm text-gray-500">
                Aquí se mostrará el estado de sincronización de los backups hacia el VPS cuando haya conexión a internet.
              </p>
            </div>
          </div>

          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700">
            <RefreshCw className="h-4 w-4" />
            <span>Acciones manuales de respaldo y restauración se definirán aquí.</span>
          </div>
        </section>
      </div>
    </div>
  )
}

export default BackupsSistemaPage

