'use client'

/**
 * @deprecated Pantalla legacy. El registro de pago real está en
 * `/pagos/registrar/[clienteId]`, que el `rewrites` de `next.config.ts` sirve
 * desde `app/admin/pagos/registrar/[clienteId]`. Se redirige allí.
 *
 * Esta versión era una SIMULACIÓN completa, y de las peligrosas:
 *
 *   - El cliente era inventado: `clienteId === '2' ? 'Juan Taller Motos' :
 *     'Maria Tienda Esquina'`.
 *   - Los saldos eran inventados: 3.500.000 y 450.000.
 *   - El envío era `setTimeout(… setEstadoEnvio('exito'))`: pintaba la
 *     pantalla de éxito y volvía atrás, sin tocar el backend.
 *
 * O sea: el supervisor veía un saldo falso, escribía un monto, leía «éxito», y
 * el dinero no quedaba registrado en ninguna parte. La ruta no la enlaza nadie,
 * pero se alcanza escribiendo la URL, y era la única de las seis pantallas
 * simuladas que se quedó sin neutralizar.
 */
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function RegistrarPagoSupervisorRedirect() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params?.clienteId as string

  useEffect(() => {
    router.replace(`/pagos/registrar/${clienteId}`)
  }, [router, clienteId])

  return null
}
