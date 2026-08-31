'use client'

import { WifiOff, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { listaPadreDeDetalle } from '@/lib/detalle-padre'

// Ruta de inicio segun el rol, para "Seguir usando el sistema" sin depender del
// historial del navegador (que puede estar vacio tras un F5 en esta pantalla).
const INICIO_POR_ROL: Record<string, string> = {
  SUPER_ADMINISTRADOR: '/admin',
  ADMIN: '/admin',
  COORDINADOR: '/coordinador',
  SUPERVISOR: '/supervisor',
  COBRADOR: '/cobranzas',
  CONTADOR: '/contador/contable',
  PUNTO_DE_VENTA: '/punto-de-venta',
}

const rutaInicioSegunSesion = (): string => {
  if (typeof window === 'undefined') return '/login'
  try {
    const raw = localStorage.getItem('user')
    const rol = raw ? JSON.parse(raw)?.rol : null
    return (rol && INICIO_POR_ROL[rol]) || '/login'
  } catch {
    return '/login'
  }
}

const ContingenciaPage = () => {
  const router = useRouter()

  // Al volver la conexion, regresa a la pantalla anterior automaticamente.
  useEffect(() => {
    const alVolver = () => router.back()
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [router])

  // Cold-start offline sobre un detalle `[id]` nunca visitado: en vez de dejar
  // al usuario en esta pantalla, lo reenviamos a la LISTA PADRE (página estática
  // cacheada que sí renderiza offline). Guarda anti-bucle: solo se intenta una
  // vez por URL (si volviéramos aquí para la misma ruta, ya no se reintenta).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const actual = window.location.pathname
    const padre = listaPadreDeDetalle(actual)
    if (!padre) return
    try {
      const clave = `contingencia-fwd:${actual}`
      if (sessionStorage.getItem(clave)) return
      sessionStorage.setItem(clave, '1')
    } catch {
      /* si sessionStorage falla, seguimos: el peor caso es un reintento */
    }
    router.replace(padre)
  }, [router])

  const seguirUsando = () => {
    // Si venimos de un detalle [id], la lista padre es el mejor destino;
    // si no, al inicio del rol. Ambos usan el shell cacheado (offline).
    const padre = typeof window !== 'undefined' ? listaPadreDeDetalle(window.location.pathname) : null
    router.replace(padre || rutaInicioSegunSesion())
  }

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

        <div className="flex flex-col items-center gap-3 w-full sm:flex-row sm:justify-center">
          <button
            onClick={seguirUsando}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#08557f] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#064063]"
          >
            <span>Seguir usando el sistema</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => (typeof window !== 'undefined' && navigator.onLine ? router.back() : window.location.reload())}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-xs text-gray-700 hover:border-gray-300"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reintentar conexión</span>
          </button>
        </div>
        <p className="text-[11px] text-gray-400 -mt-4">
          Puedes seguir trabajando sin conexión; los cambios se sincronizan al volver la red.
        </p>
      </div>
    </div>
  )
}

export default ContingenciaPage

