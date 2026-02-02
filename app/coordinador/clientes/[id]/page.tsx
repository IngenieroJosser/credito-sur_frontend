'use client';

import { use } from 'react';
import { ChevronLeft, User, Phone, CreditCard, TrendingUp, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function DetalleClienteCoordinadorPage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);
  
  // Mock data for a client
  const cliente = {
    id,
    nombre: 'Carlos Andrés Rodríguez Pérez',
    documento: '0912345678',
    telefono: '310 123 4567',
    direccion: 'Calle 123 # 45-67, Barrio El Rosario',
    ciudad: 'Cúcuta',
    estrato: 3,
    score: 850,
    estado: 'ACTIVO',
    fechaRegistro: '15/01/2023',
    prestamosActivos: 1,
    totalPrestado: 5000000,
    saldoActual: 1200000,
    rutasAsociadas: ['Ruta Centro', 'Ruta Norte'],
    historial: [
      { fecha: '2023-12-15', evento: 'Pago realizado cuota #4', monto: 300000 },
      { fecha: '2023-11-15', evento: 'Pago realizado cuota #3', monto: 300000 },
      { fecha: '2023-10-15', evento: 'Crédito PR-2023-001 aprobado', monto: 1500000 },
    ]
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-10 blur-[100px]"></div>
      </div>

      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/coordinador/clientes" 
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">Ficha del Cliente</h1>
                  <p className="text-xs font-medium text-slate-500">{cliente.nombre}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar con Info Básica */}
            <div className="space-y-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                    <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-slate-400">
                        {cliente.nombre.charAt(0)}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{cliente.nombre}</h2>
                    <p className="text-sm text-slate-500 mb-4">{cliente.documento}</p>
                    <div className="flex justify-center gap-2 mb-6">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100 uppercase">
                            {cliente.estado}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-6 border-t border-slate-100">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Score</p>
                            <p className="text-xl font-bold text-blue-600">{cliente.score}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Antigüedad</p>
                            <p className="text-xl font-bold text-slate-900">12m</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-500" />
                        Contacto
                    </h3>
                    <div className="space-y-3">
                        <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Teléfono Movil</p>
                           <p className="text-sm font-medium text-slate-700">{cliente.telefono}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Dirección Principal</p>
                           <p className="text-sm font-medium text-slate-700">{cliente.direccion}</p>
                           <p className="text-xs text-slate-500">{cliente.ciudad}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saldo Activo</p>
                            <DollarSign className="w-4 h-4 text-orange-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(cliente.saldoActual)}</h3>
                        <p className="text-xs text-slate-500 font-medium">{cliente.prestamosActivos} Operación vigente</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Colocado</p>
                            <CreditCard className="w-4 h-4 text-blue-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(cliente.totalPrestado)}</h3>
                        <p className="text-xs text-slate-500 font-medium">Histórico acumulado</p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        <h3 className="font-bold text-slate-900">Historial de Actividad</h3>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            {cliente.historial.map((h, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-2 bg-slate-100 rounded-full" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-sm font-bold text-slate-900">{h.evento}</p>
                                            <span className="text-[10px] font-bold text-slate-400">{h.fecha}</span>
                                        </div>
                                        <p className="text-xs text-blue-600 font-bold">{formatCurrency(h.monto)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
