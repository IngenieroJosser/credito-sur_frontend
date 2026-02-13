import AdminLayout from '../admin/layout'

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}
