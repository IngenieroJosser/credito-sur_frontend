'use client'

import React from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Image as ImageIcon,
  MapPin,
  Phone,
  Route,
  ShieldAlert,
  User,
  Users,
  Video,
  X,
} from 'lucide-react'
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal'
import { formatCurrency, resolveMediaUrl } from '@/lib/utils'

interface AlertaClienteDetalleModalProps {
  alerta: any
  onClose: () => void
  loading?: boolean
}

const text = (...values: any[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue

    let candidate = value
    if (value instanceof Date) {
      candidate = value.toISOString()
    } else if (typeof value === 'object') {
      candidate =
        value.label ??
        value.nombre ??
        value.valor ??
        value.value ??
        value.fechaPago ??
        value.fecha ??
        value.fechaVisita ??
        value.creadoEn ??
        value.date ??
        value.iso
      if (candidate === null || candidate === undefined || candidate === value) {
        continue
      }
    }

    const str = String(candidate ?? '').trim()
    if (str && str !== 'undefined' && str !== 'null' && str !== '—') return str
  }
  return ''
}

const money = (value: any) => formatCurrency(Number(value || 0))

const formatDate = (value: any) => {
  const raw = text(
    value?.fechaPago,
    value?.fecha,
    value?.fechaVisita,
    value?.creadoEn,
    value?.date,
    value?.iso,
    value,
  )
  if (!raw) return 'Sin fecha'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const estadoLabel: Record<string, string> = {
  ACTIVO: 'Activo',
  EN_MORA: 'En mora',
  INCUMPLIDO: 'Incumplido',
  PENDIENTE_APROBACION: 'Pendiente de revisión',
  PAGADO: 'Pagado',
}

const esCarteraActiva = (credito: any) => {
  if (credito?.esCarteraActiva === true) return true
  if (credito?.esCarteraActiva === false) return false

  const estado = String(credito?.estado || '').toUpperCase()
  const estadoAprobacion = String(credito?.estadoAprobacion || '').toUpperCase()
  return (
    ['ACTIVO', 'EN_MORA', 'INCUMPLIDO'].includes(estado) &&
    !['PENDIENTE', 'RECHAZADO'].includes(estadoAprobacion)
  )
}

function Stat({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: string
  tone?: 'slate' | 'red' | 'amber' | 'emerald'
}) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }

  return (
    <div className={`rounded-xl border px-3 py-3 ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black">{value}</p>
    </div>
  )
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: any
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-bold text-slate-800">
          {text(value) || 'No registrado'}
        </p>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-500">{icon}</div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
          {title}
        </h3>
      </div>
      {children}
    </section>
  )
}

export default function AlertaClienteDetalleModal({
  alerta,
  onClose,
  loading = false,
}: AlertaClienteDetalleModalProps) {
  const metadata = alerta?.metadata || {}
  const snapshot = alerta?.snapshotCliente || metadata.snapshotCliente || {}
  const cliente = snapshot.cliente || alerta?.cliente || {}
  const ruta = snapshot.ruta || {}
  const cobrador = ruta?.cobrador || snapshot.cobrador || {}
  const referencias = Array.isArray(snapshot.referencias) ? snapshot.referencias : []
  const creditos = Array.isArray(snapshot.creditos) ? snapshot.creditos : []
  const visitas = Array.isArray(snapshot.historialVisitas) ? snapshot.historialVisitas : []
  const evidencias = Array.isArray(snapshot.evidencias) ? snapshot.evidencias : []
  const pagos = creditos.flatMap((credito: any) =>
    Array.isArray(credito.pagosRecientes) ? credito.pagosRecientes : [],
  )
  const rawMetricas = snapshot.metricas || metadata || {}
  const saldoCarteraActivaCalculado = creditos
    .filter(esCarteraActiva)
    .reduce((sum: number, credito: any) => sum + Number(credito.saldoPendiente || 0), 0)
  const saldoPendienteRevisionCalculado = creditos
    .filter((credito: any) => !esCarteraActiva(credito))
    .reduce((sum: number, credito: any) => sum + Number(credito.saldoPendiente || 0), 0)
  const cuotasVencidasCalculadas = creditos
    .filter(esCarteraActiva)
    .reduce((sum: number, credito: any) => sum + Number(credito.cuotasVencidas || 0), 0)
  const metricas = {
    ...rawMetricas,
    saldoPendienteTotal:
      rawMetricas.saldoPendienteCarteraActiva ??
      rawMetricas.saldoCarteraActiva ??
      saldoCarteraActivaCalculado,
    saldoPendientePendienteRevision:
      rawMetricas.saldoPendientePendienteRevision ??
      saldoPendienteRevisionCalculado,
    cuotasVencidas:
      rawMetricas.saldoPendienteCarteraActiva !== undefined ||
      rawMetricas.saldoCarteraActiva !== undefined
        ? rawMetricas.cuotasVencidas
        : cuotasVencidasCalculadas,
  }

  const clienteNombre = text(
    metadata.clienteNombre,
    cliente.nombreCompleto,
    `${cliente.nombres || ''} ${cliente.apellidos || ''}`,
  )
  const documento = text(metadata.documento, cliente.documento, cliente.dni)
  const estado = text(alerta?.estado, metadata.estadoAlerta, 'ACTIVA')
  const activa = estado.toUpperCase() === 'ACTIVA'

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none"
        style={{ zIndex: MODAL_Z_INDEX + 30 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-slate-50 shadow-2xl sm:rounded-3xl">
          <div className="border-b border-slate-200 bg-white px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      activa
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {activa ? 'Alerta activa' : 'Alerta resuelta'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Cliente no ubicado
                  </span>
                </div>
                <h2 className="truncate text-2xl font-black text-slate-950">
                  {clienteNombre || 'Cliente sin nombre'}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {documento ? `Documento ${documento}` : 'Sin documento'} ·{' '}
                  {text(metadata.rutaNombre, ruta.nombre) || 'Sin ruta asignada'}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-2xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Saldo cartera activa"
                value={money(metricas.saldoPendienteTotal)}
                tone="red"
              />
              <Stat
                label="Cuotas vencidas"
                value={String(metricas.cuotasVencidas || 0)}
                tone={Number(metricas.cuotasVencidas || 0) > 0 ? 'amber' : 'emerald'}
              />
              <Stat label="Obligaciones" value={String(creditos.length || 0)} />
              <Stat label="Evidencias" value={String(evidencias.length || 0)} />
            </div>
            {Number(metricas.saldoPendientePendienteRevision || 0) > 0 ? (
              <p className="mt-3 text-xs font-bold text-slate-500">
                En revisión sin sumar al saldo activo:{' '}
                <span className="text-slate-800">
                  {money(metricas.saldoPendientePendienteRevision)}
                </span>
              </p>
            ) : null}
          </div>

          <div className="overflow-y-auto p-4 sm:p-5">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
                Cargando detalle de la alerta...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.25fr]">
                <div className="space-y-4">
                  <Section title="Reporte" icon={<ShieldAlert className="h-4 w-4" />}>
                    <div className="space-y-3">
                      <div className="rounded-xl bg-red-50 px-3 py-3 text-sm font-bold text-red-950">
                        {text(alerta?.descripcion, metadata.descripcion) ||
                          'Sin descripción registrada.'}
                      </div>
                      <Field
                        icon={<AlertTriangle className="h-4 w-4" />}
                        label="Motivo"
                        value={text(alerta?.motivo, metadata.motivo).replace(/_/g, ' ')}
                      />
                      <Field
                        icon={<MapPin className="h-4 w-4" />}
                        label="Última ubicación conocida"
                        value={text(alerta?.ultimaUbicacionConocida, metadata.ultimaUbicacionConocida)}
                      />
                      <Field
                        icon={<FileText className="h-4 w-4" />}
                        label="Observaciones"
                        value={text(alerta?.observacionesReportante, metadata.observacionesReportante)}
                      />
                    </div>
                  </Section>

                  <Section title="Contacto y ruta" icon={<User className="h-4 w-4" />}>
                    <div className="grid gap-3">
                      <Field icon={<Phone className="h-4 w-4" />} label="Teléfono" value={text(cliente.telefono, metadata.telefono)} />
                      <Field icon={<MapPin className="h-4 w-4" />} label="Dirección" value={text(cliente.direccion, metadata.direccion)} />
                      <Field icon={<Route className="h-4 w-4" />} label="Ruta" value={text(ruta.nombre, metadata.rutaNombre)} />
                      <Field
                        icon={<Users className="h-4 w-4" />}
                        label="Cobrador"
                        value={text(
                          metadata.cobradorNombre,
                          cobrador.nombreCompleto,
                          `${cobrador.nombres || ''} ${cobrador.apellidos || ''}`,
                        )}
                      />
                    </div>
                  </Section>

                  <Section title="Referencias personales" icon={<Users className="h-4 w-4" />}>
                    {referencias.length > 0 ? (
                      <div className="grid gap-3">
                        {referencias.map((ref: any, index: number) => (
                          <div key={`${ref.tipo || 'ref'}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                            <p className="text-sm font-black text-slate-900">
                              {text(ref.nombre) || 'Referencia sin nombre'}
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-600">
                              {text(ref.telefono) || 'Sin teléfono'}
                            </p>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {text(ref.tipo).replace(/_/g, ' ') || `Referencia ${index + 1}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-slate-400">Sin referencias registradas.</p>
                    )}
                  </Section>
                </div>

                <div className="space-y-4">
                  <Section title="Obligaciones asociadas" icon={<CreditCard className="h-4 w-4" />}>
                    {creditos.length > 0 ? (
                      <div className="space-y-3">
                        {creditos.map((credito: any) => {
                          const vencidas = Number(credito.cuotasVencidas || 0)
                          const sumaSaldoActivo = esCarteraActiva(credito)
                          return (
                            <div key={credito.id || credito.numeroPrestamo} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-900">
                                    {credito.numeroPrestamo || credito.id || 'Crédito'}
                                  </p>
                                  <p className="mt-1 text-xs font-bold text-slate-500">
                                    {estadoLabel[String(credito.estado || '').toUpperCase()] ||
                                      text(credito.estado).replace(/_/g, ' ') ||
                                      'Sin estado'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-slate-900">
                                    {money(credito.saldoPendiente)}
                                  </p>
                                  <p className={`mt-1 text-[10px] font-black uppercase tracking-widest ${vencidas > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {vencidas > 0 ? `${vencidas} vencidas` : sumaSaldoActivo ? 'Al día' : 'No suma'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-slate-400">Sin créditos asociados.</p>
                    )}
                  </Section>

                  <Section title="Evidencias cargadas" icon={<ImageIcon className="h-4 w-4" />}>
                    {evidencias.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {evidencias.map((ev: any) => {
                          const url = resolveMediaUrl(ev.url || ev.path || ev.ruta || '')
                          const kind = String(ev.tipoContenido || ev.tipoArchivo || '').toLowerCase()
                          const isVideo = kind.includes('video') || /\.(mp4|mov|webm)$/i.test(url)
                          const isImage = kind.includes('foto') || kind.includes('imagen') || /\.(jpg|jpeg|png|webp|gif)$/i.test(url)

                          return (
                            <div key={ev.id || url} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                              {url && isImage ? (
                                <img src={url} alt={text(ev.descripcion, ev.nombreOriginal, 'Evidencia')} className="h-40 w-full object-cover" />
                              ) : url && isVideo ? (
                                <video src={url} controls className="h-40 w-full bg-black object-cover" />
                              ) : (
                                <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-500">
                                  {isVideo ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                  Evidencia
                                </div>
                              )}
                              <div className="px-3 py-2">
                                <p className="truncate text-xs font-black text-slate-800">
                                  {text(ev.descripcion, ev.nombreOriginal, ev.tipoContenido, 'Evidencia')}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-slate-400">Sin evidencias cargadas.</p>
                    )}
                  </Section>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Section title="Últimos pagos" icon={<CheckCircle2 className="h-4 w-4" />}>
                      {pagos.length > 0 ? (
                        <div className="space-y-2">
                          {pagos.slice(0, 5).map((pago: any, index: number) => (
                            <div key={pago.id || pago.numeroPago || `pago-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-600">{formatDate(pago)}</p>
                                {text(pago.metodoPago, pago.metodo) ? (
                                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {text(pago.metodoPago, pago.metodo).replace(/_/g, ' ')}
                                  </p>
                                ) : null}
                              </div>
                              <p className="text-sm font-black text-emerald-700">{money(pago.montoTotal ?? pago.monto ?? pago.valor)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-slate-400">Sin pagos recientes.</p>
                      )}
                    </Section>

                    <Section title="Últimas gestiones" icon={<Calendar className="h-4 w-4" />}>
                      {visitas.length > 0 ? (
                        <div className="space-y-2">
                          {visitas.slice(0, 5).map((visita: any) => (
                            <div key={visita.id || `${visita.fechaVisita}-${visita.estadoVisita}`} className="rounded-xl bg-slate-50 px-3 py-2">
                              <p className="text-xs font-black text-slate-800">
                                {text(visita.fechaVisita, visita.creadoEn)} · {text(visita.estadoVisita).replace(/_/g, ' ') || 'Sin estado'}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">
                                {text(visita.notas) || 'Sin observaciones'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-slate-400">Sin visitas registradas.</p>
                      )}
                    </Section>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}
