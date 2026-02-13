'use client'

/**
 * @description Ruta unificada para cierre de caja. Importa la implementación de admin.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminCierreCajaPage from '@/app/admin/contable/cierre-caja/page'

export default function CierreCajaPage() {
  return (
    <ProtectedPage permiso="CONTABLE_VIEW">
      <AdminCierreCajaPage />
    </ProtectedPage>
  )
}
