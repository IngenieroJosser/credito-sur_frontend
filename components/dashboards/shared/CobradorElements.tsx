'use client'

import React, { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Eye, Phone, GripVertical, Clock, XCircle, ChevronDown, Calendar, Timer } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'
import { formatMilesCOP } from '@/lib/utils'

export const MODAL_Z_INDEX = 2147483600

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
    <div className="fixed inset-0 z-[2147483600] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
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
                       <option value="" disabled className="text-slate-400 bg-white">Seleccionar de la lista...</option>
                       {visitas.map(v => {
                          // Mostrar tipo y frecuencia para diferenciar múltiples créditos del mismo cliente
                          const tipoCred = v.tipoPrestamo === 'ARTICULO'
                            ? (v.articuloNombre ? `Artículo: ${v.articuloNombre}` : 'Artículo')
                            : 'Efectivo';
                          const periodoCred = v.periodoRuta === 'DIA' ? 'Diario'
                            : v.periodoRuta === 'SEMANA' ? 'Semanal'
                            : v.periodoRuta === 'QUINCENA' ? 'Quincenal'
                            : v.periodoRuta === 'MES' ? 'Mensual'
                            : v.periodoRuta;
                          return (
                            <option key={v.id} value={v.id} className="text-slate-900 bg-white">
                              {`${v.cliente} — ${tipoCred} · ${periodoCred}`}
                            </option>
                          );
                       })}
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
  onSelect?: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor?: (prioridad: 'alta' | 'media' | 'baja') => string
  isSelected?: boolean
  allowClick?: boolean
  children?: ReactNode
}) {
  return (
    <div
      onClick={() => allowClick && onSelect && onSelect(visita.id)}
      className={`relative z-10 w-full rounded-xl px-3 py-2 transition-all bg-white ${
        allowClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
      } border-2 ${
        isSelected 
          ? 'ring-2 ring-[#08557f] shadow-md bg-blue-50/30 border-[#08557f]' 
          : visita.nivelRiesgo === 'bajo' ? 'border-emerald-500 shadow-sm' :
            visita.nivelRiesgo === 'leve' ? 'border-blue-500 shadow-sm' :
            (visita.nivelRiesgo as string) === 'precaucion' ? 'border-yellow-400 shadow-sm' :
            visita.nivelRiesgo === 'moderado' ? 'border-orange-500 shadow-sm' :
            visita.nivelRiesgo === 'critico' ? 'border-red-600 shadow-md' :
            'border-slate-200'
      }`}
    >
      {/* FILA PRINCIPAL — todo en una sola línea */}
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-slate-200 shrink-0" />

        {/* Nombre + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Dot semáforo: Verde=al día · Amarillo=leve retraso · Rojo=mora/crítico */}
            <span
              title={
                visita.nivelRiesgo === 'bajo' ? 'Al día' :
                visita.nivelRiesgo === 'leve' ? 'Riesgo leve' :
                (visita.nivelRiesgo as string) === 'precaucion' ? 'Precaución' :
                visita.nivelRiesgo === 'moderado' ? 'En mora' :
                visita.nivelRiesgo === 'critico' ? 'Crítico / Lista negra' : ''
              }
              className={`w-2 h-2 rounded-full shrink-0 ${
                visita.nivelRiesgo === 'bajo' ? 'bg-emerald-500' :
                visita.nivelRiesgo === 'leve' ? 'bg-yellow-400' :
                (visita.nivelRiesgo as string) === 'precaucion' ? 'bg-orange-400' :
                visita.nivelRiesgo === 'moderado' ? 'bg-orange-500' :
                visita.nivelRiesgo === 'critico' ? 'bg-red-600' :
                'bg-slate-300'
              }`}
            />
            <span className="text-sm font-bold text-slate-900 truncate min-w-0">{visita.cliente}</span>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
              visita.nivelRiesgo === 'bajo' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
              visita.nivelRiesgo === 'leve' ? 'text-blue-700 bg-blue-50 border-blue-100' :
              (visita.nivelRiesgo as string) === 'precaucion' ? 'text-yellow-700 bg-yellow-50 border-yellow-100' :
              visita.nivelRiesgo === 'moderado' ? 'text-orange-700 bg-orange-50 border-orange-100' :
              visita.nivelRiesgo === 'critico' ? 'text-red-700 bg-red-50 border-red-100' :
              'text-slate-400 bg-slate-50 border-slate-200'
            }`}>
              {visita.nivelRiesgo === 'bajo' ? 'Mínimo' :
               visita.nivelRiesgo === 'leve' ? 'Leve' :
               (visita.nivelRiesgo as string) === 'precaucion' ? 'Precaución' :
                visita.nivelRiesgo === 'moderado' ? 'Moderado' :
                visita.nivelRiesgo === 'critico' ? 'Crítico' : '—'}
             </span>
             {visita.cuotaActual && (
               <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                 #{visita.cuotaActual}{visita.cuotasTotales ? `/${visita.cuotasTotales}` : ''}
               </span>
             )}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${getEstadoClasses(visita.estado)}`}>
              {visita.estado.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 font-medium">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[180px]">{visita.direccion}</span>
            {visita.telefono && (
              <><span className="mx-0.5">·</span><Phone className="w-3 h-3 shrink-0" /><span>{visita.telefono}</span></>
            )}
          </div>
        </div>

        {/* KPIs en horizontal */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-center">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Cuota</div>
            <div className="text-xs font-black text-slate-800">${formatMilesCOP(visita.montoCuota)}</div>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="text-center">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Saldo</div>
            <div className={`text-xs font-black ${visita.saldoTotal > 0 ? 'text-slate-700' : 'text-emerald-600'}`}>${formatMilesCOP(visita.saldoTotal)}</div>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center gap-1 text-[10px] font-bold bg-[#08557f]/5 text-[#08557f] border border-[#08557f]/10 px-1.5 py-0.5 rounded-md uppercase">
            {visita.periodoRuta === 'DIA' ? 'Día' :
             visita.periodoRuta === 'SEMANA' ? 'Sem' :
             visita.periodoRuta === 'QUINCENA' ? 'Qna' :
             visita.periodoRuta === 'MES' ? 'Mes' : visita.periodoRuta}
          </div>
        </div>

        {/* Ojo */}
        <button
          onClick={(e) => { e.stopPropagation(); onVerCliente(visita); }}
          className="p-1.5 bg-slate-100/60 rounded-lg hover:bg-white text-slate-400 hover:text-[#08557f] transition-all border border-transparent hover:border-slate-200 shrink-0"
          title="Ver detalles"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Prórroga — solo si aplica */}
      {visita.enProrroga && (() => {
        const diasRestantes = visita.fechaProrroga
          ? Math.ceil((new Date(visita.fechaProrroga).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null
        const color = diasRestantes === null || diasRestantes < 0
          ? 'bg-rose-50 border-rose-200 text-rose-700'
          : diasRestantes <= 1 ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-blue-50 border-blue-200 text-blue-700'
        return (
          <div className={`mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wide ${color}`}>
            <Timer className="w-3 h-3 shrink-0" />
            {diasRestantes === null ? 'En prórroga activa' :
             diasRestantes < 0 ? 'Prórroga vencida' :
             diasRestantes === 0 ? 'Prórroga vence HOY' :
             `Prórroga — vence ${new Date(visita.fechaProrroga!).toLocaleDateString('es-CO')} (${diasRestantes}d)`}
          </div>
        )
      })()}

      {/* Botones de acción — en fila compacta */}
      {children && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          {children}
        </div>
      )}
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
      className={`relative z-10 w-full rounded-xl px-3 py-2 transition-all bg-white border-2 ${
        isSelected 
          ? 'ring-2 ring-[#08557f] shadow-md bg-blue-50/30 border-[#08557f]' 
          : visita.nivelRiesgo === 'bajo' ? 'border-emerald-500 shadow-sm' :
            visita.nivelRiesgo === 'leve' ? 'border-blue-500 shadow-sm' :
            (visita.nivelRiesgo as string) === 'precaucion' ? 'border-yellow-400 shadow-sm' :
            visita.nivelRiesgo === 'moderado' ? 'border-orange-500 shadow-sm' :
            visita.nivelRiesgo === 'critico' ? 'border-red-600 shadow-md' :
            'border-slate-200'
      }`}
    >
      {/* FILA PRINCIPAL — todo en una sola línea */}
      <div className="flex items-center gap-2">
        {/* Handle drag */}
        {disableSort ? (
          <GripVertical className="h-4 w-4 text-slate-200 shrink-0" />
        ) : (
          <div
            className="cursor-grab active:cursor-grabbing shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-slate-400" />
          </div>
        )}

        {/* Nombre + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Dot semáforo */}
            <span
              title={
                visita.nivelRiesgo === 'bajo' ? 'Al día' :
                visita.nivelRiesgo === 'leve' ? 'Riesgo leve' :
                (visita.nivelRiesgo as string) === 'precaucion' ? 'Precaución' :
                visita.nivelRiesgo === 'moderado' ? 'En mora' :
                visita.nivelRiesgo === 'critico' ? 'Crítico / Lista negra' : ''
              }
              className={`w-2 h-2 rounded-full shrink-0 ${
                visita.nivelRiesgo === 'bajo' ? 'bg-emerald-500' :
                visita.nivelRiesgo === 'leve' ? 'bg-yellow-400' :
                (visita.nivelRiesgo as string) === 'precaucion' ? 'bg-orange-400' :
                visita.nivelRiesgo === 'moderado' ? 'bg-orange-500' :
                visita.nivelRiesgo === 'critico' ? 'bg-red-600' :
                'bg-slate-300'
              }`}
            />
            <span className="text-sm font-bold text-slate-900 truncate min-w-0">{visita.cliente}</span>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
              visita.nivelRiesgo === 'bajo' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
              visita.nivelRiesgo === 'leve' ? 'text-blue-700 bg-blue-50 border-blue-100' :
              (visita.nivelRiesgo as string) === 'precaucion' ? 'text-yellow-700 bg-yellow-50 border-yellow-100' :
              visita.nivelRiesgo === 'moderado' ? 'text-orange-700 bg-orange-50 border-orange-100' :
              visita.nivelRiesgo === 'critico' ? 'text-red-700 bg-red-50 border-red-100' :
              'text-slate-400 bg-slate-50 border-slate-200'
            }`}>
              {visita.nivelRiesgo === 'bajo' ? 'Mínimo' :
               visita.nivelRiesgo === 'leve' ? 'Leve' :
               (visita.nivelRiesgo as string) === 'precaucion' ? 'Precaución' :
                visita.nivelRiesgo === 'moderado' ? 'Moderado' :
                visita.nivelRiesgo === 'critico' ? 'Crítico' : '—'}
             </span>
             {visita.cuotaActual && (
               <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                 #{visita.cuotaActual}{visita.cuotasTotales ? `/${visita.cuotasTotales}` : ''}
               </span>
             )}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${getEstadoClasses(visita.estado)}`}>
              {visita.estado.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 font-medium">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[180px]">{visita.direccion}</span>
            {visita.telefono && (
              <><span className="mx-0.5">·</span><Phone className="w-3 h-3 shrink-0" /><span>{visita.telefono}</span></>
            )}
          </div>
        </div>

        {/* KPIs en horizontal */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-center">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Cuota</div>
            <div className="text-xs font-black text-slate-800">${formatMilesCOP(visita.montoCuota)}</div>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="text-center">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Saldo</div>
            <div className={`text-xs font-black ${visita.saldoTotal > 0 ? 'text-slate-700' : 'text-emerald-600'}`}>${formatMilesCOP(visita.saldoTotal)}</div>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center gap-1 text-[10px] font-bold bg-[#08557f]/5 text-[#08557f] border border-[#08557f]/10 px-1.5 py-0.5 rounded-md uppercase">
            {visita.periodoRuta === 'DIA' ? 'Día' :
             visita.periodoRuta === 'SEMANA' ? 'Sem' :
             visita.periodoRuta === 'QUINCENA' ? 'Qna' :
             visita.periodoRuta === 'MES' ? 'Mes' : visita.periodoRuta}
          </div>
        </div>

        {/* Ojo */}
        <button
          onClick={(e) => { e.stopPropagation(); onVerCliente(visita); }}
          className="p-1.5 bg-slate-100/60 rounded-lg hover:bg-white text-slate-400 hover:text-[#08557f] transition-all border border-transparent hover:border-slate-200 shrink-0"
          title="Ver detalles"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Prórroga — solo si aplica */}
      {visita.enProrroga && (() => {
        const diasRestantes = visita.fechaProrroga
          ? Math.ceil((new Date(visita.fechaProrroga).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null
        const color = diasRestantes === null || diasRestantes < 0
          ? 'bg-rose-50 border-rose-200 text-rose-700'
          : diasRestantes <= 1 ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-blue-50 border-blue-200 text-blue-700'
        return (
          <div className={`mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wide ${color}`}>
            <Timer className="w-3 h-3 shrink-0" />
            {diasRestantes === null ? 'En prórroga activa' :
             diasRestantes < 0 ? 'Prórroga vencida' :
             diasRestantes === 0 ? 'Prórroga vence HOY' :
             `Prórroga — vence ${new Date(visita.fechaProrroga!).toLocaleDateString('es-CO')} (${diasRestantes}d)`}
          </div>
        )
      })()}

      {/* Botones de acción */}
      {children && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          {children}
        </div>
      )}
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
