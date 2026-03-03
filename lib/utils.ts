import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export const formatMilesCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
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

export const resolveMediaUrl = (rawUrl: unknown) => {
  if (!rawUrl) return ''
  const url = String(rawUrl)
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const looksLikeCloudinaryPublicId =
    (url.includes('/') && (url.startsWith('creditos-del-sur') || url.startsWith('creditos-del-sur-local') || url.startsWith('clientes/'))) ||
    url.includes('/clientes/')

  if (cloudName && looksLikeCloudinaryPublicId) {
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('/videos/')
    return `https://res.cloudinary.com/${cloudName}/${isVideo ? 'video' : 'image'}/upload/${url}`
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
  if (url.startsWith('/')) return `${baseUrl}${url}`
  return `${baseUrl}/${url}`
}
