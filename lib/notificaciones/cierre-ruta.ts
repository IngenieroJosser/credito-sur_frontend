import { objeto, texto } from '@/lib/valores-de-api'
export type CierreRutaNotifResumen = {
  cobrador: string
  rutaNombre: string
  recaudo: number
  meta: number
  efectividad: number
  clientesFaltantes: number
  clientesAusentes: number
}

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const parseMoney = (value?: string) => {
  if (!value) return 0
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0
}

const parsePercent = (value?: string) => {
  if (!value) return 0
  return Number(value.replace(',', '.')) || 0
}

/**
 * Lo que este parser necesita de la notificacion: el mensaje y la bolsa `metadata`.
 *
 * `metadata` es la columna `Json?` del modelo, asi que sus valores son `unknown` y se
 * convierten con los conversores. Antes esto era `any` y los nombres de dentro de
 * `metadata` no los comprobaba nadie.
 */
export type NotificacionDeCierreRuta = {
  mensaje?: string
  metadata?: Record<string, unknown> | null
}

export const parseCierreRutaNotif = (
  notificacion: NotificacionDeCierreRuta,
): CierreRutaNotifResumen => {
  const mensaje: string = notificacion?.mensaje || ''
  const metadata = objeto(notificacion?.metadata)

  const cobradorMatch = mensaje.match(/Cobrador:\s*(.+?)\s+cerr[oó]/i)
  const rutaMatch = mensaje.match(/cerr[oó]\s+la\s+ruta\s+(.+?)\.\s+Recaudo/i)
  const recaudoMatch = mensaje.match(/Recaudo Final:\s*\$?([\d.,]+)/i)
  const efectividadMatch = mensaje.match(/\(([\d.,]+)%\s*META\)/i)
  const faltantesMatch = mensaje.match(/Faltaron\s+(\d+)\s+clientes?/i)

  return {
    cobrador: texto(metadata.cobradorNombre) || cobradorMatch?.[1]?.trim() || 'Cobrador',
    rutaNombre: texto(metadata.rutaNombre) || rutaMatch?.[1]?.trim() || 'Ruta',
    recaudo: toNumber(metadata.recaudoFinal, parseMoney(recaudoMatch?.[1])),
    meta: toNumber(metadata.meta, 0),
    efectividad: toNumber(
      metadata.efectividad,
      parsePercent(efectividadMatch?.[1]),
    ),
    clientesFaltantes: toNumber(
      metadata.clientesFaltantes,
      Number(faltantesMatch?.[1] || 0),
    ),
    clientesAusentes: toNumber(metadata.clientesAusentes, 0),
  }
}
