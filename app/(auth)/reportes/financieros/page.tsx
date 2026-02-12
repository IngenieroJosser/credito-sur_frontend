'use client'

/**
 * @description Ruta unificada para reportes financieros. Importa la implementación de admin.
 * @migration Permission-Based Routing
 * @roles SUPER_ADMINISTRADOR, ADMIN, CONTADOR
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminReportesFinancierosPage from '@/app/admin/reportes/financieros/page'

export default function ReportesFinancierosPage() {
  return (
    <ProtectedPage permiso="REPORTES_FINANCIEROS_VIEW">
      <AdminReportesFinancierosPage />
    </ProtectedPage>
  )
}
