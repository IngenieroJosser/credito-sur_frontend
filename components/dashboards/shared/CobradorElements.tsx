'use client'

import React, { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Eye, Phone, GripVertical, XCircle, ChevronDown, Timer, CheckCircle2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'
import { formatMilesCOP } from '@/lib/utils'

export const MODAL_Z_INDEX = 2147483600

// ── Portal ───────────────────────────────────────────────────────────────────

export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

// ── Formato abreviado de montos (COP) ────────────────────────────────────────
// Ejemplos: $401,5M · $13,4M · $458.333 · $1,2B

function formatMontoCorto(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000) {
    const scaled = amount / 1_000_000_000
    const safe = Math.trunc(scaled * 100) / 100
    return `$${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(safe)}B`
  }
  if (abs >= 1_000_000) {
    const scaled = amount / 1_000_000
    const safe = Math.trunc(scaled * 100) / 100
    return `$${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(safe)}M`
  }
  return `$${formatMilesCOP(amount)}`
}

// ── Helpers de color de semáforo ─────────────────────────────────────────────

function dotColor(nivelRiesgo: string | undefined): string {
  switch (nivelRiesgo) {
    case 'bajo':       return 'bg-emerald-500'
    case 'leve':       return 'bg-blue-500'
    case 'precaucion': return 'bg-amber-400'
    case 'moderado':   return 'bg-orange-500'
    case 'critico':    return 'bg-red-600'
    case 'VERDE':      return 'bg-emerald-500'
    case 'AMARILLO':   return 'bg-amber-400'
    case 'ROJO':       return 'bg-orange-500'
    case 'LISTA_NEGRA':return 'bg-red-600'
    default:           return 'bg-slate-300'
  }
}

function resolveNivelRiesgoForVisita(visita: VisitaRuta): string | undefined {
  const base = String(visita?.nivelRiesgo || '') || undefined
  const enMora = ((visita as any)?.enMoraHistorico) || String(visita?.estado || '').toLowerCase() === 'en_mora'
  const enProrroga = ((visita as any)?.enProrrogaHistorico) || (visita as any)?.enProrroga || !!(visita as any)?.fechaProrroga
  const diasMora = Number((visita as any)?.diasMora ?? 0)

  const nivelPorDias = (() => {
    if (!(diasMora > 0)) return undefined
    if (diasMora >= 8) return 'critico'
    if (diasMora >= 5) return 'moderado'
    if (diasMora >= 3) return 'precaucion'
    return 'leve'
  })()

  if (!enMora && !enProrroga && !nivelPorDias) return base

  const severity = (nivel: string | undefined) => {
    switch (nivel) {
      case 'critico': return 5
      case 'LISTA_NEGRA': return 5
      case 'moderado': return 4
      case 'ROJO': return 4
      case 'precaucion': return 3
      case 'AMARILLO': return 3
      case 'leve': return 2
      case 'bajo': return 1
      case 'VERDE': return 1
      default: return 0
    }
  }

  // Criterio por días (prioritario):
  // - 1-2 => leve
  // - 3-4 => precaucion
  // - 5-7 => moderado
  // - 8+  => critico
  // Si no tenemos `diasMora` pero el backend ya marcó `en_mora`, degradamos a un mínimo
  // razonable (leve) en vez de forzar moderado.
  const target = nivelPorDias
    || (enProrroga ? 'precaucion' : undefined)
    || (enMora ? 'leve' : undefined)
    || base

  const merged = severity(base) >= severity(target) ? base : target
  if (nivelPorDias && severity(merged) < severity(nivelPorDias)) return nivelPorDias
  return merged
}

function nivelBadgeColor(nivelRiesgo: string | undefined): string {
  switch (nivelRiesgo) {
    case 'bajo':       return 'text-emerald-700 bg-emerald-50 border-emerald-100'
    case 'leve':       return 'text-blue-700 bg-blue-50 border-blue-100'
    case 'precaucion': return 'text-amber-700 bg-amber-50 border-amber-100'
    case 'moderado':   return 'text-orange-700 bg-orange-50 border-orange-100'
    case 'critico':    return 'text-red-700 bg-red-50 border-red-100'
    case 'VERDE':      return 'text-emerald-700 bg-emerald-50 border-emerald-100'
    case 'AMARILLO':   return 'text-amber-700 bg-amber-50 border-amber-100'
    case 'ROJO':       return 'text-orange-700 bg-orange-50 border-orange-100'
    case 'LISTA_NEGRA':return 'text-red-700 bg-red-50 border-red-100'
    default:           return 'text-slate-400 bg-slate-50 border-slate-200'
  }
}

