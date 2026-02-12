'use client'

/**
 * @description Ruta unificada para detalle de reporte financiero.
 * @migration Permission-Based Routing
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminDetalleReporteFinancieroPage from '@/app/admin/reportes/financieros/detalle/[id]/page'

export default function DetalleReporteFinancieroPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedPage permiso="REPORTES_FINANCIEROS_VIEW">
      <AdminDetalleReporteFinancieroPage params={params} />
    </ProtectedPage>
  )
}
