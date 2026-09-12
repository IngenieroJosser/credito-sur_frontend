/**
 * Recuerda por cuántos días no volver a mostrar un aviso que la persona cerró.
 *
 * Se guarda una fecha límite y no un "ya lo cerró" para siempre: el aviso
 * anterior de notificaciones se marcaba descartado de por vida, y quien tocaba
 * "Después" una vez no volvía a verlo nunca.
 */

export type AvisoDescartable = 'instalar' | 'notificaciones'

const PREFIJO = 'credisur_aviso_descartado_hasta:'
const MS_POR_DIA = 24 * 60 * 60 * 1000

export function avisoDescartado(aviso: AvisoDescartable): boolean {
  try {
    const hasta = Number(localStorage.getItem(PREFIJO + aviso))
    return Number.isFinite(hasta) && Date.now() < hasta
  } catch {
    // Sin localStorage (modo privado estricto) se trata como no descartado.
    return false
  }
}

export function descartarAviso(aviso: AvisoDescartable, dias: number): void {
  try {
    localStorage.setItem(PREFIJO + aviso, String(Date.now() + dias * MS_POR_DIA))
  } catch {
    /* localStorage no disponible: el aviso podrá volver a salir */
  }
}
