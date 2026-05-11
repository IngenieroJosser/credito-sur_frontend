'use client'

import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminHistorialPagosPage from '@/app/admin/pagos/historial/page'

export default function PagosHistorialPage() {
  return (
    <ProtectedPage permiso="CONTABLE_VIEW" roles={['COORDINADOR', 'ADMIN', 'SUPER_ADMINISTRADOR', 'CONTADOR']}>
      <AdminHistorialPagosPage />
    </ProtectedPage>
  )
}
