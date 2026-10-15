function parseBogotaDate(value: string | Date | number) {
  if (value instanceof Date) return value

  // Marca de tiempo en milisegundos: es una fecha valida tanto como las otras
  // dos, y asi los helpers aceptan lo mismo que los del backend.
  if (typeof value === 'number') return new Date(value)

  const raw = String(value)

  // Fecha operativa tipo YYYY-MM-DD.
  // Usar mediodía Bogotá evita corrimientos por zona horaria.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00-05:00`)
  }

  return new Date(raw)
}

export function formatFechaHumanaBogota(value?: string | Date | null) {
  if (!value) return 'No disponible'

  const date = parseBogotaDate(value)

  if (Number.isNaN(date.getTime())) return 'No disponible'

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatFechaCortaBogota(value?: string | Date | null) {
  if (!value) return 'No disponible'

  const date = parseBogotaDate(value)

  if (Number.isNaN(date.getTime())) return 'No disponible'

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Cualquier formato de fecha, pero SIEMPRE en hora de Bogotá.
 *
 * Existe porque había 50 sitios llamando a `toLocaleDateString` con 22
 * combinaciones distintas de opciones y sin fijar la zona. Hacer 22 ayudantes
 * con nombre no tiene sentido: lo que cambia entre ellos es el formato, y lo que
 * todos necesitan igual es la zona. Así que cada sitio conserva sus opciones y
 * esto le pone lo que faltaba.
 *
 * Dos cosas que resuelve y que un `toLocaleDateString` suelto no:
 *
 *  - **La zona.** Sin `timeZone` se usa la del dispositivo. En un teléfono en
 *    Colombia coincide con Bogotá, así que no se nota; en uno con el huso mal
 *    puesto —o de alguien de viaje— la fecha se corre, y aquí las fechas son
 *    cobros.
 *  - **Las fechas operativas `YYYY-MM-DD`.** `new Date('2026-10-13')` se
 *    interpreta como medianoche **UTC**, que en Bogotá son las 7 p. m. del 12:
 *    la pantalla mostraba el día ANTERIOR. Eso fallaba incluso con el huso bien
 *    puesto. `parseBogotaDate` las ancla al mediodía, lejos de los dos bordes.
 */
export function formatFechaBogota(
  value?: string | Date | number | null,
  opciones: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  },
  locale = 'es-CO',
): string {
  if (!value) return ''

  const date = parseBogotaDate(value)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'America/Bogota',
    ...opciones,
  }).format(date)
}

/**
 * Solo la hora, en Bogotá. El equivalente de `toLocaleTimeString` sin zona.
 *
 * Por omisión en reloj de 24 horas: sin el sufijo am/pm, un `08:30` de la tarde
 * es indistinguible de uno de la mañana. Quien quiera am/pm pasa
 * `{ hour12: true }`.
 */
export function formatHoraBogota(
  value?: string | Date | number | null,
  opciones: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
  locale = 'es-CO',
): string {
  if (!value) return ''

  const date = parseBogotaDate(value)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'America/Bogota',
    ...opciones,
  }).format(date)
}
