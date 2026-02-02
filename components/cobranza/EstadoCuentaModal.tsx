'use client'

import { useMemo } from 'react'
import { X, Calendar, Clock, ShoppingBag, History } from 'lucide-react'
import { VisitaRuta } from '@/lib/types/cobranza'
import { formatMilesCOP } from '@/lib/utils'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'

interface EstadoCuentaModalProps {
  visita: VisitaRuta
  onClose: () => void
}

export default function EstadoCuentaModal({ visita, onClose }: EstadoCuentaModalProps) {
  // --- Lógica Dinámica para Datos Consistentes ---
  const today = new Date();
  
  // 1. Determinar Frecuencia en Días
  const periodMap: Record<string, number> = { 'DIA': 1, 'SEMANA': 7, 'QUINCENA': 15, 'MES': 30 };
  const frequencyDays = periodMap[visita.periodoRuta] || 7;

  // 2. Calcular Cuotas
  const valorCuota = visita.montoCuota;
  const saldoRestante = visita.saldoTotal;
  const cuotasRestantes = Math.ceil(saldoRestante / (valorCuota || 1));
  
  // Simulamos cuotas pagadas (entre 20% y 50% del total para que parezca un crédito en curso)
  // Si está 'en_mora', asumimos que lleva más tiempo (más cuotas "deberían" haber pasado)
  const cuotasPagadas = Math.max(2, Math.floor(cuotasRestantes * 0.6)); 
  const totalCuotas = cuotasPagadas + cuotasRestantes;
  const valorInicial = totalCuotas * valorCuota;

  // 3. Calcular Fechas
  // Fecha Inicio = Hoy - (Tiempo transcurrido estimado)
  const daysElapsed = cuotasPagadas * frequencyDays;
  const fechaInicio = new Date(today);
  fechaInicio.setDate(today.getDate() - daysElapsed); // Retrocedemos en el tiempo

  // Fecha Vencimiento = Fecha Inicio + Duración Total del Crédito
  // "Si el prestamo era para 1 mes... esa es su fecha de vencimiento"
  const durationDays = totalCuotas * frequencyDays;
  const fechaVencimiento = new Date(fechaInicio);
  fechaVencimiento.setDate(fechaInicio.getDate() + durationDays);

  // 4. Calcular Atrasos (Si está en mora)
  const { delayDays, delayInstallments } = useMemo(() => {
    let dDays = 0;
    let dInst = 0;
    if (visita.estado === 'en_mora') {
        // Deterministic pseudo-random based on id to avoid lint errors
        const seed = visita.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const pseudoRandom = (seed % 100) / 100;
        
        const daysOverdue = Math.floor(pseudoRandom * 15) + 5; // 5-20 días
        dDays = daysOverdue;
        dInst = Math.max(1, Math.floor(daysOverdue / frequencyDays));
    }
    return { delayDays: dDays, delayInstallments: dInst };
  }, [visita.estado, frequencyDays, visita.id]);

  if (visita.estado === 'en_mora' && fechaVencimiento > today) {
      // Ajustamos Fecha Vencimiento si ya pasó
      fechaVencimiento.setDate(today.getDate() - delayDays);
  }

  // Detectar artículo
  const isArticle = visita.montoCuota > 150000 || visita.cliente.toLowerCase().includes('maria');
  const articleName = isArticle ? 'Electrodoméstico / Mueble' : 'Préstamo Efectivo';

  const creditInfo = { 
    startDate: fechaInicio.toLocaleDateString('es-CO'), 
    endDate: fechaVencimiento.toLocaleDateString('es-CO'), 
    totalPaid: cuotasPagadas * valorCuota, 
    totalValue: valorInicial, 
    installmentsPaid: cuotasPagadas, 
    installmentsTotal: totalCuotas, 
    delayDays, 
    delayInstallments 
  };

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
          <div className="p-0"> {/* Padding removed for cleaner header */}
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
               <div>
                  <h3 className="text-xl font-bold text-slate-900">Estado de Cuenta</h3>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-sm font-bold text-slate-500">{visita.cliente}</span>
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        visita.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        visita.estado === 'en_mora' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                     }`}>
                        {visita.estado.replace('_', ' ')}
                     </span>
                  </div>
               </div>
               <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                  <X className="h-5 w-5" />
               </button>
            </div>

            <div className="p-6 space-y-6">
                 
                 {/* Fechas Clave */}
                 <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                           <Calendar className="w-4 h-4 text-slate-400" />
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Inicio</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900">{creditInfo.startDate}</div>
                     </div>
                     <div className={`p-4 rounded-2xl border ${
                         creditInfo.delayDays > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                     }`}>
                        <div className="flex items-center gap-2 mb-1">
                           <Clock className={`w-4 h-4 ${creditInfo.delayDays > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                           <span className={`text-xs font-bold uppercase tracking-wider ${creditInfo.delayDays > 0 ? 'text-red-600' : 'text-slate-500'}`}>Vencimiento</span>
                        </div>
                        <div className={`text-lg font-bold ${creditInfo.delayDays > 0 ? 'text-red-700' : 'text-slate-900'}`}>{creditInfo.endDate}</div>
                        {creditInfo.delayDays > 0 && <div className="text-[10px] font-bold text-red-600 mt-1">¡VENCIDA!</div>}
                     </div>
                 </div>

                 {/* Información de Artículo (Si aplica) */}
                 {isArticle && (
                     <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl relative overflow-hidden">
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100">
                                <ShoppingBag className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Artículo Financiado</div>
                                <div className="font-bold text-slate-900 text-lg leading-tight">{articleName}</div>
                                <div className="text-sm text-blue-800 mt-1 font-medium">Valor Inicial Estimado: <b>${formatMilesCOP(creditInfo.totalValue)}</b></div>
                            </div>
                        </div>
                     </div>
                 )}

                 {/* Resumen Financiero */}
                 <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Progreso de Pago</div>
                            <div className="text-3xl font-bold text-slate-900 tracking-tight">
                                ${formatMilesCOP(creditInfo.totalPaid)} <span className="text-lg text-slate-400 font-medium">/ ${formatMilesCOP(creditInfo.totalValue)}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Restante</div>
                            <div className="text-xl font-bold text-emerald-600">${formatMilesCOP(visita.saldoTotal)}</div>
                        </div>
                    </div>
                    {/* Barra de Progreso */}
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div 
                           className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all duration-1000" 
                           style={{ width: `${(creditInfo.totalPaid / creditInfo.totalValue) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span>{creditInfo.installmentsPaid} Cuotas pagadas</span>
                        <span>{creditInfo.installmentsTotal - creditInfo.installmentsPaid} Restantes</span>
                    </div>
                 </div>

                 {/* Alerta de Atraso */}
                 {creditInfo.delayDays > 0 && (
                     <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                         <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                            <Clock className="w-5 h-5" />
                         </div>
                         <div className="flex-1">
                            <div className="text-xs font-bold text-orange-600 uppercase tracking-wider">Préstamo en Mora</div>
                            <div className="font-bold text-slate-900 text-sm mt-0.5">
                               Cliente presenta un atraso de <span className="text-orange-600 text-lg">{creditInfo.delayDays} días</span> ({creditInfo.delayInstallments} cuotas vencidas).
                            </div>
                         </div>
                     </div>
                 )}

                 {/* Historial Detallado */}
                 <div>
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" /> 
                        Historial de Pagos
                    </h4>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden text-sm shadow-sm">
                        <table className="w-full">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left">Fecha</th>
                                    <th className="px-4 py-3 text-left">Detalle</th>
                                    <th className="px-4 py-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                               {[1,2,3,4,5].map(i => {
                                   // Mock dates logic
                                   const d = new Date(); d.setDate(d.getDate() - (i*7));
                                   const dateStr = d.toLocaleDateString('es-CO');
                                   return (
                                     <tr key={i} className="hover:bg-slate-50 transition-colors">
                                         <td className="px-4 py-3">
                                             <div className="font-bold text-slate-900">{dateStr}</div>
                                             <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 text-[#08557f]">Confirmado</div>
                                         </td>
                                         <td className="px-4 py-3">
                                             <div className="font-medium text-slate-700">Pago Cuota #{16-i}</div>
                                             <div className="text-[10px] text-slate-400">Efectivo</div>
                                         </td>
                                         <td className="px-4 py-3 text-right font-bold text-slate-900">
                                             ${formatMilesCOP(visita.montoCuota)}
                                         </td>
                                     </tr>
                                   )
                               })}
                            </tbody>
                        </table>
                    </div>
                 </div>

                 <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl bg-white border-2 border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                 >
                    Cerrar Detalle
                 </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
