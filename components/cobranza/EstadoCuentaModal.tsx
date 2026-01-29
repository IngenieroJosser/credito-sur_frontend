'use client'

import { X } from 'lucide-react'
import { VisitaRuta } from '@/lib/types/cobranza'
import { formatMilesCOP } from '@/lib/utils'
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal'

interface EstadoCuentaModalProps {
  visita: VisitaRuta
  onClose: () => void
}

export default function EstadoCuentaModal({ visita, onClose }: EstadoCuentaModalProps) {
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
                type="button"
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
