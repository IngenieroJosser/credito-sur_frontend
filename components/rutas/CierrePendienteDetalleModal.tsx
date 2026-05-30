'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Users, CheckCircle2, Clock } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import {
  formatFechaCortaBogota,
  formatFechaHumanaBogota,
} from '@/lib/format-date'
import type { CierrePendienteDetalle } from '@/types/rutas/cierre-pendiente'

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
}) {
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(0)

  // Resetear selección cuando cambia el detalle
  useEffect(() => {
    setJornadaSeleccionada(0)
  }, [detalle?.totalPendientes])

  if (!open) return null

  // Detectar si hay jornadas[] (nueva estructura) o usar la estructura antigua
  const jornadas = detalle?.jornadas || []
  const tieneJornadas = jornadas.length > 0

  // Usar la jornada seleccionada o la estructura antigua
  const jornadaActual = tieneJornadas ? jornadas[jornadaSeleccionada] : detalle
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
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-3xl">
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
          <div className="flex shrink-0 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 overflow-x-auto scrollbar-hide">
            {jornadas.map((jornada, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setJornadaSeleccionada(index)}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
                  jornadaSeleccionada === index
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
                )}
              >
                {formatFechaCortaBogota(jornada.resumen?.fechaOperativa || '')}
                {jornada.resumen?.diasPendiente && (
                  <span className="ml-2 text-[10px] opacity-75">
                    ({jornada.resumen.diasPendiente} días)
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm font-bold text-slate-500">
            Cargando detalle operativo...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            {resumen && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Fecha pendiente
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {formatFechaCortaBogota(resumen.fechaOperativa)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Activada
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {formatFechaHumanaBogota(resumen.fechaActivacion)}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-bold uppercase text-red-500">
                    Días pendiente
                  </p>
                  <p className="mt-1 text-2xl font-black text-red-700">
                    {resumen.diasPendiente}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Efectividad
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {resumen.efectividad}%
                  </p>
                </div>
              </div>
            )}

            {resumen && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Metric label="Meta" value={formatCurrency(resumen.meta)} />
                <Metric label="Recaudo operativo" value={formatCurrency(resumen.recaudoOperativo ?? resumen.recaudo)} />
                <Metric label="Recaudo contable" value={formatCurrency(resumen.recaudoContable ?? 0)} />
                <Metric label="Regularizado" value={formatCurrency(resumen.recaudoRegularizado ?? 0)} />
                <Metric label="Clientes" value={String(resumen.totalClientes)} />
              </div>
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
                  {clientes.map((cliente) => (
                    <div key={cliente.asignacionId || cliente.clienteId} className="p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-black text-slate-900">
                            {cliente.nombreCliente || 'Cliente sin nombre'}
                          </p>
                          <p className="text-xs text-slate-500">
                            CC: {cliente.dni || 'N/A'} · Tel: {cliente.telefono || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {cliente.direccion || 'Sin dirección'}
                          </p>
                        </div>

                        <EstadoGestionBadge estado={cliente.estadoGestion} />
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <SmallInfo
                          label="Recaudado"
                          value={formatCurrency(cliente.recaudadoDelDia || 0)}
                        />
                        <SmallInfo
                          label="Estado visita"
                          value={cliente.estadoVisita || 'Sin registro'}
                        />
                        <SmallInfo
                          label="Notas"
                          value={cliente.notasVisita || 'Sin notas'}
                        />
                      </div>

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

                        {cliente.estadoGestion === 'PENDIENTE' && onRegistrarPago && (
                          <button
                            type="button"
                            onClick={() => onRegistrarPago(cliente, contextoRegularizacion)}
                            className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 sm:w-auto"
                          >
                            Registrar pago
                          </button>
                        )}

                        {cliente.estadoGestion === 'PENDIENTE' && onMarcarAusente && (
                          <button
                            type="button"
                            onClick={() => onMarcarAusente(cliente, contextoRegularizacion)}
                            className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 sm:w-auto"
                          >
                            Marcar ausente
                          </button>
                        )}

                        {cliente.estadoGestion === 'AUSENTE' && onReprogramar && (
                          <button
                            type="button"
                            onClick={() => onReprogramar(cliente, contextoRegularizacion)}
                            className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 sm:w-auto"
                          >
                            Reprogramar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

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
                    {(detalle?.accionesSugeridas || []).map((accion, index) => (
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
                    Acciones
                  </h3>

                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Exportar detalle
                    </button>

                    <button
                      type="button"
                      className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100"
                    >
                      Solicitar corrección al cobrador
                    </button>

                    {onRegularizar && (
                      <button
                        type="button"
                        onClick={() => onRegularizar(contextoRegularizacion)}
                        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                      >
                        Regularizar jornada
                      </button>
                    )}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
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
