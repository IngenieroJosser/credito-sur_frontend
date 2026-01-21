import DashboardPageContent from "@/components/admin/DashboardPageContent"
import { AuthGuard } from "@/components/AuthGuard"

export default function DashboardPage() {
  return (
    <AuthGuard allowedRoles={['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR', 'CONTADOR']}>
      <DashboardPageContent />
    </AuthGuard>
  )
}