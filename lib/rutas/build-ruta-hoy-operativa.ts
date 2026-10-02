import type { Pago, PrestamoParcial } from '@/types/domain'
import type { DailyVisitsResponse } from '@/services/rutas-service'
import type { CuotaOperativa, VisitaRuta } from '@/lib/types/cobranza'
import type { Cuota } from '@/services/prestamos-service'
import {
  resolveRutaDailySummary,
  shouldShowVisitaEnRutaHoy,
  shouldExcludeVisitaFromOperationalMeta,
  resolveCuotaIdFromVisitaLike,
  resolveFechaEfectivaCuota,
  computeDiasMoraFromCuotaObjetivo,
} from '@/lib/rutas-core'
import { resolveNivelRiesgoVisita } from '@/lib/rutas/resolve-riesgo-visita'
import { enrichVisitasConCuotasYRiesgo } from '@/lib/rutas/enrich-visitas-con-cuotas-y-riesgo'
import {
  applyRecaudoHoyToVisitas,
  buildRecaudosHoyMapByPrestamoId,
  indexPagosByPrestamoId,
} from '@/lib/ruta-recaudos'
import { memoizePromiseByKey } from '@/lib/async-utils'
import { prestamosService } from '@/services/prestamos-service'
import { frecuenciaToPeriodoRuta } from '@/lib/rutas-core'

export type RutaHoyOperativaResult = {
  kpiItems: VisitaRuta[]
  visibleItems: VisitaRuta[]
  /**
   * Las visitas ya mapeadas, enriquecidas con cuotas vivas y cruzadas con los
   * pagos, ANTES de los filtros de KPI.
   *
   * Se expone porque VistaCobrador necesita ese punto intermedio para armar sus
   * propias listas (`visitasBase`, el selector y el orden), y por no tenerlo se
   * habia quedado con una copia entera del calculo que ya se separo de este.
   * Devolverlo es aditivo: los otros consumidores siguen leyendo kpiItems y
   * visibleItems sin cambiar nada.
   */
  visitasConPagos: VisitaRuta[]
  stats: {
    meta: number
    recaudo: number
    pendiente: number
    eficiencia: number
  }
}

export type BuildRutaHoyOperativaParams = {
  // Los tres tipos ya existen y son los que `resolveRutaDailySummary` y
  // `computeRecaudadoDelDia` reciben: se reutilizan en vez de `any`. De este helper cuelgan
  // cuatro pantallas, asi que era el `any` con mas alcance de la zona de rutas.
  ruta: Parameters<typeof resolveRutaDailySummary>[0]
  dailyVisits: DailyVisitsResponse | null | undefined
  hoyBogotaKey: string
  cobradorId: string
  getCuotasByPrestamoId?: (prestamoId: string) => Promise<Cuota[]>
  pagos?: Partial<Pago>[]
}

