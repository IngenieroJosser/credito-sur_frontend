import {
  formatCOPInputValue,
  formatCurrency,
  formatLoanTerm,
  formatMilesCOP,
  getDisplayedCOPInteger,
  isSameDisplayedCOPAmount,
  parseCOPInputToNumber,
} from '@/lib/utils'

/** `Intl` puede separar el símbolo con un espacio duro; eso no es lo que se comprueba. */
const norm = (texto: string) => texto.replace(/[  ]/g, ' ')

/**
 * El dinero, tal y como se escribe y se lee en pantalla.
 *
 * `formatCurrency` aparece en 75 archivos y `parseCOPInputToNumber` en los
 * formularios donde se teclea un pago. No tenían pruebas propias.
 *
 * Lo delicado es leer un texto de dinero sin saber de dónde viene: en Colombia
 * el punto separa miles y la coma decimales, pero al sistema llegan cifras de
 * las dos formas (JSON del backend, celdas de Excel importadas, texto escrito a
 * mano). "1.234" puede ser mil doscientos treinta y cuatro o uno con 234, y
 * como avisa el propio módulo, equivocarse ahí no rompe nada: enseña un crédito
 * de 1.200.000 como 1,2.
 */
describe('formatCurrency', () => {
  it('escribe pesos colombianos sin decimales', () => {
    expect(norm(formatCurrency(1_200_000))).toBe('$ 1.200.000')
  })

  it('un punto es separador de miles, que es lo que significa aquí', () => {
    expect(norm(formatCurrency('1.200.000'))).toBe('$ 1.200.000')
    expect(norm(formatCurrency('1.234'))).toBe('$ 1.234')
  })

  it('reconoce el decimal inglés y el colombiano, y los trunca igual', () => {
    expect(norm(formatCurrency('1234.56'))).toBe('$ 1.234')
    expect(norm(formatCurrency('1.234,56'))).toBe('$ 1.234')
  })

  it('acepta un texto que ya trae el símbolo', () => {
    expect(norm(formatCurrency('$ 50.000'))).toBe('$ 50.000')
  })

  it('no pinta "-$ 0" por un residuo de centavos', () => {
    // Math.trunc(-0.4) da -0, e Intl lo escribiría con signo menos: un menos
    // sobre un valor que en realidad es cero.
    expect(norm(formatCurrency(-0.4))).toBe('$ 0')
  })

  it('sin valor muestra cero, no vacío ni NaN', () => {
    expect(norm(formatCurrency(null))).toBe('$ 0')
    expect(norm(formatCurrency(undefined))).toBe('$ 0')
    expect(norm(formatCurrency(''))).toBe('$ 0')
    expect(norm(formatCurrency('no-es-dinero'))).toBe('$ 0')
  })
})

describe('lo que se teclea en un campo de dinero', () => {
  it('va poniendo los puntos de miles mientras se escribe', () => {
    expect(norm(formatCOPInputValue('50000'))).toBe('50.000')
    expect(formatCOPInputValue('')).toBe('')
    expect(formatCOPInputValue('abc')).toBe('')
  })

  it('al leerlo, los puntos no cuentan', () => {
    expect(parseCOPInputToNumber('50.000')).toBe(50_000)
    expect(parseCOPInputToNumber('')).toBe(0)
  })

  it('ignora el signo menos: aquí no se registran pagos negativos', () => {
    expect(parseCOPInputToNumber('-5000')).toBe(5_000)
  })

  it('formatMilesCOP tampoco deja el cero negativo', () => {
    expect(norm(formatMilesCOP(-0.4))).toBe('0')
    expect(norm(formatMilesCOP(1_200_000))).toBe('1.200.000')
  })
})

/**
 * Esto decide si un pago cuenta como cuota completa o como abono, en los tres
 * modales de cobro. La cuota puede tener centavos que la pantalla no enseña:
 * si se comparara contra el valor exacto, el cobrador teclearía justo lo que
 * ve y el sistema le diría que no cuadra.
 */
describe('isSameDisplayedCOPAmount', () => {
  it('compara contra lo que la pantalla muestra, no contra los centavos', () => {
    expect(getDisplayedCOPInteger(50_000.9)).toBe(50_000)
    expect(isSameDisplayedCOPAmount(50_000, 50_000.9)).toBe(true)
  })

  it('una diferencia de un peso sí es una diferencia', () => {
    expect(isSameDisplayedCOPAmount(49_999, 50_000)).toBe(false)
    expect(isSameDisplayedCOPAmount(50_001, 50_000)).toBe(false)
  })

  it('un monto ausente no equivale a cualquier cuota', () => {
    expect(isSameDisplayedCOPAmount(0, 50_000)).toBe(false)
  })
})

describe('formatLoanTerm', () => {
  it('cuenta en meses cuando se cobra mensual', () => {
    expect(
      formatLoanTerm({
        plazoMeses: 6,
        cantidadCuotas: 6,
        frecuenciaPago: 'MENSUAL',
      }),
    ).toBe('6 meses')
  })

  it('cuenta en la unidad de la frecuencia, no en meses', () => {
    expect(
      formatLoanTerm({
        plazoMeses: 1,
        cantidadCuotas: 4,
        frecuenciaPago: 'SEMANAL',
      }),
    ).toBe('4 semanas')
  })
})
