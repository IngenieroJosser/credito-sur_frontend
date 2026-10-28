export type TipoCreditoNormalizado = 'ARTICULO' | 'EFECTIVO'

export interface FuenteTipoCredito {
  tipoPrestamo?: unknown
  tipo?: unknown
  tipoCredito?: unknown
  esArticulo?: unknown
  productoId?: unknown
  articuloNombre?: unknown
  producto?: unknown
  numeroPrestamo?: unknown
}

const normalizarTexto = (valor: unknown) =>
  String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

/**
 * Resuelve las variantes que usan los endpoints para el tipo de credito.
 * Devuelve undefined cuando el dato no existe: no se presenta efectivo por defecto.
 */
export const normalizarTipoCredito = (
  tipoPrestamo?: unknown,
  tipo?: unknown,
): TipoCreditoNormalizado | undefined => {
  const valor = normalizarTexto(tipoPrestamo || tipo)

  if (['ARTICULO', 'CREDITO_ARTICULO', 'VENTA_ARTICULO'].includes(valor)) {
    return 'ARTICULO'
  }

  if (['EFECTIVO', 'DINERO', 'PRESTAMO_EFECTIVO'].includes(valor)) {
    return 'EFECTIVO'
  }

  return undefined
}

export const esCreditoArticulo = (tipoPrestamo?: unknown, tipo?: unknown) =>
  normalizarTipoCredito(tipoPrestamo, tipo) === 'ARTICULO'

/**
 * Resuelve el tipo desde las distintas formas de crédito que usan rutas,
 * pagos y aprobaciones. Solo infiere artículo con evidencia positiva; nunca
 * convierte un dato ausente en efectivo.
 */
export const resolverTipoCreditoDeEntidad = (
  fuente?: FuenteTipoCredito | null,
): TipoCreditoNormalizado | undefined => {
  if (!fuente) return undefined

  const explicito = normalizarTipoCredito(
    fuente.tipoPrestamo ?? fuente.tipoCredito,
    fuente.tipo,
  )
  if (explicito) return explicito

  const articuloNombre = normalizarTexto(fuente.articuloNombre)

  if (
    fuente.esArticulo === true ||
    Boolean(fuente.productoId) ||
    Boolean(fuente.producto) ||
    (Boolean(articuloNombre) && articuloNombre !== 'PRESTAMO') ||
    /^ART-/i.test(String(fuente.numeroPrestamo ?? '').trim())
  ) {
    return 'ARTICULO'
  }

  if (/^PRES-/i.test(String(fuente.numeroPrestamo ?? '').trim())) {
    return 'EFECTIVO'
  }

  if (articuloNombre === 'PRESTAMO') return 'EFECTIVO'

  return undefined
}
