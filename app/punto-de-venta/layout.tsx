import AdminLayout from '../admin/layout';
import PuntoDeVentaFloatingActions from '@/components/dashboards/PuntoDeVentaFloatingActions';

export default function PuntoDeVentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout>
      {children}
      <PuntoDeVentaFloatingActions />
    </AdminLayout>
  );
}
