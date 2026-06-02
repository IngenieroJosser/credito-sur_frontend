'use client'

/**
 * @description Ruta unificada para detalle de crédito artículo.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminDetalleCreditoArticuloPage from '@/app/admin/creditos-articulos/[id]/page'

export default function DetalleCreditoArticuloPage() {
  return (
    <ProtectedPage permiso="CREDITOS_ARTICULOS_VIEW" roles={['PUNTO_DE_VENTA', 'ADMIN', 'SUPER_ADMINISTRADOR', 'SUPERVISOR']}>
      <AdminDetalleCreditoArticuloPage />
    </ProtectedPage>
  )
}
