'use client'

/**
 * @description Ruta unificada para detalle de movimiento. Importa la implementación de admin.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminDetalleMovimientoPage from '@/app/admin/contable/movimientos/[id]/page'

export default function DetalleMovimientoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedPage permiso="CONTABLE_VIEW">
      <AdminDetalleMovimientoPage params={params} />
    </ProtectedPage>
  )
}
