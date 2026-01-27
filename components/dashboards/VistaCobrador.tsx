'use client'

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  MapPin,
  Wallet,
  CheckCircle2,
  Clock,
  ChevronRight,
  UserPlus,
  Receipt,
  DollarSign,
  MessageSquare,
  Eye,
  ClipboardList,
  Users,
  CreditCard,
  FileText,
  Plus,
  X,
  Filter,
  Smartphone,
  RefreshCw,
  Calculator,
  User,
  GripVertical,
  Home,
  BarChart3,
  Settings,
  Camera,
  Calendar,
  Search,
  History,
  ShoppingBag,
  FileText as FileTextIcon
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import { RolUsuario } from '@/lib/types/autenticacion-type'
import { obtenerPerfil } from '@/services/autenticacion-service'
import { formatCOPInputValue, formatCurrency, formatMilesCOP, parseCOPInputToNumber } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'

type EstadoVisita = 'pendiente' | 'pagado' | 'en_mora' | 'ausente' | 'reprogramado'
type PeriodoRuta = 'DIA' | 'SEMANA' | 'MES'

interface VisitaRuta {
  id: string
  cliente: string
  direccion: string
  telefono: string
  horaSugerida: string
  montoCuota: number
  saldoTotal: number
  estado: EstadoVisita
  proximaVisita: string
  ordenVisita: number
  prioridad: 'alta' | 'media' | 'baja'
  cobradorId: string
  periodoRuta: PeriodoRuta
}

