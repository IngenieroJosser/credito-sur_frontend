import ProtectedPage from '@/components/auth/ProtectedPage'
import ReportesFinancierosPage from '@/app/admin/reportes/financieros/page'

export default function ContadorReportesFinancierosPage() {
  return (
    <ProtectedPage permiso="REPORTES_FINANCIEROS_VIEW" roles={['CONTADOR', 'ADMIN', 'SUPER_ADMINISTRADOR']}>
      <ReportesFinancierosPage />
    </ProtectedPage>
  )
}
