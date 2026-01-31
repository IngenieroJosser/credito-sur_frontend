'use client'

import React, { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Eye, Phone, GripVertical, Clock, XCircle, ChevronDown } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'

export const MODAL_Z_INDEX = 2147483647

export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export function SeleccionClienteModal({ 
  visitas, 
  onSelect, 
  onClose,
  titulo = "Estado de Cuenta",
  subtitulo = "Consultar Cliente"
}: { 
  visitas: VisitaRuta[], 
  onSelect: (v: VisitaRuta) => void, 
  onClose: () => void,
  titulo?: string,
  subtitulo?: string
}) {
  return (
    <Portal>
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 text-center">
             <h3 className="font-bold text-lg text-slate-900 flex-1">{titulo}</h3>
             <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <XCircle className="h-5 w-5" />
             </button>
          </div>
          <div className="p-8 space-y-6">
             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{subtitulo}</label>
                <div className="relative">
                    <select 
                       autoFocus
                       defaultValue=""
                       className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all appearance-none cursor-pointer"
                       onChange={(e) => {
                          const visita = visitas.find(v => v.id === e.target.value);
                          if (visita) onSelect(visita);
                       }}
                    >
                       <option value="" disabled>Seleccionar de la lista...</option>
                       {visitas.map(v => (
                          <option key={v.id} value={v.id}>{v.cliente} - {v.direccion}</option>
                       ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                       <ChevronDown className="h-5 w-5" />
                    </div>
                </div>
             </div>
             <button onClick={onClose} className="w-full py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                Cancelar consulta
             </button>
          </div>
       </div>
    </div>
    </Portal>
  )
}

export function StaticVisitaItem({
  visita,
  onSelect,
  onVerCliente,
  getEstadoClasses,
  getPrioridadColor,
  isSelected,
  allowClick = true,
  children,
}: {
  visita: VisitaRuta
  onSelect: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor?: (prioridad: 'alta' | 'media' | 'baja') => string
  isSelected?: boolean
  allowClick?: boolean
  children?: ReactNode
}) {
  return (
    <div
      onClick={() => allowClick && onSelect(visita.id)}
      className={`relative z-10 w-full rounded-2xl px-4 py-3 transition-all bg-white ${
        allowClick ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'
      } ${
        isSelected 
          ? 'ring-2 ring-[#08557f] shadow-md bg-slate-50' 
          : visita.nivelRiesgo === 'bajo' ? 'border-[3px] border-blue-600 shadow-sm' :
            visita.nivelRiesgo === 'leve' ? 'border-[3px] border-emerald-600 shadow-sm' :
            visita.nivelRiesgo === 'moderado' ? 'border-[3px] border-orange-600 shadow-md' :
            visita.nivelRiesgo === 'critico' ? 'border-[3px] border-red-700 shadow-lg' :
            'border-[3px] border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex items-center">
          <GripVertical className="h-5 w-5 text-slate-200" />
        </div>

        <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-lg font-bold text-slate-900 leading-tight">{visita.cliente}</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center flex-wrap gap-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">#{visita.ordenVisita}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 bg-blue-50/50 px-1.5 py-0.5 rounded text-blue-700 border border-blue-100/50">
                            <Clock className="w-3 h-3" />
                            {visita.horaSugerida || 'En ruta'}
                        </span>
                        <span>•</span>
                        <span>{visita.periodoRuta === 'DIA' ? 'Diario' : visita.periodoRuta}</span>
                         {getPrioridadColor && (
                           <div className="flex items-center gap-1 ml-2">
                             <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getPrioridadColor(visita.prioridad) }}></div>
                             <span className="text-[10px] uppercase font-bold" style={{ color: getPrioridadColor(visita.prioridad) }}>{visita.prioridad}</span>
                           </div>
                         )}
                    </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onVerCliente(visita); }}
                  className="p-2 bg-slate-100/50 rounded-full hover:bg-white text-slate-500 hover:text-[#08557f] transition-all border border-transparent hover:border-slate-200 shadow-sm"
                  title="Ver detalles"
                >
                   <Eye className="w-5 h-5" />
                </button>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2 text-sm text-slate-700 bg-white/50 px-3 py-2 rounded-lg border border-slate-100/50">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate flex-1 font-medium">{visita.direccion}</span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2">
                 <div className="bg-white/60 p-2 rounded-lg border border-slate-100/50 shadow-sm">
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">Cuota</div>
                     <div className="text-sm font-bold text-slate-900">${visita.montoCuota.toLocaleString('es-CO')}</div>
                 </div>
                 <div className="bg-white/60 p-2 rounded-lg border border-slate-100/50 shadow-sm text-center">
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">Recaudado</div>
                     <div className="text-sm font-bold text-emerald-600">$0</div>
                 </div>
                 <div className="bg-white/60 p-2 rounded-lg border border-slate-100/50 shadow-sm text-right">
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">Por Entregar</div>
                     <div className={`text-sm font-bold ${visita.saldoTotal > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>${visita.saldoTotal.toLocaleString('es-CO')}</div>
                 </div>
            </div>

            {/* Status Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100/20">
                 <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase w-fit ${getEstadoClasses(visita.estado)} shadow-sm`}>
                        {visita.estado.replace('_', ' ')}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded w-fit ${
                        visita.nivelRiesgo === 'bajo' ? 'text-blue-600 bg-blue-50 border border-blue-100' :
                        visita.nivelRiesgo === 'leve' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' :
                        visita.nivelRiesgo === 'moderado' ? 'text-orange-600 bg-orange-50 border border-orange-100' :
                        visita.nivelRiesgo === 'critico' ? 'text-red-600 bg-red-50 border border-red-100' :
                        'text-slate-400 bg-slate-50'
                    }`}>
                        {visita.nivelRiesgo === 'bajo' ? 'Peligro Mínimo' :
                         visita.nivelRiesgo === 'leve' ? 'Leve Retraso' :
                         visita.nivelRiesgo === 'moderado' ? 'Riesgo Moderado' :
                         visita.nivelRiesgo === 'critico' ? 'Alto Riesgo' :
                        'Riesgo Desconocido'}
                    </span>
                 </div>
                 <div className="flex items-center gap-1.5 text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                     <Phone className="w-3.5 h-3.5 text-[#08557f]" />
                     {visita.telefono}
                 </div>
            </div>
            
            {isSelected && children && (
              <div className="pt-2 mt-2 border-t border-slate-100 animate-in slide-in-from-top-2">
                {children}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export function SortableItem({
  visita,
  onSelect,
  onVerCliente,
  getEstadoClasses,
  getPrioridadColor,
  isSelected,
  children,
  disableSort,
}: {
  visita: VisitaRuta
  onSelect: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor?: (prioridad: 'alta' | 'media' | 'baja') => string
  isSelected?: boolean
  children?: ReactNode
  disableSort?: boolean
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
      onClick={() => onSelect(visita.id)}
      className={`relative z-10 w-full rounded-2xl px-4 py-3 transition-all cursor-pointer hover:shadow-lg bg-white ${
        isSelected 
          ? 'ring-2 ring-[#08557f] shadow-md bg-slate-50' 
          : visita.nivelRiesgo === 'bajo' ? 'border-[3px] border-blue-600 shadow-sm' :
            visita.nivelRiesgo === 'leve' ? 'border-[3px] border-emerald-600 shadow-sm' :
            visita.nivelRiesgo === 'moderado' ? 'border-[3px] border-orange-600 shadow-md' :
            visita.nivelRiesgo === 'critico' ? 'border-[3px] border-red-700 shadow-lg' :
            'border-[3px] border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
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
        
        <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-lg font-bold text-slate-900 leading-tight">{visita.cliente}</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center flex-wrap gap-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">#{visita.ordenVisita}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 bg-blue-50/50 px-1.5 py-0.5 rounded text-blue-700 border border-blue-100/50">
                            <Clock className="w-3 h-3" />
                            {visita.horaSugerida || 'En ruta'}
                        </span>
                        <span>•</span>
                        <span>{visita.periodoRuta === 'DIA' ? 'Diario' : visita.periodoRuta}</span>
                        {getPrioridadColor && (
                           <div className="flex items-center gap-1 ml-2">
                             <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getPrioridadColor(visita.prioridad) }}></div>
                             <span className="text-[10px] uppercase font-bold" style={{ color: getPrioridadColor(visita.prioridad) }}>{visita.prioridad}</span>
                           </div>
                         )}
                    </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onVerCliente(visita); }}
                  className="p-2 bg-slate-100/50 rounded-full hover:bg-white text-slate-500 hover:text-[#08557f] transition-all border border-transparent hover:border-slate-200 shadow-sm"
                  title="Ver detalles"
                >
                   <Eye className="w-5 h-5" />
                </button>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2 text-sm text-slate-700 bg-white/50 px-3 py-2 rounded-lg border border-slate-100/50">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate flex-1 font-medium">{visita.direccion}</span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2">
                 <div className="bg-white/60 p-2 rounded-lg border border-slate-100/50 shadow-sm">
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">Cuota</div>
                     <div className="text-sm font-bold text-slate-900">${visita.montoCuota.toLocaleString('es-CO')}</div>
                 </div>
                 <div className="bg-white/60 p-2 rounded-lg border border-slate-100/50 shadow-sm text-center">
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">Recaudado</div>
                     <div className="text-sm font-bold text-emerald-600">$0</div>
                 </div>
                 <div className="bg-white/60 p-2 rounded-lg border border-slate-100/50 shadow-sm text-right">
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">Por Entregar</div>
                     <div className={`text-sm font-bold ${visita.saldoTotal > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>${visita.saldoTotal.toLocaleString('es-CO')}</div>
                 </div>
            </div>

            {/* Status Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100/20">
                 <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase w-fit ${getEstadoClasses(visita.estado)} shadow-sm`}>
                        {visita.estado.replace('_', ' ')}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded w-fit ${
                        visita.nivelRiesgo === 'bajo' ? 'text-blue-600 bg-blue-50 border border-blue-100' :
                        visita.nivelRiesgo === 'leve' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' :
                        visita.nivelRiesgo === 'moderado' ? 'text-orange-600 bg-orange-50 border border-orange-100' :
                        visita.nivelRiesgo === 'critico' ? 'text-red-600 bg-red-50 border border-red-100' :
                        'text-slate-400 bg-slate-50'
                    }`}>
                        {visita.nivelRiesgo === 'bajo' ? 'Peligro Mínimo' :
                         visita.nivelRiesgo === 'leve' ? 'Leve Retraso' :
                         visita.nivelRiesgo === 'moderado' ? 'Riesgo Moderado' :
                         visita.nivelRiesgo === 'critico' ? 'Alto Riesgo' :
                        'Riesgo Desconocido'}
                    </span>
                 </div>
                 <div className="flex items-center gap-1.5 text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                     <Phone className="w-3.5 h-3.5 text-[#08557f]" />
                     {visita.telefono}
                 </div>
            </div>
            
            {isSelected && children && (
              <div className="pt-2 mt-2 border-t border-slate-100 animate-in slide-in-from-top-2">
                {children}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export function SortableVisita({
  visita,
  onSelect,
  onVerCliente,
  getEstadoClasses,
  getPrioridadColor,
  isSelected,
  children,
  disableSort,
}: {
  visita: VisitaRuta
  onSelect: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor?: (prioridad: 'alta' | 'media' | 'baja') => string
  isSelected?: boolean
  children?: ReactNode
  disableSort?: boolean
}) {
  return (
    <SortableItem
      visita={visita}
      onSelect={onSelect}
      onVerCliente={onVerCliente}
      getEstadoClasses={getEstadoClasses}
      getPrioridadColor={getPrioridadColor}
      isSelected={isSelected}
      disableSort={disableSort}
    >
      {children}
    </SortableItem>
  )
}
