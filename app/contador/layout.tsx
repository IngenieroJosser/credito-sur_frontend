import AdminLayout from '../admin/layout'

export default function ContadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}
