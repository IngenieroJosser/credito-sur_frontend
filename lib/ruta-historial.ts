import { isPagoCierrePendiente } from '@/lib/ruta-recaudos'
import { logger } from '@/lib/logger'
import { getPagoBogotaDateKey, shouldExcludeVisitaFromOperationalMeta } from '@/lib/rutas-core'
import { mapNivelRiesgo, type VisitaRuta } from '@/lib/types/cobranza'
import { resolveRiesgoObligacion } from '@/lib/rutas/riesgo-obligacion'

type Resumen = {
  recaudo: number
  recaudoOperativo?: number
  recaudoRegularizado?: number
  recaudoContable?: number
  recaudoEfectivo?: number
  recaudoTransferencia?: number
  recaudoContableEfectivo?: number
  recaudoContableTransferencia?: number
  recaudoRegularizadoEfectivo?: number
  recaudoRegularizadoTransferencia?: number
  meta?: number
  gastos: number
  netoEfectivoRuta?: number
  efectividad: number
  visitados: number
  total: number
  jornadaId?: string | null
  jornadaEstado?: string | null
  jornadaCerradaEn?: string | null
  jornadaRegularizadaEn?: string | null
  jornadaEtiqueta?: string
  jornadaEtiquetaColor?: string
}

export const getHistorialJornadaBadge = (resumen: Partial<Resumen> | undefined) => {
  const estado = String(resumen?.jornadaEstado || '').toUpperCase()
  const visitados = Number(resumen?.visitados || 0)
  const total = Number(resumen?.total || 0)
  const todosGestionados = total > 0 && visitados >= total

  if (estado === 'CERRADA') {
    return { label: 'Completada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  }
  if (estado === 'REGULARIZADA') {
    return { label: 'Regularizada', color: 'bg-blue-100 text-blue-700 border-blue-200' }
  }
  if (estado === 'PENDIENTE_CIERRE') {
    return todosGestionados
      ? { label: 'Lista para cerrar', color: 'bg-amber-100 text-amber-700 border-amber-200' }
      : { label: 'Pendiente de gestión', color: 'bg-orange-100 text-orange-700 border-orange-200' }
  }
  return null
}

export const isPagoForHistorialFecha = (pago: any, fechaClave: string) => {
  if (isPagoCierrePendiente(pago)) {
    return String(pago?.fechaOperativaRuta || '').slice(0, 10) === fechaClave
  }

  const raw = pago?.fechaPago || pago?.creadoEn
  if (!raw) return false
  return getPagoBogotaDateKey(String(raw)) === fechaClave
}

export const normalizeEstadoVisitaHistorial = (raw: any) =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export const isEstadoVisitaGestionadoHistorial = (raw: any) => {
  const estado = normalizeEstadoVisitaHistorial(raw)
  return (
    estado === 'ausente' ||
    estado === 'pagado' ||
    estado === 'pago' ||
    estado === 'pago_registrado' ||
    estado === 'reprogramado' ||
    estado === 'reprogramada' ||
    estado === 'reprogramacion'
  )
}

export const hasGestionHistorial = (visita: any) => {
  return (
    Number(visita?.recaudadoDelDia || 0) > 0 ||
    Number(visita?.recaudadoRegularizadoDespues || 0) > 0 ||
    isEstadoVisitaGestionadoHistorial(visita?.estadoVisita)
  )
}

export const isReprogramadoHistorial = (v: any): boolean => {
  const estado = String(
    v?.estado ||
    v?.estadoVisita ||
    v?.estadoGestion ||
    v?.tipoGestion ||
    ''
  ).toUpperCase()

  return (
    estado.includes('REPROGRAM') ||
    Boolean(v?.fechaReprogramada) ||
    Boolean(v?.nuevaFechaPago) ||
    Boolean(v?.aprobacionReprogramacionId)
  )
}

export const isGestionHistorial = (v: any): boolean => {
  const estado = String(
    v?.estado ||
    v?.estadoVisita ||
    v?.estadoGestion ||
    ''
  ).toUpperCase()

  return (
    Number(v?.recaudadoDelDia || 0) > 0 ||
    Number(v?.montoPagado || 0) > 0 ||
    estado.includes('PAGADO') ||
    estado.includes('ABONO') ||
    estado.includes('AUSENTE') ||
    estado.includes('REPROGRAM') ||
    isReprogramadoHistorial(v)
  )
}

export const normalizeVisitaHistorial = (v: any): any => {
  if (isReprogramadoHistorial(v)) {
    return {
      ...v,
      estado: 'reprogramado',
      estadoVisita: 'reprogramado',
      estadoGestion: 'REPROGRAMADO',
    }
  }

  return v
}

export const buildResumenHistorialCompartido = (visitas: any[], resumenBase?: any) => {
  const normalizadas = (visitas || []).map(normalizeVisitaHistorial)

  const total = normalizadas.length
  const visitados = normalizadas.filter(isGestionHistorial).length
  const recaudo = normalizadas.reduce(
    (sum, v) => sum + Number(v?.recaudadoDelDia || v?.montoTotal || 0),
    0,
  )

  const esperado = normalizadas.reduce(
    (sum, v) => sum + Number(v?.montoCuotaPendiente ?? v?.montoCuota ?? 0),
    0,
  )

  return {
    ...(resumenBase || {}),
    recaudo,
    total,
    visitados,
    efectividad: esperado > 0 ? Number(((recaudo / esperado) * 100).toFixed(1)) : 0,
  }
}

export function computeHistorialResumenCompartido(visitas: any[], resumenBase?: any) {
  const normalizadas = (visitas || []).map(normalizeVisitaHistorial)

  // Filtrar visitas que deben excluirse de la meta operativa (ausentes, etc.)
  const visitasOperativas = normalizadas.filter((v: any) => {
    try {
      return !shouldExcludeVisitaFromOperationalMeta(v)
    } catch {
      return true
    }
  })

  const total = visitasOperativas.length

  const visitados = visitasOperativas.filter((v: any) => {
    const estado = String(
      v?.estadoGestion ||
        v?.estadoVisita ||
        v?.estado ||
        ''
    ).toLowerCase()

    const aprobacionEstado = String(
      v?.aprobacionEstado ||
        v?.estadoAprobacion ||
        v?.efectoProvisionalEstado ||
        ''
    ).toLowerCase()

    if (estado.includes('reprogram')) {
      return !aprobacionEstado.includes('rechaz')
    }

    return hasGestionHistorial(v)
  }).length

  const recaudo = visitasOperativas.reduce(
    (sum, v) => sum + Number(v?.recaudadoDelDia || v?.montoTotal || 0),
    0,
  )

  // Usar montoCuotaNormal (meta operativa) en lugar de montoCuotaPendiente
  const esperado = visitasOperativas.reduce(
    (sum, v) => sum + Number(v?.montoCuotaNormal ?? v?.montoCuota ?? 0),
    0,
  )

  return {
    ...(resumenBase || {}),
    total,
    visitados,
    recaudo,
    efectividad:
      esperado > 0
        ? Number(((recaudo / esperado) * 100).toFixed(2))
        : recaudo > 0
          ? 100
          : 0,
  }
}

export const isVisitadoHistorial = (visita: any) => {
  return hasGestionHistorial(visita) || isGestionHistorial(visita) || String(visita?.estado || '').toLowerCase() === 'pagado'
}

const normalizeNivelRiesgo = (raw: any): any => {
  return mapNivelRiesgo(raw)
}

const resolveEstadoHistorialFromGestion = (estadoGestion: any, cuotaObjetivo: any, recaudado: number) => {
  const estado = String(estadoGestion || '').toUpperCase()
  if (estado === 'PAGO_REGISTRADO') return 'pagado'
  if (estado === 'AUSENTE') return 'ausente'
  if (estado === 'REPROGRAMADO') return 'reprogramado'

  const cuotaEstado = String(cuotaObjetivo?.estadoActual || cuotaObjetivo?.estado || '').toUpperCase()
  if (cuotaEstado === 'VENCIDA' || cuotaEstado === 'ATRASADA') return 'en_mora'
  if (recaudado > 0) return 'pagado'
  return 'pendiente'
}

export const applyPagosDelDiaToHistorialVisitas = (params: {
  fechaClave: string
  visitas: VisitaRuta[]
  pagosDelDia: any[]
}) => {
  const { fechaClave, visitas, pagosDelDia } = params
  const pagosOperativos = (Array.isArray(pagosDelDia) ? pagosDelDia : [])
    .filter((p: any) => !isPagoCierrePendiente(p))
  const recaudadoPorPrestamo: Record<string, number> = {}
  const pagosPorKey = new Map<string, { pago: any; total: number; index: number }>()

  pagosOperativos.forEach((p: any, index: number) => {
    const monto = Number(p?.montoTotal ?? p?.monto ?? p?.valor ?? 0)
    if (!(monto > 0)) return

    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    if (pid) recaudadoPorPrestamo[pid] = (recaudadoPorPrestamo[pid] || 0) + monto

    const key = pid ? `loan-${pid}` : ''
    if (!key) return
    const prev = pagosPorKey.get(key)
    if (prev) {
      prev.total += monto
    } else {
      pagosPorKey.set(key, { pago: p, total: monto, index })
    }
  })

  const existentes = new Set<string>()
  const visitasActualizadas = (Array.isArray(visitas) ? visitas : []).map((v: any) => {
    const pid = String(v?.prestamoId || '')
    if (pid) existentes.add(`loan-${pid}`)

    const recPago = pid ? Number(recaudadoPorPrestamo[pid] || 0) : 0
    const recActual = Number(v?.recaudadoDelDia || 0)
    const recaudadoDelDia = Math.max(recActual, recPago)

    return {
      ...v,
      recaudadoDelDia,
      estado: recaudadoDelDia > 0 && String(v?.estado || '').toLowerCase() !== 'en_mora'
        ? 'pagado'
        : v?.estado,
    } as VisitaRuta
  })

  const sinteticos: VisitaRuta[] = Array.from(pagosPorKey.entries()).flatMap(([key, item]) => {
    if (existentes.has(key)) return []
    const p = item.pago
    const cid = p?.clienteId || p?.cliente?.id
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    return [{
      id: `pago-${p?.id || item.index}-${fechaClave}`,
      cliente: p?.cliente ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim() : 'Cliente',
      direccion: p?.cliente?.direccion || '',
      telefono: p?.cliente?.telefono || '',
      horaSugerida: '08:00 AM',
      montoCuota: item.total,
      saldoTotal: 0,
      estado: 'pagado',
      proximaVisita: fechaClave,
      ordenVisita: visitasActualizadas.length + item.index + 1,
      prioridad: 'media',
      nivelRiesgo: normalizeNivelRiesgo(p?.cliente?.nivelRiesgo),
      cobradorId: p?.cobradorId || '',
      periodoRuta: 'DIA',
      clienteId: cid,
      prestamoId: pid,
      cuotaActual: p?.detalle?.cuota?.numeroCuota || p?.detalles?.[0]?.cuota?.numeroCuota,
      cuotasTotales: p?.prestamo?.cantidadCuotas,
      recaudadoDelDia: item.total,
    } as any]
  })

  const finalVisitas = [...visitasActualizadas, ...sinteticos]

  // Ocultar saldados (pagado y saldo <= 0) que NO tuvieron gestión real en este día.
  const filteredVisitas = finalVisitas.filter((v: any) => {
    const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;
    return !(isSaldado && !hasGestionHistorial(v));
  });

  const recaudo = filteredVisitas.reduce((sum: number, v: any) => sum + Number(v?.recaudadoDelDia || 0), 0)
  const visitados = filteredVisitas.filter(isVisitadoHistorial).length

  return { visitas: filteredVisitas, recaudo, visitados }
}

// Construye la información de un día del historial (visitas + resumen) a partir de:
// - `visitasResp`: respuesta del backend de `rutasService.obtenerVisitasDelDia(rutaId, fechaClave)`
// - `saldo`: respuesta del backend de `obtenerSaldoDisponibleRuta(rutaId, fechaClave)`
// - `pagosDelDia`: pagos de esa jornada. Los normales entran por fecha de pago; los regularizados
//   por `fechaOperativaRuta`, porque se registran después pero pertenecen a una jornada pasada.
//
// Importante:
// - Este helper NO recalcula la lógica completa de la ruta del día (mora/cuota acumulada/etc.).
//   Para fechas distintas de hoy, la fuente de verdad principal es lo que devuelva el backend.
// - Si el backend no provee `item.estado`/`item.montoCuota`, se usa un fallback mínimo
//   basado en `recaudadoDelDia` y si existe alguna cuota vencida.
// - Se agregan "visitas sintéticas" para pagos de clientes que no estén presentes en la ruta
//   del día devuelta por el backend, para que el historial refleje correctamente el recaudo.
export const buildHistorialDiaFromBackend = (params: {
  fechaClave: string
  visitasResp: any
  saldo: any
  pagosDelDia: any[]
}) => {
  const { fechaClave, visitasResp, saldo, pagosDelDia } = params
  const pagos = Array.isArray(pagosDelDia) ? pagosDelDia : []
  const pagosOperativos = pagos.filter((p: any) => !isPagoCierrePendiente(p))
  const pagosRegularizados = pagos.filter((p: any) =>
    isPagoCierrePendiente(p) && String(p?.fechaOperativaRuta || '').slice(0, 10) === fechaClave
  )

  // 1) Índice de pagos por obligación (prestamoId + cuotaId) para evitar contaminación entre créditos del mismo cliente.
  // El recaudo histórico debe salir ÚNICAMENTE de pagosDelDia, indexado por prestamoId y opcionalmente prestamoId:cuotaId.
  const getPagoPrestamoId = (p: any) => String(p?.prestamoId || p?.prestamo?.id || '').trim()
  const getPagoCuotaId = (p: any) => String(p?.cuotaId || p?.cuota?.id || '').trim()

  const pagosByPrestamo = new Map<string, number>()
  const pagosByPrestamoCuota = new Map<string, number>()

  for (const p of pagosOperativos) {
    const prestamoId = getPagoPrestamoId(p)
    const cuotaId = getPagoCuotaId(p)
    const monto = Number(p?.montoTotal ?? p?.monto ?? p?.valor ?? 0)

    if (!prestamoId || monto <= 0) continue

    pagosByPrestamo.set(
      prestamoId,
      (pagosByPrestamo.get(prestamoId) || 0) + monto,
    )

    if (cuotaId) {
      pagosByPrestamoCuota.set(
        `${prestamoId}:${cuotaId}`,
        (pagosByPrestamoCuota.get(`${prestamoId}:${cuotaId}`) || 0) + monto,
      )
    }
  }

  const regularizadoPorCliente: Record<string, number> = {}
  const regularizadoPorPrestamo: Record<string, number> = {}
  for (const p of pagosRegularizados) {
    const monto = Number(p?.montoTotal || 0)
    if (!(monto > 0)) continue
    const cid = String(p?.clienteId || p?.cliente?.id || '')
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    if (cid) regularizadoPorCliente[cid] = (regularizadoPorCliente[cid] || 0) + monto
    if (pid) regularizadoPorPrestamo[pid] = (regularizadoPorPrestamo[pid] || 0) + monto
  }

  // 2) Mantener track de "visitas" ya creadas para evitar sintéticos duplicados.
  //    Usamos llave por préstamo cuando exista; si no, por cliente.
  const existentes = new Set<string>()

  const normalizePeriodoRuta = (raw: any): any => {
    const v = String(raw || '').toUpperCase()
    if (v === 'DIARIO' || v === 'DIA') return 'DIA'
    if (v === 'SEMANAL' || v === 'SEMANA') return 'SEMANA'
    if (v === 'QUINCENAL' || v === 'QUINCENA') return 'QUINCENA'
    if (v === 'MENSUAL' || v === 'MES') return 'MES'
    return 'DIA'
  }

  const obligacionesRaw = Array.isArray((visitasResp as any)?.obligaciones)
    ? (visitasResp as any).obligaciones
    : []

  // LOGS DE AUDITORÍA: Ver qué devuelve el backend
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`[buildHistorialDiaFromBackend] Fecha: ${fechaClave}`)
    logger.log(`[buildHistorialDiaFromBackend] Obligaciones: ${obligacionesRaw.length}`)
    logger.log(`[buildHistorialDiaFromBackend] Visitas: ${Array.isArray((visitasResp as any)?.visitas) ? (visitasResp as any).visitas.length : 0}`)
    console.table((pagosOperativos || []).map((p: any) => ({
      tipo: 'PAGO_HISTORIAL',
      id: p.id,
      clienteId: p.clienteId,
      prestamoId: p.prestamoId,
      cuotaId: p.cuotaId,
      montoTotal: p.montoTotal,
      fechaPago: p.fechaPago || p.creadoEn,
    })))
  }

  const visitasDesdeObligaciones: VisitaRuta[] = obligacionesRaw.map((item: any, index: number) => {
    const cliente = item?.cliente || item?.visita?.cliente || {}
    const prestamo = item?.prestamo || {}
    const cuotaObjetivo = item?.cuotaObjetivo || prestamo?.cuotaObjetivo || null
    const prestamoId = String(item?.prestamoId || prestamo?.id || '')
    const clienteId = String(cliente?.id || item?.clienteId || '')
    const cuotaId = String(cuotaObjetivo?.id || item?.cuotaId || '')

    // Cruzar pagos por obligación (prestamoId + cuotaId) o por prestamoId
    const exactKey = cuotaId ? `${prestamoId}:${cuotaId}` : ''
    const recaudadoDelDia =
      // Se prefiere lo que digan los pagos, indexados por obligación para no
      // mezclar créditos del mismo cliente. Pero si para esta obligación no
      // hay ninguno, se conserva lo que el backend ya le atribuyó: cuando la
      // lista de pagos llega vacía, poner cero borraba un recaudo real y la
      // tarjeta aparecía sin cobrar. Es el mayor de los dos, nunca la suma,
      // para no contar dos veces el mismo pago.
      Math.max(
        exactKey && pagosByPrestamoCuota.has(exactKey)
          ? Number(pagosByPrestamoCuota.get(exactKey) || 0)
          : prestamoId
            ? Number(pagosByPrestamo.get(prestamoId) || 0)
            : 0,
        Number(item?.recaudadoDelDia || 0),
      )
    const regularizadoDespues = prestamoId
      ? Number(regularizadoPorPrestamo[prestamoId] || 0)
      : 0
    const montoMetaPendiente = Number(
      item?.montoMetaOperativaPendiente
      ?? prestamo?.montoMetaOperativaPendiente
      ?? cuotaObjetivo?.saldoExigibleEnFechaOperativa
      ?? 0,
    )
    const cuotaNormal = Number(
      cuotaObjetivo?.montoCuotaNormal
      ?? cuotaObjetivo?.montoNominal
      ?? prestamo?.proximaCuota?.montoNominal
      ?? prestamo?.montoCuotaNormal
      ?? cuotaObjetivo?.montoCuota
      ?? cuotaObjetivo?.monto
      ?? prestamo?.proximaCuota?.monto
      ?? prestamo?.montoCuota
      // Último recurso: lo que el backend dejó por cobrar en esa obligación.
      // Una obligación que llega sin cuota objetivo —un crédito recién
      // asignado, por ejemplo— se quedaba con la cuota en cero y la tarjeta
      // salía sin monto, aunque el backend sí había dicho cuánto se le debe.
      ?? montoMetaPendiente
      ?? 0,
    )
    const saldoTotal = Number(
      prestamo?.saldoPendiente
      ?? item?.saldoTotal
      ?? montoMetaPendiente
      ?? 0,
    )
    const keyExist = prestamoId ? `loan-${prestamoId}` : (clienteId ? `client-${clienteId}` : `obl-${index}`)
    existentes.add(keyExist)

    // No confiar en estadoGestion crudo si no hay pago asignado por obligación
    const pagoCompletaCuota = recaudadoDelDia > 0 && cuotaNormal > 0 && recaudadoDelDia >= cuotaNormal
    const estadoBase = resolveEstadoHistorialFromGestion(item?.estadoGestion, cuotaObjetivo, regularizadoDespues) as any
    const estado = pagoCompletaCuota ? 'pagado' : estadoBase

    // Calcular riesgo histórico con datos de la fecha
    const montoVencidoHistorico = Number(
      item?.montoVencidoAcumuladoEnFecha ??
      item?.montoVencidoAcumulado ??
      item?.saldoVencidoAcumulado ??
      item?.montoMoraAcumulada ??
      cuotaObjetivo?.montoVencidoAcumuladoEnFecha ??
      cuotaObjetivo?.saldoVencidoAcumulado ??
      cuotaObjetivo?.montoMoraAcumulada ??
      0,
    )

    const cuotasVencidasHistorico = Number(
      item?.cuotasVencidasEnFecha ??
      item?.cuotasVencidas ??
      cuotaObjetivo?.cuotasVencidasEnFecha ??
      cuotaObjetivo?.cuotasVencidas ??
      0,
    )

    const diasMoraHistorico = Number(
      item?.diasMoraEnFecha ??
      item?.diasMoraOperativos ??
      item?.diasMora ??
      cuotaObjetivo?.diasMoraEnFecha ??
      cuotaObjetivo?.diasMora ??
      0,
    )

    // Usar valores históricos del backend o valores actuales como fallback
    const montoVencidoFinal = montoVencidoHistorico > 0 ? montoVencidoHistorico : Number(item?.montoVencidoAcumulado || item?.saldoVencidoAcumulado || 0)
    const cuotasVencidasFinal = cuotasVencidasHistorico > 0 ? cuotasVencidasHistorico : Number(item?.cuotasVencidas || 0)
    const diasMoraFinal = diasMoraHistorico > 0 ? diasMoraHistorico : Number(item?.diasMora || 0)

    return {
      id: `${item?.asignacionId || `hist-obligacion-${fechaClave}-${index}`}-${prestamoId || clienteId || index}`,
      cliente: `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim() || 'Cliente Sin Nombre',
      direccion: cliente?.direccion || 'Sin dirección',
      telefono: cliente?.telefono || '',
      horaSugerida: '08:00 AM',
      montoCuota: cuotaNormal,
      montoCuotaNormal: cuotaNormal,
      montoMetaOperativaPendiente: montoMetaPendiente,
      saldoTotal,
      estado,
      estadoVisita: item?.estadoVisita || prestamo?.estadoVisita || undefined,
      notasVisita: item?.notasVisita || prestamo?.notasVisita || undefined,
      proximaVisita:
        cuotaObjetivo?.fechaEfectiva ||
        cuotaObjetivo?.fechaVencimiento ||
        prestamo?.proximaCuota?.fechaVencimiento ||
        item?.visita?.proximaVisita ||
        fechaClave,
      ordenVisita: Number(item?.ordenVisita || item?.visita?.ordenVisita || index + 1),
      cobradorId: '',
      periodoRuta: normalizePeriodoRuta(prestamo?.frecuenciaRuta || prestamo?.frecuenciaPago || prestamo?.frecuencia || 'DIA'),
      clienteId,
      prestamoId,
      cuotaActual: cuotaObjetivo?.numeroCuota || prestamo?.proximaCuota?.numeroCuota,
      cuotasTotales: prestamo?.cantidadCuotas,
      tipoPrestamo: String(prestamo?.tipoPrestamo || prestamo?.tipo || '').toUpperCase() === 'ARTICULO' ? 'ARTICULO' : 'EFECTIVO',
      articuloNombre: String(prestamo?.tipoPrestamo || prestamo?.tipo || '').toUpperCase() === 'ARTICULO'
        ? (prestamo?.articulo || prestamo?.descripcionArticulo || 'Artículo')
        : 'Préstamo',
      recaudadoDelDia: recaudadoDelDia,
      recaudadoRegularizadoDespues: regularizadoDespues,
      diasMora: diasMoraFinal,
      cuotasVencidas: cuotasVencidasFinal,
      montoVencidoAcumulado: montoVencidoFinal,
      saldoVencidoAcumulado: montoVencidoFinal,
      montoMoraAcumulada: montoVencidoFinal,
      pendienteAprobacion: Boolean(prestamo?.esProvisional) || String(prestamo?.estadoAprobacion || '').toUpperCase() === 'PENDIENTE',
      esProvisional: Boolean(prestamo?.esProvisional),
      cuotaObjetivo,
    } as any
  })

  // Calcular riesgo de obligación para todas las visitas
  const visitasConRiesgo = visitasDesdeObligaciones.map((visita: any) => {
    const nivelRiesgoRaw = resolveRiesgoObligacion({
      row: visita,
      prestamo: visita.prestamo || {},
      cuotaObjetivo: visita.cuotaObjetivo,
      estadoCalculado: visita.estado,
      diasMora: visita.diasMora,
      cuotasVencidas: visita.cuotasVencidas,
      esProvisional: visita.esProvisional,
    })
    const nivelRiesgo = normalizeNivelRiesgo(nivelRiesgoRaw)
    const prioridad = nivelRiesgoRaw === 'ROJO' || nivelRiesgoRaw === 'LISTA_NEGRA' ? 'alta' : 'media'
    return {
      ...visita,
      nivelRiesgo,
      prioridad,
    }
  })

  // 3) Mapear visitas del backend a `VisitaRuta` (shape que espera el UI).
  //    Nota: aquí NO aplicamos la lógica pesada de mapeo/asignación del día actual.
  //    Para historial, la mayoría de campos se debe respetar del backend si viene.
  const visitas: VisitaRuta[] = visitasConRiesgo.length > 0
    ? visitasConRiesgo
    : ((visitasResp as any)?.visitas || []).flatMap((item: any, index: number) => {
    const cliente = item?.cliente || {}
    const prestamos = Array.isArray(item?.prestamos) ? item.prestamos : []

    // Si no hay préstamos, caer a una sola visita por cliente como antes.
    if (prestamos.length === 0) {
      const recaudadoDelDia = 0 // Sin prestamoId, no aplicar pagos (evitar contaminación por clienteId)
      const regularizadoDespues = 0
      const keyExist = cliente?.id ? `client-${cliente.id}` : `client-idx-${index}`
      existentes.add(keyExist)
      return [
        {
          id: item?.asignacionId || `hist-${fechaClave}-${index}`,
          cliente: `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim() || 'Cliente Sin Nombre',
          direccion: cliente?.direccion || 'Sin dirección',
          telefono: cliente?.telefono || '',
          horaSugerida: '08:00 AM',
          montoCuota: recaudadoDelDia > 0 ? recaudadoDelDia : 0,
          saldoTotal: Number(item?.saldoTotal ?? 0),
          estado: item?.estado || ((recaudadoDelDia > 0 || regularizadoDespues > 0) ? 'pagado' : 'pendiente'),
          // Preservar estadoVisita del backend (ej: 'ausente') para mostrar el badge correcto
          estadoVisita: item?.estadoVisita || undefined,
          proximaVisita: item?.proximaVisita || fechaClave,
          ordenVisita: item?.ordenVisita || index + 1,
          cobradorId: '',
          periodoRuta: 'DIA',
          clienteId: cliente?.id,
          prestamoId: String(item?.prestamoId || ''),
          recaudadoDelDia: recaudadoDelDia,
          recaudadoRegularizadoDespues: regularizadoDespues,
        } as any,
      ]
    }

    const prestamoPreferidoId = String(
      item?.prestamoId
        || (prestamos.find((p: any) => Number(p?.saldoPendiente || 0) > 0)?.id || '')
        || (prestamos[0]?.id || ''),
    )

    const prestamosSeleccionados = prestamoPreferidoId
      ? prestamos.filter((p: any) => String(p?.id || '') === prestamoPreferidoId)
      : prestamos

    const lista = (prestamosSeleccionados.length > 0 ? prestamosSeleccionados : [prestamos[0]]).filter(Boolean)

    return lista.map((p: any, loanIdx: number) => {
      const prestamoId = String(p?.id || prestamoPreferidoId || '')
      const cuotaId = String(p?.cuotaId || p?.cuota?.id || '')

      // Cruzar pagos por obligación (prestamoId + cuotaId) o por prestamoId
      const exactKey = cuotaId ? `${prestamoId}:${cuotaId}` : ''
      const recaudadoDelDia =
        exactKey && pagosByPrestamoCuota.has(exactKey)
          ? Number(pagosByPrestamoCuota.get(exactKey) || 0)
          : prestamoId
            ? Number(pagosByPrestamo.get(prestamoId) || 0)
            : 0
      const regularizadoDespues = prestamoId
        ? Number(regularizadoPorPrestamo[prestamoId] || 0)
        : (cliente?.id ? Number(regularizadoPorCliente[cliente.id] || 0) : 0)

      const proximaCuota = p?.proximaCuota || {}
      const montoCuotaBase = Number(p?.montoCuota ?? proximaCuota?.monto ?? 0)
      const montoGestionado = recaudadoDelDia + regularizadoDespues
      const montoCuotaDisplay = montoGestionado > 0 ? Math.max(montoCuotaBase, montoGestionado) : montoCuotaBase

      const saldoTotal = Number(p?.saldoPendiente ?? 0)
      const proxEstado = String(proximaCuota?.estado || '').toUpperCase()

      let estado: any = item?.estado || 'pendiente'
      if (!item?.estado) {
        if (saldoTotal <= 0) estado = 'pagado'
        else if (proxEstado === 'PAGADA' || proxEstado === 'PAGADO') estado = 'pagado'
        else if (proxEstado === 'VENCIDA' || proxEstado === 'ATRASADA') estado = 'en_mora'
        else if (montoGestionado > 0 && montoGestionado >= montoCuotaBase - 1) estado = 'pagado'
      }

      // Si el backend no reporta estado y no hay pago asociado a este préstamo, no marcarlo como pagado
      // por pagos del cliente de otros préstamos.
      if (!item?.estado && montoGestionado <= 0 && estado === 'pagado') estado = 'pendiente'

      const periodoRuta = normalizePeriodoRuta(p?.frecuenciaRuta || p?.frecuenciaPago || p?.frecuencia || 'DIA')

      const keyExist = prestamoId ? `loan-${prestamoId}` : (cliente?.id ? `client-${cliente.id}` : `client-idx-${index}`)
      existentes.add(keyExist)

      const visitaBase = {
        id: `${item?.asignacionId || `hist-${fechaClave}-${index}`}-${prestamoId || loanIdx}`,
        cliente: `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim() || 'Cliente Sin Nombre',
        direccion: cliente?.direccion || 'Sin dirección',
        telefono: cliente?.telefono || '',
        horaSugerida: '08:00 AM',
        montoCuota: montoCuotaDisplay,
        saldoTotal,
        estado,
        // Preservar estadoVisita del backend (ej: 'ausente') para mostrar el badge correcto
        estadoVisita: item?.estadoVisita || undefined,
        proximaVisita: item?.proximaVisita || proximaCuota?.fechaVencimiento || fechaClave,
        ordenVisita: (item?.ordenVisita ? Number(item.ordenVisita) : (index + 1)) + loanIdx,
        cobradorId: '',
        periodoRuta,
        clienteId: cliente?.id,
        prestamoId,
        recaudadoDelDia: recaudadoDelDia,
        recaudadoRegularizadoDespues: regularizadoDespues,
        pendienteAprobacion: Boolean(p?.esProvisional) || String(p?.estadoAprobacion || '').toUpperCase() === 'PENDIENTE',
        esProvisional: Boolean(p?.esProvisional),
      } as any

      // Calcular riesgo histórico desde campos históricos del backend
      const montoVencidoFinal = Number(
        item?.montoVencidoAcumuladoEnFecha ??
        item?.montoVencidoAcumulado ??
        item?.saldoVencidoAcumulado ??
        item?.montoMoraAcumulada ??
        proximaCuota?.montoVencidoAcumuladoEnFecha ??
        proximaCuota?.saldoVencidoAcumulado ??
        proximaCuota?.montoMoraAcumulada ??
        0,
      )
      const cuotasVencidasFinal = Number(
        item?.cuotasVencidasEnFecha ??
        item?.cuotasVencidas ??
        proximaCuota?.cuotasVencidasEnFecha ??
        proximaCuota?.cuotasVencidas ??
        0,
      )
      const diasMoraFinal = Number(
        item?.diasMoraEnFecha ??
        item?.diasMoraOperativos ??
        item?.diasMora ??
        proximaCuota?.diasMoraEnFecha ??
        proximaCuota?.diasMora ??
        0,
      )

      // Asignar campos de riesgo a la visita base
      visitaBase.montoVencidoAcumulado = montoVencidoFinal
      visitaBase.saldoVencidoAcumulado = montoVencidoFinal
      visitaBase.montoMoraAcumulada = montoVencidoFinal
      visitaBase.cuotasVencidas = cuotasVencidasFinal
      visitaBase.diasMora = diasMoraFinal
      visitaBase.enMoraHistorico = diasMoraFinal > 0 || montoVencidoFinal > 0

      // Calcular riesgo de obligación con datos históricos
      const nivelRiesgoRaw = resolveRiesgoObligacion({
        row: visitaBase,
        prestamo: p,
        cuotaObjetivo: proximaCuota,
        estadoCalculado: estado,
        diasMora: diasMoraFinal,
        cuotasVencidas: cuotasVencidasFinal,
        esProvisional: visitaBase.esProvisional,
      })
      const nivelRiesgo = normalizeNivelRiesgo(nivelRiesgoRaw)
      const prioridad = nivelRiesgoRaw === 'ROJO' || nivelRiesgoRaw === 'LISTA_NEGRA' ? 'alta' : 'media'

      return {
        ...visitaBase,
        nivelRiesgo,
        nivelRiesgoObligacion: nivelRiesgoRaw,
        prioridad,
      } as any
    })
    })

  // 4) Visitas sintéticas:
  // Si hubo un pago en el día para un cliente que no aparece en `visitasResp.visitas`,
  // lo agregamos al historial para que el recaudo y el "visitados" cuadre con la realidad.
  const pagosSinteticosPorKey = new Map<string, { pago: any; total: number; index: number }>()
  for (const [i, p] of pagosOperativos.entries()) {
    const cid = p?.clienteId || p?.cliente?.id
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    const keyExist = pid ? `loan-${pid}` : (cid ? `client-${cid}` : '')
    if (!cid || !keyExist || existentes.has(keyExist)) continue

    const actual = pagosSinteticosPorKey.get(keyExist)
    if (actual) {
      actual.total += Number(p?.montoTotal || 0)
    } else {
      pagosSinteticosPorKey.set(keyExist, {
        pago: p,
        total: Number(p?.montoTotal || 0),
        index: i,
      })
    }
  }

  for (const [i, p] of pagosRegularizados.entries()) {
    const cid = p?.clienteId || p?.cliente?.id
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    const keyExist = pid ? `loan-${pid}` : (cid ? `client-${cid}` : '')
    if (!cid || !keyExist || existentes.has(keyExist)) continue

    const actual = pagosSinteticosPorKey.get(keyExist)
    if (actual) {
      actual.total += Number(p?.montoTotal || 0)
    } else {
      pagosSinteticosPorKey.set(keyExist, {
        pago: p,
        total: Number(p?.montoTotal || 0),
        index: pagosOperativos.length + i,
      })
    }
  }

  const sinteticos: VisitaRuta[] = Array.from(pagosSinteticosPorKey.entries()).map(([keyExist, item], offset) => {
    const p = item.pago
    const cid = p?.clienteId || p?.cliente?.id
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    const primerDetalle = Array.isArray(p?.detalles) ? p.detalles[0] : undefined
    const cuotaDetalle = primerDetalle?.cuota || p?.cuota || undefined
    const prestamo = p?.prestamo || {}
    const cliente = p?.cliente || {}
    const nombreCliente = cliente
      ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim()
      : ''
    const saldoPendiente = Number(prestamo?.saldoPendiente ?? 0)
    const cuotaMonto = Number(cuotaDetalle?.monto ?? primerDetalle?.monto ?? item.total ?? 0)
    existentes.add(keyExist)

    return {
      id: `pago-${p?.id || item.index}-${fechaClave}`,
      cliente: nombreCliente || 'Cliente',
      direccion: cliente?.direccion || '',
      telefono: cliente?.telefono || '',
      horaSugerida: '08:00 AM',
      montoCuota: cuotaMonto > 0 ? cuotaMonto : item.total,
      saldoTotal: saldoPendiente,
      estado: 'pagado',
      proximaVisita: fechaClave,
      ordenVisita: visitas.length + offset + 1,
      prioridad: cliente?.nivelRiesgo === 'ROJO' ? 'alta' : 'media',
      nivelRiesgo: normalizeNivelRiesgo(cliente?.nivelRiesgo),
      cobradorId: '',
      periodoRuta: normalizePeriodoRuta(prestamo?.frecuenciaRuta || prestamo?.frecuenciaPago || prestamo?.frecuencia || 'DIA'),
      clienteId: cid,
      prestamoId: pid,
      cuotaActual: cuotaDetalle?.numeroCuota,
      cuotasTotales: prestamo?.cantidadCuotas,
      tipoPrestamo: String(prestamo?.tipoPrestamo || prestamo?.tipo || '').toUpperCase() === 'ARTICULO' ? 'ARTICULO' : 'EFECTIVO',
      articuloNombre: String(prestamo?.tipoPrestamo || prestamo?.tipo || '').toUpperCase() === 'ARTICULO'
        ? (prestamo?.articulo || prestamo?.descripcionArticulo || 'Artículo')
        : 'Préstamo',
      recaudadoDelDia: isPagoCierrePendiente(p) ? 0 : item.total,
      recaudadoRegularizadoDespues: isPagoCierrePendiente(p) ? item.total : 0,
    } as any
  })

  const todasVisitas = [...visitas, ...sinteticos].map(normalizeVisitaHistorial)

  // Reconstruir visitas desde pagos si no vienen en obligaciones
  const prestamosEnVisitas = new Set<string>()
  for (const v of todasVisitas) {
    const prestamoId = String(v?.prestamoId || '').trim()
    if (prestamoId) prestamosEnVisitas.add(prestamoId)
  }

  for (const pago of pagosOperativos) {
    const prestamoId = String(pago?.prestamoId || pago?.prestamo?.id || '').trim()
    if (!prestamoId) continue

    const yaExiste = prestamosEnVisitas.has(prestamoId)
    if (yaExiste) continue

    // Buscar préstamo/cuotas si hace falta y agregar visita histórica mínima
    const prestamo = pago?.prestamo || null
    const cliente = pago?.cliente || null

    todasVisitas.push({
      id: `hist-pago-${prestamoId}`,
      cliente: cliente
        ? `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim()
        : pago?.clienteNombre || 'Cliente',
      direccion: cliente?.direccion || '',
      telefono: cliente?.telefono || '',
      horaSugerida: '08:00 AM',
      montoCuota: Number(pago?.montoCuotaEsperado || pago?.montoTotal || 0),
      montoCuotaNormal: Number(pago?.montoCuotaEsperado || pago?.montoTotal || 0),
      saldoTotal: Number(prestamo?.saldoPendiente ?? 0),
      estado: 'pagado',
      proximaVisita: fechaClave,
      ordenVisita: todasVisitas.length + 1,
      prioridad: 'media',
      nivelRiesgo: cliente?.nivelRiesgo || 'MINIMO',
      cobradorId: '',
      periodoRuta: normalizePeriodoRuta(prestamo?.frecuenciaRuta || prestamo?.frecuenciaPago || 'DIA'),
      clienteId: pago?.clienteId || cliente?.id || '',
      prestamoId,
      cuotaActual: pago?.cuota?.numeroCuota,
      cuotasTotales: prestamo?.cantidadCuotas,
      tipoPrestamo: String(prestamo?.tipoPrestamo || prestamo?.tipo || '').toUpperCase() === 'ARTICULO' ? 'ARTICULO' : 'EFECTIVO',
      articuloNombre: String(prestamo?.tipoPrestamo || prestamo?.tipo || '').toUpperCase() === 'ARTICULO'
        ? (prestamo?.articulo || prestamo?.descripcionArticulo || 'Artículo')
        : 'Préstamo',
      recaudadoDelDia: Number(pago?.montoTotal || 0),
      recaudadoRegularizadoDespues: 0,
    } as any)
  }

  // LOGS DE AUDITORÍA: Ver las visitas finales
  if (process.env.NODE_ENV !== 'production') {
    console.table(todasVisitas.map((v: any) => ({
      tipo: 'VISITA_HISTORIAL',
      cliente: v.cliente,
      clienteId: v.clienteId,
      prestamoId: v.prestamoId,
      cuotaId: v.cuotaId,
      cuotaActual: v.cuotaActual,
      montoCuota: v.montoCuota,
      montoCuotaNormal: v.montoCuotaNormal,
      saldoTotal: v.saldoTotal,
      recaudadoDelDia: v.recaudadoDelDia,
      estado: v.estado,
      montoVencidoAcumulado: v.montoVencidoAcumulado,
      saldoVencidoAcumulado: v.saldoVencidoAcumulado,
      cuotasVencidas: v.cuotasVencidas,
      diasMora: v.diasMora,
      nivelRiesgo: v.nivelRiesgo,
      nivelRiesgoObligacion: v.nivelRiesgoObligacion,
    })))
  }

  // Ocultar saldados (pagado y saldo <= 0) que NO tuvieron gestión real en este día.
  const filteredVisitas = todasVisitas.filter((v: any) => {
    const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;
    return !(isSaldado && !isGestionHistorial(v));
  });

  // 5) Resumen: calcular desde visitas finales, no desde backend viejo
  const visitasOperativas = filteredVisitas.filter(
    (v: any) => !shouldExcludeVisitaFromOperationalMeta(v),
  )

  const meta = visitasOperativas.reduce((sum: number, v: any) => {
    return sum + Number(v?.montoCuotaNormal ?? v?.montoCuota ?? 0)
  }, 0)

  const recaudo = visitasOperativas.reduce((sum: number, v: any) => {
    return sum + Number(v?.recaudadoDelDia || 0)
  }, 0)

  // Los conteos van sobre todas las tarjetas del día, no solo las operativas.
  //
  // `visitasOperativas` deja fuera lo reprogramado y lo ausente, que es lo
  // correcto para la meta: son plata que ya no se espera cobrar hoy. Pero el
  // historial cuenta otra cosa —a cuántos clientes se les hizo algo— y una
  // visita reprogramada es justamente una gestión. Contándolas sobre las
  // operativas, un día entero de reprogramaciones salía como cero visitados,
  // como si el cobrador no hubiera salido.
  const visitados = filteredVisitas.filter((v: any) => {
    return Number(v?.recaudadoDelDia || 0) > 0 || hasGestionHistorial(v)
  }).length

  const total = filteredVisitas.length

  const efectividad =
    meta > 0
      ? Number(((recaudo / meta) * 100).toFixed(2))
      : recaudo > 0
        ? 100
        : 0

  // El resumen sale del backend; lo local solo puede sumar lo que él no vio.
  //
  // Se calculaba de cero desde las tarjetas visibles, con el recaudo contable,
  // el regularizado y el estado de jornada fijados en cero y null. Eso borraba
  // cifras que el frontend no puede calcular: el contable depende de la fecha
  // real de cada pago y el regularizado de a qué jornada pertenece, y las dos
  // solo las sabe el backend, que ve todos los pagos y no solo los de las
  // tarjetas que quedaron a la vista.
  //
  // Pero el backend tampoco basta solo: su resumen es una foto, y entre esa
  // foto y la lista de pagos que el frontend acaba de traer puede haber pagos
  // nuevos. Pasó en el caso de tres pagos regularizados de una jornada donde el
  // resumen traía dos: 1.767.334 contra 1.894.000 reales.
  //
  // Así que se toma el mayor de los dos por cada cifra: nunca se muestra menos
  // que lo que el backend reportó, y nunca se cuenta dos veces un pago que él
  // ya había contado.
  const resumenBackend = ((visitasResp as any)?.resumen || {}) as any
  const mayorQueElBackend = (clave: string, local: number) =>
    Math.max(Number(resumenBackend?.[clave] ?? 0), Number(local || 0))

  const regularizadoLocal = pagosRegularizados.reduce(
    (sum: number, p: any) => sum + Number(p?.montoTotal || 0),
    0,
  )

  const contableFinal = Number(resumenBackend?.recaudoContable ?? 0)
  const regularizadoFinal = mayorQueElBackend(
    'recaudoRegularizado',
    regularizadoLocal,
  )

  // Al total del backend se le suma solo lo que el frontend puede demostrar
  // que a él le faltó: los pagos regularizados que ve de más.
  //
  // No se rehace el total sumando contable más regularizado. Parece que
  // debería dar lo mismo —el backend lo arma así— pero el contable puede traer
  // pagos registrados hoy que pertenecen a otra jornada, y esos no son parte
  // del total operativo de este día. Rehacer la suma los metería y el día
  // aparecería con más plata de la que se recaudó.
  const regularizadoQueFaltaba = Math.max(
    0,
    regularizadoFinal - Number(resumenBackend?.recaudoRegularizado ?? 0),
  )

  const recaudoFinal = Math.max(
    Number(resumenBackend?.recaudo ?? 0) + regularizadoQueFaltaba,
    Number(recaudo || 0),
  )
  const operativoFinal = Math.max(
    Number(resumenBackend?.recaudoOperativo ?? 0) + regularizadoQueFaltaba,
    Number(recaudo || 0),
  )
  const metaFinal = mayorQueElBackend('meta', meta)

  // La efectividad se recalcula: la del backend corresponde a su foto, y si
  // aquí el recaudo subió, esa cifra queda vieja.
  const efectividadFinal =
    metaFinal > 0
      ? Number(((recaudoFinal / metaFinal) * 100).toFixed(1))
      : recaudoFinal > 0
        ? 100
        : 0

  const resumenFinal: Resumen = {
    recaudo: recaudoFinal,
    meta: metaFinal,
    efectividad: efectividadFinal,
    // Los conteos mandan desde el backend, que sabe cuántas obligaciones
    // tenía la jornada. Aquí solo se ven las tarjetas que sobrevivieron al
    // filtrado, que son menos, y quedarse con el mayor de los dos inflaría el
    // día con visitas que el backend no reconoce.
    visitados:
      resumenBackend?.visitados != null
        ? Number(resumenBackend.visitados)
        : visitados,
    total:
      resumenBackend?.total != null ? Number(resumenBackend.total) : total,
    recaudoOperativo: operativoFinal,
    recaudoRegularizado: regularizadoFinal,
    // Este el frontend no lo puede calcular: depende de la fecha real de cada
    // pago, que el backend ya resolvió.
    recaudoContable: contableFinal,
    recaudoEfectivo: Number(resumenBackend?.recaudoEfectivo ?? 0),
    recaudoTransferencia: Number(resumenBackend?.recaudoTransferencia ?? 0),
    recaudoContableEfectivo: Number(
      resumenBackend?.recaudoContableEfectivo ?? 0,
    ),
    recaudoContableTransferencia: Number(
      resumenBackend?.recaudoContableTransferencia ?? 0,
    ),
    recaudoRegularizadoEfectivo: Number(
      resumenBackend?.recaudoRegularizadoEfectivo ?? 0,
    ),
    recaudoRegularizadoTransferencia: Number(
      resumenBackend?.recaudoRegularizadoTransferencia ?? 0,
    ),
    gastos: Number(resumenBackend?.gastos ?? 0),
    netoEfectivoRuta: Number(resumenBackend?.netoEfectivoRuta ?? 0),
    jornadaId: resumenBackend?.jornadaId ?? null,
    jornadaEstado: resumenBackend?.jornadaEstado ?? null,
    jornadaCerradaEn: resumenBackend?.jornadaCerradaEn ?? null,
    jornadaRegularizadaEn: resumenBackend?.jornadaRegularizadaEn ?? null,
  }

  const badge = getHistorialJornadaBadge(resumenFinal)
  if (badge) {
    resumenFinal.jornadaEtiqueta = badge.label
    resumenFinal.jornadaEtiquetaColor = badge.color
  }

  // Logs de validación para historial final
  if (process.env.NODE_ENV !== 'production') {
    console.table(filteredVisitas.map((v: any) => ({
      tipo: 'HISTORIAL_FINAL',
      cliente: v.cliente,
      prestamoId: v.prestamoId,
      estado: v.estado,
      montoCuotaNormal: v.montoCuotaNormal,
      recaudadoDelDia: v.recaudadoDelDia,
      montoVencidoAcumulado: v.montoVencidoAcumulado,
      cuotasVencidas: v.cuotasVencidas,
      diasMora: v.diasMora,
      nivelRiesgo: v.nivelRiesgo,
      nivelRiesgoObligacion: v.nivelRiesgoObligacion,
    })))
    logger.log('[HISTORIAL_RESUMEN_FINAL]', resumenFinal)
  }

  return { resumen: resumenFinal, visitas: filteredVisitas }
}
