'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, 
  AlertCircle, 
  DollarSign, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  Clock, 
  FileText,
  User,
  CalendarDays,
  Send,
  MessageSquare,
  CheckCircle2
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

// Mock Data para demostración
const moraDetalleMock = {
  id: '1',
  numeroPrestamo: 'P-2024-001',
  cliente: {
    id: 'CLI-001',
    nombre: 'Juan Pérez',
    documento: 'V-12345678',
    telefono: '310 123 4567',
    direccion: 'Av. Bolívar, Casa 5',
    estado: 'ACTIVO'
  },
  prestamo: {
    montoOriginal: 1500000,
    saldoCapital: 800000,
    cuotaPromedio: 150000,
    frecuencia: 'quincenal',
    proximoVencimiento: '2024-02-15'
  },
  mora: {
    diasAtraso: 45,
    capitalVencido: 300000, // 2 cuotas de 150k
    interesMora: 15000,
    gastosCobranza: 0,
    totalPagarYa: 315000,
    fechaInicioMora: '2024-01-01',
    nivelRiesgo: 'ROJO'
  },
  historialGestion: [
    { fecha: '2024-01-15', usuario: 'Carlos Ruiz', tipo: 'VISITA', nota: 'Cliente no estaba, se dejó aviso.' },
    { fecha: '2024-01-10', usuario: 'Admin', tipo: 'LLAMADA', nota: 'Promesa de pago incumplida.' }
  ]
}

