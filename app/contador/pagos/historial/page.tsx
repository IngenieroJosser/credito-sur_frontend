import ProtectedPage from '@/components/auth/ProtectedPage'
import HistorialPagosPage from '@/app/admin/pagos/historial/page'

export default function ContadorHistorialPagosPage() {
  return (
    <ProtectedPage permiso="CONTABLE_VIEW" roles={['CONTADOR', 'ADMIN', 'SUPER_ADMINISTRADOR']}>
      <HistorialPagosPage />
    </ProtectedPage>
  )
}
