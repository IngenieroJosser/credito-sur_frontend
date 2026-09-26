import {
  LARGO_MAXIMO_CODIGO_RUTA,
  normalizarCodigoRuta,
} from '@/lib/rutas/codigo-ruta'

/**
 * Los mismos casos que `src/routes/codigo-ruta.spec.ts` del backend.
 *
 * `lib/rutas/codigo-ruta.ts` es una copia a mano de la función del servidor:
 * el formulario necesita mostrar cómo va a quedar el código sin preguntarle al
 * backend en cada tecla. Una copia sin pruebas es una copia que se va a
 * separar del original sin que nadie lo note, y cuando eso pase la vista
 * previa dirá "RT-CENTRO" mientras el servidor guarda otra cosa.
 *
 * Si algún día cambia la regla, estas pruebas y las del backend deben cambiar
 * juntas; si solo cambia un lado, una de las dos falla.
 */
describe('normalizarCodigoRuta (espejo del backend)', () => {
  it('le pone el prefijo a un nombre suelto', () => {
    expect(normalizarCodigoRuta('Centro')).toBe('RT-CENTRO')
    expect(normalizarCodigoRuta('centro')).toBe('RT-CENTRO')
  })

  it('no duplica el prefijo, venga como venga', () => {
    expect(normalizarCodigoRuta('RT-CENTRO')).toBe('RT-CENTRO')
    expect(normalizarCodigoRuta('RUTA CENTRO')).toBe('RT-CENTRO')
    expect(normalizarCodigoRuta('rt centro')).toBe('RT-CENTRO')
  })

  it('respeta los codigos que ya existen en el sistema', () => {
    expect(normalizarCodigoRuta('RT-CEN-01')).toBe('RT-CEN-01')
  })

  it('es idempotente: normalizar dos veces da lo mismo', () => {
    const una = normalizarCodigoRuta('Zona Norte 2')
    expect(una).toBe('RT-ZONA-NORTE-2')
    expect(normalizarCodigoRuta(una)).toBe(una)
  })

  it('quita tildes, espacios y signos', () => {
    expect(normalizarCodigoRuta('  Bogotá   Sur  ')).toBe('RT-BOGOTA-SUR')
    expect(normalizarCodigoRuta('Centro / Norte')).toBe('RT-CENTRO-NORTE')
  })

  it('respeta el limite de la columna (20) y no deja guion al final', () => {
    const largo = normalizarCodigoRuta('Zona Nororiental Municipal Extendida')
    expect(largo.length).toBeLessThanOrEqual(LARGO_MAXIMO_CODIGO_RUTA)
    expect(largo.endsWith('-')).toBe(false)
    expect(largo.startsWith('RT-')).toBe(true)
  })

  it('devuelve vacio cuando no hay nada que normalizar', () => {
    expect(normalizarCodigoRuta('')).toBe('')
    expect(normalizarCodigoRuta('   ')).toBe('')
    expect(normalizarCodigoRuta(null)).toBe('')
    expect(normalizarCodigoRuta('---')).toBe('')
  })
})