export async function buildRutaHoyOperativa({
  ruta,
  dailyVisits,
  hoyBogotaKey,
  cobradorId,
  getCuotasByPrestamoId,
  pagos: pagosParam,
}: BuildRutaHoyOperativaParams): Promise<RutaHoyOperativaResult> {
  const hoyBogota = hoyBogotaKey

  // 1. Obtener daily summary y filtrar obligaciones
  const dailySummary = resolveRutaDailySummary(ruta, dailyVisits)
  const obligacionesJornada = (dailySummary.obligaciones || []).filter((o) => {
    const estado = String(
      o.estadoGestion ||
        o.estadoVisita ||
        o.prestamo?.estadoGestion ||
        o.prestamo?.estadoVisita ||
        '',
    ).toUpperCase()
    return !estado.includes('REPROGRAM')
  })

  // 2. Convertir obligaciones en formato VisitaRuta
  const visitasOperativas: VisitaRuta[] = obligacionesJornada.map((o, idx) => {
    const clienteObj = typeof o.cliente === 'object' && o.cliente ? o.cliente : null
    // El `|| {}` mete un objeto vacio en la union y el compilador deja de
    // ver los campos. Se anota lo que estas variables contienen.
    const prestamo: PrestamoParcial = o.prestamo || {}

    const clienteNombre =
      o.clienteNombre ||
      clienteObj?.nombre ||
      `${clienteObj?.nombres || ''} ${clienteObj?.apellidos || ''}`.trim() ||
      (typeof o.cliente === 'string' ? o.cliente : '') ||
      'Cliente sin nombre'

    const estadoGestion = String(
      o.estadoGestion ||
        o.estadoVisita ||
        prestamo?.estadoGestion ||
        prestamo?.estadoVisita ||
        'PENDIENTE',
    ).toUpperCase()

    const montoMetaPendiente = Number(
      o.montoMetaOperativaPendiente ??
        prestamo?.montoMetaOperativaPendiente ??
        o.cuotaObjetivo?.saldoExigibleEnFechaOperativa ??
        prestamo?.cuotaObjetivo?.saldoExigibleEnFechaOperativa ??
        0,
    )

    // Anotada porque la cascada mezcla dos formas: la cuota de la obligacion es
    // `CuotaOperativa` y la del prestamo es una proyeccion de `Cuota`. Sin la anotacion el
    // compilador ve la union y deja de encontrar los campos que solo declara la primera.
    const cuotaObjetivo: CuotaOperativa =
      o.cuotaObjetivo || prestamo?.cuotaObjetivo || prestamo?.proximaCuota || {}

    const estadoCuota = String(
      o.cuotaObjetivo?.estadoActual ||
        o.cuotaObjetivo?.estado ||
        cuotaObjetivo?.estadoActual ||
        cuotaObjetivo?.estado ||
        prestamo?.proximaCuota?.estadoActual ||
        prestamo?.proximaCuota?.estado ||
        '',
    ).toUpperCase()

    const estaEnMora =
      Boolean(o.cuotaObjetivo?.enMoraEnFechaOperativa) ||
      Boolean(cuotaObjetivo?.enMoraEnFechaOperativa) ||
      estadoCuota.includes('VENC') ||
      estadoCuota.includes('MORA')

    // Tres palabras, no `any`: el ternario no puede producir otra cosa, y
    // declararlas deja que el compilador avise si alguien agrega una cuarta rama con
    // un valor que las pantallas no sepan pintar.
    const estadoVisual: 'reprogramado' | 'en_mora' | 'pendiente' = estadoGestion.includes(
      'REPROGRAM',
    )
      ? 'reprogramado'
      : estaEnMora
        ? 'en_mora'
        : 'pendiente'

    const cuotaNormal = Number(
      o.montoCuotaNormal ??
        o.cuotaObjetivo?.montoCuota ??
        o.cuotaObjetivo?.montoNominal ??
        cuotaObjetivo?.montoCuota ??
        cuotaObjetivo?.montoNominal ??
        cuotaObjetivo?.monto ??
        prestamo?.proximaCuota?.montoCuota ??
        prestamo?.proximaCuota?.montoNominal ??
        prestamo?.proximaCuota?.monto ??
        prestamo?.valorCuota ??
        prestamo?.montoCuota ??
        0,
    )

    const frecuenciaPago = o.frecuenciaPago || prestamo?.frecuenciaPago || 'DIARIO'
    const diasMora = Number(
      o.diasMora ??
        o.diasMoraOperativos ??
        o.cuotaObjetivo?.diasMora ??
        cuotaObjetivo?.diasMora ??
        computeDiasMoraFromCuotaObjetivo(cuotaObjetivo, hoyBogotaKey, frecuenciaPago) ??
        0,
    )

    const cuotaId = resolveCuotaIdFromVisitaLike(o, prestamo, cuotaObjetivo)

    const visitaBase = {
      ...o,
      // Lo que sigue son campos que el `...o` ya trae, pero con la forma del BACKEND:
      // textos que pueden ser `null`, montos que pueden ser texto (Prisma serializa
      // `Decimal` como string) y contadores que pueden faltar. `VisitaRuta` los declara
      // `string` y `number`, asi que se normalizan aqui, en un solo sitio, en vez de
      // castear la fila entera. No cambia ninguna lectura: todos los consumidores ya los
      // pasaban por `Number(... || 0)` o `String(... || '')`.
      montoMetaOperativaPendiente: Number(o.montoMetaOperativaPendiente ?? 0),
      saldoPendiente: Number(o.saldoPendiente ?? 0),
      // Los dos vienen en el `...o` con la forma del backend —`string | null` la hora, y
      // monto-que-puede-ser-texto el recaudo— y `VisitaRuta` los declara `string` y
      // `number`. Se normalizan aqui, que es donde se conoce el valor por defecto.
      horaSugerida: o.horaSugerida || '08:00 AM',
      recaudadoDelDia: Number(o.recaudadoDelDia ?? 0),

      id: o.id || o.prestamoId || prestamo?.id || `obligacion-${idx}`,
      cuotaId,
      cuotaObjetivoId: cuotaId,
      cuotaObjetivoPrestamoId: cuotaId,
      cuotaObjetivo,
      proximaCuota: cuotaObjetivo,

      cliente: clienteNombre,
      direccion: o.direccion || clienteObj?.direccion || 'Sin dirección',
      telefono: o.telefono || clienteObj?.telefono || '',

      montoCuota: cuotaNormal,
      montoCuotaNormal: cuotaNormal,

      montoCuotaPendiente: montoMetaPendiente,
      montoMoraAcumulada: Number(
        o.montoMoraAcumulada ??
          o.saldoVencidoAcumulado ??
          o.cuotaObjetivo?.montoMoraAcumulada ??
          o.cuotaObjetivo?.saldoVencidoAcumulado ??
          prestamo?.cuotaObjetivo?.montoMoraAcumulada ??
          prestamo?.cuotaObjetivo?.saldoVencidoAcumulado ??
          0,
      ),
      montoVencidoAcumulado: Number(
        o.montoMoraAcumulada ??
          o.saldoVencidoAcumulado ??
          o.cuotaObjetivo?.montoMoraAcumulada ??
          o.cuotaObjetivo?.saldoVencidoAcumulado ??
          prestamo?.cuotaObjetivo?.montoMoraAcumulada ??
          prestamo?.cuotaObjetivo?.saldoVencidoAcumulado ??
          0,
      ),
      saldoVencidoAcumulado: Number(
        o.montoMoraAcumulada ??
          o.saldoVencidoAcumulado ??
          o.cuotaObjetivo?.montoMoraAcumulada ??
          o.cuotaObjetivo?.saldoVencidoAcumulado ??
          prestamo?.cuotaObjetivo?.montoMoraAcumulada ??
          prestamo?.cuotaObjetivo?.saldoVencidoAcumulado ??
          0,
      ),
      cuotasVencidas: Math.max(
        Number(
          o.cuotasVencidas ??
            o.cuotaObjetivo?.cuotasVencidas ??
            prestamo?.cuotaObjetivo?.cuotasVencidas ??
            0,
        ),
        estadoVisual === 'en_mora' ? 1 : 0,
      ),

      saldoTotal: Number(
        o.saldoTotal ?? o.saldoPendiente ?? prestamo?.saldoTotal ?? prestamo?.saldoPendiente ?? 0,
      ),

      estado: estadoVisual,

      estadoGestion,
      // `?? undefined` y no `|| null`: `VisitaRuta.estadoVisita` es `string | undefined`,
      // y el `null` de la fila del backend no le cabe. Se lee igual con `||` en todos los
      // consumidores.
      estadoVisita: o.estadoVisita || prestamo?.estadoVisita || undefined,
      notasVisita: o.notasVisita || prestamo?.notasVisita || null,

      proximaVisita:
        resolveFechaEfectivaCuota(cuotaObjetivo) ||
        cuotaObjetivo?.fechaVencimiento ||
        prestamo?.proximaCuota?.fechaVencimiento ||
        o.proximaVisita ||
        o.fechaVisita ||
        hoyBogotaKey,

      ordenVisita: Number(o.ordenVisita || idx + 1),
      prioridad: o.prioridad || 'media',

      cobradorId: ruta?.cobradorId || cobradorId,
      periodoRuta: frecuenciaToPeriodoRuta(frecuenciaPago),

      clienteId: o.clienteId || clienteObj?.id || '',
      prestamoId: o.prestamoId || prestamo?.id || '',
      diasMora,
      // Las cinco cascadas cierran con `?? undefined` porque el ultimo eslabon sale de
      // `PrestamoParcial`, que los declara `string | null`, y `VisitaRuta` los quiere
      // `string | undefined`. Con `any` las dos cosas eran iguales.
      nivelRiesgoObligacion:
        o?.nivelRiesgoObligacion ??
        o?.prestamo?.nivelRiesgoObligacion ??
        prestamo?.nivelRiesgoObligacion ??
        undefined,
      nivelRiesgoCredito:
        o?.nivelRiesgoCredito ??
        o?.prestamo?.nivelRiesgoCredito ??
        prestamo?.nivelRiesgoCredito ??
        undefined,
      riesgoCredito:
        o?.riesgoCredito ??
        o?.prestamo?.riesgoCredito ??
        prestamo?.riesgoCredito ??
        undefined,
      riesgoOperativo:
        o?.riesgoOperativo ??
        o?.prestamo?.riesgoOperativo ??
        prestamo?.riesgoOperativo ??
        undefined,
      nivelRiesgoBackend: o?.nivelRiesgoBackend ?? clienteObj?.nivelRiesgo ?? undefined,
      prestamoRaw: prestamo,
    }

    return {
      ...visitaBase,
      nivelRiesgo: resolveNivelRiesgoVisita(visitaBase, prestamo, cuotaObjetivo),
    }
  })

  // 3. Enriquecer con cuotas vivas
  // Sin el `as Promise<unknown[]>` que llevaba: `obtenerCuotas` ya declara
  // `Promise<Cuota[]>`, asi que ese cast no agregaba informacion, la tiraba.
  const getCuotasFn =
    getCuotasByPrestamoId ||
    memoizePromiseByKey(
      (prestamoId) => prestamosService.obtenerCuotas(prestamoId),
      () => [],
    )

  const visitasOperativasVivas = await enrichVisitasConCuotasYRiesgo({
    visitas: visitasOperativas,
    hoyBogotaKey,
    getCuotasByPrestamoId: getCuotasFn,
    concurrency: 6,
  })

  // 4. Aplicar pagos por prestamoId
  let visitasOperativasConPagos = visitasOperativasVivas

  const pagosData = pagosParam || []
  if (pagosData.length > 0) {
    const recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(pagosData, hoyBogotaKey, {
      includeCierrePendiente: false,
    })

    const { ultimoPagoDateByPrestamoId } = indexPagosByPrestamoId(pagosData)

    visitasOperativasConPagos = applyRecaudoHoyToVisitas(
      visitasOperativasVivas.map((v) => ({
        ...v,
        recaudadoDelDia: 0,
        recaudadoTotalClient: 0,
        recaudadoPeriodo: 0,
      })),
      {
        hoyBogotaKey,
        recaudosHoyMap,
      },
    ).map((v) => {
      const pid = String(v?.prestamoId || '')
      return {
        ...v,
        fechaUltimoPago: pid
          ? Number(ultimoPagoDateByPrestamoId[pid] || 0)
          : Number(v?.fechaUltimoPago || 0),
      }
    })
  }

  // 5. Construir lista completa para KPI
  const kpiItems = visitasOperativasConPagos
    .filter((v) => {
      const recaudado = Number(v?.recaudadoDelDia || 0)
      const cuotaNormal = Number(v?.montoCuotaNormal ?? v?.montoCuota ?? 0)
      const metaPendiente = Number(v?.montoCuotaPendiente || 0)
      const estadoGestion = String(v?.estadoGestion || '').toUpperCase()

      return (
        cuotaNormal > 0 ||
        metaPendiente > 0 ||
        recaudado > 0 ||
        estadoGestion.includes('PAGO') ||
        estadoGestion.includes('ABONO')
      )
    })
    .filter((v) => !shouldExcludeVisitaFromOperationalMeta(v))

  // 6. Construir lista visible
  const visibleItems = kpiItems.filter((v) => shouldShowVisitaEnRutaHoy(v, hoyBogotaKey))

  // 7. Calcular KPI exacto
  const recaudo = kpiItems.reduce((sum: number, v) => {
    return sum + Number(v?.recaudadoDelDia || 0)
  }, 0)

  const meta = kpiItems.reduce((sum: number, v) => {
    return sum + Number(v?.montoCuotaNormal ?? v?.montoCuota ?? 0)
  }, 0)

  const pendiente = Math.max(0, meta - recaudo)

  const eficiencia = meta > 0 ? Number(((recaudo / meta) * 100).toFixed(2)) : recaudo > 0 ? 100 : 0

  // Logs de validación
  console.table(
    kpiItems.map((v) => ({
      tipo: 'KPI',
      cliente: v.cliente,
      prestamoId: v.prestamoId,
      cuotaId: v.cuotaId,
      cuotaActual: v.cuotaActual,
      montoCuotaNormal: v.montoCuotaNormal,
      montoCuotaPendiente: v.montoCuotaPendiente,
      recaudadoDelDia: v.recaudadoDelDia,
      estado: v.estado,
    })),
  )

  console.table(
    visibleItems.map((v) => ({
      tipo: 'VISIBLE',
      cliente: v.cliente,
      prestamoId: v.prestamoId,
      cuotaId: v.cuotaId,
      montoCuotaNormal: v.montoCuotaNormal,
      recaudadoDelDia: v.recaudadoDelDia,
      estado: v.estado,
    })),
  )

  return {
    kpiItems,
    visibleItems,
    visitasConPagos: visitasOperativasConPagos,
    stats: {
      meta,
      recaudo,
      pendiente,
      eficiencia,
    },
  }
}
