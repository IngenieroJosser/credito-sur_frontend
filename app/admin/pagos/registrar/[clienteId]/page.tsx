'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PagoOficina } from '@/components/cobranza/PagoOficina'
import { usePermission } from '@/hooks/usePermission'
import { puedeCobrarEnOficina } from '@/lib/pagos/cobro-en-oficina'
import { mensajeDeError } from '@/lib/mensaje-de-error'
import { clientesService } from '@/services/clientes-service'

export default function RegistrarPagoClientePage() {
  const { clienteId } = useParams<{ clienteId: string }>()
  const router = useRouter()
  const { rol } = usePermission()
  const autorizado = puedeCobrarEnOficina(rol)
  const [estado, setEstado] = useState<
    { id: string; cliente: Awaited<ReturnType<typeof clientesService.obtenerPorId>> } |
    { id: string; error: string } | null
  >(null)

  useEffect(() => {
    if (!autorizado || !clienteId) return
    let vigente = true
    clientesService.obtenerPorId(clienteId).then((cliente) => {
      if (vigente) setEstado({ id: clienteId, cliente })
    }).catch((error) => {
      if (vigente) setEstado({ id: clienteId, error: mensajeDeError(error, 'No se pudo consultar el cliente.') })
    })
    return () => { vigente = false }
  }, [autorizado, clienteId])

  return (
    <section className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700"
        onClick={() => router.back()}><ArrowLeft size={16} /> Volver</button>
      <h1 className="text-xl font-bold text-slate-900">Registrar pago en oficina</h1>
      {!rol ? <p role="status">Cargando sesión…</p>
        : !autorizado ? <p>No tienes permiso para registrar pagos en oficina.</p>
          : estado?.id !== clienteId ? <p role="status">Consultando cliente…</p>
            : 'error' in estado ? <p role="alert">{estado.error}</p>
              : <PagoOficina key={clienteId} cliente={estado.cliente} />}
    </section>
  )
}
