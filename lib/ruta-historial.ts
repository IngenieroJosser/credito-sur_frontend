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

  // 1) Índice de recaudo por cliente para poder asignar `recaudadoDelDia` a cada visita.
  const recaudadoPorCliente: Record<string, number> = {}
  for (const p of pagosDelDia || []) {
    const cid = p?.clienteId || p?.cliente?.id
    if (!cid) continue
    recaudadoPorCliente[cid] = (recaudadoPorCliente[cid] || 0) + Number(p?.montoTotal || 0)
  }

  // 2) Mantener track de clientes que sí vienen en la ruta del backend.
  //    Esto se usa para poder crear sintéticos para pagos de clientes "fuera de ruta".
  const existentes = new Set<string>()

  // 3) Mapear visitas del backend a `VisitaRuta` (shape que espera el UI).
  //    Nota: aquí NO aplicamos la lógica pesada de mapeo/asignación del día actual.
  //    Para historial, la mayoría de campos se debe respetar del backend si viene.
  const visitas: VisitaRuta[] = ((visitasResp as any)?.visitas || []).map((item: any, index: number) => {
    const cliente = item?.cliente || {}
    const prestamos = item?.prestamos || []

    // Para historial, el backend devuelve los préstamos del cliente.
    // Si no trae `item.montoCuota`, armamos un fallback sumando `proximaCuota.monto`.
    const montoCuotaTotal = prestamos.reduce((total: number, p: any) => total + Number(p?.proximaCuota?.monto || 0), 0)
    const saldoTotalGeneral = prestamos.reduce((total: number, p: any) => total + Number(p?.saldoPendiente || 0), 0)

    const recDia = cliente?.id ? (recaudadoPorCliente[cliente.id] || 0) : 0
    if (cliente?.id) existentes.add(cliente.id)

    // Fallback mínimo de estado:
    // - si cubrió la cuota del día o no hay saldo, se considera pagado
    // - si tiene alguna cuota vencida, se considera en mora
    // - de lo contrario pendiente
    let estado: any = item?.estado || 'pendiente'
    if (!item?.estado) {
      if ((recDia > 0 && recDia >= montoCuotaTotal - 1) || saldoTotalGeneral <= 0) estado = 'pagado'
      else if (prestamos.some((p: any) => p?.proximaCuota?.estado === 'VENCIDA')) estado = 'en_mora'
    }

    const prestamoActivo = prestamos[0] || {}
    const proximaCuota = prestamoActivo?.proximaCuota || {}

    return {
      id: item?.asignacionId || `hist-${fechaClave}-${index}`,
      cliente: `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim() || 'Cliente Sin Nombre',
      direccion: cliente?.direccion || 'Sin dirección',
      telefono: cliente?.telefono || '',
      horaSugerida: '08:00 AM',
      montoCuota: Number(item?.montoCuota ?? montoCuotaTotal),
      saldoTotal: Number(item?.saldoTotal ?? saldoTotalGeneral),
      estado,
      proximaVisita: item?.proximaVisita || proximaCuota?.fechaVencimiento || fechaClave,
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
      recaudadoDelDia: recDia,
    } as any
  })

  // 4) Visitas sintéticas:
  // Si hubo un pago en el día para un cliente que no aparece en `visitasResp.visitas`,
  // lo agregamos al historial para que el recaudo y el "visitados" cuadre con la realidad.
  const sinteticos: VisitaRuta[] = (pagosDelDia || []).flatMap((p: any, i: number) => {
    const cid = p?.clienteId || p?.cliente?.id
    if (!cid || existentes.has(cid)) return []
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
  const efectividad = esperado > 0 ? Math.round((recaudoDia / esperado) * 100) : (recaudoDia > 0 ? 100 : 0)

  const resumen: Resumen = {
    recaudo: recaudoDia,
    gastos: Number((saldo as any)?.gastosDelDia ?? 0),
    efectividad,
    visitados,
    total,
  }

  return { resumen, visitas: todasVisitas }
}