export default function DetalleCuentaMoraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  
  const data = moraDetalleMock; 
  const [nota, setNota] = useState('');
  const [activeTab, setActiveTab] = useState<'historial' | 'reprogramar' | 'supervisor'>('historial');

  return (
    <div className="min-h-screen bg-slate-50 relative pb-8">
       {/* Fondo arquitectónico sutil con toque de alerta */}
       <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-rose-500 opacity-10 blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="px-6 py-3 w-full mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/admin/cuentas-mora" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        Expediente de Mora #{id}
                    </h1>
                    <p className="text-xs font-medium text-slate-500">Préstamo {data.numeroPrestamo}</p>
                </div>
            </div>
        </div>
      </header>

      <main className="px-6 py-6 w-full mx-auto space-y-4">
        
        {/* Top Cards: Client & Debt Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Client Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <User className="w-24 h-24 text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Deudor</h3>
                <div className="relative z-10">
                    <div className="text-xl font-bold text-slate-900 mb-1">{data.cliente.nombre}</div>
                    <div className="text-sm text-slate-500 font-mono mb-4">{data.cliente.documento}</div>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {data.cliente.telefono}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {data.cliente.direccion}
                        </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                         <Link href={`/admin/clientes/${data.cliente.id}`} className="flex-1 py-2 text-center text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                            Ver Perfil
                        </Link>
                        {/* Botón Llamar eliminado a petición del usuario */}
                    </div>
                </div>
            </div>

            {/* Debt Status Card - MAIN FOCUS */}
            <div className="lg:col-span-2 bg-gradient-to-br from-rose-50 to-white rounded-2xl p-5 border border-rose-100 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-6">
                    <span className="px-4 py-1.5 bg-rose-100 text-rose-700 font-bold rounded-full text-sm border border-rose-200 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Riesgo {data.mora.nivelRiesgo}
                    </span>
                </div>
                
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-4">Estado de la Deuda</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Días de Atraso</p>
                        <p className="text-3xl font-bold text-slate-900">{data.mora.diasAtraso}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Capital Vencido</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.mora.capitalVencido)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Interés Mora</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.mora.interesMora)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Total a Pagar Ya</p>
                        <p className="text-3xl font-bold text-slate-900">{formatCurrency(data.mora.totalPagarYa)}</p>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-rose-100">
                     <Link href={`/admin/pagos/registrar/${data.cliente.id}`} className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-white text-slate-900 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 shadow-sm transition-all">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Registrar Pago
                     </Link>
                </div>
            </div>
        </div>

        {/* Detailed Info & Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Loan Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit">
                 <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Detalles del Préstamo
                 </h3>
                 <div className="space-y-3">
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 text-sm">Monto Original</span>
                        <span className="font-medium text-slate-900">{formatCurrency(data.prestamo.montoOriginal)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 text-sm">Saldo Capital Actual</span>
                        <span className="font-medium text-slate-900">{formatCurrency(data.prestamo.saldoCapital)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 text-sm">Valor Cuota</span>
                        <span className="font-medium text-slate-900">{formatCurrency(data.prestamo.cuotaPromedio)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 text-sm">Frecuencia</span>
                        <span className="font-medium text-slate-900 capitalize">{data.prestamo.frecuencia}</span>
                    </div>
                 </div>
            </div>

            {/* Management Tabs */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={cn(
                            "flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative",
                            activeTab === 'historial' ? "text-blue-600 bg-blue-50/50" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        <Clock className="w-4 h-4" />
                        Historial de Gestión
                        {activeTab === 'historial' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('reprogramar')}
                        className={cn(
                            "flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative",
                            activeTab === 'reprogramar' ? "text-orange-600 bg-orange-50/50" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        <CalendarDays className="w-4 h-4" />
                        Reprogramar
                        {activeTab === 'reprogramar' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('supervisor')}
                        className={cn(
                            "flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative",
                            activeTab === 'supervisor' ? "text-rose-600 bg-rose-50/50" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        Pasar a Supervisor
                        {activeTab === 'supervisor' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600"></div>}
                    </button>
                </div>
                 
                 {/* Tab Content */}
                 <div className="p-5">
                    
                    {/* HISTORIAL */}
                    {activeTab === 'historial' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             {/* Add Note Input */}
                            <div className="flex gap-4">
                                <textarea 
                                    value={nota}
                                    onChange={(e) => setNota(e.target.value)}
                                    placeholder="Agregar nueva nota de gestión..."
                                    className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-16 text-slate-900 placeholder:text-slate-400"
                                />
                                <button className="self-end px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Guardar
                                </button>
                            </div>

                            {/* Timeline */}
                            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 py-2">
                                {data.historialGestion.map((item, idx) => (
                                    <div key={idx} className="relative pl-8">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white ring-1 ring-slate-100"></div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-slate-500 uppercase">{item.tipo}</span>
                                            <span className="text-xs text-slate-400">{item.fecha}</span>
                                        </div>
                                        <p className="text-slate-700 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            {item.nota}
                                            <span className="block mt-2 text-xs text-slate-400 font-medium">— {item.usuario}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* REPROGRAMAR */}
                    {activeTab === 'reprogramar' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-800">
                                    La reprogramación debe ser autorizada por el Coordinador si implica cambio de tasa o condonación de intereses.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nueva Fecha de Pago</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-slate-900 font-medium placeholder:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Cuota Propuesta</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            inputMode="numeric"
                                            placeholder="0"
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-slate-900 font-medium placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Motivo / Acuerdo</label>
                                    <textarea 
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-slate-900 text-sm h-20 resize-none placeholder:text-slate-400"
                                        placeholder="Describa el acuerdo de pago alcanzado con el cliente..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Solicitar Reprogramación
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SUPERVISOR */}
                    {activeTab === 'supervisor' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-3">
                                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-rose-800">
                                    Escalar este caso notificará inmediatamente al Supervisor de zona y bloqueará acciones de cobranza estándar hasta nueva orden.
                                </p>
                            </div>

                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Prioridad</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="prioridad" className="text-rose-600 focus:ring-rose-500" />
                                        <span className="text-sm font-medium text-slate-700">Alta</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="prioridad" className="text-rose-600 focus:ring-rose-500" defaultChecked />
                                        <span className="text-sm font-medium text-slate-700">Media</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="prioridad" className="text-rose-600 focus:ring-rose-500" />
                                        <span className="text-sm font-medium text-slate-700">Baja</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Informe para Supervisor</label>
                                <textarea 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-slate-900 text-sm h-24 resize-none placeholder:text-slate-400"
                                    placeholder="Detalle por qué este caso requiere intervención de supervisión (ej: cliente ilocalizable, negativa de pago, amenazas)..."
                                ></textarea>
                            </div>

                             <div className="flex justify-end pt-2">
                                <button className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2">
                                    <Send className="w-4 h-4" />
                                    Escalar Caso
                                </button>
                            </div>
                        </div>
                    )}
                 </div>
            </div>
        </div>

      </main>
    </div>
  )
}