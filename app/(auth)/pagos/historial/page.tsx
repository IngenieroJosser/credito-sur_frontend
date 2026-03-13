'use client'

import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminHistorialPagosPage from '@/app/admin/pagos/historial/page'

export default function PagosHistorialPage() {
  return (
    <ProtectedPage permiso="CONTABLE_VIEW">
      <AdminHistorialPagosPage />
    </ProtectedPage>
  )
}
