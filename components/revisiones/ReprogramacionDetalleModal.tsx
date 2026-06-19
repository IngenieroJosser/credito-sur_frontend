'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileImage,
  Loader2,
  MessageSquare,
  Phone,
  Receipt,
  ShieldAlert,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { aprobacionesService, type ApprovalContext } from '@/services/aprobaciones-service'

export interface ReprogramacionData {
  id: string
  solicitante?: string
  creadoEn?: string
  estado?: string

  cliente?: string
  clienteNombre?: string
  numeroPrestamo?: string
  montoCuota?: number
  fechaGestionOriginal?: string
  fechaVencimientoOriginal?: string
  nuevaFechaVencimiento?: string
  motivo?: string
  gestionadoPor?: string
}

export interface ReprogramacionDetalleModalProps {
  isOpen: boolean
  onClose: () => void
  data: ReprogramacionData | null
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  canApprove?: boolean
  isProcessing?: boolean
}

type TabKey = 'solicitud' | 'cliente' | 'creditos' | 'pagos' | 'evidencias' | 'referencias'

const TABS: Array<{ id: TabKey; label: string; icon: React.ElementType }> = [
  { id: 'solicitud', label: 'Solicitud', icon: CalendarClock },
  { id: 'cliente', label: 'Cliente', icon: User },
  { id: 'creditos', label: 'Créditos', icon: CreditCard },
  { id: 'pagos', label: 'Pagos', icon: Receipt },
  { id: 'evidencias', label: 'Evidencias', icon: FileImage },
  { id: 'referencias', label: 'Referencias', icon: Users },
]

function formatFecha(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    const raw = String(iso).trim()
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    const dateToParse = isDateOnly ? `${raw}T12:00:00-05:00` : raw

    return new Date(dateToParse).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatFechaHora(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '—'
  }
}

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

function InfoTile({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: React.ReactNode
  tone?: 'slate' | 'orange' | 'emerald' | 'rose'
}) {
  const tones = {
    slate: 'bg-white border-slate-200 text-slate-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
  }

  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <div className="text-sm font-black leading-tight">{value || '—'}</div>
    </div>
  )
}

