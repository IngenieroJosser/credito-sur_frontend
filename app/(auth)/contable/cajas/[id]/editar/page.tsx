'use client'

/**
 * @description Ruta unificada para editar caja. Importa la implementación de admin.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminEditarCajaPage from '@/app/admin/contable/cajas/[id]/editar/page'

export default function EditarCajaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedPage permiso="CONTABLE_VIEW">
      <AdminEditarCajaPage params={params} />
    </ProtectedPage>
  )
}
