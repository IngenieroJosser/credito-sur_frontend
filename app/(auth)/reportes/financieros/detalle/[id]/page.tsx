'use client'

/**
 * @description Ruta unificada para detalle de reporte financiero.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminDetalleReporteFinancieroPage from '@/app/admin/reportes/financieros/detalle/[id]/page'

export default function DetalleReporteFinancieroPage() {
  return (
    <ProtectedPage permiso="REPORTES_FINANCIEROS_VIEW">
      <AdminDetalleReporteFinancieroPage />
    </ProtectedPage>
  )
}
