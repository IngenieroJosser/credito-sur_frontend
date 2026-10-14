import type { Aprobacion, ApprovalContext } from '@/services/aprobaciones-service'

export interface ResumenAprobacion {
  titulo: string
  subtitulo: string
  monto: number | null
  labelMonto?: string
  montoSecundario?: number | null
  labelSecundario?: string
}

const texto = (value: unknown): string | undefined => {
  const normalized = String(value ?? '').trim()
  return normalized || undefined
}

const numero = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

const unir = (...parts: Array<string | undefined>): string =>
  parts.filter(Boolean).join(' · ')

export const montoSolicitudConocido = (
  item: Pick<Aprobacion, 'tipoAprobacion' | 'datosSolicitud' | 'montoSolicitud'>,
): number | undefined => {
  const datos = item.datosSolicitud || {}

  if (item.tipoAprobacion === 'PAGO_TRANSFERENCIA') {
    return numero(datos.montoTotal) ?? numero(item.montoSolicitud)
  }

  if (item.tipoAprobacion === 'SOLICITUD_BASE_EFECTIVO') {
    return numero(datos.monto) ?? numero(item.montoSolicitud)
  }

  return numero(datos.monto) ?? numero(item.montoSolicitud)
}

export const resumenAprobacionOperativa = (item: Aprobacion): ResumenAprobacion | null => {
  const datos = item.datosSolicitud || {}
  const solicitante = texto(item.solicitante) || 'Solicitante no informado'

  if (item.tipoAprobacion === 'PAGO_TRANSFERENCIA') {
    const cliente = texto(datos.cliente) || texto(datos.clienteNombre)
    const prestamo = texto(datos.numeroPrestamo)
    const referencia = texto(datos.numeroReferencia)

    return {
      titulo: cliente || 'Pago por transferencia',
      subtitulo: unir(
        prestamo ? `Crédito ${prestamo}` : undefined,
        referencia ? `Ref. ${referencia}` : undefined,
        `Solicitado por ${solicitante}`,
      ),
      monto: montoSolicitudConocido(item) ?? null,
      labelMonto: 'Valor transferido',
    }
  }

  if (item.tipoAprobacion === 'SOLICITUD_BASE_EFECTIVO') {
    const ruta = texto(datos.rutaNombre) || texto(datos.ruta) || texto(datos.rutaCodigo)
    const caja = texto(datos.cajaNombre) || texto(datos.caja)
    const descripcion = texto(datos.descripcion) || texto(datos.motivo)

    return {
      titulo: ruta ? `Base para ${ruta}` : 'Solicitud de base de efectivo',
      subtitulo: unir(caja, descripcion, `Solicitada por ${solicitante}`),
      monto: montoSolicitudConocido(item) ?? null,
      labelMonto: 'Base solicitada',
    }
  }

  return null
}

export const enriquecerAprobacionConContexto = (
  item: Aprobacion,
  context: ApprovalContext,
): Aprobacion => {
  const credito = context.creditoSolicitud
  const cliente = context.cliente
  const datos = item.datosSolicitud || {}
  const nombreCliente = cliente
    ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim()
    : undefined
  const comprobantes = (context.multimedia || []).filter(
    (archivo) =>
      String(archivo.tipoContenido || '').toUpperCase() === 'COMPROBANTE_TRANSFERENCIA' &&
      (!credito?.id || !archivo.prestamoId || archivo.prestamoId === credito.id),
  )

  return {
    ...item,
    datosSolicitud: {
      ...datos,
      cliente: texto(datos.cliente) || texto(datos.clienteNombre) || nombreCliente,
      clienteNombre: texto(datos.clienteNombre) || texto(datos.cliente) || nombreCliente,
      clienteDni: texto(datos.clienteDni) || cliente?.dni,
      numeroPrestamo: texto(datos.numeroPrestamo) || credito?.numeroPrestamo,
      tipoPrestamo: texto(datos.tipoPrestamo) || credito?.tipoPrestamo,
      prestamoId: texto(datos.prestamoId) || credito?.id,
      archivos: Array.isArray(datos.archivos) ? datos.archivos : comprobantes,
      rutaNombre:
        texto(datos.rutaNombre) ||
        cliente?.asignacionesRuta?.find(
          (asignacion) => asignacion.ruta.id === texto(datos.rutaId),
        )?.ruta.nombre ||
        cliente?.asignacionesRuta?.[0]?.ruta.nombre,
      rutaCodigo:
        texto(datos.rutaCodigo) ||
        cliente?.asignacionesRuta?.find(
          (asignacion) => asignacion.ruta.id === texto(datos.rutaId),
        )?.ruta.codigo ||
        cliente?.asignacionesRuta?.[0]?.ruta.codigo,
    },
  }
}
