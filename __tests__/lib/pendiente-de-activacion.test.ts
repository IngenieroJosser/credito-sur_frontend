import { estaPendienteDeActivacion } from '@/lib/rutas/pendiente-de-activacion'

/**
 * La pestaña "Pendientes" del listado de rutas.
 *
 * Filtraba por `estado === 'PENDIENTE_ACTIVACION'`, un estado que el backend nunca
 * manda: lo deriva de la columna `activa`, así que solo vale ACTIVA o INACTIVA. La
 * pestaña no podía coincidir con nada y la lista salía siempre vacía.
 *
 * Ahora el listado trae `activadaHoy` para todas las rutas de una vez, y esta es la
 * regla que decide.
 */
describe('estaPendienteDeActivacion', () => {
  it('una ruta habilitada que no salió a operar hoy sí está pendiente', () => {
    expect(
      estaPendienteDeActivacion({ estado: 'ACTIVA', activadaHoy: false, diaNoLaboral: false }),
    ).toBe(true)
  })

  it('una ruta que ya abrió jornada no está pendiente', () => {
    expect(
      estaPendienteDeActivacion({ estado: 'ACTIVA', activadaHoy: true, diaNoLaboral: false }),
    ).toBe(false)
  })

  it('una ruta inhabilitada no está pendiente: está apagada', () => {
    // No se espera que opere, así que no tiene sentido pedirle que active.
    expect(
      estaPendienteDeActivacion({ estado: 'INACTIVA', activadaHoy: false, diaNoLaboral: false }),
    ).toBe(false)
  })

  it('el domingo nada está pendiente: no hay jornada operativa', () => {
    expect(
      estaPendienteDeActivacion({ estado: 'ACTIVA', activadaHoy: false, diaNoLaboral: true }),
    ).toBe(false)
  })

  describe('cuando el dato no viene', () => {
    it('sin `activadaHoy` no se marca nada', () => {
      // Pasa con una respuesta vieja o un caché de antes de este cambio. Es mejor
      // no marcar nada que marcar todas las rutas como pendientes.
      expect(estaPendienteDeActivacion({ estado: 'ACTIVA' })).toBe(false)
      expect(estaPendienteDeActivacion({ estado: 'ACTIVA', activadaHoy: undefined })).toBe(false)
    })

    it('sin `diaNoLaboral` se asume día laboral', () => {
      expect(estaPendienteDeActivacion({ estado: 'ACTIVA', activadaHoy: false })).toBe(true)
    })
  })

  describe('así se veía el error', () => {
    it('el filtro viejo no coincidía con ninguna ruta real', () => {
      // El backend solo manda estos dos estados.
      const comoLasManda: Array<'ACTIVA' | 'INACTIVA'> = ['ACTIVA', 'INACTIVA']
      const coincidenciasDelFiltroViejo = comoLasManda.filter(
        (estado) => (estado as string) === 'PENDIENTE_ACTIVACION',
      )
      expect(coincidenciasDelFiltroViejo).toHaveLength(0)

      // Con la regla nueva, la misma ruta sí aparece.
      expect(
        estaPendienteDeActivacion({ estado: 'ACTIVA', activadaHoy: false, diaNoLaboral: false }),
      ).toBe(true)
    })
  })
})
