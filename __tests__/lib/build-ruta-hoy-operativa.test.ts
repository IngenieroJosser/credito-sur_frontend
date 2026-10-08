/**
 * Red de seguridad para `buildRutaHoyOperativa`.
 *
 * Este helper alimenta la ruta del día en cuatro pantallas —VistaCobrador,
 * SupervisorCobroView, ruta-client y RutasPageView— y tenía 8,7% de cobertura: de
 * sus 356 líneas, las 32 a 356 no las ejecutaba ninguna de las 8.246 pruebas del
 * frontend. Sin eso, cualquier cambio ahí es a ciegas, y ahí es justo donde vive la
 * copia de 330 líneas que hay dentro de VistaCobrador y que ya se había separado
 * del original en dos condiciones del filtro.
 *
 * Estas pruebas fijan el comportamiento observable, no la implementación: qué
 * obligaciones entran, cuáles se descartan, y cómo sale cada KPI. Son la
 * referencia contra la que se puede comprobar que unificar las dos copias no
 * cambia nada.
 */
import { buildRutaHoyOperativa } from '@/lib/rutas/build-ruta-hoy-operativa'

const HOY = '2026-03-12'

/**
 * Una obligación como las que manda el backend en `dailyVisits.obligaciones`.
 *
 * Solo se nombran los campos que el helper lee; el resto de la fila real no
 * cambia nada y meterlo aquí solo escondería cuáles importan.
 */
const obligacion = (extra: Record<string, unknown> = {}) => ({
  id: 'obl-1',
  prestamoId: 'prestamo-1',
  clienteId: 'cliente-1',
  cliente: {
    id: 'cliente-1',
    nombres: 'Ana',
    apellidos: 'Pérez',
    telefono: '3001112233',
    direccion: 'Calle 1',
  },
  prestamo: {
    id: 'prestamo-1',
    numeroPrestamo: 'PRES-001',
    frecuenciaPago: 'DIARIO',
    saldoPendiente: 300_000,
  },
  montoCuotaNormal: 10_000,
  montoMetaOperativaPendiente: 10_000,
  recaudadoDelDia: 0,
  estadoGestion: 'PENDIENTE',
  ...extra,
})

const correr = (
  obligaciones: Array<Record<string, unknown>>,
  pagos: Array<Record<string, unknown>> = [],
) =>
  buildRutaHoyOperativa({
    ruta: { id: 'ruta-1', cobradorId: 'cobrador-1', codigo: 'R-01' },
    // El resumen va con sus seis cifras en 0 y no `{}`: `DailyVisitsResponse` las declara
    // obligatorias, y 0 es lo que corresponde a una jornada sin nada. No cambia ninguna
    // asercion: este helper saca la meta de las obligaciones, no del resumen.
    dailyVisits: {
      fecha: HOY,
      rutaId: 'ruta-1',
      totalVisitas: obligaciones.length,
      visitas: [],
      obligaciones,
      resumen: {
        recaudo: 0,
        meta: 0,
        gastos: 0,
        efectividad: 0,
        visitados: 0,
        total: 0,
      },
    },
    hoyBogotaKey: HOY,
    cobradorId: 'cobrador-1',
    // Se pasa a propósito: sin esto el helper va a `prestamosService` a buscar
    // cuotas, o sea a la red, y la prueba dejaría de ser una prueba.
    getCuotasByPrestamoId: async () => [],
    pagos,
  })

