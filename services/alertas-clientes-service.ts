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
  snapshotCliente?: any
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
