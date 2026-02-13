'use client'

/**
 * @description Ruta unificada para detalle de crédito artículo.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminDetalleCreditoArticuloPage from '@/app/admin/creditos-articulos/[id]/page'

export default function DetalleCreditoArticuloPage() {
  return (
    <ProtectedPage permiso="CREDITOS_ARTICULOS_VIEW">
      <AdminDetalleCreditoArticuloPage />
    </ProtectedPage>
  )
}
