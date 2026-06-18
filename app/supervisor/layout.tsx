import AdminLayout from '../admin/layout'
import SupervisorLayoutClient from './SupervisorLayoutClient'

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminLayout>
      <SupervisorLayoutClient>{children}</SupervisorLayoutClient>
    </AdminLayout>
  )
}
