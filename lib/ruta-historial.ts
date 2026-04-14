import type { VisitaRuta } from '@/lib/types/cobranza'

type Resumen = {
  recaudo: number
  gastos: number
  efectividad: number
  visitados: number
  total: number
}

// Construye la información de un día del historial (visitas + resumen) a partir de:
// - `visitasResp`: respuesta del backend de `rutasService.obtenerVisitasDelDia(rutaId, fechaClave)`
// - `saldo`: respuesta del backend de `obtenerSaldoDisponibleRuta(rutaId, fechaClave)`
// - `pagosDelDia`: pagos filtrados estrictamente para esa fecha (Bogotá key) y (opcionalmente) por cobrador.
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

  const prestamoIdPorCliente: Record<string, string> = {}
  for (const p of pagosDelDia || []) {
    const cid = String(p?.clienteId || p?.cliente?.id || '')
    if (!cid) continue
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    if (!pid) continue
    if (!prestamoIdPorCliente[cid]) prestamoIdPorCliente[cid] = pid
  }

  // 1) Índice de recaudo por cliente para poder asignar `recaudadoDelDia` a cada visita.
  const recaudadoPorCliente: Record<string, number> = {}
  for (const p of pagosDelDia || []) {
    const cid = p?.clienteId || p?.cliente?.id
    if (!cid) continue
    recaudadoPorCliente[cid] = (recaudadoPorCliente[cid] || 0) + Number(p?.montoTotal || 0)
  }

  // Índice por préstamo para diferenciar múltiples préstamos del mismo cliente.
  const recaudadoPorPrestamo: Record<string, number> = {}
  for (const p of pagosDelDia || []) {
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    if (!pid) continue
    recaudadoPorPrestamo[pid] = (recaudadoPorPrestamo[pid] || 0) + Number(p?.montoTotal || 0)
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
          estado: item?.estado || (recDia > 0 ? 'pagado' : 'pendiente'),
          proximaVisita: item?.proximaVisita || fechaClave,
          ordenVisita: item?.ordenVisita || index + 1,
          prioridad: cliente?.nivelRiesgo === 'ROJO' ? 'alta' : 'media',
          nivelRiesgo: (() => {
            const r = cliente?.nivelRiesgo || 'VERDE'
            if (r === 'VERDE') return 'bajo'
            if (r === 'AMARILLO') return 'leve'
            if (r === 'ROJO') return 'moderado'
            if (r === 'LISTA_NEGRA') return 'critico'
            return 'bajo'
          })(),
          cobradorId: '',
          periodoRuta: 'DIA',
          clienteId: cliente?.id,
          prestamoId: String(item?.prestamoId || ''),
          recaudadoDelDia: recDia,
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
      const recDia = recDiaPrestamo

      const proximaCuota = p?.proximaCuota || {}
      const montoCuotaBase = Number(p?.montoCuota ?? proximaCuota?.monto ?? 0)
      const montoCuotaDisplay = recDia > 0 ? Math.max(montoCuotaBase, recDia) : montoCuotaBase

      const saldoTotal = Number(p?.saldoPendiente ?? 0)
      const proxEstado = String(proximaCuota?.estado || '').toUpperCase()

      let estado: any = item?.estado || 'pendiente'
      if (!item?.estado) {
        if (saldoTotal <= 0) estado = 'pagado'
        else if (proxEstado === 'PAGADA' || proxEstado === 'PAGADO') estado = 'pagado'
        else if (proxEstado === 'VENCIDA' || proxEstado === 'ATRASADA') estado = 'en_mora'
        else if (recDia > 0 && recDia >= montoCuotaBase - 1) estado = 'pagado'
      }

      // Si el backend no reporta estado y no hay pago asociado a este préstamo, no marcarlo como pagado
      // por pagos del cliente de otros préstamos.
      if (!item?.estado && recDia <= 0 && estado === 'pagado') estado = 'pendiente'

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
        proximaVisita: item?.proximaVisita || proximaCuota?.fechaVencimiento || fechaClave,
        ordenVisita: (item?.ordenVisita ? Number(item.ordenVisita) : (index + 1)) + loanIdx,
        prioridad: cliente?.nivelRiesgo === 'ROJO' ? 'alta' : 'media',
        nivelRiesgo: (() => {
          const r = cliente?.nivelRiesgo || 'VERDE'
          if (r === 'VERDE') return 'bajo'
          if (r === 'AMARILLO') return 'leve'
          if (r === 'ROJO') return 'moderado'
          if (r === 'LISTA_NEGRA') return 'critico'
          return 'bajo'
        })(),
        cobradorId: '',
        periodoRuta,
        clienteId: cliente?.id,
        prestamoId,
        recaudadoDelDia: recDia,
      } as any
    })
  })

  // 4) Visitas sintéticas:
  // Si hubo un pago en el día para un cliente que no aparece en `visitasResp.visitas`,
  // lo agregamos al historial para que el recaudo y el "visitados" cuadre con la realidad.
  const sinteticos: VisitaRuta[] = (pagosDelDia || []).flatMap((p: any, i: number) => {
    const cid = p?.clienteId || p?.cliente?.id
    const pid = String(p?.prestamoId || p?.prestamo?.id || '')
    const keyExist = pid ? `loan-${pid}` : (cid ? `client-${cid}` : '')
    if (!cid || (keyExist && existentes.has(keyExist))) return []
    return [
      {
        id: `pago-${p?.id || i}-${fechaClave}`,
        cliente: p?.cliente ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim() : 'Cliente',
        direccion: p?.cliente?.direccion || '',
        telefono: p?.cliente?.telefono || '',
        horaSugerida: '08:00 AM',
        montoCuota: 0,
        saldoTotal: 0,
        estado: 'pagado',
        proximaVisita: fechaClave,
        ordenVisita: visitas.length + i + 1,
        prioridad: 'media',
        cobradorId: '',
        periodoRuta: 'DIA',
        clienteId: cid,
        prestamoId: pid,
        recaudadoDelDia: Number(p?.montoTotal || 0),
      } as any,
    ]
  })

  const todasVisitas = [...visitas, ...sinteticos]
  const total = todasVisitas.length

  // 5) Resumen:
  // - `recaudo`: preferimos el valor del backend (saldo del día); si no existe, sumamos pagos.
  // - `efectividad`: aproximación basada en (recaudo / esperado).
  //   Nota: este esperado usa montoCuota por visita (fallback); para historial profundo,
  //   la efectividad "exacta" depende de reglas de negocio del backend.
  const esperado = todasVisitas.reduce((sum: number, v: any) => sum + Number(v?.montoCuota || 0), 0)
  const recaudoDia =
    Number((saldo as any)?.recaudoDelDia ?? 0) > 0
      ? Number((saldo as any)?.recaudoDelDia ?? 0)
      : (pagosDelDia || []).reduce((s: number, p: any) => s + Number(p?.montoTotal || 0), 0)

  // `visitados` se define como:
  // - visitas con recaudo del día > 0
  // - o visitas en estado pagado
  const visitados = todasVisitas.filter((v: any) => Number(v?.recaudadoDelDia || 0) > 0 || v?.estado === 'pagado').length
  const objetivoShown = Math.max(esperado, recaudoDia)
  const efectividadRaw = objetivoShown > 0 ? Math.round((recaudoDia / objetivoShown) * 100) : 0
  const efectividad = Math.min(100, Math.max(0, efectividadRaw))

  const resumen: Resumen = {
    recaudo: recaudoDia,
    gastos: Number((saldo as any)?.gastosDelDia ?? 0),
    efectividad,
    visitados,
    total,
  }

  return { resumen, visitas: todasVisitas }
}
