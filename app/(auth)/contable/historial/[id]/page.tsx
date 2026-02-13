'use client'

/**
 * @description Ruta unificada para detalle de cierre. Importa la implementación de admin.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminDetalleCierrePage from '@/app/admin/contable/historial/[id]/page'

export default function DetalleCierrePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedPage permiso="CONTABLE_VIEW">
      <AdminDetalleCierrePage params={params} />
    </ProtectedPage>
  )
}
