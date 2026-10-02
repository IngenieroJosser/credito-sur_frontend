import { apiRequest } from '@/lib/api/api'
import { conRespaldoOffline, esErrorDeRed } from '@/lib/offline/conRespaldoOffline'
import { TipoAprobacion, EstadoAprobacion } from '@/types/enums'

export interface Aprobacion {
  id: string
  tipoAprobacion: TipoAprobacion
  referenciaId: string
  tablaReferencia: string
  solicitadoPorId: string
  aprobadoPorId: string | null
  estado: EstadoAprobacion
  comentarios: string | null
  /**
   * Los datos de la solicitud y los que el revisor corrigio, tal como vienen de sus
   * columnas `Json`.
   *
   * `Record<string, unknown>` y no `any`: quien los lee tiene que convertir cada campo,
   * que es lo que hace falta en un `Json`. De estos dos colgaba la mayoria de los `any`
   * de la pantalla de revisiones.
   */
  datosSolicitud: Record<string, unknown>
  datosAprobados: Record<string, unknown> | null
  montoSolicitud: number | null
  creadoEn: string
  actualizadoEn: string
  revisadoEn: string | null
  // Campos enriquecidos del backend
  solicitante?: string
  rolSolicitante?: string
  rechazadoPor?: string
  rolRechazador?: string
  solicitadoPor?: {
    id: string
    nombres: string
    apellidos: string
    rol: string
  }
}

export interface PendingResponse {
  total: number
  conteo: Record<string, number>
  items: Record<string, Aprobacion[]>
}

export interface SuperadminReviewResponse {
  total: number
  items: Aprobacion[]
}

export interface ApprovalMultimedia {
  id: string
  url?: string | null
  ruta?: string | null
  rutaArchivo?: string | null
  nombreOriginal?: string | null
  nombreArchivo?: string | null
  tipoContenido?: string | null
  tipoArchivo?: string | null
  formato?: string | null
  entidad?: string | null
  descripcion?: string | null
  creadoEn?: string
  clienteId?: string | null
  prestamoId?: string | null
  pagoId?: string | null
}

/**
 * El cliente tal como lo manda `GET /approvals/:id/context`.
 *
 * NO es el `Cliente` del servicio de clientes: aqui viene por un `select` acotado (ver
 * `getApprovalContext` en `approvals.service.ts`), asi que solo estan estos campos. Antes
 * era `any`, y eso permitia leer cualquier nombre sin que nada avisara.
 */
export interface ClienteDeContextoAprobacion {
  id: string
  codigo: string
  dni: string
  nombres: string
  apellidos: string
  telefono: string
  direccion: string | null
  nivelRiesgo: string
  enListaNegra: boolean
  razonListaNegra: string | null
  referencia: string | null
  referencia1Nombre: string | null
  referencia1Telefono: string | null
  referencia2Nombre: string | null
  referencia2Telefono: string | null
  /** Solo la asignacion activa, y de la ruta solo lo que se muestra. */
  asignacionesRuta: Array<{
    ruta: {
      id: string
      nombre: string
      codigo: string
      cobrador: { id: string; nombres: string; apellidos: string } | null
    }
  }>
}

/** Una cuota del credito, con los ocho campos que el contexto selecciona. */
export interface CuotaDeContextoAprobacion {
  id: string
  numeroCuota: number
  fechaVencimiento: string
  fechaVencimientoProrroga: string | null
  fechaPago: string | null
  monto: number | string
  montoPagado: number | string
  estado: string
}

/**
 * Un credito del cliente en el contexto de aprobacion.
 *
 * El backend lo pide con `include`, asi que llegan todas las columnas del prestamo; aqui se
 * declaran las que las pantallas leen, mas `producto` y `cuotas`, que son las dos
 * relaciones que el `include` nombra. Si hace falta otra columna, se agrega: lo que no debe
 * volver es el `any`, que dejaba pasar nombres inexistentes.
 */
export interface CreditoDeContextoAprobacion {
  id: string
  numeroPrestamo: string
  estado: string
  tipoPrestamo: string
  frecuenciaPago: string
  cantidadCuotas: number
  saldoPendiente: number | string
  monto?: number | string
  producto?: {
    id: string
    nombre: string
    marca: string | null
    modelo: string | null
  } | null
  cuotas?: CuotaDeContextoAprobacion[]
}

/**
 * Un pago de los ultimos 30 dias. El backend lo pide con un `select` de OCHO campos, y esos
 * son todos los que llegan.
 */
export interface PagoDeContextoAprobacion {
  id: string
  numeroPago: string
  prestamoId: string
  montoTotal: number | string
  metodoPago: string
  fechaPago: string
  origenGestion: string | null
  fechaOperativaRuta: string | null
}

