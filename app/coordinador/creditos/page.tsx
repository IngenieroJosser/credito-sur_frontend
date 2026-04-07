'use client'
import { useRealtimeData } from '@/hooks/useRealtimeData';

import ListadoPrestamosElegante from '@/components/prestamos/ListadoPrestamos';

export default function CoordinadorCreditosPage() {
  // Tiempo real: refrescar automáticamente cuando haya cambios
  useRealtimeData(['prestamos_actualizados'], () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  })

  return (
    <div className="p-0">
      <ListadoPrestamosElegante />
    </div>
  );
}