function nivelLabel(nivelRiesgo: string | undefined): string {
  switch (nivelRiesgo) {
    case 'bajo':       return 'Mínimo'
    case 'leve':       return 'Leve'
    case 'precaucion': return 'Precaución'
    case 'moderado':   return 'Moderado'
    case 'critico':    return 'Crítico'
    case 'VERDE':      return 'Mínimo'
    case 'AMARILLO':   return 'Precaución'
    case 'ROJO':       return 'Moderado'
    case 'LISTA_NEGRA':return 'Crítico'
    default:           return '—'
  }
}

function nivelTitle(nivelRiesgo: string | undefined): string {
  switch (nivelRiesgo) {
    case 'bajo':       return 'Al día'
    case 'leve':       return 'Riesgo leve'
    case 'precaucion': return 'Precaución'
    case 'moderado':   return 'En mora'
    case 'critico':    return 'Crítico / Lista negra'
    case 'VERDE':      return 'Al día'
    case 'AMARILLO':   return 'Precaución'
    case 'ROJO':       return 'En mora'
    case 'LISTA_NEGRA':return 'Crítico / Lista negra'
    default:           return ''
  }
}

function borderColor(nivelRiesgo: string | undefined, isSelected: boolean): string {
  if (isSelected) return 'ring-2 ring-[#08557f] shadow-md bg-blue-50/30 border-[#08557f]'
  switch (nivelRiesgo) {
    case 'bajo':       return 'border-emerald-400 shadow-sm'
    case 'leve':       return 'border-blue-400 shadow-sm'
    case 'precaucion': return 'border-amber-400 shadow-sm'
    case 'moderado':   return 'border-orange-500 shadow-sm'
    case 'critico':    return 'border-red-600 shadow-md'
    case 'VERDE':      return 'border-emerald-400 shadow-sm'
    case 'AMARILLO':   return 'border-amber-400 shadow-sm'
    case 'ROJO':       return 'border-orange-500 shadow-sm'
    case 'LISTA_NEGRA':return 'border-red-600 shadow-md'
    default:           return 'border-slate-200'
  }
}

function periodoLabel(periodo: string): string {
  switch (periodo) {
    case 'DIA':      return 'Día'
    case 'SEMANA':   return 'Sem'
    case 'QUINCENA': return 'Qna'
    case 'MES':      return 'Mes'
    default:         return periodo
  }
}

// ── Contenido de la tarjeta (reutilizado por Static y Sortable) ──────────────
/**
 * Layout responsive:
 *   Fila 1 → [grip?] · nombre completo · [ojo]
 *   Fila 2 → badges (nivel · cuota# · estado) | KPIs (cuota · saldo · período)
 *   Fila 3 → dirección + teléfono (opcional)
 *   Fila 4 → prórroga (opcional)
 *   Fila 5 → botones de acción (children, opcional)
 */
