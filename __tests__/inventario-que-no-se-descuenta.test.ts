import * as fs from 'fs'
import * as path from 'path'

import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que la venta de artículos cobre y descuente lo mismo.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * `CreacionCreditoArticulo` dejaba elegir varios artículos y una cantidad por
 * cada uno, y cobraba la suma de todos. El backend, en cambio:
 *
 *     precioTotal = Number(precioProducto.precio)   // ← de UNA unidad
 *     stock: { decrement: 1 }                       // ← UNA unidad
 *
 * O sea que de una venta de tres teléfonos se cobraba uno y salía uno del
 * inventario. Lo primero es peor que lo segundo: la pantalla prometía el total
 * de los tres, el cliente firmaba por los tres y las cuotas se repartían sobre
 * el precio de uno.
 *
 * ── Las dos mitades, arregladas ─────────────────────────────────────────────
 *
 * **La cantidad** va de punta a punta: el préstamo lleva `cantidadProducto`
 * (migración `20261114120000_cantidad_producto_prestamo`, `DEFAULT 1`), el
 * precio del plan y el costo se multiplican por esas unidades, el stock exigido
 * y descontado es el que se vende, y las tres reversiones devuelven lo mismo
 * que salió.
 *
 * **Varios artículos distintos** ya no se pueden elegir. El negocio no vende
 * así —antes se hacían créditos de dos o tres artículos a la vez; hoy no— y el
 * modelo tampoco sabe representarlo: el precio es por producto y plazo
 * (`PrecioProducto(productoId, meses)`) y el préstamo guarda UN
 * `precioProductoId`. Había un aviso contándolo en el paso 4; un aviso que
 * explica un descuadre vale menos que no poder provocarlo.
 *
 * Esta prueba vigila las dos mitades.
 */

const RAIZ = path.join(__dirname, '..')
const PANTALLA = path.join(RAIZ, 'components', 'creditos', 'CreacionCreditoArticulo.tsx')

describe('la cantidad vendida llega al backend', () => {
  const fuente = fs.readFileSync(PANTALLA, 'utf8')

  it('el payload manda las unidades', () => {
    /*
     * Esto es lo que arregla el fallo de dinero. Sin el campo, el backend
     * recalcula el monto con el precio de UNA unidad y lo que se cobra no es lo
     * que la pantalla prometió.
     */
    expect(fuente).toMatch(/cantidadProducto: articulo\.cantidad/)
  })

  it('y manda un solo producto, que es lo que el modelo sabe guardar', () => {
    expect(fuente).toMatch(/productoId: articulo\.id/)
  })

  it('la cantidad no pasa del stock', () => {
    // Desde que la cantidad se descuenta de verdad, pasarse del stock es un
    // error que el backend rechaza con el formulario ya lleno.
    expect(fuente).toContain('const tope = Math.max(1, Number(p.stock) || 1)')
    expect(fuente).toMatch(/Math\.min\(tope, Math\.max\(1, p\.cantidad \+ delta\)\)/)
  })
})

describe('un crédito cubre un solo artículo', () => {
  const fuente = sinComentarios(fs.readFileSync(PANTALLA, 'utf8'))

  it('elegir otro artículo distinto no lo añade', () => {
    /*
     * La guarda está al principio de `handleAgregarArticulo` y corta antes de
     * tocar el estado. Si alguien la quita, vuelve el combo —y con él un
     * crédito que cobra tres artículos y registra uno—.
     */
    expect(fuente).toMatch(
      /if \(articuloElegido && articuloElegido\.id !== articulo\.id\) \{/,
    )
  })

  it('y dice por qué, y qué hacer en su lugar', () => {
    // «No se puede» a secas deja a la persona sin saber que lo que quiere
    // —varias unidades— sí se puede.
    expect(fuente).toContain('Un crédito cubre un solo artículo')
    expect(fuente).toContain('sube la cantidad si son varias unidades del mismo')
  })

  it('ya no queda el aviso de ajustar el inventario a mano', () => {
    /*
     * Si vuelve, es que volvió el combo. Se comprueba sobre el texto sin
     * comentarios porque la explicación de arriba del bloque cuenta que ese
     * aviso existió.
     */
    expect(fuente).not.toContain('unidadesSinDescontar')
    expect(fuente).not.toContain('El inventario no se ajusta solo')
  })

  it('y ese lector ve el defecto cuando se le pone delante', () => {
    // Comprobada al revés: con el defecto fuera de un comentario sí se ve.
    expect(sinComentarios('const x = unidadesSinDescontar')).toContain(
      'unidadesSinDescontar',
    )
    expect(sinComentarios('// habia un unidadesSinDescontar')).not.toContain(
      'unidadesSinDescontar',
    )
  })
})
