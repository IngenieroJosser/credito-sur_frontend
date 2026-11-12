import * as fs from 'fs'
import * as path from 'path'
import { montoEnPalabras, porQueNoEsDinero, MAXIMO_EN_PESOS } from '@/lib/dinero'

describe('qué es dinero válido', () => {
  it('acepta un importe normal', () => {
    expect(porQueNoEsDinero(500_000)).toBeNull()
  })

  it.each([
    ['vacío', '', 'Falta indicar'],
    ['nulo', null, 'Falta indicar'],
    ['texto', 'abc', 'número'],
    ['cero', 0, 'mayor que cero'],
    ['negativo', -1000, 'mayor que cero'],
    ['con centavos', 1000.5, 'centavos'],
    ['enorme', MAXIMO_EN_PESOS + 1, 'demasiado grande'],
  ])('rechaza un importe %s', (_caso, valor, fragmento) => {
    const motivo = porQueNoEsDinero(valor)
    expect(motivo).not.toBeNull()
    expect(motivo).toContain(fragmento)
  })

  it('el tope coincide con el del backend', () => {
    // Es una copia a propósito —el aviso tiene que salir mientras se escribe—
    // y por eso se comprueba que no se separe. Si el backend no está al lado,
    // la prueba se salta: son dos repositorios.
    const util = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'credito-sur_backend',
      'src',
      'common',
      'dinero.util.ts',
    )
    if (!fs.existsSync(util)) return

    const fuente = fs.readFileSync(util, 'utf8')
    const hallado = fuente.match(/MAXIMO_EN_PESOS\s*=\s*([0-9_]+)/)

    expect(hallado).not.toBeNull()
    expect(Number(hallado?.[1].replace(/_/g, ''))).toBe(MAXIMO_EN_PESOS)
  })
})

describe('el importe en palabras', () => {
  it.each([
    [1, 'un peso'],
    [2, 'dos pesos'],
    [15, 'quince pesos'],
    [21, 'veintiún pesos'],
    [100, 'cien pesos'],
    [101, 'ciento un pesos'],
    [250, 'doscientos cincuenta pesos'],
    [1000, 'mil pesos'],
    [50_000, 'cincuenta mil pesos'],
    [500_000, 'quinientos mil pesos'],
    [1_000_000, 'un millón de pesos'],
    [10_000_000, 'diez millones de pesos'],
    [1_500_000, 'un millón quinientos mil pesos'],
  ])('%i se lee «%s»', (monto, esperado) => {
    expect(montoEnPalabras(monto)).toBe(esperado)
  })

  it('el cero de más se ve a simple vista', () => {
    // Este es el error que motivó todo: entre los puntos de miles, 1.000.000 y
    // 10.000.000 se parecen. Escritos, no.
    expect(montoEnPalabras(1_000_000)).toBe('un millón de pesos')
    expect(montoEnPalabras(10_000_000)).toBe('diez millones de pesos')
  })

  it('un importe que no sirve no se escribe', () => {
    // Quien lo use no tiene que decidir qué pintar cuando el campo va a medias.
    expect(montoEnPalabras(0)).toBe('')
    expect(montoEnPalabras(-5)).toBe('')
    expect(montoEnPalabras(1000.5)).toBe('')
  })
})
