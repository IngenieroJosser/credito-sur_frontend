export type CierrePendienteRuta = {
  pendienteCierre?: boolean
  message?: string
  fechaOperativa?: string
  fechaActivacion?: string
  diasPendiente?: number
  rutaId?: string
  rutaNombre?: string
  cajaId?: string
  cobradorId?: string | null
  cobradorNombre?: string | null
  activacionId?: string
  requiereRegularizacion?: boolean
}

export type CierrePendienteDetalle = {
  pendienteCierre: boolean
  totalPendientes?: number
  jornadas?: Array<{
    cierrePendiente?: CierrePendienteRuta
    resumen?: {
      fechaOperativa: string
      fechaActivacion: string
      diasPendiente: number
      rutaId: string
      rutaNombre: string
      cobradorNombre: string | null
      meta: number
      recaudo: number
      recaudoOperativo?: number
      recaudoContable?: number
      recaudoRegularizado?: number
      pendiente: number
      gastos: number
      efectividad: number
      totalClientes: number
      clientesGestionados: number
      clientesPagaron: number
      clientesAusentes: number
      clientesPendientes: number
    }
    clientes?: Array<{
      asignacionId?: string
      ordenVisita?: number
      clienteId?: string
      nombreCliente?: string
      dni?: string
      telefono?: string
      direccion?: string
      nivelRiesgo?: string
      estadoGestion: 'PAGO_REGISTRADO' | 'AUSENTE' | 'PENDIENTE'
      recaudadoDelDia: number
      estadoVisita?: string | null
      notasVisita?: string | null
      prestamos?: any[]
    }>
    accionesSugeridas?: string[]
  }>
  // Mantener compatibilidad con estructura antigua
  cierrePendiente?: CierrePendienteRuta
  resumen?: {
    fechaOperativa: string
    fechaActivacion: string
    diasPendiente: number
    rutaId: string
    rutaNombre: string
    cobradorNombre: string | null
    meta: number
    recaudo: number
    recaudoOperativo?: number
    recaudoContable?: number
    recaudoRegularizado?: number
    pendiente: number
    gastos: number
    efectividad: number
    totalClientes: number
    clientesGestionados: number
    clientesPagaron: number
    clientesAusentes: number
    clientesPendientes: number
  }
  clientes?: Array<{
    asignacionId?: string
    ordenVisita?: number
    clienteId?: string
    nombreCliente?: string
    dni?: string
    telefono?: string
    direccion?: string
    nivelRiesgo?: string
    estadoGestion: 'PAGO_REGISTRADO' | 'AUSENTE' | 'PENDIENTE'
    recaudadoDelDia: number
    estadoVisita?: string | null
    notasVisita?: string | null
    prestamos?: any[]
  }>
  accionesSugeridas?: string[]
}
