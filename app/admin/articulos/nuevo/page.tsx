'use client'

/**
 * @deprecated Ruta legacy. La creación de artículos se maneja con el modal de
 * `components/articulos/ArticulosContent.tsx`. Redirige al listado.
 *
 * Mismo caso que `app/admin/clientes/nuevo`: una SEGUNDA implementación del
 * mismo formulario —415 líneas, con sus plazos y sus precios por cuota—
 * mientras el listado ya trae su modal de crear y editar, ese sí con la
 * comprobación de permisos (`puedeCrear || puedeEditar`) que esta página no
 * hacía.
 *
 * Nada del sistema enlazaba aquí: la ruta solo se alcanzaba escribiendo la
 * URL, y aun así salía en el inventario de pantallas y en las capturas, con
 * una apariencia distinta de la que ve todo el mundo para hacer lo mismo.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminNuevoArticuloRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/articulos')
  }, [router])

  return null
}