function VisitaCardContent({
  visita,
  onVerCliente,
  getEstadoClasses,
  grip,
  actions,
  children,
}: {
  visita: VisitaRuta
  onVerCliente: (v: VisitaRuta) => void
  getEstadoClasses: (e: EstadoVisita) => string
  grip?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const estadoLower = String((visita as any)?.estado || '').toLowerCase().replace(/\s+/g, '_')
  const tieneCuotaPendiente = (visita as any)?.montoCuotaPendiente != null
  const cuotaBase = Number(((visita as any)?.montoCuotaPendiente ?? (visita as any)?.montoCuota) || 0)
  const recHoy = Number((visita as any)?.recaudadoDelDia || 0)
  const saldo = Number((visita as any)?.saldoTotal || 0)
  const cuotaPendiente = tieneCuotaPendiente ? cuotaBase : Math.max(0, cuotaBase - recHoy)
  const cuotaUI = estadoLower === 'pagado'
    ? cuotaBase
    : Math.min(cuotaPendiente, saldo > 0 ? saldo : cuotaPendiente)

  const nivelRiesgoUI = resolveNivelRiesgoForVisita(visita)
  return (
    <>
      {/* Fila 1: grip + nombre + botón ojo */}
      <div className="flex items-center gap-2">
        {grip}

        {/* Nombre (ocupa todo el espacio disponible) */}
        <p className="flex-1 min-w-0 text-xs font-black text-slate-900 leading-snug break-words">
          {visita.cliente}
        </p>

        {/* Botón ver detalles */}
        <button
          onClick={(e) => { e.stopPropagation(); onVerCliente(visita) }}
          className="p-1.5 bg-slate-100/60 rounded-lg hover:bg-white text-slate-400 hover:text-[#08557f] transition-all border border-transparent hover:border-slate-200 shrink-0 active:scale-95"
          title="Ver expediente del cliente"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fila 2: badges | acciones | KPIs (en PC como antes; en móvil apilado) */}
      <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-center md:gap-1.5">
        {/* Badges */}
        <div className="flex items-center gap-1 flex-wrap shrink-0">
          {/* Dot semáforo */}
          <span
            title={nivelTitle(nivelRiesgoUI)}
            className={`w-2 h-2 rounded-full shrink-0 ${dotColor(nivelRiesgoUI)}`}
          />
          {/* Badge nivel riesgo */}
          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${nivelBadgeColor(nivelRiesgoUI)}`}>
            {nivelLabel(nivelRiesgoUI)}
          </span>
          {/* Badge cuota actual */}
          {visita.cuotaActual && (
            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
              Cuota: {visita.cuotaActual}{visita.cuotasTotales ? `/${visita.cuotasTotales}` : ''}
            </span>
          )}
          {/* Badge estado visita */}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${getEstadoClasses(visita.estado)}`}>
            {visita.estado.replace('_', ' ')}
          </span>

          {(((visita as any)?.enMoraHistorico) || String(visita.estado || '').toLowerCase() === 'en_mora') && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase bg-rose-50 text-rose-700 border-rose-200">
              en mora
            </span>
          )}

          {(((visita as any)?.enProrrogaHistorico) || (visita as any)?.enProrroga || !!(visita as any)?.fechaProrroga) && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase bg-amber-50 text-amber-700 border-amber-200">
              prórroga
            </span>
          )}
        </div>

        {/* Botones de acción (móvil: fila propia con scroll; PC: centrado como antes) */}
        {actions && (
          <div className="w-full overflow-x-auto -mx-0.5 px-0.5 md:w-auto md:overflow-visible md:mx-0 md:px-0 md:flex-1 md:flex md:items-center md:justify-center md:gap-1 md:flex-wrap">
            <div className="flex items-center gap-1 flex-nowrap min-w-0 shrink-0 md:flex-wrap md:justify-center">
              {actions}
            </div>
          </div>
        )}

        {/* KPIs: cuota · saldo · período */}
        <div className="flex items-center gap-1.5 shrink-0 md:ml-auto">
          <div className="text-center">
            <div className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">Cuota</div>
            <div className="text-[11px] font-black text-slate-800 tabular-nums">{formatMontoCorto(cuotaUI)}</div>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="text-center">
            <div className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">Saldo</div>
            <div className={`text-[11px] font-black tabular-nums ${visita.saldoTotal > 0 ? 'text-slate-700' : 'text-emerald-600'}`}>
              {formatMontoCorto(visita.saldoTotal)}
            </div>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <span className="text-[9px] font-bold bg-[#08557f]/5 text-[#08557f] border border-[#08557f]/10 px-1.5 py-0.5 rounded-md uppercase">
            {periodoLabel(visita.periodoRuta)}
          </span>
        </div>
      </div>

      {/* Fila 2b: Banner "Pendiente de aprobación" */}
      {visita.pendienteAprobacion && (
        <div className="mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          Crédito pendiente de aprobación — cobro deshabilitado
        </div>
      )}

      {/* Fila 3: dirección + teléfono */}
      {(visita.direccion || visita.telefono) && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-medium leading-none flex-wrap">
          {visita.direccion && (
            <>
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[55%]">{visita.direccion}</span>
            </>
          )}
          {visita.telefono && (
            <>
              <span className="mx-0.5">·</span>
              <Phone className="w-3 h-3 shrink-0" />
              <span>{visita.telefono}</span>
            </>
          )}
        </div>
      )}

      {/* Fila 4: prórroga activa */}
      {visita.enProrroga && (() => {
        const diasRestantes = (() => {
          if (!visita.fechaProrroga) return null
          const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
          const limite = new Date(visita.fechaProrroga); limite.setHours(0, 0, 0, 0)
          return Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        })()
        const color =
          diasRestantes === null || diasRestantes < 0
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : diasRestantes <= 1
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
        return (
          <div className={`mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wide ${color}`}>
            <Timer className="w-3 h-3 shrink-0" />
            {diasRestantes === null
              ? 'En prórroga activa'
              : diasRestantes < 0
                ? 'Prórroga vencida'
                : diasRestantes === 0
                  ? 'Prórroga vence HOY'
                  : `Prórroga — vence ${new Date(visita.fechaProrroga!).toLocaleDateString('es-CO')} (${diasRestantes}d)`}
          </div>
        )
      })()}

      {/* Fila extra: monto pagado hoy (visible en historial) */}
      {(visita as any).recaudadoDelDia > 0 && (
        <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 w-fit">
          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wide">
            Pagó hoy: {formatMontoCorto((visita as any).recaudadoDelDia)}
          </span>
        </div>
      )}

      {/* Fila extra: children (fallback para contenido adicional) */}
      {children && (
        <div className="mt-1 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </>
  )
}

// ── StaticVisitaItem ─────────────────────────────────────────────────────────

