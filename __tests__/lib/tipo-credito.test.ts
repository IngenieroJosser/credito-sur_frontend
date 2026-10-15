import {
  esCreditoArticulo,
  normalizarTipoCredito,
  resolverTipoCreditoDeEntidad,
} from '@/lib/creditos/tipo-credito'

describe('tipo de credito compartido', () => {
  it.each(['ARTICULO', 'artículo', 'CREDITO_ARTICULO', 'VENTA_ARTICULO'])(
    'reconoce %s como credito de articulo',
    (tipo) => {
      expect(normalizarTipoCredito(tipo)).toBe('ARTICULO')
      expect(esCreditoArticulo(tipo)).toBe(true)
    },
  )

  it('prioriza tipoPrestamo y acepta tipo como alias del endpoint', () => {
    expect(normalizarTipoCredito('ARTICULO', 'EFECTIVO')).toBe('ARTICULO')
    expect(normalizarTipoCredito(undefined, 'ARTICULO')).toBe('ARTICULO')
  })

  it('no inventa efectivo cuando el tipo no viene', () => {
    expect(normalizarTipoCredito()).toBeUndefined()
    expect(normalizarTipoCredito('OTRO')).toBeUndefined()
  })

  it('detecta un crédito de artículo por producto aunque falte tipoPrestamo', () => {
    expect(resolverTipoCreditoDeEntidad({ productoId: 'producto-1' })).toBe('ARTICULO')
  })

  it('no confunde el respaldo visual Préstamo con un artículo', () => {
    expect(resolverTipoCreditoDeEntidad({ articuloNombre: 'Préstamo' })).toBe('EFECTIVO')
  })

  it('no inventa un tipo cuando no existe evidencia', () => {
    expect(resolverTipoCreditoDeEntidad({})).toBeUndefined()
  })
})
