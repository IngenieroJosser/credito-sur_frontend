function parseBogotaDate(value: string | Date) {
  if (value instanceof Date) return value

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
