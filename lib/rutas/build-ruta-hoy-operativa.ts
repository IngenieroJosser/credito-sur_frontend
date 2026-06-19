import { getBogotaDateKey } from '@/lib/rutas-core'
import { resolveRutaDailySummary, shouldShowVisitaEnRutaHoy, shouldExcludeVisitaFromOperationalMeta, resolveCuotaIdFromVisitaLike, resolveFechaEfectivaCuota, computeDiasMoraFromCuotaObjetivo } from '@/lib/rutas-core'
import { resolveNivelRiesgoVisita } from '@/lib/rutas/resolve-riesgo-visita'
import { enrichVisitasConCuotasYRiesgo } from '@/lib/rutas/enrich-visitas-con-cuotas-y-riesgo'
import { applyRecaudoHoyToVisitas, buildRecaudosHoyMapByPrestamoId, indexPagosByPrestamoId } from '@/lib/ruta-recaudos'
import { memoizePromiseByKey } from '@/lib/async-utils'
import { prestamosService } from '@/services/prestamos-service'
import { pagosService } from '@/services/pagos-service'

export type RutaHoyOperativaResult = {
  kpiItems: any[]
  visibleItems: any[]
  stats: {
    meta: number
    recaudo: number
    pendiente: number
    eficiencia: number
  }
}

export type BuildRutaHoyOperativaParams = {
  ruta: any
  dailyVisits: any
  hoyBogotaKey: string
  cobradorId: string
  getCuotasByPrestamoId?: (prestamoId: string) => Promise<any[]>
  pagos?: any[]
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
  const obligacionesJornada = (dailySummary.obligaciones || []).filter((o: any) => {
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
  const visitasOperativas = obligacionesJornada.map((o: any, idx: number) => {
    const clienteObj = typeof o.cliente === 'object' && o.cliente ? o.cliente : null
    const prestamo = o.prestamo || {}

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

    const cuotaObjetivo = o.cuotaObjetivo || prestamo?.cuotaObjetivo || prestamo?.proximaCuota || {}

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

    const estadoVisual: any = estadoGestion.includes('REPROGRAM')
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
        o.saldoTotal ??
        o.saldoPendiente ??
        prestamo?.saldoTotal ??
        prestamo?.saldoPendiente ??
        0,
      ),

      estado: estadoVisual,

      estadoGestion,
      estadoVisita: o.estadoVisita || prestamo?.estadoVisita || null,
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

      cobradorId: ruta.cobradorId,
      periodoRuta: frecuenciaPago === 'DIARIO' ? 'DIA' : frecuenciaPago === 'SEMANAL' ? 'SEMANA' : frecuenciaPago === 'QUINCENAL' ? 'QUINCENA' : 'MES',

      clienteId: o.clienteId || clienteObj?.id || '',
      prestamoId: o.prestamoId || prestamo?.id || '',
      diasMora,
      nivelRiesgoObligacion: o?.nivelRiesgoObligacion ?? o?.prestamo?.nivelRiesgoObligacion ?? prestamo?.nivelRiesgoObligacion,
      nivelRiesgoCredito: o?.nivelRiesgoCredito ?? o?.prestamo?.nivelRiesgoCredito ?? prestamo?.nivelRiesgoCredito,
      riesgoCredito: o?.riesgoCredito ?? o?.prestamo?.riesgoCredito ?? prestamo?.riesgoCredito,
      riesgoOperativo: o?.riesgoOperativo ?? o?.prestamo?.riesgoOperativo ?? prestamo?.riesgoOperativo,
      nivelRiesgoBackend: o?.nivelRiesgoBackend ?? o?.cliente?.nivelRiesgo ?? clienteObj?.nivelRiesgo,
      prestamoRaw: prestamo,
    }

    return {
      ...visitaBase,
      nivelRiesgo: resolveNivelRiesgoVisita(visitaBase, prestamo, cuotaObjetivo),
    }
  })

  // 3. Enriquecer con cuotas vivas
  const getCuotasFn = getCuotasByPrestamoId || memoizePromiseByKey(
    (prestamoId) => prestamosService.obtenerCuotas(prestamoId) as Promise<any[]>,
    () => [],
  )

  const visitasOperativasVivas = await enrichVisitasConCuotasYRiesgo({
    visitas: visitasOperativas,
    hoyBogotaKey,
    getCuotasByPrestamoId: getCuotasFn,
    concurrency: 6,
  })

  // 4. Aplicar pagos por prestamoId
  let visitasOperativasConPagos = visitasOperativasVivas as any[]

  const pagosData = pagosParam || []
  if (pagosData.length > 0) {
    const recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(
      pagosData as any,
      hoyBogotaKey,
      { includeCierrePendiente: false },
    )

    const { ultimoPagoDateByPrestamoId } = indexPagosByPrestamoId(pagosData as any)

    visitasOperativasConPagos = applyRecaudoHoyToVisitas(
      visitasOperativasVivas.map((v: any) => ({
        ...v,
        recaudadoDelDia: 0,
        recaudadoTotalClient: 0,
        recaudadoPeriodo: 0,
      })) as any,
      {
        hoyBogotaKey,
        recaudosHoyMap,
      },
    ).map((v: any) => {
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
    .filter((v: any) => {
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
    .filter((v: any) => !shouldExcludeVisitaFromOperationalMeta(v))

  // 6. Construir lista visible
  const visibleItems = kpiItems
    .filter((v: any) => shouldShowVisitaEnRutaHoy(v, hoyBogotaKey))

  // 7. Calcular KPI exacto
  const recaudo = kpiItems.reduce((sum: number, v: any) => {
    return sum + Number(v?.recaudadoDelDia || 0)
  }, 0)

  const meta = kpiItems.reduce((sum: number, v: any) => {
    return sum + Number(v?.montoCuotaNormal ?? v?.montoCuota ?? 0)
  }, 0)

  const pendiente = Math.max(0, meta - recaudo)

  const eficiencia =
    meta > 0
      ? Number(((recaudo / meta) * 100).toFixed(2))
      : recaudo > 0
        ? 100
        : 0

  // Logs de validación
  console.table(kpiItems.map((v: any) => ({
    tipo: 'KPI',
    cliente: v.cliente,
    prestamoId: v.prestamoId,
    cuotaId: v.cuotaId,
    cuotaActual: v.cuotaActual,
    montoCuotaNormal: v.montoCuotaNormal,
    montoCuotaPendiente: v.montoCuotaPendiente,
    recaudadoDelDia: v.recaudadoDelDia,
    estado: v.estado,
  })))

  console.table(visibleItems.map((v: any) => ({
    tipo: 'VISIBLE',
    cliente: v.cliente,
    prestamoId: v.prestamoId,
    cuotaId: v.cuotaId,
    montoCuotaNormal: v.montoCuotaNormal,
    recaudadoDelDia: v.recaudadoDelDia,
    estado: v.estado,
  })))

  return {
    kpiItems,
    visibleItems,
    stats: {
      meta,
      recaudo,
      pendiente,
      eficiencia,
    },
  }
}
