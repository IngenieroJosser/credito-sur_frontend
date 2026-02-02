import AdminDetalleMovimientoPage from '../../../../admin/contable/movimientos/[id]/page'

export default function ContadorDetalleMovimientoPage({
  params,
}: {
  params: { id: string }
}) {
  return <AdminDetalleMovimientoPage params={params} />
}
