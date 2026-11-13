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

/**
 * Cuántos modales anidados cabe apilar antes de llegar a la capa siguiente.
 *
 * `MODAL_Z_INDEX` es la base y cada modal abierto encima suma uno, así que la
 * banda va de 2147483600 a 2147483609 y `MODAL_ENCIMA_Z_INDEX` (610) sigue
 * quedando por encima de toda ella.
 *
 * Diez es de sobra: la cadena más larga que existe hoy son tres —el modal del
 * crédito, el del cliente que se abre al pulsar su nombre, y la foto del
 * documento a pantalla completa—. A partir de ahí se queda en la última, que
 * es preferible a pasarse de banda y colarse por encima de los avisos.
 */
export const MODALES_APILABLES = 10

/**
 * La capa de un modal según cuántos tenga debajo.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 *
 * Medido sobre el sistema entero: 86 modales en 56 archivos, y solo 25
 * usaban esta escala. Los otros 61 llevaban un número escrito a mano —60, 70,
 * 80, 90, 100, 9999, 2147483600, 2147483601, 2147483620, 2147483647— o
 * ninguno.
 *
 * Con eso, que un modal se abra DELANTE o DETRÁS del que lo abrió es cuestión
 * de qué número eligió cada autor. El caso concreto que lo delató: el modal
 * del préstamo se había quedado con `z-[2147483620]` —que es la capa de los
 * tooltips, no la suya— y el modal del cliente que se abre al pulsar el
 * nombre no declaraba ninguna. Resultado: el segundo se abría por detrás del
 * primero, y como el de delante tiene su fondo pulsable, el clic para cerrar
 * el de arriba cerraba en realidad el de abajo y se iban los dos.
 *
 * Elegir el número a mano no se puede arreglar eligiendo mejor el número: el
 * mismo modal del cliente se abre suelto desde un listado y encima del modal
 * del préstamo, así que no hay una cifra correcta. Lo que decide es cuántos
 * hay debajo, y eso solo se sabe al abrirlo.
 *
 * `useModalDialog` ya lleva la pila de diálogos abiertos —la tiene para que
 * Escape cierre solo el de encima—, así que devuelve también `capa`, que es
 * esta función aplicada a su posición. Un modal que use el hook queda en su
 * sitio sin que nadie elija nada.
 */
export function capaDeModal(profundidad: number): number {
  const nivel = Math.min(Math.max(0, Math.trunc(profundidad)), MODALES_APILABLES - 1)
  return MODAL_Z_INDEX + nivel
}

export default function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
