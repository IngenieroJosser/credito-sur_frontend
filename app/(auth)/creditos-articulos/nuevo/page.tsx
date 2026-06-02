'use client'

/**
 * @description Ruta unificada para crear nuevo crédito artículo.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminNuevoCreditoArticuloPage from '@/app/admin/creditos-articulos/nuevo/page'

export default function NuevoCreditoArticuloPage() {
  return (
    <ProtectedPage permiso="CREDITOS_ARTICULOS_VIEW" roles={['PUNTO_DE_VENTA', 'ADMIN', 'SUPER_ADMINISTRADOR', 'SUPERVISOR']}>
      <AdminNuevoCreditoArticuloPage />
    </ProtectedPage>
  )
}
