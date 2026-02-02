'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, User, FileText, TrendingUp, Package, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

export interface PrestamoDetalle {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteDni: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  montoPrestamo: number;
  montoTotal: number;
  saldoPendiente: number;
  tasaInteres: number;
  duracion: string;
  frecuencia: string;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: 'ACTIVO' | 'PAGADO' | 'EN_MORA' | 'PENDIENTE';
  producto?: string;
  garantia?: string;
  fotos?: string[];
  cuotas: {
    numero: number;
    fecha: string;
    monto: number;
    estado: 'PAGADO' | 'PENDIENTE' | 'PARCIAL' | 'VENCIDO';
    fechaPago?: string;
  }[];
}

interface DetallePrestamoProps {
  prestamo: PrestamoDetalle;
}

export default function DetallePrestamo({ prestamo }: DetallePrestamoProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'cuotas' | 'documentos'>('info');

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVO': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      case 'PAGADO': return 'text-blue-700 bg-blue-50 border border-blue-100';
      case 'EN_MORA': return 'text-rose-700 bg-rose-50 border border-rose-100';
      case 'PENDIENTE': return 'text-amber-700 bg-amber-50 border border-amber-100';
      default: return 'text-slate-600 bg-slate-50 border border-slate-100';
    }
  };

  const getCuotaEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PAGADO': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      case 'PENDIENTE': return 'text-slate-600 bg-slate-50 border border-slate-100';
      case 'PARCIAL': return 'text-amber-700 bg-amber-50 border border-amber-100';
      case 'VENCIDO': return 'text-rose-700 bg-rose-50 border border-rose-100';
      default: return 'text-slate-600 bg-slate-50 border border-slate-100';
    }
  };

  const montoAbonado = prestamo.montoTotal - prestamo.saldoPendiente;
  const progresoPorcentaje = Math.round((montoAbonado / prestamo.montoTotal) * 100);

  return (
    <div className="w-full p-6 md:p-8 space-y-8">
      {/* 1. Header: Datos del Cliente (Full Width) */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <User className="w-32 h-32 text-slate-900" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
             <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Cliente Titular</h3>
                <Link href={`/admin/clientes/${prestamo.clienteId}`} className="group flex items-center gap-2">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                    {prestamo.clienteNombre}
                  </h2>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </Link>
             </div>
             <span className={cn("px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border", getEstadoColor(prestamo.estado))}>
                {prestamo.estado}
             </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Documento ID</span>
               <span className="text-sm font-bold text-slate-700 block">{prestamo.clienteDni}</span>
             </div>
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Teléfono</span>
               <span className="text-sm font-bold text-slate-700 block">{prestamo.clienteTelefono || 'No registrado'}</span>
             </div>
             <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Dirección</span>
               <span className="text-sm font-bold text-slate-700 block">{prestamo.clienteDireccion || 'No registrada'}</span>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Loan Summary Grid (The 6 Requested Metrics) */}
      <div>
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-600" />
          Resumen de la Cuenta
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Monto Prestado */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Prestado</span>
             <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(prestamo.montoPrestamo)}</p>
          </div>

          {/* Abonado */}
          <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between h-28">
             <div className="flex justify-between items-start">
               <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest">Abonado a la Fecha</span>
               <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{progresoPorcentaje}%</span>
             </div>
             <p className="text-2xl font-bold text-emerald-700 tracking-tight">{formatCurrency(montoAbonado)}</p>
          </div>

          {/* Saldo Pendiente */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente</span>
             <p className="text-2xl font-bold text-rose-600 tracking-tight">{formatCurrency(prestamo.saldoPendiente)}</p>
          </div>

          {/* Frecuencia (now Row 2) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center gap-1 h-24">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                   <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Frecuencia Pago</span>
                   <span className="text-lg font-bold text-slate-900 capitalize block leading-none mt-1">{prestamo.frecuencia}</span>
                </div>
             </div>
          </div>

          {/* Fecha Inicio */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center gap-1 h-24">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                   <Calendar className="w-4 h-4" />
                </div>
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fecha Inicio</span>
                   <span className="text-lg font-bold text-slate-900 block leading-none mt-1">{prestamo.fechaInicio}</span>
                </div>
             </div>
          </div>

          {/* Fecha Vencimiento */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center gap-1 h-24">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                   <Calendar className="w-4 h-4" />
                </div>
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Vencimiento</span>
                   <span className="text-lg font-bold text-slate-900 block leading-none mt-1">{prestamo.fechaVencimiento}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('cuotas')}
            className={cn(
              "py-4 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm transition-colors",
              activeTab === 'cuotas'
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            <Calendar className="h-4 w-4" />
            Plan de Pagos
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              "py-4 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm transition-colors",
              activeTab === 'info'
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            <FileText className="h-4 w-4" />
            Detalles y Garantía
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={cn(
              "py-4 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm transition-colors",
              activeTab === 'documentos'
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            <ImageIcon className="h-4 w-4" />
            Documentos ({prestamo.fotos?.length || 0})
          </button>
        </nav>
      </div>

      {/* Contenido de Tabs */}
      <div className="min-h-[300px]">
        {activeTab === 'cuotas' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Pago</th>
                  <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {prestamo.cuotas.map((cuota) => (
                  <tr key={cuota.numero} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">{cuota.numero}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{cuota.fecha}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                      {formatCurrency(cuota.monto)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase border", getCuotaEstadoColor(cuota.estado))}>
                        {cuota.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                      {cuota.fechaPago || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <span className="text-xs text-slate-300 font-mono">#{cuota.numero.toString().padStart(3, '0')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" />
                Detalles del Producto
              </h3>
              <dl className="space-y-4">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-xs font-bold text-slate-400">Descripción</dt>
                  <dd className="text-sm font-bold text-slate-700">{prestamo.producto || 'N/A'}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                Indicadores
              </h3>
              <dl className="space-y-4">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-xs font-bold text-slate-400">Tasa de Interés</dt>
                  <dd className="text-sm font-bold text-slate-700">{prestamo.tasaInteres}%</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-xs font-bold text-slate-400">Monto Total a Pagar</dt>
                  <dd className="text-sm font-bold text-slate-700">{formatCurrency(prestamo.montoTotal)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'documentos' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
             {prestamo.fotos && prestamo.fotos.length > 0 ? (
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {prestamo.fotos.map((foto, index) => (
                   <div key={index} className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative group">
                     {/* Placeholder real de imagen */}
                     <div className="w-full h-full flex items-center justify-center text-slate-400">
                       <ImageIcon className="h-8 w-8" />
                     </div>
                     {/* Overlay */}
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <button className="text-white text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors">
                         Ver
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-12">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                   <ImageIcon className="h-8 w-8" />
                 </div>
                 <h3 className="text-sm font-bold text-slate-900">Sin documentos</h3>
                 <p className="text-xs text-slate-500 mt-1">No hay fotos o documentos adjuntos a este préstamo</p>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
