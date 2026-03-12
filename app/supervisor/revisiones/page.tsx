import RevisionesPage from '@/app/admin/revisiones/page'

/**
 * Vista de revisiones para el supervisor
 * Reutiliza el componente original de admin/revisiones que ya
 * maneja el estado internamente según el rol.
 */
export default function SupervisorRevisionesPage() {
  return <RevisionesPage />
}
