/**
 * Mapper compartido para convertir DailyVisitsResponse en VisitaRuta[].
 * Centraliza la normalización de obligaciones operativas para todas las vistas:
 * - Ruta Actual
 * - Historial
 * - Mis clientes
 * - Vista Cobrador
 * - Vista Supervisor
 * - Vista Coordinador
 * - Vista Admin / SuperAdmin cuando entran a rutas
 *
 * Este mapper siempre devuelve:
 * - nivelRiesgo (calculado con resolveRiesgoObligacion)
 * - prioridad
 * - montoCuota
 * - montoCuotaNormal
 * - montoCuotaPendiente
 * - montoMoraAcumulada
 * - montoVencidoAcumulado
 * - saldoVencidoAcumulado
 * - saldoTotal
 * - estado
 * - prestamoId
 * - clienteId
 * - pendienteAprobacion
 * - estadoAprobacion
 * - estadoEfectoProvisional
 * - esProvisional
 * - periodoRuta
 * - cuotaActual
 * - cuotasTotales
 * - cuotaObjetivo
 * - proximaCuota
 */

import { getPagoBogotaDateKey } from '@/lib/rutas-core'
import { mapNivelRiesgo, mapFrecuenciaToPeriodo, type VisitaRuta, type EstadoVisita } from '@/lib/types/cobranza'
import { resolveRiesgoObligacion, resolveMontoVencidoAcumulado } from './riesgo-obligacion'

interface MapDailyVisitsToVisitasParams {
  resp: any
  hoyBogotaKey?: string
  rutaData?: any
  initialRuta?: any
}