export function StaticVisitaItem({
  visita,
  onSelect,
  onVerCliente,
  getEstadoClasses,
  getPrioridadColor,
  isSelected,
  allowClick = true,
  actions,
  children,
}: {
  visita: VisitaRuta
  onSelect?: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor?: (prioridad: 'alta' | 'media' | 'baja') => string
  isSelected?: boolean
  allowClick?: boolean
  actions?: ReactNode
  children?: ReactNode
}) {
  const nivelRiesgoUI = resolveNivelRiesgoForVisita(visita)
  return (
    <div
      onClick={() => allowClick && onSelect && onSelect(visita.id)}
      className={`relative z-10 w-full rounded-xl px-2.5 py-1.5 transition-all bg-white border-2 overflow-hidden ${
        allowClick ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : 'cursor-default'
      } ${borderColor(nivelRiesgoUI, !!isSelected)}`}
    >
      <VisitaCardContent
        visita={visita}
        onVerCliente={onVerCliente}
        getEstadoClasses={getEstadoClasses}
        actions={actions}
      >
        {children}
      </VisitaCardContent>
    </div>
  )
}

// ── SortableItem (con drag handle) ───────────────────────────────────────────

export function SortableItem({
  visita,
  onSelect,
  onVerCliente,
  getEstadoClasses,
  getPrioridadColor,
  isSelected,
  actions,
  children,
  disableSort,
}: {
  visita: VisitaRuta
  onSelect: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor?: (prioridad: 'alta' | 'media' | 'baja') => string
  isSelected?: boolean
  actions?: ReactNode
  children?: ReactNode
  disableSort?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: visita.id,
    disabled: !!disableSort,
  })

  const nivelRiesgoUI = resolveNivelRiesgoForVisita(visita)

  const style = { transform: CSS.Transform.toString(transform), transition }

  const grip = disableSort ? null : (
    <div
      className="cursor-grab active:cursor-grabbing shrink-0 touch-none"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 text-slate-400" />
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative z-10 w-full rounded-xl px-2.5 py-1.5 transition-all bg-white border-2 overflow-hidden ${borderColor(nivelRiesgoUI, !!isSelected)}`}
    >
      <VisitaCardContent
        visita={visita}
        onVerCliente={onVerCliente}
        getEstadoClasses={getEstadoClasses}
        grip={grip}
        actions={actions}
      >
        {children}
      </VisitaCardContent>
    </div>
  )
}

// ── SortableVisita (wrapper re-exportado) ────────────────────────────────────

export function SortableVisita({
  visita,
  onSelect,
  onVerCliente,
  getEstadoClasses,
  getPrioridadColor,
  isSelected,
  actions,
  children,
  disableSort,
}: {
  visita: VisitaRuta
  onSelect: (id: string) => void
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor?: (prioridad: 'alta' | 'media' | 'baja') => string
  isSelected?: boolean
  actions?: ReactNode
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
      actions={actions}
    >
      {children}
    </SortableItem>
  )
}

// ── SeleccionClienteModal ────────────────────────────────────────────────────

export function SeleccionClienteModal({
  visitas,
  onSelect,
  onClose,
  titulo = 'Estado de Cuenta',
  subtitulo = 'Consultar Cliente',
}: {
  visitas: VisitaRuta[]
  onSelect: (v: VisitaRuta) => void
  onClose: () => void
  titulo?: string
  subtitulo?: string
}) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[2147483600] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white sm:rounded-[2rem] rounded-t-[2rem] w-full sm:max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-lg text-slate-900 flex-1">{titulo}</h3>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                {subtitulo}
              </label>
              <div className="relative">
                <select
                  autoFocus
                  defaultValue=""
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all appearance-none cursor-pointer"
                  onChange={(e) => {
                    const visita = visitas.find((v) => v.id === e.target.value)
                    if (visita) onSelect(visita)
                  }}
                >
                  <option value="" disabled className="text-slate-400 bg-white">
                    Seleccionar de la lista...
                  </option>
                  {visitas.map((v) => {
                    const tipoCred =
                      v.tipoPrestamo === 'ARTICULO'
                        ? v.articuloNombre
                          ? `Artículo: ${v.articuloNombre}`
                          : 'Artículo'
                        : 'Efectivo'
                    const periodoCred =
                      v.periodoRuta === 'DIA'      ? 'Diario'    :
                      v.periodoRuta === 'SEMANA'   ? 'Semanal'   :
                      v.periodoRuta === 'QUINCENA' ? 'Quincenal' :
                      v.periodoRuta === 'MES'      ? 'Mensual'   :
                      v.periodoRuta
                    return (
                      <option key={v.id} value={v.id} className="text-slate-900 bg-white">
                        {`${v.cliente} — ${tipoCred} · ${periodoCred}`}
                      </option>
                    )
                  })}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="h-5 w-5" />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
