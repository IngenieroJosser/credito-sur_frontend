'use client'

/**
 * @deprecated Ruta legacy. La creación de clientes se maneja vía
 * `NuevoClienteModal`. Redirige al listado, que es donde está ese modal.
 *
 * Era una SEGUNDA implementación del mismo formulario: 533 líneas con sus
 * cinco secciones —datos personales, contacto, fotos, riesgo, asignación—,
 * mientras `components/clientes/NuevoClienteModal.tsx` hace lo mismo y es el
 * que usa todo el sistema: diez pantallas lo importan, incluidas las de
 * cobrador, supervisor y punto de venta.
 *
 * Sus hermanas ya estaban neutralizadas y lo decían con estas palabras:
 *
 *     app/cobranzas/clientes/nuevo/page.tsx   18 líneas, redirige
 *     app/supervisor/clientes/nuevo/page.tsx  18 líneas, redirige
 *
 * A esta no le llegó el cambio. Se veía en las capturas de pantalla: el
 * formulario completo en `/admin/clientes/nuevo`, con una apariencia distinta
 * del modal que usa todo el mundo para lo mismo.
 *
 * Nada del sistema enlazaba aquí —solo se alcanzaba escribiendo la URL—, y el
 * único enlace parecido, el de una notificación, apunta a
 * `/cobranzas/clientes/nuevo`, que ya redirige.
 *
 * Lo único que esta página tenía y el modal no era el borrador que sobrevive a
 * una recarga (`useBorradorDeFormulario`). Ya no: el modal lo lleva desde que
 * se le añadió, que era además el caso para el que se escribió el hook —el
 * cobrador, en la calle, con el teléfono—.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminNuevoClienteRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/clientes')
  }, [router])

  return null
}
