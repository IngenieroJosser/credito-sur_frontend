'use client'

/**
 * @description Ruta unificada para detalle de caja. Importa la implementación de admin.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminDetalleCajaPage from '@/app/admin/contable/cajas/[id]/page'

export default function DetalleCajaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedPage permiso="CONTABLE_VIEW">
      <AdminDetalleCajaPage params={params} />
    </ProtectedPage>
  )
}
