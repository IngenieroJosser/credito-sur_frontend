export type EstadoVisita = 'pendiente' | 'pagado' | 'en_mora' | 'ausente' | 'reprogramado' | 'en_prorroga' | 'gestionado'
export type PeriodoRuta = 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES'

/**
 * La cuota que toca cobrar, tal y como la devuelve el endpoint de rutas.
 *
 * NO es la cuota de la base de datos (`Cuota` en types/domain.ts). El servidor
 * la enriquece antes de mandarla: le calcula el saldo exigible en la fecha
 * operativa, los dias de mora, lo vencido acumulado y la fecha efectiva, que
 * son las cifras con las que trabaja el cobrador en la calle. Por eso tiene
 * tipo propio: confundirla con la de la base lleva a leer `monto` donde hay
 * que leer `saldoExigibleEnFechaOperativa`.
 *
 * Se arma en RoutesService (routes.service.ts, "Step 5: Enrich cuota objetivo")
 * y el propio backend la marca como "fuente autoritativa para frontend".
 *
 * Todo es opcional, incluido el `id`: no todos los endpoints enriquecen igual,
 * y hay codigo que la reconstruye con `{ ...visita.cuotaObjetivo, ... }` sobre
 * una visita que puede no traerla. Declararlo obligatorio seria mentir.
 */
export interface CuotaOperativa {
  id?: string
  numeroCuota?: number

  /** Valor de la cuota. `montoNominal` es el valor sin mora ni recargos. */
  monto?: number
  montoCuota?: number
  montoNominal?: number
  montoCuotaNormal?: number
  montoPagado?: number

  /**
   * Lo que queda por cobrar en la fecha operativa. Es el numero que se le
   * pide al cliente, no `monto`.
   */
  saldoExigibleEnFechaOperativa?: number

  estado?: string
  /** Estado recalculado por el servidor; manda sobre `estado` si viene. */
  estadoActual?: string

  fechaVencimiento?: string
  fechaVencimientoProrroga?: string | null
  /** Cuando se pago, si se pago. */
  fechaPago?: string | null
  /** Fecha que cuenta de verdad: la prorrogada si la hay, si no la original. */
  fechaEfectiva?: string
  enProrroga?: boolean

  // Mora y vencido, calculados por el servidor sobre la fecha operativa.
  diasMora?: number
  diasMoraEnFecha?: number
  enMoraEnFechaOperativa?: boolean
  cuotasVencidas?: number
  cuotasVencidasEnFecha?: number
  numeroCuotasVencidas?: number
  montoMoraAcumulada?: number
  montoVencidoAcumulado?: number
  montoVencidoAcumuladoEnFecha?: number
  saldoVencidoAcumulado?: number

  // Reprogramacion y bloqueos de la jornada.
  esCuotaReprogramadaJornada?: boolean
  nuevaFechaReprogramada?: string | null
  cubiertaPorPagoJornada?: boolean
  motivoBloqueoPago?: string | null
  motivoBloqueoReprogramacion?: string | null
}

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
  /** Como quedo gestionada la obligacion: PENDIENTE, REPROGRAMADO, AUSENTE… */
  estadoGestion?: string
  /** Estado del prestamo completo (routes.service: estadoPrestamo: p.estado). */
  estadoPrestamo?: string
  /** Lo calcula el frontend al armar la ruta del dia. */
  nivelRiesgoObligacion?: string
  /** Cuanto se ha pagado de la obligacion. */
  montoPagado?: number
  /** Aprobacion que respalda una reprogramacion (routes.service:4761). */
  aprobacionReprogramacionId?: string | null

  // ───────────────────────────────────────────────────────────────────────
  // Nombres que `ruta-historial` acepta pero que HOY no manda ningun
  // endpoint: se buscaron en todo el backend y no aparecen ni una vez.
  //
  // No se quitan del codigo porque no molestan: cada uno esta en una cadena
  // `a || b || c` junto a un nombre que si llega (estadoGestion,
  // aprobacionReprogramacionId, estadoAprobacion), asi que la decision se
  // toma igual y quitarlos no cambiaria ningun resultado.
  //
  // Se declaran aqui para que quede dicho: si algun dia hay que tocar esas
  // cadenas, estos cuatro no son de donde viene el dato.
  // ───────────────────────────────────────────────────────────────────────
  tipoGestion?: string
  fechaReprogramada?: string | null
  nuevaFechaPago?: string | null
  aprobacionEstado?: string
  efectoProvisionalEstado?: string | null
  /** Frecuencia de cobro del prestamo (routes.service:769). */
  frecuenciaPago?: string
  /** Banderas que deja el enriquecedor de riesgo del historial. */
  riesgoHistoricoUiCalculado?: boolean
  riesgoHistoricoUiSource?: string
  /** Lo marca el frontend al enriquecer el historial: hubo mora ese dia. */
  enMoraHistorico?: boolean
  notasVisita?: string | null // Nota/justificación registrada al marcar ausencia
  proximaVisita: string
  targetVencimiento?: string
  ordenVisita: number
  prioridad: 'alta' | 'media' | 'baja'
  nivelRiesgo?: 'minimo' | 'leve' | 'precaucion' | 'moderado' | 'critico'
  cobradorId: string
  periodoRuta: PeriodoRuta
  clienteId: string
  prestamoId?: string
  /** Identificadores de la cuota que toca cobrar, sueltos. */
  cuotaId?: string
  cuotaObjetivoId?: string
  cuotaObjetivoPrestamoId?: string
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
  montoCuotaNormal?: number
  montoCuotaPendiente?: number
  /** Lo que queda por cobrar del periodo segun el servidor. */
  montoMetaOperativaPendiente?: number
  /** Saldo del prestamo completo, no de la cuota. */
  saldoPendiente?: number
  /** El prestamo, cuando la respuesta lo trae anidado. */
  prestamo?: { saldoPendiente?: number; [clave: string]: unknown } | null
  montoMoraAcumulada?: number
  montoVencidoAcumulado?: number
  saldoVencidoAcumulado?: number
  cuotasVencidas?: number
  // Crédito pendiente de revisión: el cliente aparece en la ruta pero aún no se puede cobrar
  pendienteAprobacion?: boolean
  estadoAprobacion?: string
  estadoEfectoProvisional?: string | null
  esProvisional?: boolean
  esRevertido?: boolean
  etiquetaRevision?: string | null
  fechaUltimoPago?: number      // Timestamp del último pago realizado para ordenamiento rápido
  /** La cuota que toca cobrar hoy, ya enriquecida por el servidor. */
  cuotaObjetivo?: CuotaOperativa | null
  /** La siguiente cuota; misma forma que la objetivo. */
  proximaCuota?: CuotaOperativa | null
}


/**
 * Una visita con lo que haya llegado.
 *
 * Las funciones del nucleo (`lib/rutas-core`) deciden cosas como si una visita
 * es exigible hoy leyendo cuatro o cinco campos, y se defienden solas de lo que
 * falte (`String(v?.campo || '')`). Se las llama con visitas completas, pero
 * tambien con objetos a medio armar mientras se enriquecen, y con fragmentos en
 * las pruebas. Pedirles una VisitaRuta entera seria pedir mas de lo que usan.
 */
export type VisitaParcial = Partial<VisitaRuta>
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

type NivelRiesgoBackend = 'VERDE' | 'AMARILLO' | 'PRECAUCION' | 'ROJO' | 'LISTA_NEGRA' | string
type NivelRiesgoFrontend = 'minimo' | 'leve' | 'precaucion' | 'moderado' | 'critico'

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
      return 'minimo'
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
      return 'minimo'
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

