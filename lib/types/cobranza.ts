export type EstadoVisita = 'pendiente' | 'pagado' | 'en_mora' | 'ausente' | 'reprogramado'
export type PeriodoRuta = 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES'

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
  nivelRiesgo?: 'bajo' | 'leve' | 'moderado' | 'critico'
  cobradorId: string
  periodoRuta: PeriodoRuta
}

export interface HistorialDia {
  resumen: {
    recaudo: number;
    efectividad: number;
    visitados: number;
    total: number;
  };
  visitas: VisitaRuta[];
}
