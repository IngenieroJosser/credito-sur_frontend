import { act, renderHook } from '@testing-library/react'
import { useHoyBogota } from '@/hooks/use-hoy-bogota'

/**
 * El día de hoy en Bogotá, probado.
 *
 * Estas treinta líneas estaban escritas tres veces dentro de tres componentes
 * de 2.700 a 4.900 líneas, así que no había forma de probarlas sin montar la
 * pantalla del cobrador entera. Sacadas al hook, se prueba lo que de verdad
 * importa:
 *
 *  - que el día sea el de BOGOTÁ y no el del dispositivo;
 *  - que cambie solo a medianoche, sin recargar, porque el cobrador deja la
 *    aplicación abierta.
 *
 * El huso del proceso se cambia con `TZ` en cada prueba: es la única forma de
 * comprobar lo primero, y es justo el caso que se quería cubrir —un teléfono
 * con la zona mal puesta—.
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

describe('useHoyBogota', () => {
  afterEach(() => {
    jest.useRealTimers()
    process.env.TZ = TZ_ORIGINAL
  })

  it('devuelve el día de Bogotá, no el del dispositivo', () => {
    /*
     * El caso que importa: son las 02:00 del 14 de noviembre en UTC, que en
     * Bogotá (UTC−5) siguen siendo las 21:00 del 13.
     *
     * Un teléfono con la zona en UTC diría «14» y enseñaría la ruta de mañana,
     * con las visitas de hoy fuera. Esto tiene que decir «13».
     */
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-11-14T02:00:00.000Z'))

    conHuso('UTC', () => {
      const { result } = renderHook(() => useHoyBogota())
      expect(result.current).toBe('2026-11-13')
    })
  })

  it('y tampoco el de quien viajó al otro lado del mundo', () => {
    // Un dispositivo en Tokio (UTC+9) a las 11:00 del 14 está a las 21:00 del
    // 13 en Bogotá.
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-11-14T02:00:00.000Z'))

    conHuso('Asia/Tokyo', () => {
      const { result } = renderHook(() => useHoyBogota())
      expect(result.current).toBe('2026-11-13')
    })
  })

  it('con el huso en Bogotá da lo mismo, que es lo esperado', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-11-13T21:00:00.000Z'))

    conHuso('America/Bogota', () => {
      const { result } = renderHook(() => useHoyBogota())
      expect(result.current).toBe('2026-11-13')
    })
  })

  it('cambia de día solo al llegar la medianoche de Bogotá', () => {
    /*
     * Lo otro que resuelve: el cobrador deja la aplicación abierta. Sin esto,
     * a las 00:01 sigue viendo la ruta de ayer hasta que recargue, y no tiene
     * por qué saber que hay que recargar.
     *
     * A las 23:30 de Bogotá faltan treinta minutos. A los veintinueve no ha
     * cambiado; pasada la medianoche, sí.
     */
    jest.useFakeTimers()
    // 23:30 en Bogotá es 04:30 UTC del día siguiente.
    jest.setSystemTime(new Date('2026-11-14T04:30:00.000Z'))

    const { result } = renderHook(() => useHoyBogota())
    expect(result.current).toBe('2026-11-13')

    act(() => {
      jest.advanceTimersByTime(29 * 60 * 1000)
    })
    expect(result.current).toBe('2026-11-13')

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000)
    })
    expect(result.current).toBe('2026-11-14')
  })

  it('sigue cambiando el día siguiente, no solo una vez', () => {
    // El temporizador se vuelve a programar: si no, el segundo día no llegaría
    // nunca y la aplicación se quedaría en la ruta de ese día para siempre.
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-11-14T04:59:00.000Z'))

    const { result } = renderHook(() => useHoyBogota())
    expect(result.current).toBe('2026-11-13')

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000)
    })
    expect(result.current).toBe('2026-11-14')

    act(() => {
      jest.advanceTimersByTime(24 * 60 * 60 * 1000)
    })
    expect(result.current).toBe('2026-11-15')
  })

  it('apaga su temporizador al desmontarse', () => {
    // Tres pantallas usan esto y una monta y desmonta al cambiar de ruta: un
    // temporizador que sobrevive sigue llamando a `setState` sobre algo que ya
    // no está.
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-11-14T04:30:00.000Z'))

    const { unmount } = renderHook(() => useHoyBogota())
    expect(jest.getTimerCount()).toBeGreaterThan(0)

    unmount()
    expect(jest.getTimerCount()).toBe(0)
  })

  it('devuelve una llave `YYYY-MM-DD`, que es lo que esperan las pantallas', () => {
    // De esta cadena salen las comparaciones de `isVisitaExigibleHoy`: si el
    // formato cambia, deja de casar y la ruta sale vacía sin que nada falle.
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-05T15:00:00.000Z'))

    const { result } = renderHook(() => useHoyBogota())
    expect(result.current).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.current).toBe('2026-01-05')
  })
})
