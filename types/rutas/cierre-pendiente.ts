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
