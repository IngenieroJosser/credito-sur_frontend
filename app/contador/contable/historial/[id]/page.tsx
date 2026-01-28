import AdminDetalleCierrePage from '../../../../admin/contable/historial/[id]/page'

export default function ContadorDetalleCierrePage({
  params,
}: {
  params: { id: string }
}) {
  return <AdminDetalleCierrePage params={params} />
}
