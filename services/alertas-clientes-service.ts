import { apiRequest } from '@/lib/api/api'

export interface CrearAlertaClienteNoUbicadoDto {
  clienteId: string
  rutaId?: string
  motivo: string
  descripcion: string
  observacionesReportante: string
  ultimaUbicacionConocida?: string
  evidenciaIds?: string[]
}

export interface ResolverAlertaClienteDto {
  motivoResolucion: string
}

/** Las metricas agregadas del snapshot. Espejo de `MetricasAlertaCliente` del backend. */
export interface MetricasAlertaCliente {
  saldoPendienteTotal: number
  saldoPendienteCarteraActiva: number
  saldoPendientePendienteRevision: number
  cuotasVencidas: number
  saldoVencidoTotal: number
  creditosActivos: number
  creditosPendientesRevision: number
  totalObligaciones: number
}

/**
 * La foto del cliente guardada en la alerta. Espejo de `SnapshotClienteAlerta` del backend
 * (`alertas-clientes.service.ts`), donde tsc la valido contra Prisma.
 *
 * Es una FOTO y no una relacion a proposito: documenta como estaba el cliente cuando el
 * cobrador no lo encontro, y eso no debe cambiar despues.
 *
 * Todo es opcional porque hay DOS productores y el segundo no rellena lo mismo:
 *
 *  1. El backend, con `buildSnapshot`.
 *  2. El `fallbackAlerta` que arma `NotificacionDetalleModal` con la metadata de la
 *     notificacion, mientras la alerta de verdad no ha cargado o no tiene id. Usa las
 *     MISMAS claves (se comprobo una por una), pero de la metadata solo sale lo que la
 *     notificacion llevaba.
 *
 * Las fechas son `string`: viajan serializadas en JSON.
 */
export interface SnapshotClienteAlerta {
  cliente?: {
    // Admiten `null` porque el modal resuelve este objeto contra DOS origenes: el snapshot
    // (que copia columnas no nulas) y la relacion `AlertaCliente.cliente`, que si declara
    // `nombres`, `apellidos` y `dni` como anulables.
    id?: string
    codigo?: string | null
    dni?: string | null
    nombres?: string | null
    apellidos?: string | null
    telefono?: string | null
    direccion?: string | null
    nivelRiesgo?: string | null
    enListaNegra?: boolean
  }
  // Sin `| null`: el backend las filtra con una guarda de tipo, no con `.filter(Boolean)`,
  // que no estrecha.
  referencias?: Array<{
    tipo?: string
    nombre?: string | null
    telefono?: string | null
  }>
  ruta?: {
    id?: string
    nombre?: string
    codigo?: string
    cobrador?: { id?: string; nombres?: string; apellidos?: string } | null
  } | null
  creditos?: Array<{
    id?: string
    numeroPrestamo?: string
    estado?: string
    estadoAprobacion?: string
    esCarteraActiva?: boolean
    saldoPendiente?: number
    monto?: number
    tipoPrestamo?: string
    frecuenciaPago?: string
    cuotasVencidas?: number
    saldoVencido?: number
    cuotas?: Array<{
      id?: string
      numeroCuota?: number
      estado?: string
      monto?: number
      montoPagado?: number
      fechaVencimiento?: string
    }>
    pagosRecientes?: Array<{
      id?: string
      montoTotal?: number
      fechaPago?: string
      metodoPago?: string
    }>
  }>
  metricas?: Partial<MetricasAlertaCliente>
  historialVisitas?: Array<{
    id?: string
    fechaVisita?: string
    estadoVisita?: string
    notas?: string | null
    ruta?: { id?: string; nombre?: string } | null
    cobrador?: { id?: string; nombres?: string; apellidos?: string } | null
  }>
  evidencias?: Array<{
    id?: string
    tipoContenido?: string
    url?: string | null
    descripcion?: string | null
  }>
  /** Solo lo rellena el respaldo desde la notificacion. */
  cobrador?: { id?: string; nombres?: string; apellidos?: string } | null
}

