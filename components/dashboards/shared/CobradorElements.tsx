'use client'
import { formatFechaBogota } from '@/lib/format-date'

import React, { ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { createPortal } from 'react-dom'
import {
  MapPin,
  Eye,
  Phone,
  GripVertical,
  XCircle,
  Timer,
  CheckCircle2,
} from 'lucide-react'
import TipoCreditoIndicador from '@/components/creditos/TipoCreditoIndicador'
import AyudaContextual from '@/components/ui/AyudaContextual'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'
import { formatCurrency } from '@/lib/utils'
import { resolveCuotaAcumuladaOperativa, resolveCuotaNormalOperativa,
  diasEntreEnBogota,
  getBogotaNowKey,
} from '@/lib/rutas-core'
import {
  badgeDeRiesgoSegunValor,
  bordeDeRiesgoSegunValor,
  etiquetaDeRiesgoSegunValor,
  puntoDeRiesgoSegunValor,
} from '@/lib/display-labels'
import Tooltip from '@/components/ui/Tooltip'
import { Selector } from '@/components/ui/Selector'

/**
 * La capa de los modales se define en un solo sitio.
 *
 * Aquí estaba escrita otra vez, con el mismo valor, y de los modales que la
 * importan la mitad la traía de aquí y la mitad de `components/ui/Portal`.
 * Coincidían, así que no se veía; lo que provocaba es que nadie supiera cuál
 * era la escala de verdad, y por eso 61 de los 86 modales acabaron con un
 * número elegido a mano. Se re-exporta para no tocar a los que la importan de
 * aquí, pero el valor vive en `Portal`, con el resto de las capas.
 */
export { MODAL_Z_INDEX } from '@/components/ui/Portal'

// ── Portal ───────────────────────────────────────────────────────────────────

export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const formatMontoCompleto = (amount: number): string => formatCurrency(amount)

// ── Helpers de color de semáforo ─────────────────────────────────────────────

function resolveNivelRiesgoForVisita(visita: VisitaRuta): string | undefined {
  // Puramente visual: devuelve el riesgo que ya calculo el mapeador compartido.
  return visita?.nivelRiesgo
}

/*
 * El color del nivel lo decide `lib/display-labels.ts`, no este archivo.
 *
 * Aqui habia tres `switch` de quince casos cada uno que mezclaban las TRES
 * escalas -la del cliente, la operativa de la ruta y la de dias de mora- en la
 * misma lista. Dos consecuencias, medidas antes de tocar nada:
 *
 *   - `LISTA_NEGRA` devolvia el MISMO rojo que `ROJO`, asi que un cliente al
 *     que se decidio no prestarle se veia igual que uno con atraso grave.
 *   - usaba `red-*` mientras el resto del sistema usa `rose-*`.
 *
 * Y las mayusculas llegaban de verdad: la rama de respaldo de
 * `enrich-ruta-historial-riesgo` caia a `nivelRiesgoObligacion` -texto crudo
 * del backend- con un `as` que no comprobaba nada. Eso se normalizo alli; esto
 * usa el despachador, que ademas aguanta las dos formas sin mentir.
 */
const dotColor = (nivelRiesgo: string | undefined): string =>
  puntoDeRiesgoSegunValor(nivelRiesgo)

const nivelBadgeColor = (nivelRiesgo: string | undefined): string =>
  badgeDeRiesgoSegunValor(nivelRiesgo)

const nivelLabel = (nivelRiesgo: string | undefined): string =>
  etiquetaDeRiesgoSegunValor(nivelRiesgo)

/*
 * El titulo del punto decia «Critico / Lista negra» para los dos valores, que
 * es justo la confusion que el resto de este arreglo deshace. Dice el nombre
 * del nivel, el mismo que el distintivo de al lado.
 */
const nivelTitle = (nivelRiesgo: string | undefined): string => {
  const nombre = etiquetaDeRiesgoSegunValor(nivelRiesgo)
  return nombre === '—' ? '' : nombre
}

// Helpers para determinar estado visual de pagado y mora
function isPagadaVisual(visita: VisitaRuta): boolean {
  const estado = String(visita?.estado || '').toLowerCase()
  const recaudo = Number(visita?.recaudadoDelDia || 0)
  const cuota = Number(visita?.montoCuotaNormal ?? visita?.montoCuota ?? 0)

  return estado === 'pagado' || (cuota > 0 && recaudo >= cuota)
}

function shouldShowMoraBadge(visita: VisitaRuta): boolean {
  if (isPagadaVisual(visita)) return false

  const estado = String(visita?.estado || '').toLowerCase()
  // Si el estado ya es 'en_mora', el badge principal ya muestra "en mora"
  // No mostrar el badge adicional para evitar duplicación
  if (estado === 'en_mora') return false

  return (
    Boolean(visita?.enMoraHistorico) ||
    Number(visita?.diasMora || 0) > 0 ||
    Number(visita?.montoVencidoAcumulado || visita?.saldoVencidoAcumulado || 0) > 0
  )
}

/*
 * El borde de la ficha, con la misma mezcla de escalas que las funciones de
 * arriba y el mismo defecto: `LISTA_NEGRA`, `ROJO` y `ALTO_RIESGO` daban los
 * tres el mismo `border-red-600`.
 */
const borderColor = (
  nivelRiesgo: string | undefined,
  isSelected: boolean,
): string =>
  isSelected
    ? 'ring-2 ring-primary shadow-md bg-blue-50/30 border-primary'
    : bordeDeRiesgoSegunValor(nivelRiesgo)

function periodoLabel(periodo: string): string {
  switch (periodo) {
    case 'DIA':
      return 'Día'
    case 'SEMANA':
      return 'Sem'
    case 'QUINCENA':
      return 'Qna'
    case 'MES':
      return 'Mes'
    default:
      return periodo
  }
}

function normalizeEstadoVisita(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  onVerCliente?: (v: VisitaRuta) => void
  getEstadoClasses: (e: EstadoVisita) => string
  grip?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const estadoLower = String(visita?.estado || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
  const cuotaNormal = resolveCuotaNormalOperativa(visita)
  const cuotaBase = cuotaNormal
  const recHoy = Number(visita?.recaudadoDelDia || 0)
  const saldo = Number(visita?.saldoTotal || 0)
  const cuotaPendiente = Math.max(0, cuotaBase - recHoy)
  const cuotaOperativa =
    estadoLower === 'pagado'
      ? cuotaBase > 0
        ? cuotaBase
        : recHoy
      : Math.min(cuotaPendiente, saldo > 0 ? saldo : cuotaPendiente)
  const cuotaUI =
    cuotaNormal > 0 ? Math.min(cuotaNormal, saldo > 0 ? saldo : cuotaNormal) : cuotaOperativa
  const acumuladoVencido = resolveCuotaAcumuladaOperativa(visita)
  const montoVencido = Number(
    visita?.montoVencidoAcumulado ??
      visita?.montoMoraAcumulada ??
      visita?.saldoVencidoAcumulado ??
      0,
  )
  const mostrarAcumuladoVencido =
    String(visita?.estado || '').toLowerCase() === 'en_mora' && montoVencido > 0
  const saldado = estadoLower === 'pagado' && cuotaUI === 0 && saldo === 0
  const estadoVisitaNorm = normalizeEstadoVisita(visita?.estadoVisita)
  const esReprogramadoHistorial =
    estadoVisitaNorm === 'reprogramado' ||
    estadoVisitaNorm === 'reprogramada' ||
    estadoVisitaNorm === 'reprogramacion'
  const regularizadoDespues = Number(visita?.recaudadoRegularizadoDespues || 0)
  /**
   * El nombre de quien cobró, solo si no es el cobrador de esta ruta.
   *
   * Se compara contra `visita.cobradorId`, que es el responsable de la
   * obligación. Si coinciden no se dice nada: lo normal no necesita rótulo.
   */
  const cobradoPorOtro =
    visita?.cobradoPor?.id && visita.cobradoPor.id !== visita?.cobradorId
      ? visita.cobradoPor.nombre || null
      : null
  const esAbonoRegularizado =
    regularizadoDespues > 0 && String(visita?.estado || '').toLowerCase() !== 'pagado'

  const nivelRiesgoUI = resolveNivelRiesgoForVisita(visita)
  return (
    <>
      {/* Fila 1: grip + nombre + botón ojo */}
      <div className="flex items-center gap-2">
        {grip}

        {/* Si es artículo o dinero. Un cliente puede tener los dos a la vez, y hasta
            ahora sus dos tarjetas se veían idénticas: mismo nombre, misma dirección,
            mismo teléfono. El icono es lo que las separa de un vistazo. */}
        <TipoCreditoIndicador
          tipo={visita.tipoPrestamo}
          credito={visita}
          mostrarTexto={false}
          modo="icono"
        />

        {/* Nombre (ocupa todo el espacio disponible) */}
        <p className="flex-1 min-w-0 text-xs font-black text-slate-900 leading-snug break-words">
          {visita.cliente}
        </p>

        {/* Botón ver detalles */}
        <Tooltip texto="Ver expediente del cliente">
          <button
            type="button"
            data-action="ver-cliente"
            data-testid={`ver-cliente-${visita.id}`}
            onPointerDownCapture={(e) => {
              e.stopPropagation()
            }}
            onMouseDownCapture={(e) => {
              e.stopPropagation()
            }}
            onClickCapture={(e) => {
              e.stopPropagation()
  
              logger.log('[StaticVisitaItem] click capture ojo', {
                id: visita.id,
                clienteId: visita.clienteId,
                prestamoId: visita.prestamoId,
                cliente: visita.cliente,
              })
  
              onVerCliente?.(visita)
            }}
            className="relative z-20 pointer-events-auto p-2.5 sm:p-2 bg-slate-100/60 rounded-lg hover:bg-white text-slate-400 hover:text-primary transition-all border border-transparent hover:border-slate-200 shrink-0 active:scale-95 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
            aria-label={`Ver detalle de ${visita.cliente}`}
          >
            <Eye className="w-5 h-5 pointer-events-none" />
          </button>
        </Tooltip>
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
          <span
            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${nivelBadgeColor(nivelRiesgoUI)}`}
          >
            {nivelLabel(nivelRiesgoUI)}
          </span>
          {/* Badge cuota actual */}
          {visita.cuotaActual && (
            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
              Cuota: {visita.cuotaActual}
              {visita.cuotasTotales ? `/${visita.cuotasTotales}` : ''}
            </span>
          )}
          {/* Badge estado visita */}
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${getEstadoClasses(visita.estado)}`}
          >
            {visita.estado?.replace('_', ' ') || visita.estado || ''}
          </span>

          {visita.estadoVisita === 'ausente' && visita.estado !== 'ausente' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase bg-amber-100 text-amber-700 border-amber-300">
              ausente
            </span>
          )}

          {esReprogramadoHistorial && estadoLower !== 'reprogramado' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase bg-sky-100 text-sky-700 border-sky-300">
              reprogramado
            </span>
          )}

          {shouldShowMoraBadge(visita) && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase bg-rose-50 text-rose-700 border-rose-200">
              en mora
            </span>
          )}

          {(visita?.enProrrogaHistorico || visita?.enProrroga || !!visita?.fechaProrroga) && (
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
          {saldado ? (
            <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md uppercase tracking-wide">
              Saldado
            </span>
          ) : (
            <>
              <div className="text-center">
                <div className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">
                  Cuota
                </div>
                <div className="text-[11px] font-black text-slate-800 tabular-nums">
                  {formatMontoCompleto(cuotaUI)}
                </div>
              </div>
              <div className="w-px h-5 bg-slate-200" />
              <div className="text-center">
                <div className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">
                  Saldo
                </div>
                <div
                  className={`text-[11px] font-black tabular-nums ${visita.saldoTotal > 0 ? 'text-slate-700' : 'text-emerald-600'}`}
                >
                  {formatMontoCompleto(visita.saldoTotal)}
                </div>
              </div>
            </>
          )}
          <div className="w-px h-5 bg-slate-200" />
          <span className="text-[9px] font-bold bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.5 rounded-md uppercase">
            {periodoLabel(visita.periodoRuta)}
          </span>
        </div>
      </div>

      {/* Fila 2b: Banner de revisión provisional */}
      {visita.pendienteAprobacion && (
        <div className="mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          {visita.etiquetaRevision || 'Pendiente de revisión'} — cobro deshabilitado
        </div>
      )}

      {mostrarAcumuladoVencido && (
        <div className="mt-1 text-[10px] font-bold text-rose-700">
          Acumulado vencido: {formatMontoCompleto(acumuladoVencido)}
        </div>
      )}

      {/* Fila 3: dirección + teléfono */}
      {(visita.direccion || visita.telefono) && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-600 font-medium leading-none flex-wrap">
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
      {visita.enProrroga &&
        (() => {
          const diasRestantes = (() => {
            if (!visita.fechaProrroga) return null
            // En hora de Bogota: antes el «hoy» era el del telefono, asi que
            // una prorroga podia verse como vencida un dia antes de estarlo.
            return diasEntreEnBogota(getBogotaNowKey(), visita.fechaProrroga)
          })()
          const color =
            diasRestantes === null || diasRestantes < 0
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : diasRestantes <= 1
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
          return (
            <div
              className={`mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wide ${color}`}
            >
              <Timer className="w-3 h-3 shrink-0" />
              {diasRestantes === null
                ? 'En prórroga activa'
                : diasRestantes < 0
                  ? 'Prórroga vencida'
                  : diasRestantes === 0
                    ? 'Prórroga vence HOY'
                    : `Prórroga — vence ${formatFechaBogota(visita.fechaProrroga!)} (${diasRestantes}d)`}
            </div>
          )
        })()}

      {/* Fila extra: monto pagado hoy (visible en historial) */}
      {(visita.recaudadoDelDia ?? 0) > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 w-fit">
          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wide">
            Pagó hoy: {formatMontoCompleto(visita.recaudadoDelDia ?? 0)}
          </span>
          {/*
            * Quién lo cobró, cuando no fue el cobrador de la ruta.
            *
            * Pasa cuando un supervisor registra el pago: el backend le
            * acredita a él —el dinero entra a SU caja— y el cliente desaparecía
            * de la lista del cobrador ya pagado, sin rastro de quién había
            * pasado por ahí. El recaudo de la ruta sí lo cuenta, así que la
            * meta no cambia; lo que faltaba era decirlo.
            */}
          {cobradoPorOtro && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 normal-case">
              · lo cobró {cobradoPorOtro}
              <AyudaContextual
                ayuda="cobradoPorOtro"
                de="quién cobró"
                tamano="pequeno"
              />
            </span>
          )}
        </div>
      )}

      {regularizadoDespues > 0 && (
        <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 w-fit">
          <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
          <span className="text-[9px] font-black text-blue-700 uppercase tracking-wide">
            {esAbonoRegularizado ? 'Abono regularizado' : 'Regularizado después'}:{' '}
            {formatMontoCompleto(regularizadoDespues)}
          </span>
        </div>
      )}

      {esReprogramadoHistorial && (
        <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-100 w-fit">
          <Timer className="w-3 h-3 text-sky-500 shrink-0" />
          <span className="text-[9px] font-black text-sky-700 uppercase tracking-wide">
            Reprogramado en esta jornada
          </span>
        </div>
      )}

      {/* Fila extra: children (fallback para contenido adicional) */}
      {children && <div className="mt-1 pt-1 border-t border-slate-100">{children}</div>}
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
  onVerCliente?: (visita: VisitaRuta) => void
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
      <div className="fixed inset-0 capa-modal flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white sm:rounded-[2rem] rounded-t-[2rem] w-full sm:max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-lg text-slate-900 flex-1">{titulo}</h3>
            <Tooltip texto="Cerrar">
              <button
                onClick={onClose}
                className="shrink-0 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
                aria-label="Cerrar"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                {subtitulo}
              </label>
              <div className="relative">
                <Selector
                  value=""
                  onChange={(id) => {
                    const visita = visitas.find((v) => v.id === id)
                    if (visita) onSelect(visita)
                  }}
                  etiqueta="Cliente de la lista"
                  placeholder="Seleccionar de la lista..."
                  className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-bold text-slate-900"
                  opciones={visitas.map((v) => {
                    const tipoCred =
                      v.tipoPrestamo === "ARTICULO"
                        ? v.articuloNombre
                          ? "Artículo: " + v.articuloNombre
                          : "Artículo"
                        : "Efectivo"
                    const periodoCred =
                      v.periodoRuta === "DIA"
                        ? "Diario"
                        : v.periodoRuta === "SEMANA"
                          ? "Semanal"
                          : v.periodoRuta === "QUINCENA"
                            ? "Quincenal"
                            : v.periodoRuta === "MES"
                              ? "Mensual"
                              : v.periodoRuta
                    return {
                      value: v.id,
                      label: v.cliente + " — " + tipoCred + " · " + periodoCred,
                    }
                  })}
                />
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
