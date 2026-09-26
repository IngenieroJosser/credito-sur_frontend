'use client'

import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Las capas del sistema, en orden. Quien necesite apilar algo, que use una de
 * estas constantes y no un número escrito a mano.
 *
 * Todo lo que va en un portal se saca del flujo de la página y se pega al
 * `body`, así que el orden entre ellos lo decide solo el z-index. Los valores
 * son enormes porque tienen que ganarle a cualquier `z-50` suelto de una
 * pantalla; lo que importa no es la cifra, es el orden:
 *
 *   MODAL            un modal normal
 *   MODAL_ENCIMA     un modal que se abre sobre otro modal
 *   ACCION           una accion en curso que no se puede interrumpir: tapa
 *                    tambien el modal desde el que se lanzo, porque su razon
 *                    de ser es que no se pueda volver a pulsar
 *   TOOLTIP          la ayuda que explica un boton: encima del modal que
 *                    la contiene, debajo de los avisos
 *   TOAST            los avisos (sonner y los propios): SIEMPRE visibles
 *   ALERTA           confirmar / cancelar, que exige una respuesta
 *
 * Los avisos van por encima de los modales a propósito. Si no, el mensaje que
 * dice si la acción salió bien queda tapado justo por el modal desde el que se
 * lanzó, y la persona se queda sin saber qué pasó. Sonner trae 999.999.999 de
 * fábrica, que es MENOS que cualquiera de estos números, así que sus toasts
 * quedaban detrás de los diecisiete modales del sistema; por eso el `Toaster`
 * del layout raíz recibe TOAST_Z_INDEX explícitamente.
 *
 * (2147483647 es el mayor entero de 32 bits: por encima no hay nada.)
 */
export const MODAL_Z_INDEX = 2147483600
export const MODAL_ENCIMA_Z_INDEX = 2147483610
export const ACCION_Z_INDEX = 2147483615
export const TOOLTIP_Z_INDEX = 2147483620
export const TOAST_Z_INDEX = 2147483640
export const ALERT_Z_INDEX = 2147483647

export default function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
