'use client';

import { use } from 'react';
import { ChevronLeft, BarChart3, TrendingUp, Users, Calendar, ArrowRight, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, cn } from '@/lib/utils';

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

      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href="/coordinador/reportes" 
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#08557f]/10 text-[#08557f]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-slate-800">Detalle de Operación</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{reporte.ruta} • {reporte.fecha}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recaudo Estimado</p>
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(reporte.recaudado)}</h3>
              <p className="text-sm text-slate-500 font-bold uppercase">Meta: {formatCurrency(reporte.meta)}</p>
            </div>
            <div className="mt-5 w-full bg-slate-100 h-3 rounded-full overflow-hidden">
               <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${reporte.eficiencia}%` }} />
            </div>
            <p className="mt-3 text-xs font-bold text-emerald-600">{reporte.eficiencia}% Cumplimiento</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cartera Visitada</p>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{reporte.clientesVisitados} <span className="text-xl text-slate-500">Clientes</span></h3>
            <p className="mt-2 text-sm text-slate-500 font-bold uppercase">{reporte.clientesNoVisitados} Sin visitar</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Colocaciones</p>
              <TrendingUp className="w-5 h-5 text-[#fb851b]" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{reporte.nuevosPrestamos} <span className="text-xl text-slate-500">Nuevos</span></h3>
            <p className="mt-2 text-sm text-slate-500 font-bold uppercase">Monto: {formatCurrency(reporte.valorNuevosPrestamos)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <section className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Bitácora de Movimientos</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{reporte.movimientos.length} REGISTROS</span>
              </div>
              <div className="divide-y divide-slate-50">
                {reporte.movimientos.map(m => (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-lg", m.tipo === 'COBRO' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{m.cliente}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{m.tipo} • {m.hora}</p>
                      </div>
                    </div>
                    <p className={cn("text-sm font-bold", m.tipo === 'COBRO' ? "text-emerald-600" : "text-blue-600")}>
                      {m.tipo === 'COBRO' ? '+' : '-'}{formatCurrency(m.monto)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#08557f]" />
                Cuadre de Ruta
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">Recaudo Bruto</span>
                  <span className="font-bold text-slate-800">{formatCurrency(reporte.recaudado)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">Gastos de Ruta</span>
                  <span className="font-bold text-rose-500">-{formatCurrency(reporte.gastosDia)}</span>
                </div>
                <div className="h-px bg-slate-50" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Liquidación Neta</span>
                  <span className="text-lg font-black text-[#08557f] tracking-tighter">{formatCurrency(reporte.recaudado - reporte.gastosDia)}</span>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-slate-700">Novedades del Día</h3>
              <p className="text-sm text-slate-600 leading-relaxed italic mb-4">
                &quot;{reporte.novedades}&quot;
              </p>
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                  {reporte.cobrador.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{reporte.cobrador}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Cobrador</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
