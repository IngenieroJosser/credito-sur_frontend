'use client'

/**
 * Modal de detalle de mora — Muestra información completa del préstamo en mora
 * y permite iniciar acciones: Asignar mora o Registrar pago.
 *
 * Flujo nuevo (sin "Dejarlo ahí"):
 * - ASIGNAR_MORA: Abre el modal de gestión de mora para asignar interés
 * - REGISTRAR_PAGO: Abre el flow de registro de pago
 */

import React from 'react'
import {
  X, ShieldAlert, User, MapPin, Phone, MessageSquare,
  ChevronRight, Banknote, DollarSign, Clock,
  Calendar, AlertTriangle, CheckCircle
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

interface DetalleMoraModalProps {
  cuenta: {
    id: string
    numeroPrestamo: string
    cliente: {
      id?: string          // opcional: algunos dashboards no tienen el ID del cliente
      nombre: string
      documento: string
      telefono: string
      direccion: string
    }
    diasMora: number
    montoMora: number
    montoTotalDeuda: number
    montoOriginal?: number
    cuotasVencidas: number
    ruta: string
    cobrador: string
    nivelRiesgo: string
    etiquetaMora?: string
    fechaInicio?: string
    fechaMora?: string
    fechaVencimiento?: string  // fecha límite de gracia actual
  }
  onClose: () => void
  onVerCliente?: (clienteId: string) => void
  onAsignarMora?: () => void
  onRegistrarPago?: () => void
}

const RIESGO_CONFIG: Record<string, { badge: string; bg: string; border: string }> = {
  VERDE:       { badge: 'bg-emerald-50 text-emerald-700',  bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  AMARILLO:    { badge: 'bg-amber-50  text-amber-700',     bg: 'bg-amber-50',    border: 'border-amber-200' },
  ROJO:        { badge: 'bg-rose-50   text-rose-700',      bg: 'bg-rose-50',     border: 'border-rose-200' },
  LISTA_NEGRA: { badge: 'bg-slate-900 text-white',         bg: 'bg-slate-900',   border: 'border-slate-700' },
}

export default function DetalleMoraModal({
  cuenta,
  onClose,
  onVerCliente,
  onAsignarMora,
  onRegistrarPago,
}: DetalleMoraModalProps) {
  if (typeof document === 'undefined') return null

  const riesgoConfig = RIESGO_CONFIG[cuenta.nivelRiesgo] || RIESGO_CONFIG.AMARILLO
  const nivel = cuenta.etiquetaMora || cuenta.nivelRiesgo

  // Días restantes de gracia
  const diasGracia = (() => {
    if (!cuenta.fechaVencimiento) return null
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const lim = new Date(cuenta.fechaVencimiento); lim.setHours(0, 0, 0, 0)
    return Math.ceil((lim.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  })()

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ zIndex: 2147483600 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-8 py-6 bg-gradient-to-br from-[#08557f] to-blue-800 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white blur-3xl" />
            <div className="absolute -left-4 bottom-0 w-32 h-32 rounded-full bg-blue-300 blur-2xl" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/15 rounded-2xl">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Detalle de Mora</h3>
                <p className="text-blue-200/80 text-xs font-bold uppercase tracking-widest mt-0.5">
                  Préstamo {cuenta.numeroPrestamo}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Banner financiero */}
          <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3 p-5 rounded-2xl border', riesgoConfig.bg, riesgoConfig.border)}>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Días Atraso</p>
              <p className="text-2xl font-black text-slate-900 leading-tight">{cuenta.diasMora}</p>
              <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-black', riesgoConfig.badge)}>
                {nivel}
              </span>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cuotas Venc.</p>
              <p className="text-2xl font-black text-slate-900">{cuenta.cuotasVencidas}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Interés Mora</p>
              <p className="text-xl font-black text-rose-600">{formatCurrency(cuenta.montoMora)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Deuda Total</p>
              <p className="text-xl font-black text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</p>
            </div>
          </div>

          {/* Plazo de gracia actual */}
          {cuenta.montoMora > 0 && diasGracia !== null && (
            <div className={cn(
              'flex items-center gap-3 p-4 rounded-2xl border',
              diasGracia < 0
                ? 'bg-rose-50 border-rose-200'
                : diasGracia <= 2
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-blue-50 border-blue-200'
            )}>
              <Clock className={cn(
                'h-5 w-5 shrink-0',
                diasGracia < 0 ? 'text-rose-600' : diasGracia <= 2 ? 'text-orange-600' : 'text-blue-600'
              )} />
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  {diasGracia < 0
                    ? `⚠️ Plazo de gracia vencido hace ${Math.abs(diasGracia)} día(s)`
                    : diasGracia === 0
                      ? '🔴 El plazo de gracia vence HOY'
                      : `⏳ ${diasGracia} día(s) restantes para pagar la mora`}
                </p>
                {cuenta.fechaVencimiento && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Fecha límite: {new Date(cuenta.fechaVencimiento).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Grid info cliente + fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Info cliente */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Información del Cliente</h4>
              <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-[#08557f] rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md shadow-blue-900/10 shrink-0">
                  {cuenta.cliente.nombre.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-900 text-base leading-tight">{cuenta.cliente.nombre}</div>
                  <div className="text-xs font-bold text-slate-400 font-mono mb-3">{cuenta.cliente.documento}</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {cuenta.cliente.telefono || 'Sin teléfono'}
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                      <span className="leading-tight">{cuenta.cliente.direccion || 'Sin dirección'}</span>
                    </div>
                  </div>
                  {onVerCliente && cuenta.cliente.id && (
                    <button
                      onClick={() => {
                        onClose()                          // cierra este modal primero
                        onVerCliente(cuenta.cliente.id!)  // luego abre el perfil con el ID correcto
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-[#08557f] hover:underline uppercase tracking-widest"
                    >
                      Ver Perfil Completo
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Fechas + ruta */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión del Crédito</h4>
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                {[
                  { label: 'Inicio del crédito', value: cuenta.fechaInicio || 'N/A', color: 'bg-slate-100' },
                  { label: 'Entró en mora', value: cuenta.fechaMora || 'N/A', color: 'bg-rose-50 border border-rose-100' },
                  { label: 'Vencimiento contrato', value: cuenta.fechaVencimiento || 'N/A', color: 'bg-slate-100' },
                  { label: 'Ruta', value: cuenta.ruta || 'Sin ruta', color: 'bg-slate-100' },
                  { label: 'Cobrador', value: cuenta.cobrador || 'Sin cobrador', color: 'bg-slate-100' },
                ].map(row => (
                  <div key={row.label} className={cn('flex justify-between items-center px-3 py-2 rounded-xl text-xs', row.color)}>
                    <span className="font-bold text-slate-500 uppercase tracking-wider">{row.label}</span>
                    <span className="font-black text-slate-700">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Acciones disponibles */}
          <div>
            <h4 className="text-[10px] font-black text-[#08557f] uppercase tracking-[0.2em] mb-3">Acciones de Gestión</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Asignar / Nueva Mora */}
              <button
                onClick={() => { onClose(); onAsignarMora?.() }}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all group shadow-sm"
              >
                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 group-hover:bg-amber-200 transition-colors">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {cuenta.montoMora > 0 ? 'Nueva Mora' : 'Asignar Mora'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {cuenta.montoMora > 0
                      ? `Ya tiene ${formatCurrency(cuenta.montoMora)} asignado`
                      : 'Cobrar interés por retraso'}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 ml-auto transition-colors" />
              </button>

              {/* Registrar Pago */}
              <button
                onClick={() => { onClose(); onRegistrarPago?.() }}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group shadow-sm"
              >
                <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800">Registrar Pago</div>
                  <div className="text-[10px] text-slate-400 font-medium">Aplicar pago parcial o total</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 ml-auto transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-200 bg-white shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
