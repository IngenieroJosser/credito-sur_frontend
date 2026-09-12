'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import InstalarAppModal from '@/components/pwa/InstalarAppModal'
import ActivarNotificacionesModal from '@/components/push/ActivarNotificacionesModal'
import { decidirAviso, type AvisoApp } from '@/lib/pwa/decidirAviso'
import { hayInstalacionNativa, suscribirCambiosInstalacion } from '@/lib/pwa/instalacion'

/** Pantallas sin sesión o de emergencia: ahí no se interrumpe con avisos. */
const RUTAS_SIN_AVISOS = ['/login', '/recuperar-contrasena', '/contingencia', '/test']

/** Espera antes de mostrar un aviso, para no tapar la pantalla mientras carga. */
const ESPERA_MS = 2500

/**
 * Orquesta los avisos de instalar la app y activar notificaciones para todos
 * los roles (va en el layout raíz). Muestra uno a la vez: cuando se cierra
 * uno, vuelve a decidir y puede seguir el otro. Ver `decidirAviso`.
 */
export default function AvisosApp() {
  const pathname = usePathname()
  const [aviso, setAviso] = useState<AvisoApp | null>(null)
  const [cambiosInstalacion, setCambiosInstalacion] = useState(0)

  // El navegador puede ofrecer instalar en cualquier momento, o la app puede
  // instalarse con el modal abierto: en ambos casos se vuelve a decidir.
  useEffect(() => suscribirCambiosInstalacion(() => setCambiosInstalacion((n) => n + 1)), [])

  useEffect(() => {
    if (aviso === 'instalar-nativo' && !hayInstalacionNativa()) setAviso(null)
  }, [cambiosInstalacion])

  useEffect(() => {
    if (aviso) return
    if (RUTAS_SIN_AVISOS.some((ruta) => pathname?.startsWith(ruta))) return

    let cancelado = false
    const temporizador = window.setTimeout(() => {
      decidirAviso()
        .then((siguiente) => {
          if (!cancelado) setAviso(siguiente)
        })
        .catch(() => {
          /* si no se puede decidir, simplemente no se muestra nada */
        })
    }, ESPERA_MS)

    return () => {
      cancelado = true
      window.clearTimeout(temporizador)
    }
  }, [pathname, aviso, cambiosInstalacion])

  return (
    <>
      <InstalarAppModal
        abierto={aviso === 'instalar-nativo' || aviso === 'instalar-ios'}
        modo={aviso === 'instalar-ios' ? 'ios' : 'nativo'}
        onCerrar={() => setAviso(null)}
      />
      <ActivarNotificacionesModal abierto={aviso === 'notificaciones'} onCerrar={() => setAviso(null)} />
    </>
  )
}
