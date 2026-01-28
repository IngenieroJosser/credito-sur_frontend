export type EstadoVisita = 'pendiente' | 'pagado' | 'en_mora' | 'ausente' | 'reprogramado'
export type PeriodoRuta = 'DIA' | 'SEMANA' | 'MES'

export interface VisitaRuta {
  id: string
  cliente: string
  direccion: string
  telefono: string
  horaSugerida: string
  montoCuota: number
  saldoTotal: number
  estado: EstadoVisita
  proximaVisita: string
  ordenVisita: number
  prioridad: 'alta' | 'media' | 'baja'
  cobradorId: string
  periodoRuta: PeriodoRuta
}
