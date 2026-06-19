'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { alertasClientesService } from '@/services/alertas-clientes-service'
import AlertaClienteDetalleModal from '@/components/notificaciones/AlertaClienteDetalleModal'

export default function AlertaClienteAutoOpenFromQuery() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const alertaId = searchParams.get('alertaId')

  const [loading, setLoading] = useState(false)
  const [alerta, setAlerta] = useState<any | null>(null)

  const openedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!alertaId) return
    if (loading) return
    if (openedRef.current === alertaId) return

    const cargar = async () => {
      try {
        setLoading(true)
        openedRef.current = alertaId

        const detalle = await alertasClientesService.obtenerDetalle(alertaId)

        setAlerta(detalle)
      } catch (error: any) {
        toast.error(
          error?.message ||
            'No se pudo cargar la alerta del cliente.',
        )
      } finally {
        setLoading(false)
      }
    }

    void cargar()
  }, [alertaId, loading])

  const cerrar = () => {
    setAlerta(null)
    openedRef.current = null

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('alertaId')

    const nextQuery = nextParams.toString()

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    })
  }

  if (!alerta) return null

  return (
    <AlertaClienteDetalleModal
      alerta={alerta}
      onClose={cerrar}
    />
  )
}
