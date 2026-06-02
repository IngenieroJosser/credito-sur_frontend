import ProtectedPage from '@/components/auth/ProtectedPage'
import DetalleReporteFinancieroPage from '@/app/admin/reportes/financieros/detalle/[id]/page'

export default function ContadorDetalleReporteFinancieroPage() {
  return (
    <ProtectedPage permiso="REPORTES_FINANCIEROS_VIEW" roles={['CONTADOR', 'ADMIN', 'SUPER_ADMINISTRADOR']}>
      <DetalleReporteFinancieroPage />
    </ProtectedPage>
  )
}
