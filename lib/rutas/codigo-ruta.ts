/**
 * ESPEJO de `normalizarCodigoRuta` del backend
 * (`src/routes/codigo-ruta.ts`).
 *
 * El backend normaliza el código igual al guardarlo; esta copia existe solo
 * para mostrar en el formulario cómo va a quedar antes de enviarlo, sin tener
 * que preguntarle al servidor en cada tecla.
 *
 *   'Centro'       -> 'RT-CENTRO'
 *   'ruta centro'  -> 'RT-CENTRO'
 *   'RT-CEN-01'    -> 'RT-CEN-01'
 *
 * Si cambia la regla, hay que cambiarla en los dos lados.
 */

export const PREFIJO_CODIGO_RUTA = 'RT'

/** `rutas.codigo` es VarChar(20) en la base. */
export const LARGO_MAXIMO_CODIGO_RUTA = 20

export function normalizarCodigoRuta(valor: unknown): string {
  const crudo = String(valor ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

  if (!crudo) return ''

  const cuerpo = crudo
    .replace(/^(RUTA|RT)[\s\-_.]+/, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!cuerpo) return ''

  return `${PREFIJO_CODIGO_RUTA}-${cuerpo}`
    .slice(0, LARGO_MAXIMO_CODIGO_RUTA)
    .replace(/-+$/, '')
}
