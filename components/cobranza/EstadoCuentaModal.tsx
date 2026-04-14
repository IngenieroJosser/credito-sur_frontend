'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Calendar, Clock, ShoppingBag, History, Loader2 } from 'lucide-react'
import { VisitaRuta } from '@/lib/types/cobranza'
import { formatMilesCOP } from '@/lib/utils'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { prestamosService } from '@/services/prestamos-service'
import { getLoanAmounts } from '@/lib/loan-calculations'
import { normalizeDateKey, resolveNextPagoFromPrestamo } from '@/lib/rutas-core'

interface EstadoCuentaModalProps {
  visita: VisitaRuta
  onClose: () => void
}

function formatDateBogota(dateStr: string) {
  const key = normalizeDateKey(dateStr)
  if (!key) return '---'
  const d = new Date(`${key}T12:00:00-05:00`)
  if (isNaN(d.getTime())) return key
  const day = String(d.getDate())
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  const month = monthNames[d.getMonth()]
  const year = String(d.getFullYear())
  return `${day} de ${month} de ${year}`
}

/**
 * Formatea Fecha y Hora para el historial contable.
 */
function formatDateTime(dateStr: string) {
  if (!dateStr) return '---'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '---'
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace('.', '')
}

export default function EstadoCuentaModal({ visita, onClose }: EstadoCuentaModalProps) {
  const [loading, setLoading] = useState(true)
  const [loanData, setLoanData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadLoanDetails() {
      try {
        setLoading(true)
        let detail = null;

        if (visita.prestamoId) {
          try {
            detail = await prestamosService.obtenerPrestamoPorId(visita.prestamoId)
          } catch (e) {
            console.warn("No se pudo obtener prestamo por ID directo...")
          }
        }

        if (!detail && (visita.clienteId || visita.cliente)) {
          const response = await prestamosService.obtenerPrestamos({ 
            search: visita.cliente,
            limit: 5
          })
          if (response.prestamos && response.prestamos.length > 0) {
            const clientLoan = visita.clienteId 
                ? response.prestamos.find((p: any) => p.clienteId === visita.clienteId)
                : response.prestamos[0];
            
            if (clientLoan) {
              detail = await prestamosService.obtenerPrestamoPorId(clientLoan.id)
            }
          }
        }
        
        if (detail) {
          setLoanData(detail)
        } else {
          setError("No se encontró información del crédito.")
        }
      } catch (error) {
        setError("Error de comunicación.")
      } finally {
        setLoading(false)
      }
    }
    loadLoanDetails()
  }, [visita.cliente, visita.clienteId, visita.prestamoId])

  const info = useMemo(() => {
    if (!loanData) return null;

    const cuotas = loanData.cuotas || [];
    const pagadas = cuotas.filter((c: any) => c.estado === 'PAGADA');
    const prox = resolveNextPagoFromPrestamo(loanData);

    const amounts = getLoanAmounts({
      tipoPrestamo: loanData.tipoPrestamo,
      monto: loanData.monto,
      cuotaInicial: loanData.cuotaInicial,
      interesTotal: loanData.interesTotal,
    });

    const totalD = amounts.totalFinanciado;
    const pagadoD = Number(loanData.totalPagado || 0);

    return {
      fechaInicio: formatDateBogota(loanData.fechaInicio),
      fechaVencimiento: formatDateBogota(loanData.fechaFin || (cuotas.length > 0 ? cuotas[cuotas.length - 1].fechaVencimiento : null)),
      nextPaymentDate: prox?.fecha ? formatDateBogota(prox.fecha) : '---',
      nextPaymentAmount: (() => {
        const cuota = prox?.cuota;
        if (!cuota) return 0;
        const montoDirecto = (cuota as any)?.montoNominal ?? (cuota as any)?.monto;
        const montoFallback = Number((cuota as any)?.montoCapital || 0) + Number((cuota as any)?.montoInteres || 0);
        const monto = Number(montoDirecto ?? montoFallback ?? 0);
        const pagado = Number((cuota as any)?.montoPagado ?? 0);
        return Math.max(0, monto - pagado);
      })(),
      totalPaid: pagadoD,
      totalValue: totalD,
      articleValue: amounts.totalContrato,
      installmentsPaid: pagadas.length,
      installmentsTotal: cuotas.length,
      saldoRestante: Number(loanData.saldoPendiente || 0)
    };
  }, [loanData]);

  const historialPagos = useMemo(() => {
    if (!loanData?.pagos) return [];
    return [...loanData.pagos].sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime()).map((p: any) => ({
        fecha: formatDateTime(p.fechaPago),
        detalle: p.referencia || `Abono a Crédito`,
        metodo: p.metodoPago || 'EFECTIVO',
        monto: p.montoTotal || p.monto
    }));
  }, [loanData]);

  const articleName = loanData?.producto?.nombre || (loanData ? 'Préstamo Efectivo' : '---');
  const isArticle = !!loanData?.productoId;

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="w-full bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-3xl sm:max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#08557f] animate-spin" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sincronizando con Backend...</p>
             </div>
          ) : error && !loanData ? (
            <div className="p-10 text-center space-y-4 font-bold">
                <X className="w-12 h-12 text-red-500 mx-auto" />
                <h4 className="text-lg text-slate-900">{error}</h4>
                <button onClick={onClose} className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl">Cerrar</button>
            </div>
          ) : info && (
            <div className="p-0">
                {/* Header Original */}
                <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Estado de Cuenta</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-slate-500">{visita.cliente}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            loanData?.estado === 'PAGADO' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            loanData?.estado === 'EN_MORA' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                            {loanData?.estado || 'ACTIVO'}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                    <X className="h-5 w-5" />
                </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Fechas Clave (Diseño Original) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Inicio</span>
                            </div>
                            <div className="text-sm font-black text-slate-900 uppercase">{info.fechaInicio}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimiento</span>
                            </div>
                            <div className="text-sm font-black text-slate-900 uppercase">{info.fechaVencimiento}</div>
                        </div>
                    </div>

                    {/* Próxima Cuota (Diseño Original) */}
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Próxima Cuota</span>
                                <div className="text-lg font-black text-slate-900 uppercase">{info.nextPaymentDate}</div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Valor Cuota</span>
                                <div className="text-lg font-black text-slate-900">${formatMilesCOP(info.nextPaymentAmount)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Artículo (Diseño Original) */}
                    <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100">
                                <ShoppingBag className="w-6 h-6 text-[#08557f]" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-[#08557f] uppercase tracking-widest mb-1">Artículo Financiado</div>
                                <div className="font-black text-slate-900 text-lg leading-tight uppercase">{articleName}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-[#08557f] uppercase tracking-widest mb-1">Valor Total</div>
                            <div className="text-xl font-black text-slate-900">${formatMilesCOP(isArticle ? info.articleValue : info.totalValue)}</div>
                        </div>
                    </div>

                    {(loanData?.notas || loanData?.garantia) && (
                      <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                        <div className="grid grid-cols-1 gap-4">
                          {loanData?.garantia && (
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Garantía</div>
                              <div className="text-xs font-bold text-slate-700">{String(loanData.garantia)}</div>
                            </div>
                          )}
                          {loanData?.notas && (
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notas / Observaciones</div>
                              <div className="text-xs font-medium text-slate-700 whitespace-pre-wrap">{String(loanData.notas)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Balance (Diseño Original) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Progreso de Pago</div>
                                <div className="text-2xl font-black text-slate-900 tracking-tight">
                                    ${formatMilesCOP(info.totalPaid)} <span className="text-lg text-slate-300 font-medium">/ ${formatMilesCOP(info.totalValue)}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Pendiente</div>
                                <div className="text-xl font-black text-emerald-600">${formatMilesCOP(info.saldoRestante)}</div>
                            </div>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div 
                                className="h-full bg-[#08557f] rounded-full transition-all duration-1000" 
                                style={{ width: `${info.totalValue > 0 ? (info.totalPaid / info.totalValue) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>{info.installmentsPaid} Cuotas pagadas</span>
                            <span>{info.installmentsTotal - info.installmentsPaid} Pendientes</span>
                        </div>
                    </div>

                    {/* Historial (Con Fecha y Hora Exacta) */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <History className="w-4 h-4" /> Recopilación de Pagos
                        </h4>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs shadow-sm">
                            <table className="w-full">
                                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Fecha y Hora</th>
                                        <th className="px-4 py-3 text-left">Detalle</th>
                                        <th className="px-4 py-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                {historialPagos.length > 0 ? historialPagos.map((p: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-black text-slate-900 uppercase">{p.fecha}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div className="font-medium">{p.detalle}</div>
                                            <div className="text-[9px] font-bold text-slate-300 uppercase">{p.metodo}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-emerald-600">
                                            +${formatMilesCOP(p.monto)}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 font-bold uppercase text-[10px]">Sin registros contables</td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-2xl bg-[#08557f] px-4 py-4 text-xs font-black text-white hover:bg-[#063a58] transition-all uppercase tracking-widest shadow-xl shadow-blue-900/10"
                    >
                        Cerrar Estado de Cuenta
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
