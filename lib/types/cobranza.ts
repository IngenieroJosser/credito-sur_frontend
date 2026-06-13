export type EstadoVisita = 'pendiente' | 'pagado' | 'en_mora' | 'ausente' | 'reprogramado' | 'en_prorroga' | 'gestionado'
export type PeriodoRuta = 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES'

export interface VisitaRuta {
  id: string
  cliente: string
  direccion: string
  telefono: string
  horaSugerida: string
  montoCuota: number
  saldoTotal: number
  recaudadoDelDia?: number
  recaudadoRegularizadoDespues?: number
  recaudadoTotalClient?: number
  recaudadoPeriodo?: number  // Total pagado en el período actual (semana/quincena/mes/día)
  estado: EstadoVisita
  estadoVisita?: string      // Estado de la visita del día registrado (ej: 'ausente')
  notasVisita?: string | null // Nota/justificación registrada al marcar ausencia
  proximaVisita: string
  targetVencimiento?: string
  ordenVisita: number
  prioridad: 'alta' | 'media' | 'baja'
  nivelRiesgo?: 'bajo' | 'leve' | 'precaucion' | 'moderado' | 'critico'
  cobradorId: string
  periodoRuta: PeriodoRuta
  clienteId: string
  prestamoId?: string
  tipoPrestamo?: 'EFECTIVO' | 'ARTICULO'
  articuloNombre?: string
  // Prórroga activa
  enProrroga?: boolean
  fechaProrroga?: string        // ISO string — nueva fecha límite de pago
  fechaOriginalVencimiento?: string  // fecha original antes de la prórroga
  // Detalle de cuotas
  cuotaActual?: number
  cuotasTotales?: number
  diasMora?: number
  // Crédito pendiente de aprobación: el cliente aparece en la ruta pero aún no se puede cobrar
  pendienteAprobacion?: boolean
  fechaUltimoPago?: number      // Timestamp del último pago realizado para ordenamiento rápido
  montoCuotaPendiente?: number  // Monto pendiente real (puede diferir de montoCuota si hay mora parcial)
  montoCuotaNormal?: number     // Cuota normal del periodo, sin acumular saldos vencidos
  montoMoraAcumulada?: number   // Saldo vencido acumulado de cartera, separado de la cuota operativa
  cuotasVencidas?: number       // Cantidad de cuotas vencidas/pendientes hasta la fecha operativa
}

export interface HistorialDia {
  resumen: {
    recaudo: number;
    efectividad: number;
    visitados: number;
    total: number;
    gastos: number;
    jornadaId?: string | null;
    jornadaEstado?: string | null;
    jornadaCerradaEn?: string | null;
    jornadaRegularizadaEn?: string | null;
    jornadaEtiqueta?: string;
    jornadaEtiquetaColor?: string;
  };
  visitas: VisitaRuta[];
  loaded?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de mapeo centralizados
// Usarlos en lugar de duplicar la lógica inline en cada componente
// ─────────────────────────────────────────────────────────────────────────────

type NivelRiesgoBackend = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA' | string
type NivelRiesgoFrontend = 'bajo' | 'leve' | 'precaucion' | 'moderado' | 'critico'

/**
 * Convierte el nivel de riesgo del backend al formato del frontend.
 * Centraliza la lógica duplicada en VistaCobrador, SupervisorCobroView,
 * ruta-client y coordinador/rutas.
 */
export const mapNivelRiesgo = (nivel?: NivelRiesgoBackend | null): NivelRiesgoFrontend => {
  const normalized = String(nivel || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  switch (normalized) {
    case 'PELIGRO_MINIMO':
    case 'MINIMO':
    case 'BAJO':
    case 'VERDE':
      return 'bajo'
    case 'LEVE_RETRASO':
    case 'LEVE':
      return 'leve'
    case 'PRECAUCION':
    case 'AMARILLO':
      return 'precaucion'
    case 'RIESGO_MODERADO':
    case 'MODERADO':
      return 'moderado'
    case 'ALTO_RIESGO':
    case 'ROJO':
    case 'CRITICO':
    case 'CRÍTICO':
    case 'RIESGO_CRITICO':
    case 'RIESGO_CRÍTICO':
    case 'LISTA_NEGRA':
      return 'critico'
    default:
      return 'bajo'
  }
}

type FrecuenciaPago = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | string

/**
 * Convierte la frecuencia de pago del backend al PeriodoRuta del frontend.
 * Centraliza la lógica duplicada en VistaCobrador, SupervisorCobroView,
 * ruta-client y coordinador/rutas.
 */
export const mapFrecuenciaToPeriodo = (frecuencia?: FrecuenciaPago | null): PeriodoRuta => {
  switch (frecuencia) {
    case 'DIARIO':    return 'DIA'
    case 'SEMANAL':   return 'SEMANA'
    case 'QUINCENAL': return 'QUINCENA'
    case 'MENSUAL':   return 'MES'
    // Acepta también el valor ya convertido (idempotente)
    case 'DIA':       return 'DIA'
    case 'SEMANA':    return 'SEMANA'
    case 'QUINCENA':  return 'QUINCENA'
    case 'MES':       return 'MES'
    default:          return 'DIA'
  }
}

