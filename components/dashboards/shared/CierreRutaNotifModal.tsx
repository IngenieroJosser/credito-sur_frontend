'use client'

import React from 'react'
import {
  X,
  MapPin,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Target,
  UserCheck,
  Route,
  BarChart3,
  XCircle,
} from 'lucide-react'
import { Portal } from '@/components/dashboards/shared/CobradorElements'
import { formatCurrency, cn } from '@/lib/utils'
import { parseCierreRutaNotif } from '@/lib/notificaciones/cierre-ruta'

export interface CierreRutaNotifModalProps {
  isOpen: boolean
  onClose: () => void
  notificacion: any
}

/**
 * Modal especializado para notificaciones de tipo "Cierre de Ruta".
 * Muestra un resumen visual detallado del rendimiento del cobrador.
 */
export default function CierreRutaNotifModal({
  isOpen,
  onClose,
  notificacion,
}: CierreRutaNotifModalProps) {
  if (!isOpen || !notificacion) return null

  // Extraer datos estructurados; el parser mantiene regex solo como fallback para notificaciones antiguas.
  const mensaje: string = notificacion.mensaje || ''
  const fecha: string = notificacion.creadoEn || notificacion.fecha || ''

  const {
    cobrador,
    rutaNombre,
    recaudo,
    efectividad,
    clientesFaltantes,
  } = parseCierreRutaNotif(notificacion)

  const excelente = efectividad >= 100
  const bueno = efectividad >= 75 && efectividad < 100
  const regular = efectividad >= 50 && efectividad < 75
  const malo = efectividad < 50

  const getEfectividadColor = () => {
    if (excelente) return { ring: 'ring-emerald-400', bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
    if (bueno) return { ring: 'ring-blue-400', bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }
    if (regular) return { ring: 'ring-amber-400', bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' }
    return { ring: 'ring-red-400', bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' }
  }

  const colors = getEfectividadColor()

  const getEfectividadLabel = () => {
    if (efectividad > 100) return { label: 'Meta Superada', icon: <CheckCircle2 className="h-4 w-4" /> }
    if (efectividad === 100) return { label: 'Meta Alcanzada', icon: <CheckCircle2 className="h-4 w-4" /> }
    if (bueno) return { label: 'Buen Rendimiento', icon: <TrendingUp className="h-4 w-4" /> }
    if (regular) return { label: 'Rendimiento Regular', icon: <AlertTriangle className="h-4 w-4" /> }
    return { label: 'Bajo Rendimiento', icon: <TrendingDown className="h-4 w-4" /> }
  }

  const badgeInfo = getEfectividadLabel()

  const fechaFormateada = fecha
    ? new Date(fecha).toLocaleString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  // Porcentaje para la barra visual (máx 100% en display)
  const barWidth = Math.min(efectividad, 100)

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: 9999 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden">
          
          {/* ── Header con gradiente tipo "Cierre de Ruta" ── */}
          <div className="relative px-6 pt-7 pb-5 overflow-hidden bg-gradient-to-br from-[#08557f] to-blue-800">
            {/* Fondo decorativo */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white" />
              <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white" />
            </div>

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icono + badge */}
            <div className="relative z-10 flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                <Route className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  "bg-white/20 text-white ring-1 ring-white/30"
                )}>
                  {badgeInfo.icon}
                  {badgeInfo.label}
                </div>
                <p className="text-white/70 text-[10px] font-bold mt-1 uppercase tracking-widest">
                  Cierre de Ruta
                </p>
              </div>
            </div>

            {/* Nombre de la ruta */}
            <h2 className="relative z-10 text-xl font-black text-white tracking-tight leading-tight">
              {rutaNombre}
            </h2>

            {/* Cobrador */}
            <div className="relative z-10 flex items-center gap-2 mt-2">
              <UserCheck className="h-3.5 w-3.5 text-white/70" />
              <p className="text-white/80 text-xs font-bold">{cobrador}</p>
            </div>

            {/* Recaudo grande */}
            <div className="relative z-10 mt-5">
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Recaudo Final</p>
              <p className="text-3xl font-black text-white tabular-nums tracking-tight">
                {formatCurrency(recaudo)}
              </p>
            </div>
          </div>

          {/* ── Cuerpo ── */}
          <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">

            {/* Barra de efectividad */}
            <div className={cn("p-4 rounded-2xl border", colors.bg, colors.border)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className={cn("h-4 w-4", colors.text)} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Efectividad sobre Meta</p>
                </div>
                <p className={cn("text-2xl font-black tabular-nums", colors.text)}>
                  {efectividad}%
                </p>
              </div>
              <div className="w-full h-2.5 bg-white/70 rounded-full overflow-hidden ring-1 ring-slate-200">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", colors.bar)}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {efectividad > 100 && (
                <p className="text-[10px] text-emerald-700 font-bold mt-2 font-black uppercase tracking-widest">
                  ¡Meta del día superada!
                </p>
              )}
              {efectividad === 100 && (
                <p className="text-[10px] text-emerald-700 font-bold mt-2 font-black uppercase tracking-widest">
                  ¡Meta del día alcanzada!
                </p>
              )}
            </div>

            {/* Grid de métricas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Recaudado</p>
                </div>
                <p className="text-base font-black text-slate-900 tabular-nums">{formatCurrency(recaudo)}</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Efectividad</p>
                </div>
                <p className={cn("text-base font-black tabular-nums", colors.text)}>{efectividad}%</p>
              </div>

              <div className={cn(
                "col-span-2 rounded-2xl p-4 border",
                clientesFaltantes === 0
                  ? "bg-emerald-50 border-emerald-100"
                  : clientesFaltantes >= 5
                    ? "bg-red-50 border-red-100"
                    : "bg-amber-50 border-amber-100"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className={cn(
                    "h-3.5 w-3.5",
                    clientesFaltantes === 0 ? "text-emerald-500"
                    : clientesFaltantes >= 5 ? "text-red-500"
                    : "text-amber-500"
                  )} />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Clientes Pendientes</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "text-xl font-black",
                    clientesFaltantes === 0 ? "text-emerald-700"
                    : clientesFaltantes >= 5 ? "text-red-700"
                    : "text-amber-700"
                  )}>
                    {clientesFaltantes === 0 ? 'Ninguno' : `${clientesFaltantes} cliente${clientesFaltantes > 1 ? 's' : ''}`}
                  </p>
                  {clientesFaltantes === 0 && (
                    <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black">
                      <CheckCircle2 className="h-3 w-3" />
                      Todos visitados
                    </div>
                  )}
                  {clientesFaltantes > 0 && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black",
                      clientesFaltantes >= 5
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    )}>
                      {clientesFaltantes >= 5
                        ? <XCircle className="h-3 w-3" />
                        : <AlertTriangle className="h-3 w-3" />}
                      Sin cobrar
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timestamp / Info */}
            {fechaFormateada && (
              <div className="flex items-center gap-2 px-1">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <p className="text-[11px] text-slate-500 font-medium capitalize">{fechaFormateada}</p>
              </div>
            )}

            {/* Mensaje original completo */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Detalle del Reporte</p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{mensaje}</p>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 pb-6 pt-1">
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
