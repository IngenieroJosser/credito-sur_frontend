import { frecuenciaToPeriodoRuta } from '@/lib/rutas-core'

/**
 * `frecuenciaToPeriodoRuta` es ahora el UNICO sitio que convierte la frecuencia de pago
 * del backend al `PeriodoRuta` del frontend. Antes habia SEIS conversiones:
 *
 *   - `mapFrecuenciaToPeriodo` en `lib/types/cobranza.ts`, la canonica, cuyo comentario ya
 *     decia que "centraliza la logica duplicada en VistaCobrador, SupervisorCobroView,
 *     ruta-client y coordinador/rutas" — pero esos archivos seguian con su copia.
 *   - `frecuenciaToPeriodoRuta` en `rutas-core`, que es la canonica mas un `toUpperCase`.
 *   - CUATRO copias locales `normalizePeriodoRuta`, byte a byte identicas entre si, en
 *     VistaCobrador, SupervisorCobroView, ruta-historial y
 *     build-ruta-historial-operativo.
 *   - Un ternario en linea en `build-ruta-hoy-operativa.ts`.
 *
 * Esta prueba no existia. Se escribe al unificar, porque sin ella nada impide que
 * reaparezca una septima copia que se comporte distinto. Importa: `periodoRuta === 'DIA'`
 * decide si una visita entra en la meta operativa del dia
 * (`rutas-core.ts`: `String(visita?.periodoRuta || '').toUpperCase() === 'DIA'`), asi que
 * clasificar mal una ruta diaria la saca de la meta.
 */
describe('frecuenciaToPeriodoRuta', () => {
  it('convierte los cuatro valores del enum del backend', () => {
    // El enum de Prisma tiene exactamente estos cuatro.
    expect(frecuenciaToPeriodoRuta('DIARIO')).toBe('DIA')
    expect(frecuenciaToPeriodoRuta('SEMANAL')).toBe('SEMANA')
    expect(frecuenciaToPeriodoRuta('QUINCENAL')).toBe('QUINCENA')
    expect(frecuenciaToPeriodoRuta('MENSUAL')).toBe('MES')
  })

  it('es idempotente: acepta el valor ya convertido', () => {
    // Hace falta porque hay pantallas que reenvian un objeto que ya paso por aqui.
    expect(frecuenciaToPeriodoRuta('DIA')).toBe('DIA')
    expect(frecuenciaToPeriodoRuta('SEMANA')).toBe('SEMANA')
    expect(frecuenciaToPeriodoRuta('QUINCENA')).toBe('QUINCENA')
    expect(frecuenciaToPeriodoRuta('MES')).toBe('MES')
  })

  it('no distingue mayusculas de minusculas', () => {
    // Esto es lo que aportaba el `toUpperCase` de las cuatro copias locales sobre la
    // canonica `mapFrecuenciaToPeriodo`, que hace un switch sobre el texto exacto. Al
    // unificar se conserva llamando a la version de `rutas-core`, no a la canonica pelada.
    expect(frecuenciaToPeriodoRuta('semanal')).toBe('SEMANA')
    expect(frecuenciaToPeriodoRuta('Quincenal')).toBe('QUINCENA')
    expect(frecuenciaToPeriodoRuta('mensual')).toBe('MES')
  })

  it('cae en DIA cuando no hay frecuencia', () => {
    // Las rutas de este negocio son diarias en su mayoria; ese es el respaldo historico.
    expect(frecuenciaToPeriodoRuta(null)).toBe('DIA')
    expect(frecuenciaToPeriodoRuta(undefined)).toBe('DIA')
    expect(frecuenciaToPeriodoRuta('')).toBe('DIA')
    expect(frecuenciaToPeriodoRuta('CADA_LUNES')).toBe('DIA')
  })

  /**
   * Estos cuatro casos son los UNICOS en los que el ternario en linea que habia en
   * `build-ruta-hoy-operativa.ts` daba un resultado distinto:
   *
   *   frecuenciaPago === 'DIARIO' ? 'DIA'
   *     : frecuenciaPago === 'SEMANAL' ? 'SEMANA'
   *     : frecuenciaPago === 'QUINCENAL' ? 'QUINCENA'
   *     : 'MES'
   *
   * No pasaba a mayusculas, no aceptaba el valor ya convertido, y su respaldo era 'MES' en
   * vez de 'DIA'. Con los valores que el enum de Prisma puede producir daba lo mismo, y por
   * eso el cambio no arregla nada hoy; se fija aqui para que la diferencia quede escrita en
   * vez de en la cabeza de nadie.
   */
  it('donde el ternario que se quito habria dicho MES', () => {
    expect(frecuenciaToPeriodoRuta('DIA')).toBe('DIA')
    expect(frecuenciaToPeriodoRuta('diario')).toBe('DIA')
    expect(frecuenciaToPeriodoRuta('SEMANA')).toBe('SEMANA')
    expect(frecuenciaToPeriodoRuta(undefined)).toBe('DIA')
  })
})
