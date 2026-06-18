'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import SupervisorGlobalFloatingActions from '@/components/dashboards/SupervisorGlobalFloatingActions';

export default function SupervisorFloatingActionsGate() {
  const { user } = useAuth();
  const pathname = usePathname();

  const rol = String(user?.rol || '').toUpperCase();
  const isSupervisor = rol === 'SUPERVISOR';

  if (!isSupervisor) return null;

  const path = pathname || '';

  /**
   * Ocultar el FAB global solo en vistas que ya tienen FAB local operativo.
   * Específicamente, el detalle de ruta del supervisor.
   */
  const hasLocalFAB =
    /^\/supervisor\/rutas\/[^/]+/.test(path);

  return (
    <SupervisorGlobalFloatingActions
      userId={user?.id}
      userRol={user?.rol}
      hideWhenLocalFAB={hasLocalFAB}
    />
  );
}
