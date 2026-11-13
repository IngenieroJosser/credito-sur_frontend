'use client'

import ListadoPrestamosElegante from '@/components/prestamos/ListadoPrestamos';

/**
 * Aqui habia un `useRealtimeData(['prestamos_actualizados'], () =>
 * window.location.reload())`: la pagina ENTERA cada vez que cualquiera
 * registraba un credito.
 *
 * Era redundante, no solo brusco. `ListadoPrestamos` ya trae su propio
 * `useRealtimeData` con los cuatro eventos y un refresco silencioso, mas un
 * `usePageFocusRefresh` para cuando se vuelve a la pestana. Hacia lo mismo
 * pero tirando la pantalla.
 */
export default function CoordinadorCreditosPage() {

  return (
    <div className="p-0">
      <ListadoPrestamosElegante />
    </div>
  );
}