describe('buildRutaHoyOperativa', () => {
  it('convierte cada obligación en una visita con los datos del cliente', async () => {
    const { kpiItems } = await correr([obligacion()])

    expect(kpiItems).toHaveLength(1)
    expect(kpiItems[0]).toMatchObject({
      clienteId: 'cliente-1',
      prestamoId: 'prestamo-1',
    })
    // El nombre se arma de `nombres` + `apellidos` y se guarda en `cliente` como
    // texto. Leer mal esa relación es lo que ya dejó el cobrador en blanco en
    // otras pantallas.
    expect(String(kpiItems[0].cliente || '')).toContain('Ana')
  })

  it('descarta las obligaciones reprogramadas', async () => {
    // La reprogramación se acordó para otro día: cobrarla hoy sería cobrar dos
    // veces. El filtro mira cuatro campos porque el estado llega en cualquiera.
    const { kpiItems } = await correr([
      obligacion({ id: 'obl-1', estadoGestion: 'REPROGRAMADA' }),
      obligacion({ id: 'obl-2', prestamoId: 'p-2', estadoVisita: 'REPROGRAMADO' }),
      obligacion({
        id: 'obl-3',
        prestamoId: 'p-3',
        estadoGestion: undefined,
        prestamo: { id: 'p-3', estadoGestion: 'REPROGRAMADA' },
      }),
      obligacion({ id: 'obl-4', prestamoId: 'p-4' }),
    ])

    expect(kpiItems.map((v) => v.prestamoId)).toEqual(['p-4'])
  })

  it('deja fuera del KPI la visita sin cuota, sin meta y sin pago', async () => {
    // Una obligación que no pide nada ni recibió nada no es trabajo del día.
    const { kpiItems } = await correr([
      obligacion({
        montoCuotaNormal: 0,
        montoMetaOperativaPendiente: 0,
        recaudadoDelDia: 0,
        estadoGestion: 'PENDIENTE',
      }),
    ])

    expect(kpiItems).toHaveLength(0)
  })

  it('mantiene en el KPI al que abonó, aunque ya no deba nada hoy', async () => {
    // Esta es la condición que la copia de VistaCobrador se había perdido: sin
    // ella, un cliente que abonó parcialmente desaparecía de la lista del
    // cobrador y seguía en la del supervisor.
    const { kpiItems } = await correr([
      obligacion({
        montoCuotaNormal: 0,
        montoMetaOperativaPendiente: 0,
        recaudadoDelDia: 5_000,
        estadoGestion: 'ABONO',
      }),
    ])

    expect(kpiItems).toHaveLength(1)
  })

  it('mantiene en el KPI al que tiene cuota fijada sin meta pendiente', async () => {
    // La otra condición que faltaba en la copia: `cuotaNormal > 0`.
    const { kpiItems } = await correr([
      obligacion({
        montoCuotaNormal: 10_000,
        montoMetaOperativaPendiente: 0,
        recaudadoDelDia: 0,
        estadoGestion: 'PENDIENTE',
      }),
    ])

    expect(kpiItems).toHaveLength(1)
  })

  it('suma la meta y el recaudo del día sobre las visitas del KPI', async () => {
    const { stats } = await correr([
      obligacion({ id: 'a', prestamoId: 'p-a', montoCuotaNormal: 10_000, recaudadoDelDia: 4_000 }),
      obligacion({ id: 'b', prestamoId: 'p-b', montoCuotaNormal: 20_000, recaudadoDelDia: 0 }),
    ])

    expect(stats.recaudo).toBe(4_000)
    expect(stats.meta).toBeGreaterThan(0)
    // La eficiencia es el recaudo contra la meta, nunca negativa ni infinita.
    expect(stats.eficiencia).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(stats.eficiencia)).toBe(true)
  })

  it('la lista visible nunca es mayor que la del KPI', async () => {
    // `visibleItems` es `kpiItems` con un filtro más encima. Si esta relación se
    // invierte, alguna pantalla está mostrando algo que el KPI no contó.
    const { kpiItems, visibleItems } = await correr([
      obligacion({ id: 'a', prestamoId: 'p-a' }),
      obligacion({ id: 'b', prestamoId: 'p-b', recaudadoDelDia: 9_000, estadoGestion: 'PAGO' }),
    ])

    expect(visibleItems.length).toBeLessThanOrEqual(kpiItems.length)
    for (const visible of visibleItems) {
      expect(kpiItems.some((k) => k.id === visible.id)).toBe(true)
    }
  })

  it('no revienta con una jornada vacía', async () => {
    const { kpiItems, visibleItems, stats } = await correr([])

    expect(kpiItems).toEqual([])
    expect(visibleItems).toEqual([])
    expect(stats.recaudo).toBe(0)
    expect(Number.isFinite(stats.eficiencia)).toBe(true)
  })

  it('tolera una obligación sin préstamo ni cliente cargados', async () => {
    // Pasa de verdad: el listado y el detalle devuelven formas distintas, y el
    // helper corre con lo que llegue. Que no reviente es el comportamiento.
    const { kpiItems } = await correr([
      {
        id: 'obl-pelada',
        prestamoId: 'p-x',
        montoCuotaNormal: 10_000,
        montoMetaOperativaPendiente: 10_000,
        recaudadoDelDia: 0,
      },
    ])

    expect(kpiItems).toHaveLength(1)
    expect(kpiItems[0].prestamoId).toBe('p-x')
  })
  it('cuenta como recaudo del día los pagos de hoy, y no los de ayer', async () => {
    // El recaudo no lo trae la obligación: se cruza con los pagos por prestamoId y
    // se suma solo lo fechado hoy. Un pago de ayer sumado aquí infla la eficiencia
    // del cobrador y descuadra el cierre.
    const { kpiItems, stats } = await correr(
      [
        obligacion({ id: 'a', prestamoId: 'p-a' }),
        obligacion({ id: 'b', prestamoId: 'p-b' }),
      ],
      [
        { prestamoId: 'p-a', montoTotal: 7_000, fechaPago: `${HOY}T14:00:00-05:00` },
        { prestamoId: 'p-b', montoTotal: 99_000, fechaPago: '2026-03-11T14:00:00-05:00' },
      ],
    )

    expect(stats.recaudo).toBe(7_000)

    const visitaA = kpiItems.find((v) => v.prestamoId === 'p-a')
    const visitaB = kpiItems.find((v) => v.prestamoId === 'p-b')
    expect(Number(visitaA?.recaudadoDelDia || 0)).toBe(7_000)
    expect(Number(visitaB?.recaudadoDelDia || 0)).toBe(0)
  })

  it('un pago sin prestamoId no se le suma a nadie', async () => {
    const { stats } = await correr(
      [obligacion({ id: 'a', prestamoId: 'p-a' })],
      [{ montoTotal: 50_000, fechaPago: `${HOY}T10:00:00-05:00` }],
    )

    expect(stats.recaudo).toBe(0)
  })
})