export default function ReprogramacionDetalleModal({
  isOpen,
  onClose,
  data,
  onApprove,
  onReject,
  canApprove = true,
  isProcessing = false,
}: ReprogramacionDetalleModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('solicitud')
  const [context, setContext] = useState<ApprovalContext | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !data?.id) return

    let cancelled = false
    setActiveTab('solicitud')
    setLoadingContext(true)
    setContextError(null)

    aprobacionesService.obtenerContexto(data.id)
      .then((result) => {
        if (!cancelled) setContext(result)
      })
      .catch((error) => {
        if (!cancelled) {
          setContext(null)
          setContextError(error?.message || 'No se pudo cargar el contexto')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, data?.id])

  const clienteNombre = useMemo(() => {
    const cliente = context?.cliente
    const desdeContexto = `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim()
    return data?.cliente || data?.clienteNombre || desdeContexto || '—'
  }, [context?.cliente, data?.cliente, data?.clienteNombre])

  if (!isOpen || !data) return null

  const montoCuota = Number(data.montoCuota || context?.approval?.datosSolicitud?.montoCuota || 0)
  const metricas = context?.metricas

  const renderLoading = () => (
    <div className="py-8 text-center text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
      <p className="text-xs font-bold">Cargando contexto...</p>
    </div>
  )

  const renderSolicitud = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InfoTile label="Cliente" value={clienteNombre} />
        <InfoTile label="Crédito" value={data.numeroPrestamo || context?.creditoSolicitud?.numeroPrestamo} />
        <InfoTile label="Monto cuota" value={montoCuota > 0 ? formatCurrency(montoCuota) : '—'} tone="orange" />
        <InfoTile label="Estado" value={data.estado || context?.approval?.estado} />
        <InfoTile label="Fecha original" value={formatFecha(data.fechaVencimientoOriginal)} />
        <InfoTile label="Nueva fecha" value={formatFecha(data.nuevaFechaVencimiento)} tone="orange" />
      </div>

      <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
          <User className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Solicitado por</p>
          <p className="text-sm font-black text-slate-900">{data.gestionadoPor || data.solicitante || '—'}</p>
          {data.creadoEn && (
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatFechaHora(data.creadoEn)}
            </p>
          )}
        </div>
      </div>

      {data.motivo && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motivo</p>
          </div>
          <p className="text-sm text-slate-700 font-medium leading-relaxed border-l-4 border-slate-300 pl-3">
            {data.motivo}
          </p>
        </div>
      )}
    </div>
  )

  const renderCliente = () => {
    const cliente = context?.cliente
    if (loadingContext) return renderLoading()
    if (!cliente) return <EmptyState text={contextError || 'Sin contexto de cliente'} />

    const ruta = cliente.asignacionesRuta?.[0]?.ruta
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InfoTile label="Nombre" value={`${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim()} />
          <InfoTile label="Cédula" value={cliente.dni} />
          <InfoTile label="Teléfono" value={cliente.telefono} />
          <InfoTile label="Riesgo cliente" value={cliente.nivelRiesgo} tone={cliente.enListaNegra ? 'rose' : 'slate'} />
        </div>
        <InfoTile label="Dirección" value={cliente.direccion} />
        <InfoTile
          label="Ruta activa"
          value={ruta ? `${ruta.nombre || ruta.codigo} · ${ruta.cobrador?.nombres || ''} ${ruta.cobrador?.apellidos || ''}`.trim() : '—'}
        />
      </div>
    )
  }

  const renderCreditos = () => {
    if (loadingContext) return renderLoading()
    if (!context?.creditosCliente?.length) return <EmptyState text="Sin créditos asociados" />

    return (
      <div className="space-y-3">
        {context.creditosCliente.map((credito) => {
          const vencidas = (credito.cuotas || []).filter((cuota: any) => cuota.estado === 'VENCIDA').length
          const pagadas = (credito.cuotas || []).filter((cuota: any) => cuota.estado === 'PAGADA').length
          const isTarget = credito.id === context.creditoSolicitud?.id
          return (
            <div key={credito.id} className={`rounded-2xl border p-4 ${isTarget ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{credito.numeroPrestamo}</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    {credito.tipoPrestamo} · {credito.frecuenciaPago} · {credito.estado}
                  </p>
                </div>
                {isTarget && (
                  <span className="px-2 py-1 rounded-full bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest">
                    Solicitud
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <InfoTile label="Saldo" value={formatCurrency(Number(credito.saldoPendiente || 0))} />
                <InfoTile label="Vencidas" value={vencidas} tone={vencidas > 0 ? 'rose' : 'slate'} />
                <InfoTile label="Pagadas" value={pagadas} tone={pagadas > 0 ? 'emerald' : 'slate'} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderPagos = () => {
    if (loadingContext) return renderLoading()
    if (!context?.pagosUltimos30Dias?.length) return <EmptyState text="Sin pagos recientes" />

    return (
      <div className="space-y-3">
        {context.pagosUltimos30Dias.map((pago) => (
          <div key={pago.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900">{formatCurrency(Number(pago.montoTotal || 0))}</p>
              <p className="text-[11px] font-bold text-slate-500">{pago.metodoPago || '—'} · {formatFechaHora(pago.fechaPago)}</p>
            </div>
            <Receipt className="h-5 w-5 text-emerald-500" />
          </div>
        ))}
      </div>
    )
  }

  const renderEvidencias = () => {
    if (loadingContext) return renderLoading()
    if (!context?.multimedia?.length) return <EmptyState text="Sin evidencias cargadas" />

    return (
      <div className="grid grid-cols-1 gap-3">
        {context.multimedia.map((item) => (
          <a
            key={item.id}
            href={item.url || item.ruta}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-orange-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileImage className="h-5 w-5 text-orange-500" />
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{item.descripcion || item.nombreOriginal || 'Evidencia'}</p>
                <p className="text-[11px] font-bold text-slate-400">{item.tipoContenido || item.formato || 'Archivo'}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    )
  }

  const renderReferencias = () => {
    if (loadingContext) return renderLoading()
    if (!context?.referencias?.length) return <EmptyState text="Sin referencias registradas" />

    return (
      <div className="space-y-3">
        {context.referencias.map((referencia) => (
          <div key={referencia.tipo} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{referencia.tipo.replace(/_/g, ' ')}</p>
            <p className="text-sm font-black text-slate-900 mt-1">{referencia.nombre || '—'}</p>
            {referencia.telefono && (
              <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {referencia.telefono}
              </p>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderTabContent = () => {
    if (activeTab === 'solicitud') return renderSolicitud()
    if (activeTab === 'cliente') return renderCliente()
    if (activeTab === 'creditos') return renderCreditos()
    if (activeTab === 'pagos') return renderPagos()
    if (activeTab === 'evidencias') return renderEvidencias()
    return renderReferencias()
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: 2147483600 }}
        onClick={onClose}
      />

      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 2147483601 }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-gradient-to-br from-orange-600 to-orange-800 px-7 py-5 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-white/15 rounded-xl text-white shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Reprogramación de Cuota
                  </h2>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5 truncate">
                    {data.numeroPrestamo ? `${data.numeroPrestamo} · ` : ''}{clienteNombre}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-b border-slate-100 bg-white px-5 py-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-5 bg-slate-50">
            {metricas && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoTile label="Saldo total" value={formatCurrency(metricas.saldoTotalPendiente)} />
                <InfoTile label="Créditos activos" value={metricas.creditosActivos} />
                <InfoTile label="Cuotas vencidas" value={metricas.cuotasVencidas} tone={metricas.cuotasVencidas > 0 ? 'rose' : 'slate'} />
                <InfoTile label="Pagos 30 días" value={formatCurrency(metricas.montoPagadoUltimos30Dias)} tone={metricas.montoPagadoUltimos30Dias > 0 ? 'emerald' : 'slate'} />
              </div>
            )}

            {metricas?.alertas?.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {metricas.alertas.map((alerta) => (
                      <p key={alerta} className="text-xs font-bold text-amber-800">{alerta}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {contextError && activeTab === 'solicitud' && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-2 text-rose-700">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-xs font-bold">{contextError}</p>
              </div>
            )}

            {renderTabContent()}
          </div>

          {canApprove && data.estado === 'PENDIENTE' && (
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={() => onReject?.(data.id)}
                disabled={isProcessing}
                className="flex-1 py-3 border border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </button>
              <button
                onClick={() => onApprove?.(data.id)}
                disabled={isProcessing}
                className="flex-[2] py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
              >
                {isProcessing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                  : <><CheckCircle2 className="h-4 w-4" /> Aprobar Solicitud</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <p className="text-sm font-bold text-slate-400">{text}</p>
    </div>
  )
}
