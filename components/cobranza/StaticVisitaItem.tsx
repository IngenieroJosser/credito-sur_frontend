'use client'

import {
  MapPin,
  Clock,
  Eye,
  ChevronRight,
  Wallet,
  FileText as FileTextIcon,
  DollarSign,
  Calendar,
  GripVertical
} from 'lucide-react'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'

interface StaticVisitaItemProps {
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
}

export default function StaticVisitaItem({
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
}: StaticVisitaItemProps) {
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
