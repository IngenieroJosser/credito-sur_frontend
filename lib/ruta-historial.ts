import { isPagoCierrePendiente } from '@/lib/ruta-recaudos'
import { getPagoBogotaDateKey } from '@/lib/rutas-core'
import type { VisitaRuta } from '@/lib/types/cobranza'

type Resumen = {
  recaudo: number
  recaudoOperativo?: number
  recaudoRegularizado?: number
  recaudoContable?: number
  meta?: number
  gastos: number
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

const normalizeNivelRiesgo = (raw: any): any => {
  const r = String(raw || '').toUpperCase()
  if (r === 'VERDE') return 'bajo'
  if (r === 'AMARILLO') return 'leve'
  if (r === 'ROJO') return 'moderado'
  if (r === 'LISTA_NEGRA') return 'critico'
  return 'bajo'
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
  const recaudadoPorCliente: Record<string, number> = {}
  const pagosPorKey = new Map<string, { pago: any; total: number; index: number }>()

  pagosOperativos.forEach((p: any, index: number) => {
    const monto = Number(p?.montoTotal ?? p?.monto ?? p?.valor ?? 0)
    if (!(monto > 0)) return

    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    const cid = String(p?.clienteId || p?.cliente?.id || '')
    if (pid) recaudadoPorPrestamo[pid] = (recaudadoPorPrestamo[pid] || 0) + monto
    if (cid) recaudadoPorCliente[cid] = (recaudadoPorCliente[cid] || 0) + monto

    const key = pid ? `loan-${pid}` : (cid ? `client-${cid}` : '')
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
    const cid = String(v?.clienteId || '')
    if (pid) existentes.add(`loan-${pid}`)
    else if (cid) existentes.add(`client-${cid}`)

    const recPago = pid
      ? Number(recaudadoPorPrestamo[pid] || 0)
      : (cid ? Number(recaudadoPorCliente[cid] || 0) : 0)
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

  // Ocultar saldados (pagado y saldo <= 0) que NO tuvieron actividad (pago o ausente) en este día
  const filteredVisitas = finalVisitas.filter((v: any) => {
    const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;
    const tuvoActividad = Number(v.recaudadoDelDia || 0) > 0 || v.estadoVisita === 'ausente';
    return !(isSaldado && !tuvoActividad);
  });

  const recaudo = filteredVisitas.reduce((sum: number, v: any) => sum + Number(v?.recaudadoDelDia || 0), 0)
  // Los ausentes cuentan como visitados (se hizo la visita pero el cliente no estaba)
  const visitados = filteredVisitas.filter((v: any) => {
    const estado = String(v?.estado || '').toLowerCase()
    return Number(v?.recaudadoDelDia || 0) > 0 || estado === 'pagado' || String(v?.estadoVisita || '') === 'ausente'
  }).length

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

  const prestamoIdPorCliente: Record<string, string> = {}
  for (const p of pagosOperativos) {
    const cid = String(p?.clienteId || p?.cliente?.id || '')
    if (!cid) continue
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    if (!pid) continue
    if (!prestamoIdPorCliente[cid]) prestamoIdPorCliente[cid] = pid
  }

  // 1) Índice de recaudo por cliente para poder asignar `recaudadoDelDia` a cada visita.
  const recaudadoPorCliente: Record<string, number> = {}
  for (const p of pagosOperativos) {
    const cid = p?.clienteId || p?.cliente?.id
    if (!cid) continue
    recaudadoPorCliente[cid] = (recaudadoPorCliente[cid] || 0) + Number(p?.montoTotal || 0)
  }

  // Índice por préstamo para diferenciar múltiples préstamos del mismo cliente.
  const recaudadoPorPrestamo: Record<string, number> = {}
  for (const p of pagosOperativos) {
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    if (!pid) continue
    recaudadoPorPrestamo[pid] = (recaudadoPorPrestamo[pid] || 0) + Number(p?.montoTotal || 0)
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

  // 3) Mapear visitas del backend a `VisitaRuta` (shape que espera el UI).
  //    Nota: aquí NO aplicamos la lógica pesada de mapeo/asignación del día actual.
  //    Para historial, la mayoría de campos se debe respetar del backend si viene.
  const visitas: VisitaRuta[] = ((visitasResp as any)?.visitas || []).flatMap((item: any, index: number) => {
    const cliente = item?.cliente || {}
    const prestamos = Array.isArray(item?.prestamos) ? item.prestamos : []

    // Si no hay préstamos, caer a una sola visita por cliente como antes.
    if (prestamos.length === 0) {
      const recDia = cliente?.id ? (recaudadoPorCliente[cliente.id] || 0) : 0
      const regularizadoDespues = cliente?.id ? (regularizadoPorCliente[cliente.id] || 0) : 0
      const keyExist = cliente?.id ? `client-${cliente.id}` : `client-idx-${index}`
      existentes.add(keyExist)
      return [
        {
          id: item?.asignacionId || `hist-${fechaClave}-${index}`,
          cliente: `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim() || 'Cliente Sin Nombre',
          direccion: cliente?.direccion || 'Sin dirección',
          telefono: cliente?.telefono || '',
          horaSugerida: '08:00 AM',
          montoCuota: recDia > 0 ? recDia : 0,
          saldoTotal: Number(item?.saldoTotal ?? 0),
          estado: item?.estado || ((recDia > 0 || regularizadoDespues > 0) ? 'pagado' : 'pendiente'),
          // Preservar estadoVisita del backend (ej: 'ausente') para mostrar el badge correcto
          estadoVisita: item?.estadoVisita || undefined,
          proximaVisita: item?.proximaVisita || fechaClave,
          ordenVisita: item?.ordenVisita || index + 1,
          prioridad: cliente?.nivelRiesgo === 'ROJO' ? 'alta' : 'media',
          nivelRiesgo: normalizeNivelRiesgo(cliente?.nivelRiesgo),
          cobradorId: '',
          periodoRuta: 'DIA',
          clienteId: cliente?.id,
          prestamoId: String(item?.prestamoId || ''),
          recaudadoDelDia: recDia,
          recaudadoRegularizadoDespues: regularizadoDespues,
        } as any,
      ]
    }

    const prestamoPreferidoId = String(
      item?.prestamoId
        || (cliente?.id ? prestamoIdPorCliente[String(cliente.id)] : '')
        || (prestamos.find((p: any) => Number(p?.saldoPendiente || 0) > 0)?.id || '')
        || (prestamos[0]?.id || ''),
    )

    const prestamosSeleccionados = prestamoPreferidoId
      ? prestamos.filter((p: any) => String(p?.id || '') === prestamoPreferidoId)
      : prestamos

    const lista = (prestamosSeleccionados.length > 0 ? prestamosSeleccionados : [prestamos[0]]).filter(Boolean)

    return lista.map((p: any, loanIdx: number) => {
      const prestamoId = String(p?.id || prestamoPreferidoId || '')
      const recDiaPrestamo = prestamoId ? (recaudadoPorPrestamo[prestamoId] || 0) : 0
      const regularizadoDespues = prestamoId
        ? Number(regularizadoPorPrestamo[prestamoId] || 0)
        : (cliente?.id ? Number(regularizadoPorCliente[cliente.id] || 0) : 0)
      const recDia = recDiaPrestamo

      const proximaCuota = p?.proximaCuota || {}
      const montoCuotaBase = Number(p?.montoCuota ?? proximaCuota?.monto ?? 0)
      const montoGestionado = recDia + regularizadoDespues
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

      return {
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
        prioridad: cliente?.nivelRiesgo === 'ROJO' ? 'alta' : 'media',
        nivelRiesgo: normalizeNivelRiesgo(cliente?.nivelRiesgo),
        cobradorId: '',
        periodoRuta,
        clienteId: cliente?.id,
        prestamoId,
        recaudadoDelDia: recDia,
        recaudadoRegularizadoDespues: regularizadoDespues,
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

  const todasVisitas = [...visitas, ...sinteticos]

  // Ocultar saldados (pagado y saldo <= 0) que NO tuvieron actividad (pago o ausente) en este día
  const filteredVisitas = todasVisitas.filter((v: any) => {
    const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;
    const tuvoActividad = Number(v.recaudadoDelDia || 0) > 0 || Number(v.recaudadoRegularizadoDespues || 0) > 0 || v.estadoVisita === 'ausente';
    return !(isSaldado && !tuvoActividad);
  });

  const total = filteredVisitas.length

  // 5) Resumen:
  // - `recaudo`: preferimos el valor del backend (saldo del día); si no existe, sumamos pagos.
  // - `efectividad`: aproximación basada en (recaudo / esperado).
  //   Nota: este esperado usa montoCuota por visita (fallback); para historial profundo,
  //   la efectividad "exacta" depende de reglas de negocio del backend.
  const esperado = filteredVisitas.reduce((sum: number, v: any) => sum + Number(v?.montoCuota || 0), 0)
  const backendResumen = (visitasResp as any)?.resumen || {}
  const fallbackRecaudoOperativo = pagosOperativos.reduce((s: number, p: any) => s + Number(p?.montoTotal || 0), 0)
  const fallbackRecaudoRegularizado = pagos
    .filter((p: any) => isPagoCierrePendiente(p) && String(p?.fechaOperativaRuta || '').slice(0, 10) === fechaClave)
    .reduce((s: number, p: any) => s + Number(p?.montoTotal || 0), 0)
  const fallbackRecaudoContable = fallbackRecaudoOperativo + fallbackRecaudoRegularizado
  const saldoRecaudo = Number((saldo as any)?.recaudoDelDia ?? 0)
  const soloTieneCierrePendiente = pagos.length > 0 && pagosOperativos.length === 0 && pagos.every((p: any) => isPagoCierrePendiente(p))

  const recaudoDia =
    Number(backendResumen?.recaudoOperativo ?? 0) > 0
      ? Number(backendResumen.recaudoOperativo)
      : Number(backendResumen?.recaudo ?? 0) > 0
        ? Number(backendResumen.recaudo)
        : saldoRecaudo > 0 && !soloTieneCierrePendiente
          ? saldoRecaudo
          : fallbackRecaudoOperativo

  // `visitados` se define como:
  // - visitas con recaudo del día > 0
  // - o visitas en estado pagado
  // - o clientes marcados como ausentes (se hizo la visita aunque no estaban)
  const visitados = filteredVisitas.filter((v: any) =>
    Number(v?.recaudadoDelDia || 0) > 0 ||
    Number(v?.recaudadoRegularizadoDespues || 0) > 0 ||
    v?.estado === 'pagado' ||
    String(v?.estadoVisita || '') === 'ausente'
  ).length
  const objetivoShown = Math.max(esperado, recaudoDia)
  const efectividadRaw = objetivoShown > 0 ? Math.round((recaudoDia / objetivoShown) * 100) : (recaudoDia > 0 ? 100 : 0)
  const efectividad = Math.min(100, Math.max(0, efectividadRaw))

  const resumen: Resumen = {
    recaudo: recaudoDia,
    recaudoOperativo: Number(backendResumen?.recaudoOperativo ?? recaudoDia),
    recaudoRegularizado: Number(backendResumen?.recaudoRegularizado ?? fallbackRecaudoRegularizado),
    recaudoContable: Number(backendResumen?.recaudoContable ?? fallbackRecaudoContable),
    meta: Number(backendResumen?.meta ?? esperado),
    gastos: Number((saldo as any)?.gastosDelDia ?? 0),
    efectividad,
    visitados,
    total,
    jornadaId: backendResumen?.jornadaId ?? null,
    jornadaEstado: backendResumen?.jornadaEstado ?? null,
    jornadaCerradaEn: backendResumen?.jornadaCerradaEn ?? null,
    jornadaRegularizadaEn: backendResumen?.jornadaRegularizadaEn ?? null,
  }
  const badge = getHistorialJornadaBadge(resumen)
  if (badge) {
    resumen.jornadaEtiqueta = badge.label
    resumen.jornadaEtiquetaColor = badge.color
  }

  return { resumen, visitas: filteredVisitas }
}
