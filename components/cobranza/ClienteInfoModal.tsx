'use client'

/**
 * Modal de Información del Cliente — Vista Cobrador
 *
 * Muestra dos pestañas:
 *  • Expediente     → Fotos del cliente (cédula, vivienda, etc.) + datos de contacto
 *  • Detalle Admin  → Resumen financiero (saldo, cuota, próximo pago)
 *
 * Las imágenes se resuelven mediante `resolveMediaUrl` igual que en
 * NotificacionDetalleModal, para soportar Cloudinary y URLs locales.
 */

import { useState, useEffect } from 'react'
import { X, User, MapPin, Phone, Camera, AlertCircle, Loader2, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { VisitaRuta } from '@/lib/types/cobranza'
import { resolveMediaUrl, formatCurrency } from '@/lib/utils'
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal'
import { resolveCuotaAcumuladaOperativa, resolveCuotaNormalOperativa } from '@/lib/rutas-core'
import { clientesService } from '@/services/clientes-service'
import { rutasService, type HistorialVisitaCliente } from '@/services/rutas-service'
import { alertasClientesService } from '@/services/alertas-clientes-service'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Props {
  visita: VisitaRuta
  nextPagoMonto: number | null
  nextPagoFecha: string | null
  recaudadoHoy: number
  formatFechaLargaUTC: (d: string) => string
  onClose: () => void
}

type Tab = 'expediente' | 'detalle'
type UserRole = 'SUPER_ADMINISTRADOR' | 'ADMIN' | 'COORDINADOR' | 'SUPERVISOR' | 'COBRADOR' | string

interface ArchivoCliente {
  id: string
  url?: string
  path?: string
  ruta?: string
  tipoArchivo?: string
  tipoContenido?: string
  nombreOriginal?: string
}

// ── Etiquetas de tipo de archivo ───────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  FOTO_PERFIL:        'Foto perfil',
  CEDULA_FRONTAL:     'Cédula — frente',
  CEDULA_REVERSO:     'Cédula — reverso',
  FOTO_VIVIENDA:      'Foto vivienda',
  FOTO_NEGOCIO:       'Foto negocio',
  COMPROBANTE_PAGO:   'Comprobante pago',
  OTRO:               'Otro',
}

const ROLES_ALERTA_CLIENTE = [
  'SUPER_ADMINISTRADOR',
  'ADMIN',
  'COORDINADOR',
  'SUPERVISOR',
]

// ── Componente ─────────────────────────────────────────────────────────────────