const EstadoCuentaModal = ({
  visita,
  onClose,
}: {
  visita: VisitaRuta
  onClose: () => void
}) => {
  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Estado de Cuenta</h3>
                <p className="text-sm text-slate-500 font-medium">{visita.cliente}</p>
              </div>

              <button
                onClick={onClose}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase">Saldo total</div>
                <div className="mt-1 text-lg font-bold text-slate-900">${visita.saldoTotal.toLocaleString('es-CO')}</div>
              </div>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase">Cuota esperada</div>
                <div className="mt-1 text-lg font-bold text-slate-900">${visita.montoCuota.toLocaleString('es-CO')}</div>
              </div>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase">Próxima visita</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{visita.proximaVisita}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900">Últimos movimientos</h4>
                <span className="text-xs font-bold text-slate-400">Mock</span>
              </div>

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">Pago #{i}</div>
                        <div className="text-xs text-slate-500">Método: EFECTIVO</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">${formatMilesCOP(visita.montoCuota)}</div>
                        <div className="text-xs font-bold text-[#08557f]">CONFIRMADO</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[#08557f] px-3 py-3 text-sm font-bold text-white hover:bg-[#063a58]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

function StaticVisitaItem({
  visita,
  isSelected,
  onSelect,
  onRegistrarPago,
  onRegistrarAbono,
  onReprogramar,
  onVerCliente,
  onVerEstadoCuenta,
  getEstadoClasses,
  getPrioridadColor,
  disableModificaciones,
}: {
  visita: VisitaRuta
  isSelected: boolean
  onSelect: (id: string) => void
  onRegistrarPago: (visita: VisitaRuta) => void
  onRegistrarAbono: (visita: VisitaRuta) => void
  onReprogramar: (visita: VisitaRuta) => void
  onVerCliente: (visita: VisitaRuta) => void
  onVerEstadoCuenta: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor: (prioridad: 'alta' | 'media' | 'baja') => string
  disableModificaciones?: boolean
}) {
  return (
    <div
      className={`relative z-10 pointer-events-auto w-full rounded-2xl border px-4 py-3 transition-all ${
        isSelected
          ? 'border-[#08557f] bg-[#f7f7f7]'
          : 'border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex items-center">
          <GripVertical className="h-5 w-5 text-slate-200" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900">{visita.cliente}</div>
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getPrioridadColor(visita.prioridad) }} />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3" />
                <span>{visita.direccion}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-slate-900">${visita.montoCuota.toLocaleString('es-CO')}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium leading-none text-slate-600 bg-slate-50">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{visita.horaSugerida}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getEstadoClasses(visita.estado)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              <span className="capitalize">
                {visita.estado === 'pendiente' && 'Pendiente'}
                {visita.estado === 'pagado' && 'Pagado'}
                {visita.estado === 'en_mora' && 'En mora'}
                {visita.estado === 'ausente' && 'Ausente'}
                {visita.estado === 'reprogramado' && 'Reprogramado'}
              </span>
            </span>

            <div className="relative z-[9999] pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onVerCliente(visita)
                }}
                className="relative z-[9999] pointer-events-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                title="Ver cliente"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(visita.id)
                }}
                className="relative z-[9999] pointer-events-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {isSelected && (
            <div className="mt-3 space-y-3">
              {visita.estado === 'pagado' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onRegistrarAbono(visita)}
                    disabled={!!disableModificaciones}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                  >
                    <Wallet className="h-4 w-4" />
                    Registrar Abono
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerEstadoCuenta(visita)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
                  >
                    <FileTextIcon className="h-4 w-4" />
                    Ver Estado de Cuenta
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onRegistrarPago(visita)}
                      disabled={!!disableModificaciones}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#08557f] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#063a58] shadow-lg shadow-[#08557f]/20"
                    >
                      <DollarSign className="h-4 w-4" />
                      Registrar Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => onRegistrarAbono(visita)}
                      disabled={!!disableModificaciones}
                      className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                    >
                      <Wallet className="h-4 w-4" />
                      Registrar Abono
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onVerEstadoCuenta(visita)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
                    >
                      <FileTextIcon className="h-4 w-4" />
                      Ver Estado de Cuenta
                    </button>
                    <button
                      type="button"
                      onClick={() => onReprogramar(visita)}
                      disabled={!!disableModificaciones}
                      className="flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-[11px] font-bold text-orange-700 hover:bg-orange-100 border border-orange-200"
                    >
                      <Calendar className="h-4 w-4" />
                      Reprogramar
                    </button>
                  </div>
                </>
              )}

              <div className="text-[11px] text-slate-600">
                <div className="flex items-center justify-between mb-1">
                  <span>Saldo total:</span>
                  <span className="font-bold">${visita.saldoTotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Próxima visita:</span>
                  <span className="font-medium">{visita.proximaVisita}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Teléfono:</span>
                  <span className="font-medium">{visita.telefono}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableVisita({
  visita,
  isSelected,
  onSelect,
  onRegistrarPago,
  onRegistrarAbono,
  onReprogramar,
  onVerCliente,
  onVerEstadoCuenta,
  getEstadoClasses,
  getPrioridadColor,
  disableSort,
  disableModificaciones,
}: {
  visita: VisitaRuta
  isSelected: boolean
  onSelect: (id: string) => void
  onRegistrarPago: (visita: VisitaRuta) => void
  onRegistrarAbono: (visita: VisitaRuta) => void
  onReprogramar: (visita: VisitaRuta) => void
  onVerCliente: (visita: VisitaRuta) => void
  onVerEstadoCuenta: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor: (prioridad: 'alta' | 'media' | 'baja') => string
  disableSort?: boolean
  disableModificaciones?: boolean
}) {
  return (
    <SortableItem
      visita={visita}
      isSelected={isSelected}
      onSelect={onSelect}
      onRegistrarPago={onRegistrarPago}
      onRegistrarAbono={onRegistrarAbono}
      onReprogramar={onReprogramar}
      onVerCliente={onVerCliente}
      onVerEstadoCuenta={onVerEstadoCuenta}
      getEstadoClasses={getEstadoClasses}
      getPrioridadColor={getPrioridadColor}
      disableSort={disableSort}
      disableModificaciones={disableModificaciones}
    />
  )
}

interface OperacionCaja {
  id: string
  tipo: 'pago' | 'gasto' | 'base'
  descripcion: string
  monto: number
  hora: string
  estado: 'completado' | 'pendiente'
  cobradorId: string
}

interface UserSession {
  id: string
  nombres: string
  apellidos: string
  correo?: string
  telefono?: string
  rol: RolUsuario
  rutaAsignada?: string
  zona?: string
  metaDiaria?: number
  avatar?: string
}

const MODAL_Z_INDEX = 2147483647

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

// Componente Sortable para las visitas
function SortableItem({
  visita,
  isSelected,
  onSelect,
  onRegistrarPago,
  onRegistrarAbono,
  onReprogramar,
  onVerCliente,
  onVerEstadoCuenta,
  getEstadoClasses,
  getPrioridadColor,
  disableSort,
  disableModificaciones,
}: {
  visita: VisitaRuta
  isSelected: boolean
  onSelect: (id: string) => void
  onRegistrarPago: (visita: VisitaRuta) => void
  onRegistrarAbono: (visita: VisitaRuta) => void
  onReprogramar: (visita: VisitaRuta) => void
  onVerCliente: (visita: VisitaRuta) => void
  onVerEstadoCuenta: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor: (prioridad: 'alta' | 'media' | 'baja') => string
  disableSort?: boolean
  disableModificaciones?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: visita.id, disabled: !!disableSort })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative z-10 pointer-events-auto w-full rounded-2xl border px-4 py-3 transition-all ${
        isSelected
          ? 'border-[#08557f] bg-[#f7f7f7]'
          : 'border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Handle de arrastre */}
        {disableSort ? (
          <div className="mt-1 flex items-center">
            <GripVertical className="h-5 w-5 text-slate-200" />
          </div>
        ) : (
          <div
            className="mt-1 flex items-center cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-slate-400" />
          </div>
        )}
        
        {/* Información del cliente */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900">
                  {visita.cliente}
                </div>
                <div 
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: getPrioridadColor(visita.prioridad) }}
                ></div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3" />
                <span>{visita.direccion}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-slate-900">
                ${visita.montoCuota.toLocaleString('es-CO')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium leading-none text-slate-600 bg-slate-50">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{visita.horaSugerida}</span>
              </span>
            </div>
          </div>

          {/* Estado y acciones */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getEstadoClasses(
                visita.estado
              )}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              <span className="capitalize">
                {visita.estado === 'pendiente' && 'Pendiente'}
                {visita.estado === 'pagado' && 'Pagado'}
                {visita.estado === 'en_mora' && 'En mora'}
                {visita.estado === 'ausente' && 'Ausente'}
                {visita.estado === 'reprogramado' && 'Reprogramado'}
              </span>
            </span>
            
            <div className="relative z-[9999] pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onVerCliente(visita)
                }}
                className="relative z-[9999] pointer-events-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                title="Ver cliente"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(visita.id)
                }}
                className="relative z-[9999] pointer-events-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Panel expandido de acciones */}
          {isSelected && (
            <div className="mt-3 space-y-3" onPointerDown={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-2">
                {visita.estado !== 'pagado' && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      if (disableModificaciones) return
                      onRegistrarPago(visita)
                    }}
                    disabled={!!disableModificaciones}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#08557f] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#063a58] shadow-lg shadow-[#08557f]/20"
                  >
                    <DollarSign className="h-4 w-4" />
                    Registrar Pago
                  </button>
                )}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (disableModificaciones) return
                    onRegistrarAbono(visita)
                  }}
                  disabled={!!disableModificaciones}
                  className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                >
                  <Wallet className="h-4 w-4" />
                  Registrar Abono
                </button>
              </div>

              <button 
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onVerEstadoCuenta(visita)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
              >
                <FileTextIcon className="h-4 w-4" />
                Ver Estado de Cuenta
              </button>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (disableModificaciones) return
                  onReprogramar(visita)
                }}
                disabled={!!disableModificaciones}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100 border border-orange-200"
              >
                <Calendar className="h-4 w-4" />
                Reprogramar Visita
              </button>
              
              <div className="text-[11px] text-slate-600">
                <div className="flex items-center justify-between mb-1">
                  <span>Saldo total:</span>
                  <span className="font-bold">${visita.saldoTotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Próxima visita:</span>
                  <span className="font-medium">{visita.proximaVisita}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Teléfono:</span>
                  <span className="font-medium">{visita.telefono}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const VistaCobrador = () => {
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [visitaPagoSeleccionada, setVisitaPagoSeleccionada] = useState<VisitaRuta | null>(null)
  const [isAbono, setIsAbono] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState<File | null>(null)
  const [comprobanteTransferenciaPreviewUrl, setComprobanteTransferenciaPreviewUrl] = useState<string | null>(null)
  const [showClienteInfoModal, setShowClienteInfoModal] = useState(false)
  const [visitaClienteSeleccionada, setVisitaClienteSeleccionada] = useState<VisitaRuta | null>(null)
  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false)
  const [visitaEstadoCuentaSeleccionada, setVisitaEstadoCuentaSeleccionada] = useState<VisitaRuta | null>(null)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showBaseRequestModal, setShowBaseRequestModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showReprogramModal, setShowReprogramModal] = useState(false)
  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)
  const [reprogramFecha, setReprogramFecha] = useState('')
  const [reprogramMotivo, setReprogramMotivo] = useState('')
  const [formularioNuevoCliente, setFormularioNuevoCliente] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    correo: '',
    direccion: '',
    referencia: '',
  })
  const [fotosCliente, setFotosCliente] = useState({
    fotoPerfil: null as File | null,
    documentoFrente: null as File | null,
    documentoReverso: null as File | null,
    comprobanteDomicilio: null as File | null,
  })
  
  // Nuevos estados para la refactorización
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>('prestamo')
  const [isFabOpen, setIsFabOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')

  const [montoPagoInput, setMontoPagoInput] = useState('')
  const [montoGastoInput, setMontoGastoInput] = useState('')
  const [montoBaseInput, setMontoBaseInput] = useState('')
  const [montoPrestamoInput, setMontoPrestamoInput] = useState('')
  const [tasaInteresInput, setTasaInteresInput] = useState('')
  const [cuotasPrestamoInput, setCuotasPrestamoInput] = useState('')
  const [cuotaInicialArticuloInput, setCuotaInicialArticuloInput] = useState('')

  const [rutaCompletada, setRutaCompletada] = useState(false)
  const [showCompletarRutaModal, setShowCompletarRutaModal] = useState(false)
  const [coordinadorToast, setCoordinadorToast] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  const creditosPendientes = useMemo(
    () => [
      { id: 'CP-001', cliente: 'María Torres', monto: 850000, estado: 'Pendiente aprobación', fecha: 'Hoy' },
      { id: 'CP-002', cliente: 'Luis Pérez', monto: 1200000, estado: 'En revisión', fecha: 'Ayer' },
      { id: 'CP-003', cliente: 'Ana Gutiérrez', monto: 620000, estado: 'Pendiente aprobación', fecha: 'Ayer' },
    ],
    []
  )
  
  // Estado para el drag & drop
  const [activeId, setActiveId] = useState<string | null>(null)
  const [visitasOrden, setVisitasOrden] = useState<string[]>([
    'V-001', 'V-002', 'V-003', 'V-004', 'V-005'
  ])

  const router = useRouter();

  // Datos base
  const [visitasBase, setVisitasBase] = useState<VisitaRuta[]>(() => [
    {
      id: 'V-001',
      cliente: 'Carlos Rodríguez',
      direccion: 'Av. Principal #123',
      telefono: '3001234567',
      horaSugerida: '09:30',
      montoCuota: 125000,
      saldoTotal: 500000,
      estado: 'pendiente',
      proximaVisita: 'Hoy',
      ordenVisita: 1,
      prioridad: 'alta',
      cobradorId: 'CB-001',
      periodoRuta: 'DIA'
    },
    {
      id: 'V-002',
      cliente: 'Ana Martínez',
      direccion: 'Calle 45, Urbanización Norte',
      telefono: '3109876543',
      horaSugerida: '10:15',
      montoCuota: 80000,
      saldoTotal: 320000,
      estado: 'en_mora',
      proximaVisita: 'Hoy',
      ordenVisita: 2,
      prioridad: 'alta',
      cobradorId: 'CB-001',
      periodoRuta: 'DIA'
    },
    {
      id: 'V-003',
      cliente: 'Luis Fernández',
      direccion: 'Conjunto Residencial Vista Azul',
      telefono: '3205551234',
      horaSugerida: '11:00',
      montoCuota: 95750,
      saldoTotal: 382000,
      estado: 'pendiente',
      proximaVisita: 'Hoy',
      ordenVisita: 3,
      prioridad: 'media',
      cobradorId: 'CB-001',
      periodoRuta: 'SEMANA'
    },
    {
      id: 'V-004',
      cliente: 'María González',
      direccion: 'Diagonal 56 #78-90',
      telefono: '3157778888',
      horaSugerida: '13:45',
      montoCuota: 110000,
      saldoTotal: 440000,
      estado: 'pagado',
      proximaVisita: '15/01',
      ordenVisita: 4,
      prioridad: 'baja',
      cobradorId: 'CB-001',
      periodoRuta: 'SEMANA'
    },
    {
      id: 'V-005',
      cliente: 'José Pérez',
      direccion: 'Avenida 7 #23-45',
      telefono: '3004445555',
      horaSugerida: '14:30',
      montoCuota: 95000,
      saldoTotal: 380000,
      estado: 'ausente',
      proximaVisita: 'Mañana',
      ordenVisita: 5,
      prioridad: 'media',
      cobradorId: 'CB-001',
      periodoRuta: 'MES'
    }
  ])

  const operacionesCaja: OperacionCaja[] = useMemo(() => [
    { id: 'OP-001', tipo: 'pago', descripcion: 'Pago Carlos Rodríguez', monto: 125000, hora: '09:42', estado: 'completado', cobradorId: 'CB-001' },
    { id: 'OP-002', tipo: 'gasto', descripcion: 'Combustible', monto: 35000, hora: '08:15', estado: 'completado', cobradorId: 'CB-001' },
    { id: 'OP-003', tipo: 'base', descripcion: 'Base solicitada', monto: 50000, hora: '10:30', estado: 'pendiente', cobradorId: 'CB-001' },
    { id: 'OP-004', tipo: 'pago', descripcion: 'Pago María González', monto: 110000, hora: '13:50', estado: 'completado', cobradorId: 'CB-001' },
  ], [])

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        // Primero intentar cargar desde localStorage
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.replace('/login');
          return;
        }

        if (userData) {
          const user = JSON.parse(userData);
          setUserSession(user);
          
          // Verificar que el rol sea COBRADOR
          if (user.rol !== 'COBRADOR') {
            // Redirigir según el rol
            const ROLE_REDIRECT_MAP: Record<RolUsuario, string> = {
              SUPER_ADMINISTRADOR: '/admin',
              COORDINADOR: '/coordinador',
              SUPERVISOR: '/supervision',
              COBRADOR: '/cobranzas',
              CONTADOR: '/contabilidad',
            };
            
            const redirectPath = ROLE_REDIRECT_MAP[user.rol as RolUsuario] ?? '/';
            router.replace(redirectPath);
            return;
          }
        } else {
          // Si no hay datos en localStorage, obtener del backend
          try {
            const perfil = await obtenerPerfil();
            localStorage.setItem('user', JSON.stringify(perfil));
            setUserSession(perfil);
          } catch (error) {
            console.error('Error al obtener perfil:', error);
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    cargarUsuario();
  }, [router]);

  useEffect(() => {
    if (comprobanteTransferenciaPreviewUrl) {
      URL.revokeObjectURL(comprobanteTransferenciaPreviewUrl)
      setComprobanteTransferenciaPreviewUrl(null)
    }

    if (!comprobanteTransferencia) return
    if (!comprobanteTransferencia.type.startsWith('image/')) return

    const url = URL.createObjectURL(comprobanteTransferencia)
    setComprobanteTransferenciaPreviewUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [comprobanteTransferencia])

  // Filtrar y ordenar visitas
  const visitasCobrador = useMemo(() => {
    const filtradas = visitasBase.filter(v => v.cobradorId === 'CB-001') // Temporal
    
    // Aplicar búsqueda
    const buscadas = filtradas.filter(v => 
      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Ordenar según el orden actual
    return visitasOrden
      .map(id => buscadas.find(v => v.id === id))
      .filter((v): v is VisitaRuta => v !== undefined)
  }, [visitasBase, visitasOrden, searchQuery])

  const exportarRutaDiariaCSV = useCallback(() => {
    const filas = visitasCobrador
      .filter((v) => v.periodoRuta === 'DIA' && v.estado !== 'pagado')
      .map((v) => {
        const cols = [
          v.ordenVisita,
          v.cliente,
          v.telefono,
          v.direccion,
          v.horaSugerida,
          v.estado,
          v.montoCuota,
          v.saldoTotal,
          v.proximaVisita,
        ]
        return cols
          .map((c) => String(c).replace(/\r?\n/g, ' ').replace(/"/g, '""'))
          .map((c) => `"${c}"`)
          .join(',')
      })

    const header = [
      'orden',
      'cliente',
      'telefono',
      'direccion',
      'hora_sugerida',
      'estado',
      'monto_cuota',
      'saldo_total',
      'proxima_visita',
    ].join(',')

    const csv = [header, ...filas].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `ruta-diaria-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [visitasCobrador])

  const exportarRutaDiariaPDF = useCallback(() => {
    const data = visitasCobrador
      .filter((v) => v.periodoRuta === 'DIA' && v.estado !== 'pagado')

    const rows = data
      .map(
        (v) => `
          <tr>
            <td>${v.ordenVisita}</td>
            <td>${v.cliente}</td>
            <td>${v.telefono}</td>
            <td>${v.direccion}</td>
            <td>${v.horaSugerida}</td>
            <td>${v.estado}</td>
            <td style="text-align:right;">${formatCurrency(v.montoCuota)}</td>
          </tr>
        `
      )
      .join('')

    const html = `
      <html>
        <head>
          <title>Ruta diaria</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Ruta diaria</h1>
          <div class="sub">${new Date().toISOString().slice(0, 10)} • ${data.length} visitas</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Hora</th>
                <th>Estado</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `

    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
  }, [visitasCobrador])

  const operacionesCobrador = useMemo(() => 
    operacionesCaja.filter(op => op.cobradorId === 'CB-001'), // Temporal
    [operacionesCaja]
  )

  // Calcular caja
  const cajaRuta = useMemo(() => {
    const recaudoTotal = operacionesCobrador
      .filter(op => op.tipo === 'pago' && op.estado === 'completado')
      .reduce((sum, op) => sum + op.monto, 0)
    
    const gastosOperativos = operacionesCobrador
      .filter(op => op.tipo === 'gasto' && op.estado === 'completado')
      .reduce((sum, op) => sum + op.monto, 0)
    
    const baseSolicitada = operacionesCobrador
      .filter(op => op.tipo === 'base' && op.estado === 'pendiente')
      .reduce((sum, op) => sum + op.monto, 0)

    return {
      recaudoTotal,
      gastosOperativos,
      baseDisponible: baseSolicitada,
      saldoNeto: recaudoTotal - gastosOperativos,
      efectivoDisponible: recaudoTotal - gastosOperativos - baseSolicitada,
      cambioNecesario: 20000,
    }
  }, [operacionesCobrador])

  // Configuración de sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handlers para drag & drop
  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (rutaCompletada) return
    setActiveId(event.active.id as string)
  }, [rutaCompletada])

  const handleAbrirAbono = useCallback((visita: VisitaRuta) => {
    setVisitaPagoSeleccionada(visita)
    setIsAbono(true)
    setMetodoPago('EFECTIVO')
    setComprobanteTransferencia(null)
    setMontoPagoInput('')
    setShowPaymentModal(true)
  }, [])

  const handleGuardarReprogramacion = useCallback(() => {
    if (!visitaReprogramar) return
    if (!reprogramFecha) return

    const formatearFechaISO = (iso: string) => {
      const [yyyy, mm, dd] = iso.split('-')
      if (!yyyy || !mm || !dd) return iso
      return `${dd}/${mm}`
    }

    setVisitasBase((prev) =>
      prev.map((v) => {
        if (v.id !== visitaReprogramar.id) return v
        return {
          ...v,
          estado: 'reprogramado',
          proximaVisita: formatearFechaISO(reprogramFecha),
        }
      })
    )

    console.log('Reprogramar visita', visitaReprogramar.id, reprogramFecha, reprogramMotivo)
    setShowReprogramModal(false)
    setVisitaReprogramar(null)
    setReprogramFecha('')
    setReprogramMotivo('')
  }, [reprogramFecha, reprogramMotivo, visitaReprogramar])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setVisitasOrden((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }

    setActiveId(null)
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  // Funciones auxiliares
  const getEstadoClasses = useCallback((estado: EstadoVisita) => {
    if (estado === 'pendiente') return 'bg-orange-50 text-orange-700 border-orange-100'
    if (estado === 'pagado') return 'bg-blue-50 text-blue-700 border-blue-100'
    if (estado === 'en_mora') return 'bg-orange-100 text-orange-800 border-orange-200'
    if (estado === 'ausente') return 'bg-gray-50 text-gray-600 border-gray-100'
    return 'bg-blue-50 text-blue-700 border-blue-100'
  }, [])

  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {
    if (prioridad === 'alta') return '#f97316'
    if (prioridad === 'media') return '#08557f'
    return '#94a3b8'
  }, [])

  const handleRegistrarPago = useCallback((visitaId: string, montoPagado: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA', comprobante: File | null) => {
    console.log(`Registra pago de ${montoPagado} para visita ${visitaId} (${metodo})`, comprobante)
    setShowPaymentModal(false)
  }, [])

  const handleCompletarRuta = useCallback(() => {
    setRutaCompletada(true)
    setShowCompletarRutaModal(false)
    setCoordinadorToast('Se notificó al coordinador: ruta diaria marcada como completada.')
    window.setTimeout(() => setCoordinadorToast(null), 4000)
  }, [])

  const handleRegistrarGasto = useCallback((descripcion: string, monto: number) => {
    console.log(`Registra gasto: ${descripcion} - $${monto}`)
    setShowExpenseModal(false)
  }, [])

  const handleSolicitarBase = useCallback((monto: number, motivo: string) => {
    console.log(`Solicita base de $${monto}: ${motivo}`)
    setShowBaseRequestModal(false)
  }, [])

  const resetNuevoClienteForm = useCallback(() => {
    setShowNewClientModal(false)
    setFormularioNuevoCliente({
      dni: '',
      nombres: '',
      apellidos: '',
      telefono: '',
      correo: '',
      direccion: '',
      referencia: '',
    })
    setFotosCliente({
      fotoPerfil: null,
      documentoFrente: null,
      documentoReverso: null,
      comprobanteDomicilio: null,
    })
  }, [])

  const handleNuevoCliente = useCallback((datos: unknown) => {
    console.log(`Crea nuevo cliente:`, datos)
    resetNuevoClienteForm()
  }, [resetNuevoClienteForm])

  const handleAbrirPago = useCallback((visita: VisitaRuta) => {
    setVisitaPagoSeleccionada(visita)
    setIsAbono(false)
    setMetodoPago('EFECTIVO')
    setComprobanteTransferencia(null)
    setMontoPagoInput(formatMilesCOP(visita.montoCuota))
    setShowPaymentModal(true)
  }, [])

  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => {
    setVisitaClienteSeleccionada(visita)
    setShowClienteInfoModal(true)
  }, [])

  const handleAbrirEstadoCuenta = useCallback((visita: VisitaRuta) => {
    setVisitaEstadoCuentaSeleccionada(visita)
    setShowEstadoCuentaModal(true)
  }, [])

  // Obtener la visita activa para el overlay
  const activeVisita = activeId ? visitasCobrador.find(v => v.id === activeId) : null

  // Generar avatar del usuario
  const generarAvatar = (nombres: string, apellidos: string) => {
    return nombres.charAt(0) + (apellidos?.charAt(0) || '');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!userSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#08557f_0,transparent_100%)] opacity-20"></div>
      </div>

      <div className="relative w-full space-y-8 p-8">
        {coordinadorToast && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {coordinadorToast}
          </div>
        )}

        {rutaCompletada && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            Ruta del día completada. Las modificaciones están bloqueadas.
          </div>
        )}

        {/* Header con información del cobrador */}
        <header className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-[#08557f] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#08557f]/20">
                  {generarAvatar(userSession.nombres, userSession.apellidos)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {userSession.nombres} {userSession.apellidos}
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">Cobrador</span>
                  <span>•</span>
                  <span>{userSession.rutaAsignada || 'Ruta Norte'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Stats rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                <DollarSign className="h-5 w-5 text-slate-900" />
              </div>
              <span className="text-sm font-bold text-slate-600">Mi Recaudo</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ${cajaRuta.recaudoTotal.toLocaleString('es-CO')}
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
                <Receipt className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">Gastos</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ${cajaRuta.gastosOperativos.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Registrados hoy</p>
          </div>
        </div>

        {/* Créditos pendientes */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Créditos pendientes</div>
              <h3 className="text-lg font-bold text-slate-900">En revisión</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              {creditosPendientes.length} pendientes
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {creditosPendientes.map((credito) => (
              <div key={credito.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold text-slate-500">{credito.id}</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{credito.cliente}</div>
                <div className="mt-2 text-sm text-slate-600">${credito.monto.toLocaleString('es-CO')}</div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 text-[10px] font-bold">
                  {credito.estado}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">{credito.fecha}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-6">
            {/* Buscador y filtros */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] shadow-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      showFilters
                        ? 'bg-[#08557f] text-white border-[#08557f]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                  </button>
                  <ExportButton
                    label="Exportar Ruta"
                    onExportExcel={exportarRutaDiariaCSV}
                    onExportPDF={exportarRutaDiariaPDF}
                  />
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      showHistory 
                        ? 'bg-[#08557f] text-white border-[#08557f]' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <History className="h-4 w-4" />
                    <span className="hidden md:inline">{showHistory ? 'Ver Ruta' : 'Historial'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCompletarRutaModal(true)}
                    disabled={rutaCompletada}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${
                      rutaCompletada
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 opacity-70'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden md:inline">Completar ruta</span>
                  </button>
                </div>
              </div>

              {showFilters && !showHistory && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de ruta</div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(
                        [
                          { key: 'TODOS' as const, label: 'Día / Semana / Mes' },
                          { key: 'DIA' as const, label: 'Día' },
                          { key: 'SEMANA' as const, label: 'Semana' },
                          { key: 'MES' as const, label: 'Mes' },
                        ]
                      ).map((item) => (
                        <button
                          key={item.key}
                          onClick={() => setPeriodoRutaFiltro(item.key)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                            periodoRutaFiltro === item.key
                              ? 'bg-[#08557f] text-white border-[#08557f] shadow-lg shadow-[#08557f]/20'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de visitas */}
            <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  {showHistory && (
                    <h3 className="font-bold text-slate-900 text-lg">Histórico de Rutas</h3>
                  )}
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={visitasCobrador.filter(v => v.estado !== 'pagado').map(v => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {(() => {
                      if (showHistory) {
                        return (
                          <div className="space-y-3">
                            {visitasCobrador.map((visita) => (
                              <SortableVisita
                                key={visita.id}
                                visita={visita}
                                isSelected={visitaSeleccionada === visita.id}
                                onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                                onVerCliente={handleAbrirClienteInfo}
                                onRegistrarPago={handleAbrirPago}
                                onRegistrarAbono={handleAbrirAbono}
                                onReprogramar={(visita) => {
                                  setVisitaReprogramar(visita)
                                  setShowReprogramModal(true)
                                }}
                                onVerEstadoCuenta={handleAbrirEstadoCuenta}
                                getEstadoClasses={getEstadoClasses}
                                getPrioridadColor={getPrioridadColor}
                                disableSort={rutaCompletada}
                                disableModificaciones={rutaCompletada}
                              />
                            ))}
                          </div>
                        )
                      }

                      const noPagadas = visitasCobrador.filter(v => v.estado !== 'pagado')

                      const porPeriodo = {
                        DIA: noPagadas.filter(v => v.periodoRuta === 'DIA'),
                        SEMANA: noPagadas.filter(v => v.periodoRuta === 'SEMANA'),
                        MES: noPagadas.filter(v => v.periodoRuta === 'MES'),
                      }

                      const renderSeccion = (titulo: string, visitas: VisitaRuta[]) => (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                              {titulo}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                              {visitas.length}
                            </div>
                          </div>
                          {visitas.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 py-6 text-sm text-slate-500">
                              Sin visitas
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {visitas.map((visita) => (
                                <SortableVisita
                                  key={visita.id}
                                  visita={visita}
                                  isSelected={visitaSeleccionada === visita.id}
                                  onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                                  onVerCliente={handleAbrirClienteInfo}
                                  onRegistrarPago={handleAbrirPago}
                                  onRegistrarAbono={handleAbrirAbono}
                                  onReprogramar={(visita) => {
                                    setVisitaReprogramar(visita)
                                    setShowReprogramModal(true)
                                  }}
                                  onVerEstadoCuenta={handleAbrirEstadoCuenta}
                                  getEstadoClasses={getEstadoClasses}
                                  getPrioridadColor={getPrioridadColor}
                                  disableSort={rutaCompletada}
                                  disableModificaciones={rutaCompletada}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )

                      if (periodoRutaFiltro === 'DIA') return renderSeccion('Ruta del día', porPeriodo.DIA)
                      if (periodoRutaFiltro === 'SEMANA') return renderSeccion('Ruta de la semana', porPeriodo.SEMANA)
                      if (periodoRutaFiltro === 'MES') return renderSeccion('Ruta del mes', porPeriodo.MES)

                      return (
                        <>
                          {renderSeccion('Ruta del día', porPeriodo.DIA)}
                          {renderSeccion('Ruta de la semana', porPeriodo.SEMANA)}
                          {renderSeccion('Ruta del mes', porPeriodo.MES)}
                        </>
                      )
                    })()}
                  </div>
                </SortableContext>
                
                <DragOverlay>
                  {activeVisita ? (
                    <div className="w-full rounded-2xl border border-slate-900 bg-white shadow-xl px-4 py-3 opacity-90 rotate-2 cursor-grabbing">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex items-center">
                          <GripVertical className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-slate-900">
                                  {activeVisita.cliente}
                                </div>
                                <div 
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: getPrioridadColor(activeVisita.prioridad) }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {/* Visitas Completadas */}
              {visitasCobrador.some(v => v.estado === 'pagado') && (
                <div className="mt-8">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 opacity-50">
                    <CheckCircle2 className="h-5 w-5" />
                    Completadas
                  </h3>
                  <div className="relative z-10 pointer-events-auto space-y-3 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                    {visitasCobrador
                      .filter(v => v.estado === 'pagado')
                      .map((visita) => (
                        <StaticVisitaItem
                          key={visita.id}
                          visita={visita}
                          isSelected={visitaSeleccionada === visita.id}
                          onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                          onVerCliente={handleAbrirClienteInfo}
                          onRegistrarPago={() => {}}
                          onRegistrarAbono={handleAbrirAbono}
                          onReprogramar={(visita) => {
                            setVisitaReprogramar(visita)
                            setShowReprogramModal(true)
                          }}
                          onVerEstadoCuenta={handleAbrirEstadoCuenta}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Action Buttons (Restored) */}
        <div className="fixed right-6 z-50 flex flex-col items-end gap-3 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-none">
          {/* Actions Menu */}
          <div
            className={`flex flex-col gap-3 transition-all duration-200 origin-bottom-right ${
              isFabOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <button
              onClick={() => {
                setShowCreditModal(true)
                setIsFabOpen(false)
              }}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear Crédito</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
                <CreditCard className="h-5 w-5" />
              </div>
            </button>
            <button 
              onClick={() => {
                setShowNewClientModal(true)
                setIsFabOpen(false)
              }}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear Cliente</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
                <UserPlus className="h-5 w-5" />
              </div>
            </button>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-orange-500/20">Reg. Gasto</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-orange-500 border border-orange-200 shadow-lg shadow-orange-500/10 hover:bg-orange-50 transition-all">
                <Receipt className="h-5 w-5" />
              </div>
            </button>
            <button 
              onClick={() => setShowBaseRequestModal(true)}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-orange-500/20">Pedir Base</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-orange-500 border border-orange-200 shadow-lg shadow-orange-500/10 hover:bg-orange-50 transition-all">
                <Wallet className="h-5 w-5" />
              </div>
            </button>
            <button
              onClick={() => {
                router.push('/cobranzas/solicitudes')
                setIsFabOpen(false)
              }}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Solicitudes</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
                <ClipboardList className="h-5 w-5" />
              </div>
            </button>
          </div>

          {/* Main Toggle Button */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`pointer-events-auto p-4 rounded-full shadow-xl transition-all duration-300 ${
              isFabOpen 
                ? 'bg-[#063a58] text-white rotate-45' 
                : 'bg-[#08557f] text-white hover:bg-[#063a58] hover:scale-105'
            }`}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Modales (Implementación simplificada para el ejemplo) */}
        {showCompletarRutaModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => setShowCompletarRutaModal(false)}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Completar ruta</h3>
                      <p className="text-sm text-slate-500 font-medium">Al completar la ruta no podrás hacer más modificaciones hoy.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCompletarRutaModal(false)}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCompletarRutaModal(false)}
                      className="flex-1 rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCompletarRuta}
                      className="flex-1 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      Marcar como completada
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {showClienteInfoModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowClienteInfoModal(false)
                setVisitaClienteSeleccionada(null)
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Cliente</h3>
                    <button
                      onClick={() => {
                        setShowClienteInfoModal(false)
                        setVisitaClienteSeleccionada(null)
                      }}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-start gap-4">
                        <div className="h-28 w-24 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">
                          FOTO
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm text-slate-500">Nombre</p>
                          <p className="font-bold text-slate-900 text-lg">{visitaClienteSeleccionada?.cliente || 'Sin seleccionar'}</p>
                          {visitaClienteSeleccionada && (
                            <>
                              <p className="text-xs text-slate-500">{visitaClienteSeleccionada.direccion}</p>
                              <p className="text-xs text-slate-500">Tel: {visitaClienteSeleccionada.telefono}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {visitaClienteSeleccionada && (
                      <div className="text-sm text-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Saldo total</span>
                          <span className="font-bold text-slate-900">${visitaClienteSeleccionada.saldoTotal.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Cuota esperada</span>
                          <span className="font-bold text-slate-900">${visitaClienteSeleccionada.montoCuota.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Próxima visita</span>
                          <span className="font-medium text-slate-900">{visitaClienteSeleccionada.proximaVisita}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowClienteInfoModal(false)
                          setVisitaClienteSeleccionada(null)
                        }}
                        className="w-full rounded-xl bg-[#08557f] px-3 py-2 text-xs font-bold text-white hover:bg-[#063a58]"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Modal de Reprogramación */}
        {showReprogramModal && visitaReprogramar && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowReprogramModal(false)
                setVisitaReprogramar(null)
                setReprogramFecha('')
                setReprogramMotivo('')
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Reprogramar visita</h3>
                      <p className="text-sm text-slate-500">{visitaReprogramar.cliente}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowReprogramModal(false)
                        setVisitaReprogramar(null)
                      }}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nueva fecha</label>
                      <input
                        type="date"
                        value={reprogramFecha}
                        onChange={(e) => setReprogramFecha(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Motivo</label>
                      <textarea
                        value={reprogramMotivo}
                        onChange={(e) => setReprogramMotivo(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                        placeholder="Ej: Cliente no estaba disponible"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGuardarReprogramacion}
                      className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
                    >
                      Guardar reprogramación
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {showEstadoCuentaModal && visitaEstadoCuentaSeleccionada && (
          <EstadoCuentaModal
            visita={visitaEstadoCuentaSeleccionada}
            onClose={() => {
              setShowEstadoCuentaModal(false)
              setVisitaEstadoCuentaSeleccionada(null)
            }}
          />
        )}

        {/* Modal de Pagos */}
        {showPaymentModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowPaymentModal(false)
                setVisitaPagoSeleccionada(null)
                setIsAbono(false)
                setMontoPagoInput('')
                setMetodoPago('EFECTIVO')
                setComprobanteTransferencia(null)
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{isAbono ? 'Registrar Abono' : 'Registrar Pago'}</h3>
                    <button 
                      onClick={() => setShowPaymentModal(false)}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <p className="text-sm text-slate-500">Cliente</p>
                      <p className="font-bold text-slate-900 text-lg">{visitaPagoSeleccionada?.cliente || 'Sin seleccionar'}</p>
                      {visitaPagoSeleccionada && (
                        <>
                          <p className="text-xs text-slate-500">{visitaPagoSeleccionada.direccion}</p>
                          <p className="text-xs text-slate-400">Cuota esperada: ${formatMilesCOP(visitaPagoSeleccionada.montoCuota)}</p>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Método de Pago</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMetodoPago('EFECTIVO')}
                          className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                            metodoPago === 'EFECTIVO'
                              ? 'bg-[#08557f] text-white border-[#08557f]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          EFECTIVO
                        </button>
                        <button
                          type="button"
                          onClick={() => setMetodoPago('TRANSFERENCIA')}
                          className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                            metodoPago === 'TRANSFERENCIA'
                              ? 'bg-[#08557f] text-white border-[#08557f]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          TRANSFERENCIA
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Monto Recibido</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={montoPagoInput}
                          onChange={(e) => setMontoPagoInput(formatCOPInputValue(e.target.value))}
                          className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-2xl text-slate-900 placeholder:text-slate-300"
                          placeholder="0"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[10000, 20000, 50000, 100000].map(amount => (
                        <button 
                          key={amount}
                          type="button"
                          onClick={() => {
                            const nuevo = parseCOPInputToNumber(montoPagoInput) + amount
                            setMontoPagoInput(nuevo === 0 ? '' : formatMilesCOP(nuevo))
                          }}
                          className="py-2 px-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                        >
                          +${(amount/1000).toFixed(0)}k
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => {
                        handleRegistrarPago(visitaPagoSeleccionada?.id || '', parseCOPInputToNumber(montoPagoInput), metodoPago, comprobanteTransferencia)
                      }}
                      disabled={
                        parseCOPInputToNumber(montoPagoInput) <= 0 ||
                        (metodoPago === 'TRANSFERENCIA' && !comprobanteTransferencia)
                      }
                      className="w-full bg-[#08557f] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      {isAbono ? 'Confirmar Abono' : 'Confirmar Pago'}
                    </button>

                    {metodoPago === 'TRANSFERENCIA' && (
                      <div className="pt-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Comprobante (Obligatorio)
                        </label>
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900">Sube el comprobante</p>
                                {comprobanteTransferencia && (
                                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#08557f] border border-blue-100">
                                    ADJUNTO
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">Imagen o PDF. Recomendado: foto clara del recibo.</p>
                            </div>
                            {comprobanteTransferencia && (
                              <button
                                type="button"
                                onClick={() => {
                                  setComprobanteTransferencia(null)
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              >
                                Quitar
                              </button>
                            )}
                          </div>

                          {comprobanteTransferenciaPreviewUrl && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <img
                                src={comprobanteTransferenciaPreviewUrl}
                                alt="Comprobante"
                                className="w-full h-40 object-cover"
                              />
                            </div>
                          )}

                          {comprobanteTransferencia && !comprobanteTransferenciaPreviewUrl && (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                              <p className="text-xs font-bold text-slate-700 truncate">
                                Archivo: {comprobanteTransferencia.name}
                              </p>
                            </div>
                          )}

                          <div className="mt-3">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => setComprobanteTransferencia(e.target.files?.[0] || null)}
                              className="w-full text-sm"
                              required
                            />
                          </div>
                        </div>
                        {!comprobanteTransferencia && (
                          <p className="mt-2 text-xs font-bold text-rose-600">
                            Adjunta el comprobante para confirmar una transferencia.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Modal de Gastos */}
        {showExpenseModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowExpenseModal(false)
                setMontoGastoInput('')
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Registrar Gasto</h3>
                    <button 
                      onClick={() => setShowExpenseModal(false)}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Concepto</label>
                      <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                        <option>Combustible</option>
                        <option>Alimentación</option>
                        <option>Reparación Moto</option>
                        <option>Papelería</option>
                        <option>Otros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Monto</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={montoGastoInput}
                          onChange={(e) => setMontoGastoInput(formatCOPInputValue(e.target.value))}
                          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante (Opcional)</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
                        <Camera className="h-8 w-8 mb-2" />
                        <span className="text-xs font-bold">Tomar foto</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRegistrarGasto('Combustible', parseCOPInputToNumber(montoGastoInput))}
                      className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
                    >
                      Guardar Gasto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Modal de Solicitud de Base */}
        {showBaseRequestModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowBaseRequestModal(false)
                setMontoBaseInput('')
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Solicitar Base</h3>
                    <button 
                      onClick={() => setShowBaseRequestModal(false)}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Monto Solicitado</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={montoBaseInput}
                          onChange={(e) => setMontoBaseInput(formatCOPInputValue(e.target.value))}
                          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Motivo / Descripción</label>
                      <textarea 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                        rows={3}
                        placeholder="Ej: Para préstamo cliente X..."
                      ></textarea>
                    </div>
                    <button 
                      onClick={() => handleSolicitarBase(parseCOPInputToNumber(montoBaseInput), 'Solicitud manual')}
                      className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
                    >
                      Enviar Solicitud
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Modal de Crear Cliente */}
        {showNewClientModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={resetNuevoClienteForm}
            >
              <div
                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Crear Cliente</h3>
                    <button 
                      onClick={resetNuevoClienteForm}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleNuevoCliente({
                        ...formularioNuevoCliente,
                        fotos: fotosCliente,
                      })
                    }}
                    className="space-y-4"
                  >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula / CC</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formularioNuevoCliente.dni}
                        onChange={(e) =>
                          setFormularioNuevoCliente((prev) => ({
                            ...prev,
                            dni: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="Número de cédula (CC)"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={formularioNuevoCliente.telefono}
                        onChange={(e) =>
                          setFormularioNuevoCliente((prev) => ({
                            ...prev,
                            telefono: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="Ej: 3001234567"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nombres</label>
                      <input
                        value={formularioNuevoCliente.nombres}
                        onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, nombres: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Apellidos</label>
                      <input
                        value={formularioNuevoCliente.apellidos}
                        onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, apellidos: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Correo (Opcional)</label>
                    <input
                      type="email"
                      value={formularioNuevoCliente.correo}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, correo: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="correo@dominio.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Dirección (Opcional)</label>
                    <input
                      value={formularioNuevoCliente.direccion}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, direccion: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="Dirección del cliente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Referencia (Opcional)</label>
                    <textarea
                      value={formularioNuevoCliente.referencia}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, referencia: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                      rows={3}
                      placeholder="Punto de referencia / observaciones"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Foto de perfil</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            fotoPerfil: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula/CC (Frente)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            documentoFrente: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula/CC (Reverso)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            documentoReverso: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante de domicilio</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            comprobanteDomicilio: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetNuevoClienteForm}
                      className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all"
                    >
                      Guardar Cliente
                    </button>
                  </div>
                  </form>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Modal de Crear Crédito */}
        {showCreditModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowCreditModal(false)
                setCreditType('prestamo')
                setMontoPrestamoInput('')
                setTasaInteresInput('')
                setCuotasPrestamoInput('')
                setCuotaInicialArticuloInput('')
              }}
            >
              <div
                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Crear Nuevo Crédito</h3>
                    <button 
                      onClick={() => {
                        setShowCreditModal(false)
                        setCreditType('prestamo')
                      }}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                
                {/* Selector de Tipo de Crédito */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Tipo de Crédito</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setCreditType('prestamo')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        creditType === 'prestamo'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <DollarSign className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Préstamo en Efectivo</div>
                    </button>
                    <button
                      onClick={() => setCreditType('articulo')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        creditType === 'articulo'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <ShoppingBag className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Crédito por Artículo</div>
                    </button>
                  </div>
                </div>

                {/* Formulario Dinámico */}
                <div className="space-y-4">
                  {/* Cliente - Común para ambos */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                      <option value="">Seleccionar cliente...</option>
                      <option>Carlos Rodríguez</option>
                      <option>Ana Martínez</option>
                      <option>Luis Fernández</option>
                    </select>
                  </div>

                  {/* Contenido específico según tipo */}
                  {creditType === 'prestamo' ? (
                    <>
                      {/* Formulario de Préstamo */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Monto del Préstamo</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input 
                              type="text"
                              inputMode="numeric"
                              value={montoPrestamoInput}
                              onChange={(e) => setMontoPrestamoInput(formatCOPInputValue(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Tasa de Interés (%)</label>
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={tasaInteresInput}
                            onChange={(e) => setTasaInteresInput(e.target.value.replace(/[^0-9.]/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            placeholder="5.0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                            <option>Diario</option>
                            <option>Semanal</option>
                            <option>Quincenal</option>
                            <option>Mensual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                          <input 
                            type="text"
                            inputMode="numeric"
                            value={cuotasPrestamoInput}
                            onChange={(e) => setCuotasPrestamoInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            placeholder="12"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Formulario de Artículo */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Artículo</label>
                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                          <option value="">Seleccionar artículo...</option>
                          <option>TV Samsung 55" 4K</option>
                          <option>Refrigeradora LG 500L</option>
                          <option>Lavadora Whirlpool 18kg</option>
                          <option>Celular iPhone 15</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Precio del Artículo</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input 
                              type="text"
                              inputMode="numeric"
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                              placeholder="0"
                              readOnly
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuota Inicial</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input 
                              type="text"
                              inputMode="numeric"
                              value={cuotaInicialArticuloInput}
                              onChange={(e) => setCuotaInicialArticuloInput(formatCOPInputValue(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                            <option>Diario</option>
                            <option>Semanal</option>
                            <option>Quincenal</option>
                            <option>Mensual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                            <option>3 cuotas</option>
                            <option>6 cuotas</option>
                            <option>12 cuotas</option>
                            <option>18 cuotas</option>
                            <option>24 cuotas</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notas - Común para ambos */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Notas (Opcional)</label>
                    <textarea 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                      rows={3}
                      placeholder="Observaciones adicionales..."
                    ></textarea>
                  </div>

                  {/* Resumen */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tipo:</span>
                        <span className="font-bold text-slate-900">
                          {creditType === 'prestamo' ? 'Préstamo en Efectivo' : 'Crédito por Artículo'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Estado:</span>
                        <span className="font-bold text-orange-600">Pendiente de Aprobación</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => {
                        setShowCreditModal(false)
                        setCreditType('prestamo')
                      }}
                      className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        console.log('Crear crédito:', creditType)
                        setShowCreditModal(false)
                        setCreditType('prestamo')
                      }}
                      className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all"
                    >
                      Crear Crédito
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </Portal>
        )}
      </div>
    </div>
  )
}

export default VistaCobrador