import { diasEntreEnBogota, hoyEnBogota } from '@/lib/rutas-core'

/**
 * Los días, contados en Bogotá y no con el reloj del dispositivo.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Cinco sitios del sistema hacían esto para saber qué día es hoy:
 *
 *     const hoy = new Date()
 *     hoy.setHours(0, 0, 0, 0)
 *
 * Eso es hoy según el reloj del DISPOSITIVO. Y de ahí salían:
 *
 *   los días vencidos de una cuenta        `(auth)/cuentas-vencidas`
 *   el límite para reprogramar un cobro    `ReprogramarModal`
 *   los días que le quedan a una prórroga  `CobradorElements`
 *   el inicio del periodo de la ruta       `VistaCobrador`, dos veces
 *
 * Con el huso mal puesto —un Android recién formateado, el de alguien que
 * viajó— o en el cambio de día, todas esas cifras salen corridas un día. Y son
 * cifras que deciden si se cobra hoy y cuánto recargo lleva.
 *
 * El huso del proceso se cambia con `TZ` en cada prueba: es la única forma de
 * comprobarlo, y es justo el caso que se quiere cubrir.
 */

const TZ_ORIGINAL = process.env.TZ

function conHuso(tz: string, fn: () => void) {
  process.env.TZ = tz
  try {
    fn()
  } finally {
    process.env.TZ = TZ_ORIGINAL
  }
}

describe('hoyEnBogota', () => {
  afterEach(() => {
    jest.useRealTimers()
    process.env.TZ = TZ_ORIGINAL
  })

  it('da el día de Bogotá aunque el dispositivo esté en otro huso', () => {
    // 02:00 UTC del 14 son las 21:00 del 13 en Bogotá.
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-11-14T02:00:00.000Z'))

    conHuso('UTC', () => {
      const hoy = hoyEnBogota()
      expect(hoy.getDate()).toBe(13)
      expect(hoy.getMonth()).toBe(10)
      expect(hoy.getFullYear()).toBe(2026)
    })
  })

  it('y al mediodía, para que sumar y restar días no corra la fecha', () => {
    /*
     * El detalle que importa: si se armara a medianoche, cualquier operación
     * que atraviese un cambio de hora de verano, o un `toISOString()`, movería
     * el día. Al mediodía quedan cinco horas de margen por cada lado.
     */
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-11-13T18:00:00.000Z'))

    conHuso('Asia/Tokyo', () => {
      expect(hoyEnBogota().getHours()).toBe(12)
    })
  })
})

describe('diasEntreEnBogota', () => {
  it('cuenta días de calendario, no horas', () => {
    // De las 23:00 del lunes a la 01:00 del martes es UN día, no cero.
    expect(
      diasEntreEnBogota('2026-11-09T23:00:00-05:00', '2026-11-10T01:00:00-05:00'),
    ).toBe(1)
  })

  it('cuenta igual con llaves `YYYY-MM-DD`', () => {
    expect(diasEntreEnBogota('2026-11-01', '2026-11-30')).toBe(29)
  })

  it('es negativo cuando la segunda fecha es anterior', () => {
    expect(diasEntreEnBogota('2026-11-30', '2026-11-01')).toBe(-29)
  })

  it('cero cuando es el mismo día', () => {
    expect(diasEntreEnBogota('2026-11-13', '2026-11-13')).toBe(0)
  })

  it('atraviesa el cambio de mes y de año', () => {
    expect(diasEntreEnBogota('2026-12-30', '2027-01-02')).toBe(3)
    // Y un año bisiesto, que es donde falla una resta hecha a mano.
    expect(diasEntreEnBogota('2028-02-28', '2028-03-01')).toBe(2)
  })

  it('devuelve `null` cuando no se sabe, no cero', () => {
    /*
     * Esto es la regla de que un cero no es un hueco, aplicada a los días: un
     * cero significa «el mismo día», y de ahí sale «la cuota es de hoy». Si no
     * se puede resolver la fecha, eso NO es lo mismo.
     */
    expect(diasEntreEnBogota(null, '2026-11-13')).toBeNull()
    expect(diasEntreEnBogota('2026-11-13', undefined)).toBeNull()
    expect(diasEntreEnBogota('', '')).toBeNull()
    expect(diasEntreEnBogota('no es una fecha', '2026-11-13')).toBeNull()
  })

  it('da lo mismo con el dispositivo en cualquier huso', () => {
    // El resultado no puede depender de dónde esté el teléfono: son dos
    // fechas de Bogotá y la diferencia entre ellas es una.
    const esperado = 5
    for (const tz of ['UTC', 'America/Bogota', 'Asia/Tokyo', 'Pacific/Kiritimati']) {
      conHuso(tz, () => {
        expect(diasEntreEnBogota('2026-11-10', '2026-11-15')).toBe(esperado)
      })
    }
  })

  it('acepta un `Date` además de una cadena', () => {
    const desde = new Date('2026-11-10T17:00:00.000Z')
    const hasta = new Date('2026-11-15T17:00:00.000Z')
    expect(diasEntreEnBogota(desde, hasta)).toBe(5)
  })
})
