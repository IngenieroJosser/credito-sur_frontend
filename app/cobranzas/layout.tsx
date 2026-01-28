import AdminLayout from '../admin/layout';

export default function CobranzasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout hideSidebar>{children}</AdminLayout>;
}
