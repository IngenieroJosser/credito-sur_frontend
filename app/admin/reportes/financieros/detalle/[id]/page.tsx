'use client'

/**
 * Pantalla legacy: mostraba cifras financieras ESCRITAS A MANO, sin conexión a
 * la API. Es la más delicada de las antiguas porque este mismo archivo se
 * re-exporta en tres rutas (admin, contador y la ruta general), así que esas
 * cifras inventadas aparecían como si fueran reales.
 *
 * El detalle real hoy se muestra en un modal desde el listado de reportes
 * (DetalleReporteFinancieroModal). Por eso aquí ya no se renderiza nada: se
 * devuelve al usuario al listado de reportes que le corresponde según la ruta
 * por la que entró, en vez de un 404 o de datos falsos.
 *
 * No se elimina el archivo: las otras dos rutas lo importan y borrarlo las
 * rompería.
 */
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/** De .../reportes/financieros/detalle/<id> se obtiene .../reportes/financieros */
const listadoDeReportes = (pathname: string): string => {
  const marca = '/reportes/financieros'
  const i = pathname.indexOf(marca)
  if (i === -1) return '/admin/reportes/financieros'
  return pathname.slice(0, i + marca.length)
}

export default function DetalleReporteFinancieroLegacy() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    router.replace(listadoDeReportes(pathname || ''))
  }, [router, pathname])

  return null
}
