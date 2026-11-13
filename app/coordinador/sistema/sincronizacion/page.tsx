'use client'

import SyncStatusPage from '@/app/admin/sistema/sincronizacion/page'
import VolverAtras from '@/components/ui/VolverAtras'

/**
 * La pantalla es la del admin; aqui solo se le anade la salida.
 *
 * Para el ADMIN esta en su menu lateral, asi que el menu es como se sale.
 * Para el COORDINADOR no: su menu no la lleva, se llega desde otra pantalla,
 * y sin esto solo se salia con el boton atras del navegador. El envoltorio va
 * aqui y no en la pantalla compartida para no ponerle al admin un «Volver»
 * que no necesita.
 */
export default function SincronizacionCoordinador() {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <VolverAtras destino="/coordinador" texto="Volver al panel" className="-ml-3" />
      </div>
      <SyncStatusPage />
    </>
  )
}
