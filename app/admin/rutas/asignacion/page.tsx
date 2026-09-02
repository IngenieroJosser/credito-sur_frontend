'use client'

/**
 * Pantalla legacy: los cobradores y las rutas estaban ESCRITOS A MANO, no venían
 * de la API. No la referencia nadie en el sistema. La versión real y funcional
 * es /coordinador/rutas/asignacion.
 *
 * Se conserva el archivo como redirección por si existe algún enlace guardado.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AsignacionRutasRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/rutas')
  }, [router])

  return null
}