export interface AlertaCliente {
  id: string
  clienteId: string
  rutaId?: string | null
  cobradorId?: string | null
  estado: 'ACTIVA' | 'RESUELTA' | string
  motivo: string
  descripcion: string
  observacionesReportante?: string | null
  ultimaUbicacionConocida?: string | null
  snapshotCliente?: SnapshotClienteAlerta
  evidenciaIds?: string[]
  notificadosCount?: number
  creadoEn: string
  resueltoEn?: string | null
  motivoResolucion?: string | null
  reportadoPor?: {
    id: string
    nombres: string
    apellidos: string
    rol: string
  } | null
  cliente?: {
    id: string
    nombres?: string | null
    apellidos?: string | null
    dni?: string | null
  } | null
  resueltoPor?: {
    id: string
    nombres: string
    apellidos: string
    rol: string
  } | null
}

export const alertasClientesService = {
  reportarClienteNoUbicado(data: CrearAlertaClienteNoUbicadoDto) {
    return apiRequest<AlertaCliente>(
      'POST',
      '/alertas-clientes/cliente-no-ubicado',
      data,
      { cacheTTL: 0 },
    )
  },

  listar(params?: {
    estado?: string
    rutaId?: string
    cobradorId?: string
    clienteId?: string
    q?: string
  }) {
    const search = new URLSearchParams()
    if (params?.estado) search.set('estado', params.estado)
    if (params?.rutaId) search.set('rutaId', params.rutaId)
    if (params?.cobradorId) search.set('cobradorId', params.cobradorId)
    if (params?.clienteId) search.set('clienteId', params.clienteId)
    if (params?.q) search.set('q', params.q)

    const query = search.toString()
    return apiRequest<AlertaCliente[]>(
      'GET',
      query ? `/alertas-clientes?${query}` : '/alertas-clientes',
      undefined,
      { cacheTTL: 0 },
    )
  },

  obtenerDetalle(id: string) {
    return apiRequest<AlertaCliente>(
      'GET',
      `/alertas-clientes/${id}`,
      undefined,
      { cacheTTL: 0 },
    )
  },

  resolver(id: string, data: ResolverAlertaClienteDto) {
    return apiRequest<AlertaCliente>(
      'PATCH',
      `/alertas-clientes/${id}/resolver`,
      data,
      { cacheTTL: 0 },
    )
  },
}

/**
 * La metadata de la NOTIFICACION de cliente no ubicado.
 *
 * No es una columna de la alerta: el esquema de `AlertaCliente` no tiene `metadata`. La
 * trae unicamente el `fallbackAlerta` que arma `NotificacionDetalleModal` a partir de la
 * notificacion, para poder pintar el detalle mientras la alerta de verdad no ha cargado o
 * no tiene id. Por eso todos los campos que el modal lee de aqui van en cadenas
 * `text(alerta?.campo, metadata.campo)`.
 *
 * Extiende las metricas porque el modal usa `metadata` como bolsa de metricas cuando el
 * snapshot no las trae (`snapshot.metricas || metadata || {}`).
 */
export interface MetadataAlertaClienteNotificacion
  extends Partial<MetricasAlertaCliente> {
  snapshotCliente?: SnapshotClienteAlerta
  clienteNombre?: string
  documento?: string
  estadoAlerta?: string
  rutaNombre?: string
  cobradorNombre?: string
  descripcion?: string
  motivo?: string
  ultimaUbicacionConocida?: string
  observacionesReportante?: string
  telefono?: string
  direccion?: string
}

/**
 * Lo que recibe `AlertaClienteDetalleModal`, que NO siempre es una `AlertaCliente` entera.
 *
 * Los dos productores: `alertasClientesService.obtenerDetalle` (la alerta completa) y el
 * `fallbackAlerta` de `NotificacionDetalleModal` (parcial, con `metadata`). De ahi que sea
 * `Partial` mas `metadata`.
 */
export interface AlertaClienteParaDetalle extends Partial<AlertaCliente> {
  metadata?: MetadataAlertaClienteNotificacion
}
