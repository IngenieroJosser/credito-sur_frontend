// ... (imports remain the same, ensure all icons are imported)
import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  ArrowRight, 
  DollarSign, 
  X,
  Clock,
  Wallet,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

interface DetalleReporteOperativoModalProps {
  id: string;
  onClose: () => void;
}

export default function DetalleReporteOperativoModal({ id, onClose }: DetalleReporteOperativoModalProps) {
  
  // Enhanced Mock data with detailed financial info
  const reporte = {
    id,
    ruta: 'Ruta Centro',
    cobrador: 'Carlos Pérez',
    fechaOperativa: 'Jueves, 22 de Enero de 2026',
    horaInicio: '08:00 AM',
    horaCierre: '05:30 PM',
    finanzas: {
      baseInicial: 500000, // Box start
      recaudoEfectivo: 950000,
      recaudoTransferencia: 300000,
      totalRecaudado: 1250000,
      metaDia: 1500000,
      eficiencia: 83.3,
      colocacionPrestamos: 300000, // Outflow
      gastosOperativos: 15000,     // Outflow
      totalEntregadoCaja: 1135000, // Formula: Base + RecaudoEfec - Prestamos - Gastos
    },
    indicadores: {
      clientesVisitados: 45,
      clientesNoVisitados: 3,
      nuevosPrestamos: 2,
      nuevosClientes: 1
    },
    novedades: 'Ruta completada sin incidentes mayores. 2 clientes solicitaron re-programación por motivos de salud.',
    movimientos: [
      { id: 'm1', cliente: 'OPERACIONES', tipo: 'BASE_INICIAL', metodo: 'EFECTIVO', monto: 500000, fecha: '2026-01-22 08:00:00' },
      { id: 'm2', cliente: 'Roberto Gómez', tipo: 'COBRO', metodo: 'EFECTIVO', monto: 50000, fecha: '2026-01-22 08:30:15' },
      { id: 'm3', cliente: 'Marta Lucía', tipo: 'PRESTAMO', metodo: 'EFECTIVO', monto: 150000, fecha: '2026-01-22 09:15:42' },
      { id: 'm4', cliente: 'Julio Casas', tipo: 'COBRO', metodo: 'TRANSFERENCIA', monto: 80000, fecha: '2026-01-22 10:00:00' },
      { id: 'm5', cliente: 'Ana María', tipo: 'COBRO', metodo: 'EFECTIVO', monto: 120000, fecha: '2026-01-22 10:45:30' },
      { id: 'm6', cliente: 'Restaurante El Paso', tipo: 'GASTO', metodo: 'EFECTIVO', monto: 15000, fecha: '2026-01-22 13:00:00', descripcion: 'Almuerzo corporativo' },
      { id: 'm7', cliente: 'Pedro Pablo', tipo: 'PRESTAMO', metodo: 'EFECTIVO', monto: 150000, fecha: '2026-01-22 14:20:10' },
      { id: 'm8', cliente: 'Luisa Lane', tipo: 'COBRO', metodo: 'EFECTIVO', monto: 75000, fecha: '2026-01-22 16:10:05' },
    ]
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Informe Detallado de Operación"
      size="xl"
    >
      <div className="space-y-8">
        
        {/* Header Summary */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                    <Calendar className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-base font-bold text-slate-800 tracking-tight">{reporte.finanzas.eficiencia >= 80 ? 'Operación Eficiente' : 'Operación Regular'}</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{reporte.ruta} • {reporte.cobrador}</p>
                </div>
            </div>
            <div className="flex items-center gap-6 text-xs border-t md:border-t-0 border-slate-200 pt-3 md:pt-0">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest mb-0.5">Fecha Operativa</p>
                  <p className="font-bold text-slate-900">{reporte.fechaOperativa}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest mb-0.5">Horario</p>
                  <p className="font-bold text-slate-900">{reporte.horaInicio} - {reporte.horaCierre}</p>
                </div>
            </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recaudo Total</p>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
               <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(reporte.finanzas.totalRecaudado)}</h3>
               <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {reporte.finanzas.eficiencia}% Meta
               </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 font-medium">
               Meta del día: <span className="font-bold text-slate-700">{formatCurrency(reporte.finanzas.metaDia)}</span>
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gastos Op.</p>
              <ArrowDownLeft className="w-4 h-4 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(reporte.finanzas.gastosOperativos)}</h3>
            <p className="mt-1 text-xs text-slate-500 font-bold uppercase">
               Salidas de Caja
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Transaction Log */}
          {/* Detailed Transaction Log - Full Width */}
          <div className="lg:col-span-3 space-y-4">
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Bitácora Financiera Detallada</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase bg-white border border-slate-200 px-2 py-1 rounded-lg">
                  {reporte.movimientos.length} TRANSACCIONES
                </span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-bold sticky top-0">
                        <tr>
                            <th className="px-6 py-3">Hora / Fecha</th>
                            <th className="px-6 py-3">Concepto</th>
                            <th className="px-6 py-3">Método</th>
                            <th className="px-6 py-3 text-right">Entrada</th>
                            <th className="px-6 py-3 text-right">Salida</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                        {reporte.movimientos.map(m => {
                            const esEntrada = m.tipo === 'COBRO' || m.tipo === 'BASE_INICIAL';
                            return (
                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-bold tabular-nums">
                                                {new Date(m.fecha).toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit', second:'2-digit', hour12:true })}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-semibold group-hover:text-blue-500 transition-colors">
                                                {new Date(m.fecha).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-bold">{m.cliente}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{m.tipo}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider",
                                            m.metodo === 'EFECTIVO' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                        )}>
                                            {m.metodo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {esEntrada ? (
                                            <span className="text-emerald-600 font-bold bg-emerald-50/50 px-2 py-1 rounded-lg">
                                                +{formatCurrency(m.monto)}
                                            </span>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {!esEntrada ? (
                                            <span className="text-rose-600 font-bold bg-rose-50/50 px-2 py-1 rounded-lg">
                                                -{formatCurrency(m.monto)}
                                            </span>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                 </table>
              </div>
            </section>
          </div>
          
          {/* Novedades moved below or removed? The user asked to remove "Arqueo..." and "Digital...". 
              I'll add a small full-width section for "Observaciones" at the bottom if requested, 
              but the user specifically pasted the cards content to remove. 
              I will assume "Novedades" inside the Digital card is also to be removed unless I see a reason to keep it.
              Actually, "Novedades" is important context. I'll stick to removing the specific financial reconciliation cards requested. 
              I will re-add a simple full-width Observations section below the table just in case, 
              as it wasn't explicitly targeting the *content* of Novedades, just the *cards*. 
              But to be safe and strictly follow "quita estas tarjetas...", I will remove the side column entirely.
           */}

        </div>
      </div>
    </Modal>
  );
}
