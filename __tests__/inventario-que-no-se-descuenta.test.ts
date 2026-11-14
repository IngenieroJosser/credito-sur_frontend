import * as fs from 'fs'
import * as path from 'path'

/**
 * Que la venta de artículos cobre y descuente lo mismo.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * `CreacionCreditoArticulo` deja elegir varios artículos y una cantidad por
 * cada uno, y cobra la suma de todos. El backend, en cambio:
 *
 *     precioTotal = Number(precioProducto.precio)   // ← de UNA unidad
 *     stock: { decrement: 1 }                       // ← UNA unidad
 *
 * O sea que de una venta de tres teléfonos se cobraba uno y salía uno del
 * inventario. Lo primero es peor que lo segundo: la pantalla prometía el total
 * de los tres, el cliente firmaba por los tres y las cuotas se repartían sobre
 * el precio de uno.
 *
 * ── Lo que se arregló ───────────────────────────────────────────────────────
 *
 * El préstamo lleva `cantidadProducto` (migración
 * `20261114120000_cantidad_producto_prestamo`, `DEFAULT 1`), el precio del plan
 * y el costo se multiplican por esas unidades, el stock exigido y descontado es
 * el que se vende, y las tres reversiones devuelven lo mismo que salió.
 *
 * ── Lo que NO se arregló, y por qué ─────────────────────────────────────────
 *
 * El COMBO: varios artículos distintos en un solo crédito. No es cablear algo
 * que falte, es que el modelo no lo representa: el precio es por producto y
 * plazo (`PrecioProducto(productoId, meses)`) y el préstamo guarda UN
 * `precioProductoId`. De los artículos siguientes no queda precio, ni costo, ni
 * descuento de inventario.
 *
 * Quitar esa posibilidad es una decisión del negocio, así que lo que se exige
 * aquí es que no sea en SILENCIO: quien crea el crédito ve, antes de confirmar,
 * qué unidades no va a registrar el sistema.
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

  it('y sigue mandando un solo producto, que es el motivo del aviso', () => {
    /*
     * Si esto deja de ser verdad —porque el modelo ya acepte varios— el aviso
     * sobra y hay que quitarlo, igual que esta prueba.
     */
    expect(fuente).toMatch(/productoId: articulo\.id/)
  })
})

describe('la venta de varios artículos avisa del inventario', () => {
  const fuente = fs.readFileSync(PANTALLA, 'utf8')

  it('sigue existiendo el cálculo de lo que no se descuenta', () => {
    expect(fuente).toContain('unidadesSinDescontar')
  })

  it('el aviso se pinta cuando hay unidades sin descontar', () => {
    // No basta con calcularlo: hay que enseñarlo. Si alguien quita el bloque y
    // deja el cálculo, esto lo dice.
    expect(fuente).toMatch(/unidadesSinDescontar\.length > 0 &&/)
    expect(fuente).toMatch(/El inventario no se ajusta solo/)
  })

  it('y dice qué hacer, no solo que algo pasa', () => {
    // Un aviso que no dice qué hacer deja a la persona igual que antes.
    expect(fuente).toMatch(/Ajusta esas unidades en el inventario/)
  })
})

describe('la cuenta de unidades sin descontar', () => {
  /**
   * La misma fórmula que la pantalla, probada aparte.
   *
   * Antes era `cantidad - 1` del primer artículo más la cantidad entera del
   * resto, porque del primero salía UNA unidad. Ahora del primero sale todo lo
   * que se vende, así que lo que queda sin registrar son los artículos
   * siguientes, enteros.
   */
  const sinDescontar = (articulos: Array<{ nombre: string; cantidad: number }>) =>
    articulos.slice(1).map((item) => ({ nombre: item.nombre, unidades: item.cantidad }))

  it('con un artículo y una unidad no hay nada que avisar', () => {
    expect(sinDescontar([{ nombre: 'Teléfono', cantidad: 1 }])).toEqual([])
  })

  it('con un artículo y tres unidades tampoco: las tres se descuentan', () => {
    // Este es el caso que cambió. Antes avisaba de dos unidades a mano; ahora
    // el sistema las descuenta.
    expect(sinDescontar([{ nombre: 'Teléfono', cantidad: 3 }])).toEqual([])
  })

  it('con dos artículos, del segundo no se registra nada', () => {
    expect(
      sinDescontar([
        { nombre: 'Teléfono', cantidad: 1 },
        { nombre: 'Televisor', cantidad: 1 },
      ]),
    ).toEqual([{ nombre: 'Televisor', unidades: 1 }])
  })

  it('y con varios de cada uno, suma lo de todos menos el primero', () => {
    expect(
      sinDescontar([
        { nombre: 'Teléfono', cantidad: 2 },
        { nombre: 'Televisor', cantidad: 3 },
        { nombre: 'Nevera', cantidad: 1 },
      ]),
    ).toEqual([
      { nombre: 'Televisor', unidades: 3 },
      { nombre: 'Nevera', unidades: 1 },
    ])
  })
})
