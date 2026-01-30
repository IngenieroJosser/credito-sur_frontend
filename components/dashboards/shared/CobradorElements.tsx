'use client'

import React, { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Eye, Phone, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'

export const MODAL_Z_INDEX = 2147483647

export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export function StaticVisitaItem({
  visita,
  onSelect,
  onVerCliente,
  getEstadoClasses,
}: {
  visita: VisitaRuta
  onSelect: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
}) {
  return (
    <div
      onClick={() => onSelect(visita.id)}
      className={`relative z-10 w-full rounded-2xl px-4 py-3 transition-all cursor-pointer hover:shadow-lg bg-white ${
        visita.nivelRiesgo === 'bajo' ? 'border-4 border-blue-600 shadow-sm' :
        visita.nivelRiesgo === 'leve' ? 'border-4 border-emerald-600 shadow-sm' :
        visita.nivelRiesgo === 'moderado' ? 'border-4 border-orange-600 shadow-md' :
        visita.nivelRiesgo === 'critico' ? 'border-4 border-red-700 shadow-lg' :
        'border-2 border-slate-200'
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
                    <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">#{visita.ordenVisita}</span>
                        <span>•</span>
                        <span>{visita.periodoRuta === 'DIA' ? 'Diario' : visita.periodoRuta}</span>
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
                 <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getEstadoClasses(visita.estado)} shadow-sm`}>
                    {visita.estado.replace('_', ' ')}
                 </span>
                 <div className="flex items-center gap-1.5 text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                     <Phone className="w-3.5 h-3.5 text-[#08557f]" />
                     {visita.telefono}
                 </div>
            </div>
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
  disableSort,
}: {
  visita: VisitaRuta
  onSelect: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
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
        visita.nivelRiesgo === 'bajo' ? 'border-4 border-blue-600 shadow-sm' :
        visita.nivelRiesgo === 'leve' ? 'border-4 border-emerald-600 shadow-sm' :
        visita.nivelRiesgo === 'moderado' ? 'border-4 border-orange-600 shadow-md' :
        visita.nivelRiesgo === 'critico' ? 'border-4 border-red-700 shadow-lg' :
        'border-2 border-slate-200'
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
                    <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">#{visita.ordenVisita}</span>
                        <span>•</span>
                        <span>{visita.periodoRuta === 'DIA' ? 'Diario' : visita.periodoRuta}</span>
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
                 <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getEstadoClasses(visita.estado)} shadow-sm`}>
                    {visita.estado.replace('_', ' ')}
                 </span>
                 <div className="flex items-center gap-1.5 text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                     <Phone className="w-3.5 h-3.5 text-[#08557f]" />
                     {visita.telefono}
                 </div>
            </div>
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
  disableSort,
}: {
  visita: VisitaRuta
  onSelect: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  disableSort?: boolean
}) {
  return (
    <SortableItem
      visita={visita}
      onSelect={onSelect}
      onVerCliente={onVerCliente}
      getEstadoClasses={getEstadoClasses}
      disableSort={disableSort}
    />
  )
}
