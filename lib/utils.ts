import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const parseCurrencyLikeValue = (amount: number | string | null | undefined) => {
  if (typeof amount !== 'string') return Number(amount)
  const cleaned = amount.trim().replace(/[^\d.,-]/g, '')
  if (!cleaned) return 0

  const dotCount = (cleaned.match(/\./g) || []).length
  const commaCount = (cleaned.match(/,/g) || []).length

  if (commaCount > 0) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.'))
  }

  if (dotCount > 1) {
    const parts = cleaned.split('.')
    const last = parts[parts.length - 1] || ''
    const normalizedLast = last.length > 3 ? last.slice(0, 3) : last
    return Number([...parts.slice(0, -1), normalizedLast].join(''))
  }

  if (/^-?\d+\.\d{1,2}$/.test(cleaned)) {
    return Number(cleaned)
  }

  return Number(cleaned.replace(/\./g, ''))
}

export const formatCurrency = (amount: number | string | null | undefined) => {
  const numeric = parseCurrencyLikeValue(amount)
  const safe = Number.isFinite(numeric) ? Math.trunc(numeric) : 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(safe)
}

export const formatMilesCOP = (amount: number) => {
  const safe = Number.isFinite(amount) ? Math.trunc(amount) : 0
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe)
}

export const formatCOPInputValue = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return formatMilesCOP(Number(digits))
}

export const parseCOPInputToNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  return Number(digits || '0')
}

export const getDisplayedCOPInteger = (amount: number) => {
  return parseCOPInputToNumber(formatMilesCOP(amount))
}

export const isSameDisplayedCOPAmount = (received: number, expected: number) => {
  return Number(received || 0) === getDisplayedCOPInteger(expected)
}

type LoanTermFormatInput = {
  plazoMeses?: number | string | null
  cantidadCuotas?: number | string | null
  frecuenciaPago?: string | null
}

const pluralizeEs = (value: number, singular: string, plural: string) => {
  return `${value} ${value === 1 ? singular : plural}`
}

export const formatLoanTerm = ({
  plazoMeses,
  cantidadCuotas,
  frecuenciaPago,
}: LoanTermFormatInput) => {
  const frecuencia = String(frecuenciaPago || '').toUpperCase()
  const cuotas = Number(cantidadCuotas || 0)
  const meses = Number(plazoMeses || 0)

  if (Number.isFinite(cuotas) && cuotas > 0) {
    const value = Math.round(cuotas)
    if (frecuencia === 'DIARIO') return pluralizeEs(value, 'día', 'días')
    if (frecuencia === 'SEMANAL') return pluralizeEs(value, 'semana', 'semanas')
    if (frecuencia === 'QUINCENAL') return pluralizeEs(value, 'quincena', 'quincenas')
    if (frecuencia === 'MENSUAL') return pluralizeEs(value, 'mes', 'meses')
  }

  if (!Number.isFinite(meses) || meses <= 0) return 'Sin plazo'
  if (frecuencia === 'DIARIO') return pluralizeEs(Math.max(1, Math.round(meses * 30)), 'día', 'días')
  if (frecuencia === 'SEMANAL') return pluralizeEs(Math.max(1, Math.round(meses * 4)), 'semana', 'semanas')
  if (frecuencia === 'QUINCENAL') return pluralizeEs(Math.max(1, Math.round(meses * 2)), 'quincena', 'quincenas')

  const mesesMostrados = Number.isInteger(meses) ? meses : Math.round(meses * 10) / 10
  return pluralizeEs(mesesMostrados, 'mes', 'meses')
}

export const formatMilesCOPDecimal = (amount: number) => {
  const safe = Number.isFinite(amount) ? Math.trunc(amount * 100) / 100 : 0
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)
}

const splitCopDecimalParts = (raw: string) => {
  const s = String(raw ?? '')
  const cleaned = s.replace(/\./g, '') // quitar separadores de miles
  const parts = cleaned.split(',')
  const intPart = (parts[0] || '').replace(/\D/g, '')
  const decRaw = (parts[1] || '').replace(/\D/g, '').slice(0, 2)
  return { intPart, decRaw, hasComma: cleaned.includes(',') }
}

export const formatCOPDecimalTypingInputValue = (raw: string) => {
  const s = String(raw ?? '')
  if (!s.trim()) return ''

  const { intPart, decRaw, hasComma } = splitCopDecimalParts(s)
  if (!intPart) return ''

  const intNum = Number(intPart || '0')
  const intFmt = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(intNum)

  if (!hasComma) return intFmt
  return `${intFmt},${decRaw}`
}

export const formatCOPDecimalBlurInputValue = (raw: string) => {
  const s = String(raw ?? '')
  if (!s.trim()) return ''

  const { intPart, decRaw } = splitCopDecimalParts(s)
  if (!intPart) return ''

  const intNum = Number(intPart || '0')
  const intFmt = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(intNum)

  return `${intFmt},${decRaw.padEnd(2, '0')}`
}

export const parseCOPDecimalInputToNumber = (raw: string) => {
  const s = String(raw ?? '').trim()
  if (!s) return 0
  const normalized = s.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return isNaN(n) ? 0 : n
}

export const resolveMediaUrl = (rawUrl: unknown) => {
  if (!rawUrl) return ''
  let url = String(rawUrl).trim()
  if (!url) return ''

  // 1. Si ya es una URL absoluta, la devolvemos tal cual
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  // 2. DEUDA TÉCNICA: Limpiar prefijos accidentales (/uploads/) si el contenido es de Cloudinary
  // Esto corrige registros antiguos que se guardaron mal en la DB
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const potentialId = url.replace(/^\/?uploads\//, '')
    // Si el resto de la cadena parece un ID de Cloudinary (ej: contiene el nombre del proyecto o es un hash largo)
    if (
      potentialId.includes('creditos-del-sur') || 
      potentialId.includes('clientes/') ||
      (potentialId.length > 15 && !potentialId.includes('.'))
    ) {
      url = potentialId
    }
  }

  // 3. Detectar si es un Public ID de Cloudinary
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.replace(/\s/g, '') || 'ds8zlwm97';
  const looksLikeCloudinary = 
    url.length > 10 && 
    !url.includes('.') && 
    !url.startsWith('/') && 
    !url.startsWith('http');

  if (cloudName && looksLikeCloudinary) {
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('/videos/')
    return `https://res.cloudinary.com/${cloudName}/${isVideo ? 'video' : 'image'}/upload/${url}`
  }

  // 4. Fallback a servidor local (API base)
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3001'
  if (!baseUrl.endsWith('/api-credisur')) {
    baseUrl = baseUrl.replace(/\/$/, '') + '/api-credisur'
  }

  const cleanUrl = url.startsWith('/') ? url : `/${url}`
  return `${baseUrl}${cleanUrl}`
}
