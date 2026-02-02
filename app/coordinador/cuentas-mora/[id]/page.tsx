'use client';

import { use } from 'react';
import { ChevronLeft, AlertCircle, Calendar, Phone, MapPin, User, ArrowRight, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, cn } from '@/lib/utils';

export default function DetalleCuentaMoraPage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);
  
  // Mock data for a mora account detail
  const cuenta = {
    id,
    numeroPrestamo: 'P-2024-001',
    cliente: {
      nombre: 'Juan Pérez',
      documento: 'V-12345678',
      telefono: '310 123 4567',
      direccion: 'Av. Bolívar, Casa 5',
      referencia: 'Frente al parque principal'
    },
    diasMora: 45,
    montoMora: 150000,
    montoTotalDeuda: 450000,
    cuotasVencidas: 3,
    ruta: 'Ruta Centro',
    cobrador: 'Carlos Ruiz',
    nivelRiesgo: 'ROJO' as const,
    ultimoPago: '2023-12-15',
    historialMora: [
      { fecha: '2024-01-15', motivo: 'Promesa de pago incumplida', tipo: 'LLAMADA' },
      { fecha: '2024-01-10', motivo: 'Cliente no se encontraba en domicilio', tipo: 'VISITA' },
      { fecha: '2024-01-05', motivo: 'Promesa de pago para el 10', tipo: 'LLAMADA' },
    ]
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-rose-500 opacity-10 blur-[100px]"></div>
      </div>

      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/coordinador/cuentas-mora" 
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">Expediente de Mora</h1>
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">{cuenta.numeroPrestamo} • {cuenta.diasMora} Días en mora</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
                 <button
                   onClick={() => {
                     if (confirm('¿Está seguro de pasar esta cuenta a revisión del supervisor?')) {
                       alert('Cuenta enviada al supervisor para revisión');
                     }
                   }}
                   className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-orange-200 text-orange-600 font-black rounded-xl hover:bg-orange-50 transition-all text-xs shadow-sm hover:shadow-md active:scale-95"
                 >
                   Pasar a Supervisión
                 </button>
                 
                 <Link 
                   href={`/coordinador/creditos/${id}`} 
                   className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                 >
                    Ver Ficha Completa
                 </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
        {/* Tarjeta de Riesgo y Resumen - Full Width */}
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-100 uppercase tracking-widest mb-4 inline-block">
                           Estado Crítico - {cuenta.nivelRiesgo}
                        </span>
                        <h2 className="text-3xl font-bold text-slate-900">{cuenta.cliente.nombre}</h2>
                        <p className="text-slate-500 font-medium">{cuenta.cliente.documento}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-y border-slate-100">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Monto en Mora</p>
                        <p className="text-2xl font-bold text-rose-600">{formatCurrency(cuenta.montoMora)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Cuotas Vencidas</p>
                        <p className="text-2xl font-bold text-slate-900">{cuenta.cuotasVencidas}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Días de Atraso</p>
                        <p className="text-2xl font-bold text-slate-900">{cuenta.diasMora}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Phone className="w-4 h-4 text-slate-400 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</p>
                                <p className="font-bold text-slate-900">{cuenta.cliente.telefono}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Dirección</p>
                                <p className="font-bold text-slate-900">{cuenta.cliente.direccion}</p>
                                <p className="text-xs text-slate-500">{cuenta.cliente.referencia}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <User className="w-4 h-4 text-slate-400 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Cobrador Asignado</p>
                                <p className="font-bold text-slate-900">{cuenta.cobrador}</p>
                                <p className="text-xs text-slate-500">{cuenta.ruta}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Calendar className="w-4 h-4 text-slate-400 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Último Pago Registrado</p>
                                <p className="font-bold text-slate-900">{cuenta.ultimoPago}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </section>

      </main>
    </div>
  );
}
