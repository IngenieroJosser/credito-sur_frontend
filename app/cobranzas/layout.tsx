import AdminLayout from '../admin/layout';
import CobradorFloatingActions from '@/components/dashboards/CobradorFloatingActions';

export default function CobranzasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout>
      {children}
      <CobradorFloatingActions />
    </AdminLayout>
  );
}
