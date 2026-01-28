'use client';

import { use } from 'react';
import { ChevronLeft, BarChart3, TrendingUp, Users, Calendar, ArrowRight, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function DetalleReporteOperativoPage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);
  
  // Mock data for a specific route report
  const reporte = {
    id,
    ruta: 'Ruta Centro',
    cobrador: 'Carlos Pérez',
    fecha: '2026-01-22',
    meta: 1500000,
    recaudado: 1250000,
    eficiencia: 83,
    clientesVisitados: 45,
    clientesNoVisitados: 3,
    nuevosPrestamos: 2,
    valorNuevosPrestamos: 300000,
    nuevosClientes: 1,
    gastosDia: 15000,
    novedades: 'Ruta completada sin incidentes mayores. 2 clientes solicitaron re-programación.',
    movimientos: [
      { id: 'm1', cliente: 'Roberto Gómez', tipo: 'COBRO', monto: 50000, hora: '08:30 AM' },
      { id: 'm2', cliente: 'Marta Lucía', tipo: 'PRESTAMO', monto: 150000, hora: '09:15 AM' },
      { id: 'm3', cliente: 'Julio Casas', tipo: 'COBRO', monto: 80000, hora: '10:00 AM' },
    ]
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-10 blur-[100px]"></div>
      </div>

      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/coordinador/reportes" 
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">Reporte Operativo</h1>
                  <p className="text-xs font-medium text-slate-500">{reporte.ruta} • {reporte.fecha}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recaudo vs Meta</p>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(reporte.recaudado)}</h3>
              <p className="text-xs text-slate-500 font-medium">De {formatCurrency(reporte.meta)} meta</p>
            </div>
            <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
               <div className="bg-emerald-500 h-full" style={{ width: `${reporte.eficiencia}%` }} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visitas</p>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{reporte.clientesVisitados}</h3>
            <p className="text-xs text-slate-500 font-medium">{reporte.clientesNoVisitados} pendientes de visita</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nuevas Colocaciones</p>
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{reporte.nuevosPrestamos}</h3>
            <p className="text-xs text-slate-500 font-medium">Por valor de {formatCurrency(reporte.valorNuevosPrestamos)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Actividad Detallada</h3>
                <span className="text-xs font-bold text-slate-400">{reporte.movimientos.length} Movimientos</span>
              </div>
              <div className="divide-y divide-slate-100 italic-header">
                {reporte.movimientos.map(m => (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", m.tipo === 'COBRO' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{m.cliente}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">{m.tipo} • {m.hora}</p>
                      </div>
                    </div>
                    <p className={cn("font-bold", m.tipo === 'COBRO' ? "text-emerald-600" : "text-blue-600")}>
                      {m.tipo === 'COBRO' ? '+' : '-'}{formatCurrency(m.monto)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Resumen de Jornada
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Recaudo Bruto</span>
                  <span className="font-bold">{formatCurrency(reporte.recaudado)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Gastos de Ruta</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(reporte.gastosDia)}</span>
                </div>
                <div className="h-[1px] bg-slate-100" />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">Entrega Neta</span>
                  <span className="font-bold text-blue-600">{formatCurrency(reporte.recaudado - reporte.gastosDia)}</span>
                </div>
              </div>
            </section>

            <section className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/20">
              <h3 className="font-bold mb-3">Observaciones / Novedades</h3>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "{reporte.novedades}"
              </p>
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
                  {reporte.cobrador.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold">{reporte.cobrador}</p>
                  <p className="text-[10px] text-slate-400">Cobrador Responsable</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
