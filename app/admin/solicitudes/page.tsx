'use client'

/**
 * Pantalla legacy: mostraba una lista de solicitudes ESCRITA A MANO y sus
 * botones no hacían nada. En un sistema de créditos un dato falso se toma por
 * cierto, así que ya no se renderiza.
 *
 * No se elimina el archivo porque `/solicitudes` sigue enrutada en el proxy y
 * puede haber enlaces guardados: en vez de un 404, se lleva al usuario a la
 * pantalla real que la reemplazó (Aprobaciones). La versión real para cobrador
 * vive aparte, en /cobranzas/solicitudes, y no se toca.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SolicitudesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/aprobaciones')
  }, [router])

  return null
}
