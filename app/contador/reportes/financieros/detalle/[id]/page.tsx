import AdminDetalleReporteFinancieroPage from '../../../../../admin/reportes/financieros/detalle/[id]/page'

export default function ContadorDetalleReporteFinancieroPage({
  params,
}: {
  params: { id: string }
}) {
  return <AdminDetalleReporteFinancieroPage params={params} />
}