export interface ApprovalContext {
  approval: Aprobacion
  cliente: ClienteDeContextoAprobacion | null
  creditoSolicitud: CreditoDeContextoAprobacion | null
  creditosCliente: CreditoDeContextoAprobacion[]
  referencias: Array<{
    tipo: string
    nombre?: string | null
    telefono?: string | null
  }>
  multimedia: ApprovalMultimedia[]
  pagosUltimos30Dias: PagoDeContextoAprobacion[]
  metricas: {
    saldoTotalPendiente: number
    creditosActivos: number
    cuotasVencidas: number
    cuotasPagadas: number
    reprogramacionesPrevias: number
    pagosUltimos30Dias: number
    montoPagadoUltimos30Dias: number
    candidatoReprogramacion: boolean
    alertas: string[]
  }
}

export interface AprobarDto {
  type: TipoAprobacion
  aprobadoPorId?: string
  notas?: string
  resultadoRevision?: 'RECHAZADO_CON_DEUDA' | 'RECHAZADO_CON_REINTEGRO'
  editedData?: Record<string, unknown>
}

export interface RechazarDto {
  type: TipoAprobacion
  rechazadoPorId?: string
  motivoRechazo?: string
  notas?: string
  resultadoRevision?: 'RECHAZADO_CON_DEUDA' | 'RECHAZADO_CON_REINTEGRO'
}

export const aprobacionesService = {
  /**
   * Obtener todas las aprobaciones pendientes agrupadas por tipo
   */
  async obtenerPendientes(tipo?: TipoAprobacion): Promise<PendingResponse> {
    const params = tipo ? `?tipo=${tipo}` : ''
    return apiRequest<PendingResponse>('GET', `/approvals/pending${params}`)
  },

  /**
   * Obtener items para revisión del SuperAdmin (rechazados/eliminados)
   */
  async obtenerRevisionSuperadmin(): Promise<SuperadminReviewResponse> {
    return apiRequest<SuperadminReviewResponse>('GET', '/approvals/superadmin-review')
  },

  async obtenerMisSolicitudes(): Promise<Aprobacion[]> {
    return apiRequest<Aprobacion[]>('GET', '/approvals/my-requests')
  },

  async obtenerContexto(id: string): Promise<ApprovalContext> {
    return apiRequest<ApprovalContext>('GET', `/approvals/${id}/context`)
  },

  /**
   * Aprobar un item pendiente
   */
  async aprobar(id: string, data: AprobarDto): Promise<unknown> {
    // La validación cuatro-ojos y de estado la hace el SERVIDOR al reproducir;
    // encolar offline no la salta. Si al sincronizar ya no procede, va a conflictos.
    return conRespaldoOffline(
      () => apiRequest('POST', `/approvals/${id}/approve`, data),
      {
        type: 'aprobacion_aprobar',
        endpoint: `/approvals/${id}/approve`,
        method: 'POST',
        data,
        description: `Aprobar solicitud ${id}`,
      },
      { esOffline: true },
    )
  },

  /**
   * Rechazar un item pendiente
   */
  async rechazar(id: string, data: RechazarDto): Promise<unknown> {
    return conRespaldoOffline(
      () => apiRequest('POST', `/approvals/${id}/reject`, data),
      {
        type: 'aprobacion_rechazar',
        endpoint: `/approvals/${id}/reject`,
        method: 'POST',
        data,
        description: `Rechazar solicitud ${id}`,
      },
      { esOffline: true },
    )
  },

  /**
   * Confirmar o revertir un rechazo (solo SuperAdmin)
   */
  async confirmarAccionSuperadmin(
    id: string,
    accion: 'CONFIRMAR' | 'REVERTIR',
    notas?: string,
  ): Promise<unknown> {
    return conRespaldoOffline(
      () => apiRequest('POST', `/approvals/${id}/confirm-deletion`, { accion, notas }),
      {
        type: 'aprobacion_confirmar_superadmin',
        endpoint: `/approvals/${id}/confirm-deletion`,
        method: 'POST',
        data: { accion, notas },
        description: `Confirmar acción superadmin ${id}`,
      },
      { esOffline: true },
    )
  },

  /**
   * Obtener historial de aprobaciones de una entidad
   */
  async getHistorial(entidadId: string, tabla: string): Promise<Aprobacion[]> {
    // Es una LECTURA (aunque use POST): offline no se encola (no hay nada que
    // sincronizar); devolvemos vacío para no romper la vista.
    try {
      return await apiRequest<Aprobacion[]>('POST', '/approvals/history', { entidadId, tabla })
    } catch (error) {
      if (esErrorDeRed(error)) return []
      throw error
    }
  },
}