export const mapDailyVisitsResponseToVisitas = ({
  resp,
  hoyBogotaKey = getPagoBogotaDateKey(new Date()),
  rutaData,
  initialRuta,
}: MapDailyVisitsToVisitasParams): VisitaRuta[] => {
  const obligaciones = Array.isArray((resp as any)?.obligaciones)
    ? (resp as any).obligaciones
    : []

  const rows = obligaciones.length > 0
    ? obligaciones
    : (Array.isArray((resp as any)?.visitas) ? (resp as any).visitas : [])

  const mapped = rows.map((row: any, idx: number) => {
    const visita = row?.visita || row || {}
    const c = row?.cliente || visita?.cliente || {}
    const p = row?.prestamo || visita?.prestamo || visita?.prestamos?.[0] || {}
    const cuotaObjetivo =
      row?.cuotaObjetivo ||
      p?.cuotaObjetivo ||
      visita?.cuotaObjetivo ||
      p?.proximaCuota ||
      visita?.proximaCuota ||
      null
    const proximaCuota = p?.proximaCuota || cuotaObjetivo
    const montoMetaPendiente = Number(
      row?.montoMetaOperativaPendiente ??
        p?.montoMetaOperativaPendiente ??
        cuotaObjetivo?.saldoExigibleEnFechaOperativa ??
        proximaCuota?.montoNominal ??
        proximaCuota?.monto ??
        0,
    )
    const recaudadoDelDia = Number(
      row?.recaudadoDelDia ??
        p?.recaudadoDelDia ??
        p?.recaudadoHoy ??
        visita?.recaudadoDelDia ??
        0,
    )
    const montoCuotaNormal = Number(
      cuotaObjetivo?.montoNominal ??
        cuotaObjetivo?.montoCuota ??
        cuotaObjetivo?.monto ??
        proximaCuota?.montoNominal ??
        proximaCuota?.monto ??
        montoMetaPendiente,
    )
    const montoCuota = montoMetaPendiente > 0
      ? montoMetaPendiente
      : Math.max(0, montoCuotaNormal - Number(cuotaObjetivo?.montoPagado || 0))
    const fechaEfectiva =
      cuotaObjetivo?.fechaEfectiva ||
      p?.fechaEfectiva ||
      proximaCuota?.fechaEfectiva ||
      proximaCuota?.fechaVencimientoProrroga ||
      proximaCuota?.fechaVencimiento ||
      hoyBogotaKey
    const estadoGestion = String(row?.estadoGestion || p?.estadoGestion || '').toUpperCase()
    const estadoCuota = String(cuotaObjetivo?.estadoActual || cuotaObjetivo?.estado || proximaCuota?.estado || '').toUpperCase()
    const estadoCalculado: EstadoVisita =
      recaudadoDelDia > 0 || estadoGestion === 'PAGO_REGISTRADO' || estadoCuota === 'PAGADA'
        ? 'pagado'
        : cuotaObjetivo?.enMoraEnFechaOperativa || estadoCuota === 'VENCIDA'
          ? 'en_mora'
          : 'pendiente'
    const esArticulo = p?.tipo === 'ARTICULO' || p?.tipoPrestamo === 'ARTICULO'
    const cuotaId = String(
      row?.cuotaObjetivoId ||
        cuotaObjetivo?.id ||
        proximaCuota?.id ||
        visita?.cuotaObjetivoId ||
        '',
    )
    const frecuencia = p?.frecuenciaPago || 'DIARIO'
    const nombreCliente = `${c?.nombres || ''} ${c?.apellidos || ''}`.trim()

    // Calcular monto vencido acumulado (factor dominante para riesgo)
    const montoVencidoAcumulado = resolveMontoVencidoAcumulado({
      row,
      prestamo: p,
      cuotaObjetivo,
      estadoCalculado,
    })

    // Calcular riesgo de obligación/crédito (no del cliente)
    const diasMora = Number(cuotaObjetivo?.diasMora || p?.diasMora || 0)
    const cuotasVencidasVal = Number(row?.cuotasVencidas ?? cuotaObjetivo?.cuotasVencidas ?? 0)
    const esProvisional = Boolean(p?.esProvisional) || String(p?.estadoAprobacion || '').toUpperCase() === 'PENDIENTE'

    // Enriquecer row con montoVencidoAcumulado para que resolveRiesgoObligacion lo use
    const rowEnriquecido = { ...row, montoVencidoAcumulado }

    const nivelObligacion = resolveRiesgoObligacion({
      row: rowEnriquecido,
      prestamo: p,
      cuotaObjetivo,
      estadoCalculado,
      diasMora,
      cuotasVencidas: cuotasVencidasVal,
      esProvisional,
    })

    // Priorizar riesgo de obligación sobre riesgo de cliente
    const nivel = nivelObligacion

    return {
      id: `${visita?.asignacionId || row?.asignacionId || 'daily'}-${p?.id || cuotaId || idx}`,
      cliente: nombreCliente || row?.nombreCliente || 'Cliente',
      direccion: c?.direccion || visita?.direccion || 'Sin dirección registrada',
      telefono: c?.telefono || visita?.telefono || '',
      horaSugerida: '08:00 AM',
      montoCuota,
      montoCuotaNormal,
      montoCuotaPendiente: montoMetaPendiente > 0 ? montoMetaPendiente : montoCuota,
      montoMoraAcumulada: montoVencidoAcumulado,
      montoVencidoAcumulado,
      saldoVencidoAcumulado: montoVencidoAcumulado,
      cuotasVencidas: Number(row?.cuotasVencidas ?? cuotaObjetivo?.cuotasVencidas ?? 0),
      saldoTotal: estadoCalculado === 'pagado' ? 0 : Number(p?.saldoPendiente || 0),
      estado: estadoCalculado,
      estadoVisita: row?.estadoVisita || p?.estadoVisita || visita?.estadoVisita || undefined,
      notasVisita: row?.notasVisita || p?.notasVisita || visita?.notasVisita || undefined,
      proximaVisita: fechaEfectiva,
      targetVencimiento: proximaCuota?.fechaVencimiento || cuotaObjetivo?.fechaVencimiento,
      ordenVisita: Number(visita?.ordenVisita || row?.ordenVisita || idx + 1),
      prioridad: nivel === 'ROJO' || nivel === 'LISTA_NEGRA' ? 'alta' : 'media' as any,
      nivelRiesgo: mapNivelRiesgo(nivel) as any,
      diasMora,
      cobradorId: rutaData?.cobradorId || initialRuta?.cobradorId || '',
      periodoRuta: mapFrecuenciaToPeriodo(frecuencia as any) as any,
      clienteId: c?.id || visita?.clienteId || '',
      prestamoId: p?.id || row?.prestamoId || '',
      tipoPrestamo: esArticulo ? 'ARTICULO' : 'EFECTIVO',
      articuloNombre: esArticulo ? (p?.articulo || p?.producto?.nombre || 'Artículo') : 'Préstamo',
      cuotaActual: Number(cuotaObjetivo?.numeroCuota || proximaCuota?.numeroCuota || 1),
      cuotasTotales: Number(p?.cantidadCuotas || 0),
      cuotaId,
      cuotaObjetivoId: cuotaId,
      cuotaObjetivoPrestamoId: cuotaId,
      cuotaObjetivo,
      proximaCuota,
      pendienteAprobacion: Boolean(p?.esProvisional) || String(p?.estadoAprobacion || '').toUpperCase() === 'PENDIENTE',
      estadoAprobacion: p?.estadoAprobacion || null,
      estadoEfectoProvisional: p?.estadoEfectoProvisional || null,
      esProvisional: Boolean(p?.esProvisional),
      esRevertido: Boolean(p?.esRevertido),
      etiquetaRevision: p?.etiquetaRevision || null,
      enProrroga: String(proximaCuota?.estado || cuotaObjetivo?.estadoActual || '').toUpperCase() === 'PRORROGADA',
      fechaProrroga: proximaCuota?.fechaVencimientoProrroga || cuotaObjetivo?.fechaVencimientoProrroga || null,
      fechaOriginalVencimiento: proximaCuota?.fechaVencimiento || cuotaObjetivo?.fechaVencimiento || null,
      recaudadoDelDia,
    } as VisitaRuta
  })

  const seen = new Set<string>()
  const uniques = mapped.filter((v: any) => {
    const key = String(v?.prestamoId || v?.clienteId || v?.id || '')
    if (!key) return true
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return uniques.sort((a: any, b: any) => {
    if (a.estado === 'pagado' && b.estado !== 'pagado') return 1
    if (a.estado !== 'pagado' && b.estado === 'pagado') return -1
    const ao = Number(a.ordenVisita ?? 0)
    const bo = Number(b.ordenVisita ?? 0)
    if (ao !== bo) return ao - bo
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
}
