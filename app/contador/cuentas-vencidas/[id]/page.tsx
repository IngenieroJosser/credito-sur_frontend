'use client';

import { use } from 'react';
import { ChevronLeft, Archive, FileText, User, Calculator } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function DetalleCuentaVencidaContadorPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params);

    // Mock data for a vencida account detail (Contador Context)
    const cuenta = {
        id,
        numeroPrestamo: 'P-2023-500',
        cliente: {
            nombre: 'Luisa Fernanda Martínez',
            documento: '1.050.555.555',
            telefono: '300 999 8877',
            direccion: 'Carrera 45 # 10-20',
        },
        fechaVencimiento: '2023-11-20',
        diasVencidos: 68,
        saldoPendiente: 5000000,
        montoOriginal: 5000000,
        ruta: 'Ruta Sur',
        nivelRiesgo: 'LISTA_NEGRA' as const,
        estadoJuridico: 'EN_PROCESO',
    };

    return (
        <div className="min-h-screen bg-slate-50 relative pb-12">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-10 blur-[100px]"></div>
            </div>

            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
                <div className="px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/contador/cuentas-vencidas"
                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-900 text-white">
                                    <Calculator className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold tracking-tight text-slate-900">Evaluación de Deterioro</h1>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cuenta.numeroPrestamo} • Ref: {id}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
                    <div className="p-8 flex-1 border-b md:border-b-0 md:border-r border-slate-100">
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg mb-4 inline-block tracking-widest uppercase border border-rose-200">
                            Candidato a Castigo
                        </span>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">{cuenta.cliente.nombre}</h2>
                        <div className="bg-slate-100 px-3 py-1 rounded-full w-fit mb-6">
                            <p className="text-slate-600 font-mono text-xs">{cuenta.cliente.documento}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Monto Deterioro (100%)</p>
                                <p className="text-2xl font-bold text-rose-600 font-mono tracking-tighter">{formatCurrency(cuenta.saldoPendiente)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Fecha Vencimiento</p>
                                <p className="text-lg font-bold text-slate-900">{cuenta.fechaVencimiento}</p>
                                <p className="text-xs text-rose-600 font-bold mt-1">+{cuenta.diasVencidos} días de mora</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 bg-slate-50/50 w-full md:w-80 space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Metadatos Contables</h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="font-medium text-slate-700">{cuenta.ruta}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <span className="font-medium text-slate-700">Estado: {cuenta.estadoJuridico}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Acciones Contables</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                Seleccione una acción para afectar los estados financieros. El castigo de cartera removerá la cuenta del balance activo y la moverá a cuentas de orden.
                            </p>
                        </div>

                        <div className="mt-8 flex gap-4">
                            <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm shadow-sm">
                                Registrar Provisión
                            </button>
                            <button className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all text-sm shadow-lg shadow-rose-600/20">
                                Ejecutar Castigo de Cartera
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
