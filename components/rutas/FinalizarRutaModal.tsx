'use client'

import { AlertTriangle, ArrowRight, CheckCircle2, Info, ShieldAlert, XCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { MODAL_Z_INDEX, Portal } from '@/components/dashboards/shared/CobradorElements'

type AusenteConNota = {
  nombre: string
  nota?: string
}

export type FinalizarRutaResumen = {
  saldoCajaRuta: number
  recaudadoHoy: number
  gastosDia: number
  metaCobro: number
  programados: number
  cobrados: number
  pendientes: number
  ausentes: number
  efectividad: number
  pendienteCobro: number
  recaudoNeto: number
  ausentesConNota?: AusenteConNota[]
}

export function FinalizarRutaModal({
  open,
  doubleConfirm,
  resumen,
  onClose,
  onRequestDoubleConfirm,
  onConfirm,
}: {
  open: boolean
  doubleConfirm: boolean
  resumen: FinalizarRutaResumen
  onClose: () => void
  onRequestDoubleConfirm: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  const saldoCajaRuta = Number(resumen.saldoCajaRuta || 0)
  const recaudadoHoy = Number(resumen.recaudadoHoy || 0)
  const gastosDia = Number(resumen.gastosDia || 0)
  const metaCobro = Number(resumen.metaCobro || 0)
  const programados = Number(resumen.programados || 0)
  const cobrados = Number(resumen.cobrados || 0)
  const pendientes = Number(resumen.pendientes || 0)
  const ausentes = Number(resumen.ausentes || 0)
  const efectividad = Number.isFinite(Number(resumen.efectividad))
    ? Number(resumen.efectividad)
    : 0
  const pendienteCobro = Math.max(0, Number(resumen.pendienteCobro || 0))
  const recaudoNeto = Math.max(0, Number(resumen.recaudoNeto || 0))
  const ausentesConNota = resumen.ausentesConNota || []

  const tieneSaldoCaja = saldoCajaRuta > 0
  const tienePendientes = pendientes > 0
  const tieneAusentes = ausentes > 0
  const requiereDobleConfirmacion = tieneSaldoCaja || tienePendientes || tieneAusentes
  const ningunCobro = cobrados === 0 && recaudadoHoy <= 0 && programados > 0
  const alCien = efectividad >= 100

  const metricas = [
    { label: 'Saldo caja ruta', value: formatCurrency(saldoCajaRuta), tone: tieneSaldoCaja ? 'text-red-600' : 'text-blue-600', strong: tieneSaldoCaja },
    { label: 'Recaudado hoy', value: formatCurrency(recaudadoHoy), tone: recaudadoHoy > 0 ? 'text-emerald-600' : 'text-slate-700' },
    { label: 'Gastos del día', value: formatCurrency(gastosDia), tone: gastosDia > 0 ? 'text-rose-600' : 'text-slate-700' },
    { label: 'Meta cobro', value: formatCurrency(metaCobro), tone: 'text-slate-900' },
    { label: 'Programados', value: String(programados), tone: 'text-slate-900' },
    { label: 'Cobrados', value: String(cobrados), tone: cobrados > 0 ? 'text-emerald-600' : 'text-slate-700' },
    { label: 'Pendiente $', value: formatCurrency(pendienteCobro), tone: pendienteCobro > 0 ? 'text-amber-600' : 'text-emerald-600', strong: pendienteCobro > 0 },
    { label: 'Recaudo neto', value: formatCurrency(recaudoNeto), tone: recaudoNeto > 0 ? 'text-emerald-600' : 'text-slate-700' },
    { label: 'Efectividad', value: `${efectividad}%`, tone: alCien ? 'text-emerald-600' : 'text-orange-600', strong: !alCien },
    { label: 'Pendientes', value: pendientes === 0 ? 'Ninguno' : `${pendientes} cliente${pendientes === 1 ? '' : 's'}`, tone: pendientes > 0 ? 'text-amber-600' : 'text-emerald-600', strong: pendientes > 0 },
    { label: 'Ausentes', value: ausentes === 0 ? 'Ninguno' : `${ausentes} cliente${ausentes === 1 ? '' : 's'}`, tone: ausentes > 0 ? 'text-amber-600' : 'text-slate-700', strong: ausentes > 0 },
  ]

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${doubleConfirm ? 'border-red-200 bg-red-50 text-red-600' : alCien ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-orange-200 bg-orange-50 text-orange-600'}`}>
                {doubleConfirm ? <ShieldAlert className="h-6 w-6" /> : alCien ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <h3 className={`text-lg font-black tracking-tight ${doubleConfirm ? 'text-red-900' : 'text-slate-900'}`}>
                  {doubleConfirm ? 'Doble confirmación' : 'Finalizar ruta del día'}
                </h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                  {doubleConfirm
                    ? `Vas a cerrar con ${pendientes} pendiente${pendientes === 1 ? '' : 's'}, ${ausentes} ausente${ausentes === 1 ? '' : 's'} y ${formatCurrency(saldoCajaRuta)} en caja.`
                    : 'Al marcar la ruta como completada se reportará tu rendimiento a la oficina.'}
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="space-y-3">
              {tieneSaldoCaja && (
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3 text-left">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-red-700">Dinero sin entregar</p>
                    <p className="mt-0.5 text-xs font-medium leading-relaxed text-red-600">
                      La caja de esta ruta conserva <span className="font-black">{formatCurrency(saldoCajaRuta)}</span>. Confirma que el valor queda soportado al cerrar.
                    </p>
                  </div>
                </div>
              )}

              {tienePendientes && (
                <div className={`flex items-start gap-3 rounded-xl border p-3 text-left ${ningunCobro ? 'border-red-200 bg-red-50' : 'border-amber-100 bg-amber-50'}`}>
                  {ningunCobro ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <p className={`text-xs font-bold leading-relaxed ${ningunCobro ? 'text-red-700' : 'text-amber-700'}`}>
                    {ningunCobro
                      ? 'Ningún cliente fue cobrado hoy. Sin recaudo en la jornada.'
                      : `Faltaron ${pendientes} cliente${pendientes === 1 ? '' : 's'} por cobrar hoy.`}
                  </p>
                </div>
              )}

              {doubleConfirm && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-600">
                  Esta acción reportará la jornada a oficina con estos valores. Revisa antes de confirmar definitivamente.
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {metricas.map((item) => (
                <div
                  key={item.label}
                  className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    item.strong
                      ? 'border-orange-200 bg-orange-50/70'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <p className="min-w-0 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {item.label}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                    <p className={`text-right text-sm font-black ${item.tone}`}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {ausentesConNota.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Ausentes con justificación</p>
                <div className="mt-2 max-h-28 space-y-2 overflow-y-auto pr-1">
                  {ausentesConNota.map((item, index) => (
                    <div key={`${item.nombre}-${index}`} className="text-[11px] leading-snug">
                      <p className="font-black text-amber-900">{item.nombre}</p>
                      <p className="font-medium text-amber-800 whitespace-pre-wrap break-words">{item.nota || 'Sin justificación registrada.'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100 active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (requiereDobleConfirmacion && !doubleConfirm) {
                  onRequestDoubleConfirm()
                  return
                }
                onConfirm()
              }}
              className={`flex-1 rounded-xl py-3 text-sm font-bold text-white shadow-xl transition-all active:scale-95 ${doubleConfirm ? 'bg-red-600 shadow-red-600/20 hover:bg-red-700' : 'bg-slate-900 shadow-slate-900/20 hover:bg-slate-800'}`}
            >
              {doubleConfirm ? 'Sí, finalizar' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
