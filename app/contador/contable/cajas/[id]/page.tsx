import AdminDetalleCajaPage from '../../../../admin/contable/cajas/[id]/page'

export default function ContadorDetalleCajaPage({
  params,
}: {
  params: { id: string }
}) {
  return <AdminDetalleCajaPage params={params} />
}
