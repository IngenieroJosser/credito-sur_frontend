'use client'

import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react'

const ContingenciaPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 px-4 py-8">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
          <WifiOff className="h-3 w-3" />
          <span>Modo contingencia</span>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center justify-center rounded-full bg-red-50 p-3 text-red-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-light text-gray-900 tracking-tight">
            Conexión inestable o no disponible
          </h1>
          <p className="text-sm text-gray-500">
            El sistema ha cambiado automáticamente a modo local. Puedes seguir registrando clientes, créditos y pagos; se sincronizarán cuando la conexión vuelva.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 text-left text-xs text-gray-600 space-y-2">
          <p>
            Acciones críticas quedan protegidas en la cola de sincronización. Evita cerrar el navegador hasta que se indique que la cola está vacía.
          </p>
          <p className="text-[11px] text-gray-400">
            Esta pantalla aplica tanto para pérdida de internet como para fallas en la comunicación con el servidor en la nube.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:border-gray-300">
          <RefreshCw className="h-4 w-4" />
          <span>Reintentar conexión</span>
        </button>
      </div>
    </div>
  )
}

export default ContingenciaPage

