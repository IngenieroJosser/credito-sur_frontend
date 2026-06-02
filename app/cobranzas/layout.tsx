import AdminLayout from '../admin/layout';
import RoleFloatingActions from '@/components/dashboards/RoleFloatingActions';

export default function CobranzasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout>
      {children}
      <RoleFloatingActions role="COBRADOR" />
    </AdminLayout>
  );
}
