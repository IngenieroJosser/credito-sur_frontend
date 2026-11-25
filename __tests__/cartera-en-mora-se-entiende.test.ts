import { textoDeCarteraEnMora } from '@/lib/dashboard/cartera-en-mora'

/**
 * La tarjeta «Cartera en Mora» dice algo que se entiende.
 *
 * ── Lo que decía ───────────────────────────────────────────────────────────
 *
 * **«4 cuentas · > 0% del capital»**. Lo señaló el dueño: no se entiende. Y
 * mirándolo de cerca había tres problemas, no uno.
 *
 * 1. El «> 0» era la forma de decir «hay mora pero no puedo calcular el
 *    porcentaje». Dicho así parece una cifra.
 * 2. El denominador estaba mal: `capitalPrestado` va filtrado POR PERIODO y
 *    la mora es un estado ACTUAL. Medido contra la base de carga (2.000
 *    clientes, 3.000 créditos):
 *
 *        periodo «hoy»   capital del periodo = 0            → «> 0%»
 *        periodo «mes»   3.000.000.000 contra 3.465.000.000 → **115,5 %**
 *
 *    Un «115,5 % del capital» no significa nada. Ahora se mide contra la
 *    cartera pendiente, de la que la mora es un subconjunto: nunca pasa de
 *    100.
 * 3. El importe se sumaba sobre la lista de detalle, que el servidor recorta
 *    a DIEZ filas, mientras el contador traía el total real.
 */
describe('el texto de la cartera en mora', () => {
  it('con mora y cartera, dice el porcentaje de la CARTERA', () => {
    const texto = textoDeCarteraEnMora({
      cuentas: 3000,
      monto: 3_465_000_000,
      carteraPendiente: 6_930_000_000,
    })
    expect(texto).toBe('3.000 cuentas · 50,0% de la cartera')
  })

  it('nunca escribe «> 0»', () => {
    /*
     * El caso exacto que señaló el dueño: hay cuentas en mora pero no hay con
     * qué calcular el porcentaje. Se dice lo que se sabe y nada más.
     */
    const texto = textoDeCarteraEnMora({
      cuentas: 4,
      monto: 9_230_000,
      carteraPendiente: 0,
    })
    expect(texto).toBe('4 cuentas')
    expect(texto).not.toContain('>')
    expect(texto).not.toContain('%')
  })

  it('tampoco inventa un 0% cuando no se sabe', () => {
    // Un «0 %» se leería como «no hay mora», y sí la hay.
    const texto = textoDeCarteraEnMora({
      cuentas: 7,
      monto: 0,
      carteraPendiente: 1_000,
    })
    expect(texto).toBe('7 cuentas')
  })

  it('sin cuentas en mora lo dice con palabras', () => {
    expect(
      textoDeCarteraEnMora({ cuentas: 0, monto: 0, carteraPendiente: 100 }),
    ).toBe('Sin cuentas en mora')
  })

  it('concuerda el singular', () => {
    // «1 cuentas» es de esas cosas que hacen que un sistema parezca
    // descuidado.
    const texto = textoDeCarteraEnMora({
      cuentas: 1,
      monto: 50,
      carteraPendiente: 200,
    })
    expect(texto).toBe('1 cuenta · 25,0% de la cartera')
  })

  it('usa la coma decimal y el punto de miles, como se escribe aquí', () => {
    const texto = textoDeCarteraEnMora({
      cuentas: 1234,
      monto: 1,
      carteraPendiente: 3,
    })
    expect(texto).toContain('1.234 cuentas')
    expect(texto).toContain('33,3%')
  })

  it('no puede pasar del 100% con el denominador correcto', () => {
    /*
     * La mora es un subconjunto de la cartera pendiente, así que el cociente
     * está acotado. Se comprueba el caso extremo: toda la cartera en mora.
     */
    const texto = textoDeCarteraEnMora({
      cuentas: 10,
      monto: 500,
      carteraPendiente: 500,
    })
    expect(texto).toBe('10 cuentas · 100,0% de la cartera')
  })
})
