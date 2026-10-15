import { nombreDelCobrador } from '@/lib/rutas/nombre-cobrador'

/**
 * En una RUTA el cobrador es un nombre, no un objeto.
 *
 * Se rastrearon los endpoints uno por uno en el backend:
 *
 *   GET /routes                          -> cobrador: string
 *   GET /routes/:id                      -> cobrador: string
 *   reports/operational/route-detail/:id -> cobrador: objeto
 *   GET /loans/:id                       -> cobrador: objeto (el del préstamo)
 *   ruta anidada en un cliente           -> no viene
 *
 * `types/domain.ts` declaraba `cobrador?: Pick<Usuario, 'id'|'nombres'|'apellidos'>`
 * y tres pantallas leían `ruta.cobrador.nombres`. Como el string es truthy,
 * entraban a esa rama, sacaban `undefined` y mostraban el cobrador EN BLANCO; en
 * `SupervisorCobroView` además se saltaban el respaldo que consultaba al usuario
 * por su id.
 */
describe('nombreDelCobrador', () => {
  describe('lo que mandan los endpoints de ruta', () => {
    it('devuelve el nombre ya armado', () => {
      expect(nombreDelCobrador('Juan Pérez')).toBe('Juan Pérez')
    })

    it('no devuelve vacío por un nombre con espacios de sobra', () => {
      expect(nombreDelCobrador('  Juan Pérez  ')).toBe('Juan Pérez')
    })

    it('así se veía el error: leer .nombres de un string da undefined', () => {
      // Esto es lo que hacía el código de antes, dejado como recordatorio.
      const cobrador: unknown = 'Juan Pérez'
      const comoEstabaAntes = cobrador
        ? `${(cobrador as { nombres?: string }).nombres || ''} ${(cobrador as { apellidos?: string }).apellidos || ''}`.trim()
        : 'Sin asignar'
      expect(comoEstabaAntes).toBe('')
      expect(nombreDelCobrador(cobrador, 'Sin asignar')).toBe('Juan Pérez')
    })
  })

  describe('lo que mandan los endpoints que sí traen el objeto', () => {
    it('arma el nombre con nombres y apellidos', () => {
      expect(nombreDelCobrador({ nombres: 'Juan', apellidos: 'Pérez' })).toBe('Juan Pérez')
    })

    it('funciona con solo el nombre', () => {
      expect(nombreDelCobrador({ nombres: 'Juan' })).toBe('Juan')
    })

    it('funciona con solo el apellido', () => {
      expect(nombreDelCobrador({ apellidos: 'Pérez' })).toBe('Pérez')
    })

    it('un objeto con los dos campos vacíos cae al valor por defecto', () => {
      expect(nombreDelCobrador({ nombres: '', apellidos: '' }, 'Sin asignar')).toBe('Sin asignar')
    })

    it('null dentro del objeto no imprime "null"', () => {
      expect(nombreDelCobrador({ nombres: null, apellidos: null }, 'Sin asignar')).toBe(
        'Sin asignar',
      )
    })
  })

  describe('cuando no hay cobrador', () => {
    it('undefined, null y vacío dan el valor por defecto', () => {
      expect(nombreDelCobrador(undefined, 'Sin asignar')).toBe('Sin asignar')
      expect(nombreDelCobrador(null, 'Sin asignar')).toBe('Sin asignar')
      expect(nombreDelCobrador('', 'Sin asignar')).toBe('Sin asignar')
      expect(nombreDelCobrador('   ', 'Sin asignar')).toBe('Sin asignar')
    })

    it('sin valor por defecto devuelve cadena vacía, no "undefined"', () => {
      expect(nombreDelCobrador(undefined)).toBe('')
      expect(nombreDelCobrador(null)).toBe('')
    })
  })

  describe('formas raras', () => {
    it('un objeto con otra forma no se imprime como "[object Object]"', () => {
      expect(nombreDelCobrador({ id: 'u1' }, 'Sin asignar')).toBe('Sin asignar')
    })

    it('un número se muestra tal cual, no se pierde', () => {
      // No deberia pasar, pero si pasa es mejor ver algo que un blanco.
      expect(nombreDelCobrador(123)).toBe('123')
    })
  })
})
