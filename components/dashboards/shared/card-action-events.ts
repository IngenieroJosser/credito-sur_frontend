import type React from 'react'

/**
 * Helper para detener la propagación de eventos en botones de acción dentro de tarjetas.
 * Evita que el evento llegue al contenedor padre (ej. DnD context).
 */
export const stopCardActionPropagation = (
  e: React.SyntheticEvent<HTMLElement>,
) => {
  e.stopPropagation()
}
