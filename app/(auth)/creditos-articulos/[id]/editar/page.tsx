'use client'

/**
 * @description Ruta unificada para editar crédito artículo.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminEditarCreditoArticuloPage from '@/app/admin/creditos-articulos/[id]/editar/page'

export default function EditarCreditoArticuloPage() {
  return (
    <ProtectedPage permiso="CREDITOS_ARTICULOS_VIEW">
      <AdminEditarCreditoArticuloPage />
    </ProtectedPage>
  )
}
