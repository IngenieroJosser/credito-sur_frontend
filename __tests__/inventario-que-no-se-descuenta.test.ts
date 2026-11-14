import * as fs from 'fs'
import * as path from 'path'

/**
 * Que la venta de varios artículos diga qué NO sale del inventario.
 *
 * ── Lo que pasa ─────────────────────────────────────────────────────────────
 *
 * `CreacionCreditoArticulo` deja elegir varios artículos y una cantidad por
 * cada uno, y cobra la suma de todos:
 *
 *     monto: resumenFinanciero.totalFinanciadoBruto
 *     productoId: articulo.id          // ← el PRIMERO de la lista
 *
 * Pero el backend acepta UN `productoId` por préstamo y descuenta UNA unidad
 * —`descontarStockSiDisponible` hace `stock: { decrement: 1 }`—. Así que de
 * una venta de tres teléfonos sale UN teléfono del inventario, y los otros dos
 * solo quedan escritos en el texto de las notas.
 *
 * Verificado en los dos lados: el `productoId` opcional y único está en
 * `create-loan.dto.ts` y `create-credit.dto.ts`, y el decremento de 1 en
 * `loans.service.ts`.
 *
 * ── Qué se exige, y qué NO ──────────────────────────────────────────────────
 *
 * NO se prohíbe vender así: puede ser un combo que el negocio de verdad vende,
 * y quitarlo es una decisión suya. Lo que no puede seguir pasando es que sea
 * en SILENCIO: quien crea el crédito tiene que ver, antes de confirmar, qué
 * unidades va a tener que ajustar a mano y de qué artículos.
 *
 * Esta prueba vigila que ese aviso siga ahí. Si algún día el backend acepta
 * varios productos y descuenta lo que toca, esto se borra con él.
 */

const RAIZ = path.join(__dirname, '..')
const PANTALLA = path.join(RAIZ, 'components', 'creditos', 'CreacionCreditoArticulo.tsx')

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

  it('el payload sigue mandando un solo producto, que es el motivo del aviso', () => {
    /*
     * Si esto deja de ser verdad —porque el backend ya acepte varios— el aviso
     * sobra y hay que quitarlo. Esta prueba falla entonces, y eso es lo que se
     * quiere: que nadie se quede con un aviso que ya no aplica.
     */
    expect(fuente).toMatch(/productoId: articulo\.id/)
  })
})

describe('la cuenta de unidades sin descontar', () => {
  /**
   * La misma fórmula que la pantalla, probada aparte.
   *
   * Del PRIMER artículo el backend descuenta una unidad; de los demás,
   * ninguna. Así que lo que queda sin descontar es `cantidad - 1` del primero
   * y la cantidad entera del resto.
   */
  const sinDescontar = (articulos: Array<{ nombre: string; cantidad: number }>) =>
    articulos
      .map((item, indice) => ({
        nombre: item.nombre,
        unidades: indice === 0 ? item.cantidad - 1 : item.cantidad,
      }))
      .filter((x) => x.unidades > 0)

  it('con un artículo y una unidad no hay nada que avisar', () => {
    // El caso normal: una venta de un artículo se registra bien.
    expect(sinDescontar([{ nombre: 'Teléfono', cantidad: 1 }])).toEqual([])
  })

  it('con un artículo y tres unidades quedan dos sin descontar', () => {
    expect(sinDescontar([{ nombre: 'Teléfono', cantidad: 3 }])).toEqual([
      { nombre: 'Teléfono', unidades: 2 },
    ])
  })

  it('con dos artículos, del segundo no se descuenta nada', () => {
    expect(
      sinDescontar([
        { nombre: 'Teléfono', cantidad: 1 },
        { nombre: 'Televisor', cantidad: 1 },
      ]),
    ).toEqual([{ nombre: 'Televisor', unidades: 1 }])
  })

  it('y con varios de cada uno, suma lo de todos', () => {
    expect(
      sinDescontar([
        { nombre: 'Teléfono', cantidad: 2 },
        { nombre: 'Televisor', cantidad: 3 },
        { nombre: 'Nevera', cantidad: 1 },
      ]),
    ).toEqual([
      { nombre: 'Teléfono', unidades: 1 },
      { nombre: 'Televisor', unidades: 3 },
      { nombre: 'Nevera', unidades: 1 },
    ])
  })
})
