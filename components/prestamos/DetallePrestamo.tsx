'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  User, 
  FileText,
  TrendingUp,
  ChevronRight,
  Package,
  Image as ImageIcon
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import Link from 'next/link';

export interface PrestamoDetalle {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteDni: string;
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

  return (
    <div className="w-full p-8 space-y-6">
      {/* Resumen Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={cn("px-3 py-1 rounded-full text-xs font-medium tracking-wide", getEstadoColor(prestamo.estado))}>
                  {prestamo.estado}
                </span>
                <span className="text-xs text-slate-400 font-mono">{prestamo.id}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {prestamo.producto ? prestamo.producto : 'Préstamo en Efectivo'}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 mb-1">Monto Total</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(prestamo.montoTotal)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500 mb-1">Capital Original</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(prestamo.montoPrestamo)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Saldo Pendiente</p>
              <p className="text-sm font-bold text-rose-600">{formatCurrency(prestamo.saldoPendiente)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Frecuencia</p>
              <p className="text-sm font-bold text-slate-900 capitalize">{prestamo.frecuencia}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Próximo Venc.</p>
              <p className="text-sm font-bold text-slate-900">
                {prestamo.cuotas.find(c => c.estado === 'PENDIENTE' || c.estado === 'VENCIDO')?.fecha || '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              Datos del Cliente
            </h3>
            <div className="space-y-3">
              <Link href={`/admin/clientes/${prestamo.clienteId}`} className="block group">
                <p className="text-xs text-slate-500">Nombre</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                    {prestamo.clienteNombre}
                  </p>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-700 transition-colors" />
                </div>
              </Link>
              <div>
                <p className="text-xs text-slate-500">CC</p>
                <p className="text-sm text-slate-700">{prestamo.clienteDni}</p>
              </div>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link 
              href={`/admin/pagos/registrar/${prestamo.clienteId}`}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] block text-center"
            >
              Registrar Pago
            </Link>
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
      <div className="min-h-[400px]">
        {activeTab === 'cuotas' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimiento</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Monto</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Pago</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {prestamo.cuotas.map((cuota) => (
                  <tr key={cuota.numero} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{cuota.numero}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{cuota.fecha}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                      {formatCurrency(cuota.monto)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold", getCuotaEstadoColor(cuota.estado))}>
                        {cuota.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {cuota.fechaPago || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-500" />
                Detalles del Producto
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Descripción</dt>
                  <dd className="mt-1 text-sm text-slate-900">{prestamo.producto || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Garantía</dt>
                  <dd className="mt-1 text-sm text-slate-900">{prestamo.garantia || 'Sin garantía específica'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Fecha de Creación</dt>
                  <dd className="mt-1 text-sm text-slate-900">{prestamo.fechaInicio}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-slate-500" />
                Indicadores Financieros
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Tasa de Interés</dt>
                  <dd className="mt-1 text-sm text-slate-900">{prestamo.tasaInteres}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Progreso de Pago</dt>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-900 rounded-full" 
                        style={{ width: `${((prestamo.montoTotal - prestamo.saldoPendiente) / prestamo.montoTotal) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {Math.round(((prestamo.montoTotal - prestamo.saldoPendiente) / prestamo.montoTotal) * 100)}%
                    </span>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'documentos' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
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
