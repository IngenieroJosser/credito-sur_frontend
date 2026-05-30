'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import {
  formatFechaCortaBogota,
  formatFechaHumanaBogota,
} from '@/lib/format-date'
import type { CierrePendienteDetalle } from '@/types/rutas/cierre-pendiente'

// Helper para formato de fecha compacto (ej: 18 may)
function formatFechaDiaMes(value?: string | Date | null) {
  if (!value) return 'N/A'

  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00-05:00`)
      : new Date(value)

  if (Number.isNaN(date.getTime())) return 'N/A'

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
  }).format(date)
}

// Helper para determinar severidad de jornada
function getJornadaSeverity(diasPendiente: number) {
  if (diasPendiente >= 7) {
    return {
      label: 'Crítica',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (diasPendiente >= 3) {
    return {
      label: 'Alta',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    label: 'Reciente',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  }
}

// Helper para calcular cumplimiento
function getCumplimiento(meta: number, recaudo: number) {
  if (meta <= 0) {
    return {
      porcentaje: recaudo > 0 ? 100 : 0,
      label: recaudo > 0 ? 'Recaudo sin meta' : 'Sin meta',
      excedente: 0,
      pendiente: 0,
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    }
  }

  const porcentaje = Math.round((recaudo / meta) * 100)
  const excedente = Math.max(0, recaudo - meta)
  const pendiente = Math.max(0, meta - recaudo)

  if (porcentaje > 100) {
    return {
      porcentaje,
      label: 'Sobre-meta',
      excedente,
      pendiente,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (porcentaje === 100) {
    return {
      porcentaje,
      label: 'Meta cumplida',
      excedente,
      pendiente,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (porcentaje >= 80) {
    return {
      porcentaje,
      label: 'En progreso',
      excedente,
      pendiente,
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    porcentaje,
    label: 'Bajo cumplimiento',
    excedente,
    pendiente,
    className: 'border-red-200 bg-red-50 text-red-700',
  }
}

export function CierrePendienteDetalleModal({
  open,
  onClose,
  detalle,
  loading,
  onRegularizar,
  onVerEstadoCuenta,
  onRegistrarPago,
  onMarcarAusente,
  onReprogramar,
  permissions,
  handlers,
}: {
  open: boolean
  onClose: () => void
  detalle: CierrePendienteDetalle | null
  loading?: boolean
  onRegularizar?: (contexto: {
    rutaId?: string
    fechaOperativa?: string
    activacionId?: string
    origenGestion: 'CIERRE_PENDIENTE'
  }) => void
  onVerEstadoCuenta?: (cliente: any, contextoRegularizacion?: any) => void
  onRegistrarPago?: (cliente: any, contextoRegularizacion?: any) => void
  onMarcarAusente?: (cliente: any, contextoRegularizacion?: any) => void
  onReprogramar?: (cliente: any, contextoRegularizacion?: any) => void
  permissions?: {
    canExportarDetalle?: boolean
    canSolicitarCorreccion?: boolean
    canCerrarJornada?: boolean
    canRegistrarPago?: boolean
    canMarcarAusente?: boolean
    canAnularAusencia?: boolean
    canReprogramar?: boolean
    canVerPago?: boolean
    canVerComprobante?: boolean
    canAgregarObservacion?: boolean
  }
  handlers?: {
    onExportarDetalle?: (contexto: any) => void
    onSolicitarCorreccion?: (contexto: any) => void
    onAnularAusencia?: (cliente: any, contextoRegularizacion?: any) => void
    onVerPago?: (cliente: any, contextoRegularizacion?: any) => void
    onVerComprobante?: (cliente: any, contextoRegularizacion?: any) => void
    onAgregarObservacion?: (cliente: any, contextoRegularizacion?: any) => void
  }
}) {
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(0)
  const [processingCliente, setProcessingCliente] = useState<string | null>(null)

  // Resetear selección cuando cambia el detalle
  useEffect(() => {
    if (open) setJornadaSeleccionada(0)
  }, [
    open,
    detalle?.totalPendientes,
    detalle?.jornadas?.[0]?.resumen?.rutaId,
  ])

  if (!open) return null

  // Detectar si hay jornadas[] (nueva estructura) o usar la estructura antigua
  const jornadas = detalle?.jornadas || []
  const tieneJornadas = jornadas.length > 0

  // Usar la jornada seleccionada o la estructura antigua
  const jornadaActual = tieneJornadas ? (jornadas[jornadaSeleccionada] || jornadas[0]) : detalle
  const resumen = jornadaActual?.resumen
  const clientes = jornadaActual?.clientes || []
  const cierrePendiente = jornadaActual?.cierrePendiente || detalle?.cierrePendiente
  const accionesSugeridas = jornadaActual?.accionesSugeridas || detalle?.accionesSugeridas

  const contextoRegularizacion = {
    rutaId: resumen?.rutaId,
    fechaOperativa: resumen?.fechaOperativa,
    activacionId: cierrePendiente?.activacionId,
    origenGestion: 'CIERRE_PENDIENTE' as const,
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 sm:text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              Jornada pendiente
            </div>

            <h2 className="text-lg font-black leading-tight text-slate-900 sm:text-2xl">
              {tieneJornadas
                ? `Jornadas pendientes (${detalle?.totalPendientes || jornadas.length})`
                : 'Detalle de jornada pendiente'}
            </h2>

            <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500 sm:text-sm">
              {resumen?.rutaNombre || 'Ruta'} · {resumen?.cobradorNombre || 'Sin cobrador'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selector de jornadas si hay múltiples jornadas pendientes */}
        {tieneJornadas && (
          <>
            <div className="flex shrink-0 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 overflow-x-auto scrollbar-hide">
              {jornadas.map((jornada, index) => {
                const diasPendiente = jornada.resumen?.diasPendiente || 0
                const severity = getJornadaSeverity(diasPendiente)
                const isSelected = jornadaSeleccionada === index

                return (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setJornadaSeleccionada(index)}
                    className={cn(
                      'shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2',
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    {formatFechaDiaMes(jornada.resumen?.fechaOperativa)}
                    <span className="ml-2 text-[10px] opacity-75">
                      {diasPendiente}d
                    </span>
                    {!isSelected && (
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${severity.className}`}>
                        {severity.label}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="px-4 pt-2 text-[11px] font-medium text-slate-400 sm:hidden">
              Desliza para ver más jornadas
            </p>
          </>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm font-bold text-slate-500">
            Cargando detalle operativo...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
            {resumen && (
              <>
                {/* Grupo A - Header de jornada */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Jornada seleccionada
                      </p>
                      <h3 className="text-lg font-black text-slate-900">
                        {formatFechaCortaBogota(resumen.fechaOperativa)}
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        Activada: {formatFechaHumanaBogota(resumen.fechaActivacion)}
                      </p>
                    </div>

                    {(() => {
                      const severity = getJornadaSeverity(resumen.diasPendiente || 0)
                      return (
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${severity.className}`}>
                          {severity.label} · {resumen.diasPendiente} días pendiente
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* Resumen accionable */}
                {(() => {
                  const cumplimiento = getCumplimiento(
                    Number(resumen.meta || 0),
                    Number(resumen.recaudoOperativo ?? resumen.recaudo ?? 0),
                  )
                  const clientesPendientes = resumen.clientesPendientes ?? 0

                  if (cumplimiento.excedente > 0) {
                    return (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                        Esta jornada supera la meta por {formatCurrency(cumplimiento.excedente)}. Revisa los clientes y cierra la jornada si la información es correcta.
                      </div>
                    )
                  }
                  if (clientesPendientes > 0) {
                    return (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                        Esta jornada todavía tiene {clientesPendientes} cliente(s) sin gestión. Regulariza o registra una observación antes de cerrar.
                      </div>
                    )
                  }
                  return (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
                      La jornada no tiene clientes pendientes. Puede cerrarse como regularizada si la información es correcta.
                    </div>
                  )
                })()}

                {/* Grupo B - Recaudo */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-400">Recaudo</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">Meta</p>
                      <p className="mt-1 text-xl font-black text-slate-900">
                        {formatCurrency(resumen.meta)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Recaudo operativo
                      </p>
                      <p className="mt-1 text-xl font-black text-slate-900">
                        {formatCurrency(resumen.recaudoOperativo ?? resumen.recaudo)}
                      </p>
                    </div>

                    {(() => {
                      const cumplimiento = getCumplimiento(
                        Number(resumen.meta || 0),
                        Number(resumen.recaudoOperativo ?? resumen.recaudo ?? 0),
                      )
                      return (
                        <div className={`rounded-2xl border p-4 ${cumplimiento.className}`}>
                          <p className="text-xs font-bold uppercase">Cumplimiento</p>
                          <p className="mt-1 text-xl font-black">
                            {cumplimiento.porcentaje}%
                          </p>
                          <p className="text-xs font-bold">
                            {cumplimiento.label}
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Grupo C - Auditoría contable */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-400">Auditoría contable</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Registrado ese día
                      </p>
                      <p className="text-sm font-black text-slate-700">
                        {formatCurrency(resumen.recaudoContable ?? 0)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Dinero registrado en la fecha operativa consultada.
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Regularizado después
                      </p>
                      <p className="text-sm font-black text-slate-700">
                        {formatCurrency(resumen.recaudoRegularizado ?? 0)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Pagos asociados a esta jornada desde otra fecha.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="font-black text-slate-900">
                    Clientes de la jornada
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Gestiona pagos, ausencias y pendientes de la fecha seleccionada.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 sm:max-h-[420px] sm:overflow-y-auto">
                  {(() => {
                    // Ordenar clientes por estado de gestión: pendientes, ausentes, pagos
                    const clientesPendientes = clientes.filter(c => c.estadoGestion === 'PENDIENTE')
                    const clientesAusentes = clientes.filter(c => c.estadoGestion === 'AUSENTE')
                    const clientesPagaron = clientes.filter(c => c.estadoGestion === 'PAGO_REGISTRADO')
                    const clientesOrdenados = [...clientesPendientes, ...clientesAusentes, ...clientesPagaron]

                    return clientesOrdenados.map((cliente) => (
                      <div key={cliente.asignacionId || cliente.clienteId} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">
                              {cliente.nombreCliente || 'Cliente sin nombre'}
                            </p>
                            <p className="text-xs text-slate-500">
                              CC: {cliente.dni || 'N/A'} · Tel: {cliente.telefono || 'N/A'}
                            </p>
                            <p className="line-clamp-2 text-xs text-slate-400">
                              {cliente.direccion || 'Sin dirección'}
                            </p>
                          </div>

                          <EstadoGestionBadge estado={cliente.estadoGestion} />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <SmallInfo
                            label="Recaudado"
                            value={formatCurrency(cliente.recaudadoDelDia || 0)}
                          />
                          <SmallInfo
                            label="Visita"
                            value={cliente.estadoVisita || 'Sin registro'}
                          />
                        </div>

                        {cliente.notasVisita && (
                          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                            {cliente.notasVisita}
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                          {onVerEstadoCuenta && (
                            <button
                              type="button"
                              onClick={() => onVerEstadoCuenta(cliente, contextoRegularizacion)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:w-auto"
                            >
                              Estado de cuenta
                            </button>
                          )}

                          {cliente.estadoGestion === 'PENDIENTE' && permissions?.canRegistrarPago && onRegistrarPago && (() => {
                            const clienteId = cliente.clienteId || cliente.asignacionId
                            if (!clienteId) return null
                            return (
                              <button
                                type="button"
                                onClick={async () => {
                                  setProcessingCliente(clienteId)
                                  try {
                                    await onRegistrarPago(cliente, contextoRegularizacion)
                                  } finally {
                                    setProcessingCliente(null)
                                  }
                                }}
                                disabled={processingCliente === clienteId}
                                className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {processingCliente === clienteId ? 'Procesando...' : 'Registrar pago regularizado'}
                              </button>
                            )
                          })()}

                          {cliente.estadoGestion === 'PENDIENTE' && permissions?.canMarcarAusente && onMarcarAusente && (() => {
                            const clienteId = cliente.clienteId || cliente.asignacionId
                            if (!clienteId) return null
                            return (
                              <button
                                type="button"
                                onClick={async () => {
                                  setProcessingCliente(clienteId)
                                  try {
                                    await onMarcarAusente(cliente, contextoRegularizacion)
                                  } finally {
                                    setProcessingCliente(null)
                                  }
                                }}
                                disabled={processingCliente === clienteId}
                                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {processingCliente === clienteId ? 'Procesando...' : 'Marcar ausente'}
                              </button>
                            )
                          })()}

                          {cliente.estadoGestion === 'PENDIENTE' && permissions?.canReprogramar && onReprogramar && (() => {
                            const clienteId = cliente.clienteId || cliente.asignacionId
                            if (!clienteId) return null
                            return (
                              <button
                                type="button"
                                onClick={async () => {
                                  setProcessingCliente(clienteId)
                                  try {
                                    await onReprogramar(cliente, contextoRegularizacion)
                                  } finally {
                                    setProcessingCliente(null)
                                  }
                                }}
                                disabled={processingCliente === clienteId}
                                className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {processingCliente === clienteId ? 'Procesando...' : 'Reprogramar'}
                              </button>
                            )
                          })()}

                          {cliente.estadoGestion === 'PENDIENTE' && permissions?.canAgregarObservacion && handlers?.onAgregarObservacion && (() => {
                            const clienteId = cliente.clienteId || cliente.asignacionId
                            if (!clienteId) return null
                            return (
                              <button
                                type="button"
                                onClick={async () => {
                                  setProcessingCliente(clienteId)
                                  try {
                                    await handlers.onAgregarObservacion?.(cliente, contextoRegularizacion)
                                  } finally {
                                    setProcessingCliente(null)
                                  }
                                }}
                                disabled={processingCliente === clienteId}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {processingCliente === clienteId ? 'Procesando...' : 'Agregar observación'}
                              </button>
                            )
                          })()}

                          {cliente.estadoGestion === 'AUSENTE' && permissions?.canRegistrarPago && onRegistrarPago && (() => {
                            const clienteId = cliente.clienteId || cliente.asignacionId
                            if (!clienteId) return null
                            return (
                              <button
                                type="button"
                                onClick={async () => {
                                  setProcessingCliente(clienteId)
                                  try {
                                    await onRegistrarPago(cliente, contextoRegularizacion)
                                  } finally {
                                    setProcessingCliente(null)
                                  }
                                }}
                                disabled={processingCliente === clienteId}
                                className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {processingCliente === clienteId ? 'Procesando...' : 'Registrar pago regularizado'}
                              </button>
                            )
                          })()}

                          {cliente.estadoGestion === 'AUSENTE' && permissions?.canAnularAusencia && handlers?.onAnularAusencia && (() => {
                            const clienteId = cliente.clienteId || cliente.asignacionId
                            if (!clienteId) return null
                            return (
                              <button
                                type="button"
                                onClick={async () => {
                                  setProcessingCliente(clienteId)
                                  try {
                                    await handlers.onAnularAusencia?.(cliente, contextoRegularizacion)
                                  } finally {
                                    setProcessingCliente(null)
                                  }
                                }}
                                disabled={processingCliente === clienteId}
                                className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {processingCliente === clienteId ? 'Procesando...' : 'Anular ausencia'}
                              </button>
                            )
                          })()}

                          {cliente.estadoGestion === 'AUSENTE' && permissions?.canReprogramar && onReprogramar && (() => {
                            const clienteId = cliente.clienteId || cliente.asignacionId
                            if (!clienteId) return null
                            return (
                              <button
                                type="button"
                                onClick={async () => {
                                  setProcessingCliente(clienteId)
                                  try {
                                    await onReprogramar(cliente, contextoRegularizacion)
                                  } finally {
                                    setProcessingCliente(null)
                                  }
                                }}
                                disabled={processingCliente === clienteId}
                                className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {processingCliente === clienteId ? 'Procesando...' : 'Reprogramar'}
                              </button>
                            )
                          })()}

                          {cliente.estadoGestion === 'AUSENTE' && permissions?.canAgregarObservacion && handlers?.onAgregarObservacion && (() => {
                            const clienteId = cliente.clienteId || cliente.asignacionId
                            if (!clienteId) return null
                            return (
                              <button
                                type="button"
                                onClick={async () => {
                                  setProcessingCliente(clienteId)
                                  try {
                                    await handlers.onAgregarObservacion?.(cliente, contextoRegularizacion)
                                  } finally {
                                    setProcessingCliente(null)
                                  }
                                }}
                                disabled={processingCliente === clienteId}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {processingCliente === clienteId ? 'Procesando...' : 'Editar observación'}
                              </button>
                            )
                          })()}

                          {cliente.estadoGestion === 'PAGO_REGISTRADO' && permissions?.canVerPago && handlers?.onVerPago && (
                            <button
                              type="button"
                              onClick={() => handlers.onVerPago?.(cliente, contextoRegularizacion)}
                              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 sm:w-auto"
                            >
                              Ver pago
                            </button>
                          )}

                          {cliente.estadoGestion === 'PAGO_REGISTRADO' && permissions?.canVerComprobante && handlers?.onVerComprobante && (
                            <button
                              type="button"
                              onClick={() => handlers.onVerComprobante?.(cliente, contextoRegularizacion)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:w-auto"
                            >
                              Ver comprobante
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  })()}

                  {clientes.length === 0 && (
                    <div className="p-8 text-center text-sm font-bold text-slate-400">
                      No hay clientes programados para esta jornada.
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-black text-amber-900">
                    Gestión recomendada
                  </h3>

                  <div className="mt-3 space-y-2">
                    {(accionesSugeridas || []).map((accion, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800"
                      >
                        {accion}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-black text-slate-900">
                    Acciones de la jornada
                  </h3>

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {permissions?.canExportarDetalle && handlers?.onExportarDetalle ? (
                      <button
                        type="button"
                        onClick={() => handlers.onExportarDetalle?.(contextoRegularizacion)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Exportar detalle
                      </button>
                    ) : permissions?.canExportarDetalle ? (
                      <button
                        type="button"
                        disabled
                        title="Función no disponible todavía"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Exportar detalle
                      </button>
                    ) : null}

                    {permissions?.canSolicitarCorreccion && handlers?.onSolicitarCorreccion ? (
                      <button
                        type="button"
                        onClick={() => handlers.onSolicitarCorreccion?.(contextoRegularizacion)}
                        className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100"
                      >
                        Solicitar corrección al cobrador
                      </button>
                    ) : permissions?.canSolicitarCorreccion ? (
                      <button
                        type="button"
                        disabled
                        title="Función no disponible todavía"
                        className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Solicitar corrección al cobrador
                      </button>
                    ) : null}

                    {permissions?.canCerrarJornada && onRegularizar && (() => {
                      const clientesPendientes = resumen?.clientesPendientes ?? 0
                      return (
                        <button
                          type="button"
                          onClick={() => onRegularizar(contextoRegularizacion)}
                          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                        >
                          {clientesPendientes > 0
                            ? 'Cerrar con observación administrativa'
                            : 'Cerrar jornada regularizada'}
                        </button>
                      )
                    })()}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-700">{value}</p>
    </div>
  )
}

function EstadoGestionBadge({
  estado,
}: {
  estado: 'PAGO_REGISTRADO' | 'AUSENTE' | 'PENDIENTE'
}) {
  const map = {
    PAGO_REGISTRADO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    AUSENTE: 'border-amber-200 bg-amber-50 text-amber-700',
    PENDIENTE: 'border-red-200 bg-red-50 text-red-700',
  }

  const label = {
    PAGO_REGISTRADO: 'Pago registrado',
    AUSENTE: 'Ausente',
    PENDIENTE: 'Sin gestión',
  }

  return (
    <span
      className={[
        'inline-flex rounded-full border px-3 py-1 text-xs font-black',
        map[estado],
      ].join(' ')}
    >
      {label[estado]}
    </span>
  )
}