export default function ClienteInfoModal({
  visita,
  nextPagoMonto,
  nextPagoFecha,
  recaudadoHoy,
  formatFechaLargaUTC,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>('expediente')
  const [archivos, setArchivos] = useState<ArchivoCliente[]>([])
  const [loadingFotos, setLoadingFotos] = useState(false)
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null)

  const [userRole, setUserRole] = useState<UserRole>('')
  const [alertaOpen, setAlertaOpen] = useState(false)
  const [alertaSubmitting, setAlertaSubmitting] = useState(false)
  const [alertaForm, setAlertaForm] = useState({
    motivo: 'NO_LOCALIZADO',
    descripcion: '',
    ultimaUbicacionConocida: '',
    observacionesReportante: '',
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      const user = raw ? JSON.parse(raw) : null
      setUserRole(String(user?.rol || ''))
    } catch {
      setUserRole('')
    }
  }, [])


  // Carga los archivos del cliente y la próxima cuota real desde el backend al abrir el modal
  useEffect(() => {
    if (!visita.clienteId) {
      console.warn('[ClienteInfoModal] No se recibió clienteId en el objeto visita:', visita)
      return
    }
    setLoadingFotos(true)
    clientesService
      .obtenerPorId(visita.clienteId)
      .then((cliente: any) => {
        if (!cliente) throw new Error('Cliente no devuelto por el servidor')
        const files: ArchivoCliente[] = cliente?.archivos || []
        setArchivos(files)
      })
      .catch((err) => {
         console.error('[ClienteInfoModal] Error cargando info extra:', err)
         setArchivos([])
      })
      .finally(() => setLoadingFotos(false))
  }, [visita.clienteId])

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const resolveUrl = (archivo: ArchivoCliente) =>
    resolveMediaUrl(archivo.url || archivo.path || archivo.ruta || '')

  const isImage = (archivo: ArchivoCliente) => {
    const tipo = String(archivo.tipoArchivo || '').toLowerCase()
    const url  = resolveUrl(archivo)
    return tipo.startsWith('image/') || /(jpg|jpeg|png|gif|webp)$/i.test(url)
  }

  const nivelRiesgoLabel =
    visita.nivelRiesgo === 'minimo'      ? 'Mínimo' :
    visita.nivelRiesgo === 'leve'      ? 'Leve' :
    (visita.nivelRiesgo as string) === 'precaucion' ? 'Precaución' :
    visita.nivelRiesgo === 'moderado'  ? 'Moderado' :
    visita.nivelRiesgo === 'critico'   ? 'Crítico' : '—'

  const nivelRiesgoColor =
    visita.nivelRiesgo === 'minimo'      ? 'bg-emerald-100 text-emerald-700' :
    visita.nivelRiesgo === 'leve'      ? 'bg-yellow-100 text-yellow-700' :
    (visita.nivelRiesgo as string) === 'precaucion' ? 'bg-amber-100 text-amber-700' :
    visita.nivelRiesgo === 'moderado'  ? 'bg-orange-100 text-orange-700' :
    visita.nivelRiesgo === 'critico'   ? 'bg-red-100 text-red-700' :
    'bg-slate-100 text-slate-600'

  const cuotaNormalOperativa = resolveCuotaNormalOperativa(visita)
  const acumuladoVencido = resolveCuotaAcumuladaOperativa(visita)
  const cuotaProyectada = nextPagoMonto ?? cuotaNormalOperativa
  const estadoVisitaGestion = String((visita as any)?.estadoVisita || visita.estado || '').toLowerCase()
  const esAusenteGestion = estadoVisitaGestion === 'ausente'
  const notaAusencia = String((visita as any)?.notasVisita || '').trim()
  const puedeReportarClienteNoUbicado = ROLES_ALERTA_CLIENTE.includes(String(userRole || '').toUpperCase())

  const handleReportarClienteNoUbicado = async () => {
    if (!visita.clienteId) {
      toast.error('No se encontró el cliente de la visita.')
      return
    }

    const descripcion = alertaForm.descripcion.trim()
    const observacionesReportante = alertaForm.observacionesReportante.trim()
    if (!descripcion || !observacionesReportante) {
      toast.error('Completa la descripción y las observaciones.')
      return
    }

    setAlertaSubmitting(true)
    try {
      await alertasClientesService.reportarClienteNoUbicado({
        clienteId: visita.clienteId,
        rutaId: String((visita as any)?.rutaId || '').trim() || undefined,
        motivo: alertaForm.motivo,
        descripcion,
        observacionesReportante,
        ultimaUbicacionConocida: alertaForm.ultimaUbicacionConocida.trim() || undefined,
      })
      toast.success('Alerta de cliente no ubicado creada.')
      setAlertaOpen(false)
      setAlertaForm({
        motivo: 'NO_LOCALIZADO',
        descripcion: '',
        ultimaUbicacionConocida: '',
        observacionesReportante: '',
      })
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo crear la alerta.')
    } finally {
      setAlertaSubmitting(false)
    }
  }

  const formatFechaVisita = (fecha: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha
    const [year, month, day] = fecha.split('-').map(Number)
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(Date.UTC(year, month - 1, day)))
  }
  const formatFechaHora = (fecha?: string | null) => {
    if (!fecha) return 'Sin fecha'
    const date = new Date(fecha)
    if (Number.isNaN(date.getTime())) return fecha
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }
  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        {/* Panel */}
        <div
          className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-slate-900 truncate">{visita.cliente}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${nivelRiesgoColor}`}>
                  {nivelRiesgoLabel}
                </span>
                {visita.telefono && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Phone className="w-3 h-3" />
                    {visita.telefono}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-3 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 px-5 shrink-0">
            {([
              { key: 'expediente', label: 'Expediente' },
              { key: 'detalle',    label: 'Detalle Administrativo' },
            ] as { key: Tab; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`py-3 text-xs font-black uppercase tracking-widest border-b-2 mr-6 transition-all ${
                  tab === key
                    ? 'border-[#08557f] text-[#08557f]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Tab: Expediente ── */}
            {tab === 'expediente' && (
              <div className="p-5 space-y-5">

                {/* Datos de contacto */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacto</p>
                  {visita.direccion && (
                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Dirección</p>
                        <p className="text-sm font-bold text-slate-800 break-words">{visita.direccion}</p>
                      </div>
                    </div>
                  )}
                  {visita.telefono && (
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Teléfono</p>
                        <a
                          href={`tel:${visita.telefono}`}
                          className="text-sm font-black text-[#08557f] hover:underline"
                        >
                          {visita.telefono}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fotografías del cliente */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Fotografías del cliente
                    </p>
                  </div>

                  {loadingFotos ? (
                    <div className="flex flex-col items-center py-8 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-xs font-medium">Cargando fotos...</span>
                    </div>
                  ) : archivos.filter(isImage).length === 0 ? (
                    <div className="flex flex-col items-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">
                        No hay fotografías registradas para este cliente
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {archivos.filter(isImage).map((archivo, idx) => {
                        const src = resolveUrl(archivo)
                        const label = TIPO_LABEL[archivo.tipoContenido || ''] || archivo.nombreOriginal || 'Foto'
                        return (
                          <div
                            key={`${idx}-${archivo.id}`}
                            className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setFotoExpandida(src)}
                          >
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-600 border-b border-slate-200 truncate">
                              {label}
                            </div>
                            <img
                              src={src}
                              alt={label}
                              className="w-full h-36 object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Detalle Administrativo ── */}
            {tab === 'detalle' && (
              <div className="p-5 space-y-4">

                {/* Resumen financiero */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                    <p className="text-[10px] text-orange-600 font-black uppercase mb-1">Saldo Pendiente</p>
                    <p className="text-orange-900 font-black text-xl">
                      {formatCurrency(visita.saldoTotal ?? 0)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-right">
                    <p className="text-[10px] text-emerald-600 font-black uppercase mb-1">Recaudado Hoy</p>
                    <p className="text-emerald-900 font-black text-xl">
                      {formatCurrency(recaudadoHoy ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Cuota proyectada */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-0.5">Cuota normal</p>
                    <p className="text-slate-900 font-black text-lg">
                      {formatCurrency(cuotaProyectada)}
                    </p>
                  </div>

                  {nextPagoFecha && (
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-black uppercase mb-0.5">Próxima Fecha</p>
                      <p className="text-[#08557f] font-bold text-sm">
                        {formatFechaLargaUTC(nextPagoFecha)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Crédito actual */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crédito Actual</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Cuota N°</p>
                      <p className="font-black text-slate-800">
                        {visita.cuotaActual ?? '—'}{visita.cuotasTotales ? ` / ${visita.cuotasTotales}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Frecuencia</p>
                      <p className="font-black text-slate-800">
                        {visita.periodoRuta === 'DIA'      ? 'Diario'    :
                         visita.periodoRuta === 'SEMANA'   ? 'Semanal'   :
                         visita.periodoRuta === 'QUINCENA' ? 'Quincenal' :
                         visita.periodoRuta === 'MES'      ? 'Mensual'   : visita.periodoRuta}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Tipo Préstamo</p>
                      <p className="font-black text-slate-800">
                        {visita.tipoPrestamo === 'ARTICULO' ? 'Artículo' : 'Efectivo'}
                      </p>
                    </div>
                    {visita.articuloNombre && (
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Artículo</p>
                        <p className="font-black text-slate-800 truncate">{visita.articuloNombre}</p>
                      </div>
                    )}
                  </div>
                </div>

                {esAusenteGestion && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Gestión de hoy</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-700 font-black uppercase mb-1">Cliente marcado como ausente</p>
                      <p className="text-sm font-bold text-amber-900 leading-relaxed whitespace-pre-wrap break-words">
                        {notaAusencia || 'Sin justificación registrada.'}
                      </p>
                    </div>
                  </div>
                )}


                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                    <p className="text-[10px] text-rose-600 font-black uppercase mb-1">Acumulado vencido</p>
                    <p className="text-rose-900 font-black text-lg">
                      {formatCurrency(acumuladoVencido)}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-right">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Cuotas vencidas</p>
                    <p className="text-slate-900 font-black text-lg">
                      {Number((visita as any)?.cuotasVencidas || 0)}
                    </p>
                  </div>
                </div>
                {/* Estado del crédito */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${
                    visita.nivelRiesgo === 'minimo'     ? 'bg-emerald-500' :
                    visita.nivelRiesgo === 'leve'     ? 'bg-yellow-400'  :
                    (visita.nivelRiesgo as string) === 'precaucion' ? 'bg-amber-400'  :
                    visita.nivelRiesgo === 'moderado' ? 'bg-orange-500'  :
                    visita.nivelRiesgo === 'critico'  ? 'bg-red-600'     :
                    'bg-slate-300'
                  }`} />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Nivel de Riesgo</p>
                    <p className="font-black text-slate-800">{nivelRiesgoLabel}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Estado Visita</p>
                    <p className="font-black text-slate-800 capitalize">{(estadoVisitaGestion || visita.estado).replace('_', ' ')}</p>
                  </div>
                </div>

                {puedeReportarClienteNoUbicado && (
                  <>
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Más acciones administrativas</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAlertaOpen(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-800 transition hover:bg-amber-100 active:scale-[0.98]"
                      >
                        <Megaphone className="h-4 w-4" />
                        Reportar no ubicado
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-[#08557f] py-4 text-sm font-black text-white hover:bg-[#063a58] shadow-xl shadow-[#08557f]/20 transition-all uppercase tracking-widest active:scale-[0.98]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Visor de foto expandida */}
      {fotoExpandida && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          style={{ zIndex: MODAL_Z_INDEX + 10 }}
          onClick={() => setFotoExpandida(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition"
            onClick={() => setFotoExpandida(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={fotoExpandida}
            alt="Foto expandida"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {alertaOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center bg-slate-900/70 p-4 sm:items-center"
          style={{ zIndex: MODAL_Z_INDEX + 20 }}
          onClick={() => !alertaSubmitting && setAlertaOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Alerta operativa</p>
                <h4 className="mt-1 text-lg font-black text-slate-900">Cliente no ubicado</h4>
                <p className="mt-1 text-xs font-semibold text-slate-500">{visita.cliente}</p>
              </div>
              <button
                type="button"
                disabled={alertaSubmitting}
                onClick={() => setAlertaOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Motivo <span className="text-red-500">*</span>
                </span>
                <select
                  value={alertaForm.motivo}
                  onChange={(e) => setAlertaForm((prev) => ({ ...prev, motivo: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                >
                  <option value="NO_LOCALIZADO">No localizado</option>
                  <option value="DIRECCION_INVALIDA">Dirección inválida</option>
                  <option value="TELEFONO_SIN_RESPUESTA">Teléfono sin respuesta</option>
                  <option value="POSIBLE_TRASLADO">Posible traslado</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Descripción <span className="text-red-500">*</span>
                </span>
                <textarea
                  value={alertaForm.descripcion}
                  onChange={(e) => setAlertaForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  placeholder="Describe qué ocurrió al intentar ubicarlo"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Última ubicación conocida</span>
                <input
                  value={alertaForm.ultimaUbicacionConocida}
                  onChange={(e) => setAlertaForm((prev) => ({ ...prev, ultimaUbicacionConocida: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  placeholder={visita.direccion || 'Barrio, dirección o referencia'}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Observaciones <span className="text-red-500">*</span>
                </span>
                <textarea
                  value={alertaForm.observacionesReportante}
                  onChange={(e) => setAlertaForm((prev) => ({ ...prev, observacionesReportante: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  placeholder="Qué se verificó, con quién se habló o qué queda pendiente"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={alertaSubmitting}
                onClick={() => setAlertaOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={alertaSubmitting}
                onClick={handleReportarClienteNoUbicado}
                className="flex-1 rounded-2xl bg-amber-600 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 disabled:opacity-60"
              >
                {alertaSubmitting ? 'Enviando...' : 'Crear alerta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Portal>
  )
}
