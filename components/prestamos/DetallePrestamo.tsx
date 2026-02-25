'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, User, FileText, TrendingUp, Package, Image as ImageIcon, ChevronRight, ChevronLeft, Clock, BarChart3 } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import ClientePortalModal from '@/components/cliente/ClientePortalModal';

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
};

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
  interesTotal?: number;
  capitalPagado?: number;
  interesPagado?: number;
  duracion: string;
  frecuencia: string;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: 'ACTIVO' | 'PAGADO' | 'EN_MORA' | 'PENDIENTE' | 'PENDIENTE_APROBACION' | string;
  tipoAmortizacion?: 'FRANCESA' | 'INTERES_SIMPLE';
  tipoPrestamo?: 'EFECTIVO' | 'ARTICULO' | string;
  cuotaInicial?: number;
  producto?: string;
  productoInfo?: {
    marca?: string;
    modelo?: string;
    serie?: string;
    categoria?: string;
  };
  garantia?: string;
  fotos?: string[];
  cuotas: {
    numero: number;
    fecha: string;
    monto: number;
    montoCapital?: number;
    montoInteres?: number;
    estado: string; // Permitir cualquier string para manejar variaciones de enum
    fechaPago?: string;
  }[];
}

interface DetallePrestamoProps {
  prestamo: PrestamoDetalle;
}

export default function DetallePrestamo({ prestamo }: DetallePrestamoProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'cuotas' | 'documentos'>('cuotas');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [cuotaPage] = useState(1);
  const CUOTAS_PER_PAGE = Number.MAX_SAFE_INTEGER;

  const isArticle = prestamo.tipoPrestamo?.toUpperCase() === 'ARTICULO';

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVO': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      case 'PAGADO': case 'PAGADA': return 'text-blue-700 bg-blue-50 border border-blue-100';
      case 'EN_MORA': return 'text-rose-700 bg-rose-50 border border-rose-100';
      case 'PENDIENTE': 
      case 'PENDIENTE_APROBACION':
        return 'text-amber-900 bg-amber-100 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)] animate-pulse';
      default: return 'text-slate-600 bg-slate-50 border border-slate-100';
    }
  };

  const getCuotaEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PAGADO': case 'PAGADA': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      case 'PENDIENTE': return 'text-slate-600 bg-slate-50 border border-slate-100';
      case 'PARCIAL': return 'text-amber-700 bg-amber-50 border border-amber-100';
      case 'VENCIDO': case 'VENCIDA': return 'text-rose-700 bg-rose-50 border border-rose-100';
      default: return 'text-slate-600 bg-slate-50 border border-slate-100';
    }
  };

  const montoAbonado = prestamo.montoTotal - prestamo.saldoPendiente;
  const progresoPorcentaje = prestamo.montoTotal > 0 ? Math.round((montoAbonado / prestamo.montoTotal) * 100) : 0;

  // Calcular saldo restante acumulado por cuota y detectar cuota actual
  const cuotasConSaldo = useMemo(() => {
    return prestamo.cuotas.reduce((acc: any[], c) => {
      const prevSaldo: number = acc.length === 0 ? prestamo.montoPrestamo : acc[acc.length - 1].saldoRestante;
      const capital = c.montoCapital ?? 0;
      const esPagada = c.estado === 'PAGADO' || c.estado === 'PAGADA';
      const newSaldo = esPagada ? Math.max(0, prevSaldo - capital) : prevSaldo;
      acc.push({ ...c, saldoRestante: Math.round(newSaldo * 100) / 100 });
      return acc;
    }, []);
  }, [prestamo.cuotas, prestamo.montoPrestamo]);

  const cuotaActual = useMemo(() => {
    const pendiente = cuotasConSaldo.find((c) => {
      const s = c.estado;
      return s === 'PENDIENTE' || s === 'PARCIAL' || s === 'VENCIDO' || s === 'VENCIDA';
    });
    return pendiente || cuotasConSaldo[cuotasConSaldo.length - 1];
  }, [cuotasConSaldo]);

  const cuotasPagadas = prestamo.cuotas.filter((c) => c.estado === 'PAGADO' || c.estado === 'PAGADA').length;
  const totalCuotas = prestamo.cuotas.length;
  const progresoCuotas = totalCuotas > 0 ? Math.round((cuotasPagadas / totalCuotas) * 100) : 0;

  return (
    <div className="w-full p-6 md:p-8 space-y-8">
      {/* 1. Header: Datos del Cliente (Full Width) */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <User className="w-32 h-32 text-slate-900" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
             <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-2xl shadow-sm border",
                  isArticle ? "bg-orange-50 border-orange-100 text-orange-600" : "bg-blue-50 border-blue-100 text-blue-600"
                )}>
                  {isArticle ? <Package className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                </div>
                <div>
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                     {isArticle ? 'Crédito de Artículo' : 'Préstamo de Efectivo'}
                   </h3>
                   <button onClick={() => setShowClienteModal(true)} className="group flex items-center gap-2 text-left">
                     <h2 className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                       {prestamo.clienteNombre}
                     </h2>
                     <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                   </button>
                </div>
             </div>
             <span className={cn("px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border", getEstadoColor(prestamo.estado))}>
                {prestamo.estado === 'PENDIENTE_APROBACION' ? 'Pendiente de Aprobación' : (prestamo.estado || '').replace(/_/g, ' ')}
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
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isArticle ? 'Monto Financiado' : 'Monto Prestado'}</span>
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

          {/* Interés Total */}
          <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between h-28">
             <span className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest">Interés Total</span>
             <p className="text-2xl font-bold text-amber-700 tracking-tight">{formatCurrency(isArticle ? 0 : (prestamo.interesTotal || 0))}</p>
          </div>

          {/* Capital Pagado */}
          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between h-28">
             <span className="text-[10px] font-black text-blue-600/70 uppercase tracking-widest">Capital Pagado</span>
             <p className="text-2xl font-bold text-blue-700 tracking-tight">{formatCurrency(prestamo.capitalPagado || 0)}</p>
          </div>

          {/* Interés Pagado */}
          <div className="bg-violet-50/50 p-5 rounded-2xl border border-violet-100 shadow-sm flex flex-col justify-between h-28">
             <span className="text-[10px] font-black text-violet-600/70 uppercase tracking-widest">Interés Pagado</span>
             <p className="text-2xl font-bold text-violet-700 tracking-tight">{formatCurrency(isArticle ? 0 : (prestamo.interesPagado || 0))}</p>
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
                   <span className="text-lg font-bold text-slate-900 block leading-none mt-1">{formatDate(prestamo.fechaInicio)}</span>
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
                   <span className="text-lg font-bold text-slate-900 block leading-none mt-1">{formatDate(prestamo.fechaVencimiento)}</span>
                </div>
             </div>
          </div>

          {/* Cuota Inicial (Only for Articles) */}
          {isArticle && (
          <div className="bg-orange-50/70 p-5 rounded-2xl border border-orange-200 shadow-sm flex flex-col justify-between h-24">
             <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Cuota Inicial</span>
             <p className="text-lg font-bold text-orange-700 tracking-tight">{formatCurrency(prestamo.cuotaInicial || 0)}</p>
          </div>
          )}
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
          <div className="space-y-4">
            {/* Tarjeta de Amortización - Cuota Actual */}
            {cuotaActual && (
              <div className="bg-white border-2 border-blue-100 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 opacity-[0.03] pointer-events-none">
                  <BarChart3 className="w-40 h-40 -mt-4 -mr-4 text-blue-600" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          {prestamo.tipoAmortizacion === 'FRANCESA' ? 'Amortización' : 'Plan de Pagos'}
                        </h4>
                        <p className="text-sm font-bold text-slate-900">Cuota #{cuotaActual.numero} de {totalCuotas}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide",
                      (cuotaActual.estado === 'VENCIDO' || cuotaActual.estado === 'VENCIDA') ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                      cuotaActual.estado === 'PARCIAL' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      (cuotaActual.estado === 'PAGADO' || cuotaActual.estado === 'PAGADA') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      'bg-blue-100 text-blue-700 border border-blue-200'
                    )}>
                      {(cuotaActual.estado === 'PAGADO' || cuotaActual.estado === 'PAGADA') ? 'Completado' : (cuotaActual.estado === 'VENCIDO' || cuotaActual.estado === 'VENCIDA') ? 'Vencida' : 'Próxima cuota'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Próxima Cuota</span>
                      <span className="text-sm font-bold text-slate-900">{formatDate(cuotaActual.fecha)}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cuota</span>
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(cuotaActual.monto)}</span>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Capital</span>
                      <span className="text-lg font-bold text-blue-700">{cuotaActual.montoCapital != null ? formatCurrency(cuotaActual.montoCapital) : '-'}</span>
                    </div>
                    <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
                      <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Interés</span>
                      <span className="text-lg font-bold text-violet-700">{cuotaActual.montoInteres != null ? formatCurrency(cuotaActual.montoInteres) : '-'}</span>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Saldo Capital</span>
                      <span className="text-lg font-bold text-emerald-700">{formatCurrency(cuotaActual.saldoRestante)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progreso</span>
                      <span className="text-xs font-bold text-slate-700">{cuotasPagadas}/{totalCuotas} cuotas — {progresoCuotas}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progresoCuotas}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de Amortización */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/50">
                <tr>
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</th>
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuota</th>
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Capital</th>
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Interés</th>
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo</th>
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Pago</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {cuotasConSaldo.map((cuota) => {
                    const esCuotaActual = cuotaActual && cuota.numero === cuotaActual.numero;
                    return (
                  <tr key={cuota.numero} className={cn(
                    "transition-colors group",
                    esCuotaActual ? "bg-blue-50/60 ring-1 ring-inset ring-blue-200" : "hover:bg-slate-50"
                  )}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-500">
                      {esCuotaActual ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          {cuota.numero}
                        </span>
                      ) : cuota.numero}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 font-medium">{formatDate(cuota.fecha)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-900">
                      {formatCurrency(cuota.monto)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-700 font-medium">
                      {cuota.montoCapital != null ? formatCurrency(cuota.montoCapital) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-violet-700 font-medium">
                      {cuota.montoInteres != null ? formatCurrency(cuota.montoInteres) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-600">
                      {formatCurrency(cuota.saldoRestante)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase border", getCuotaEstadoColor(cuota.estado))}>
                        {cuota.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-500">
                      {cuota.fechaPago ? formatDate(cuota.fechaPago) : '—'}
                    </td>
                  </tr>
                    );
                  })}
              </tbody>
            </table>

            {/* Paginador de cuotas removido: se muestran todas las cuotas */}
            </div>
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
                  <dt className="text-xs font-bold text-slate-400">Producto / Artículo</dt>
                  <dd className="text-sm font-bold text-slate-700">{prestamo.producto || 'N/A'}</dd>
                </div>
                {prestamo.productoInfo && (
                  <>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <dt className="text-xs font-bold text-slate-400">Marca</dt>
                      <dd className="text-sm font-bold text-slate-700">{prestamo.productoInfo.marca || '—'}</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <dt className="text-xs font-bold text-slate-400">Modelo</dt>
                      <dd className="text-sm font-bold text-slate-700">{prestamo.productoInfo.modelo || '—'}</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <dt className="text-xs font-bold text-slate-400">Serie / IMEI</dt>
                      <dd className="text-sm font-bold text-slate-700">{prestamo.productoInfo.serie || '—'}</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <dt className="text-xs font-bold text-slate-400">Categoría</dt>
                      <dd className="text-sm font-bold text-slate-700">{prestamo.productoInfo.categoria || '—'}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                Indicadores
              </h3>
              <dl className="space-y-4">
                {!isArticle && (
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <dt className="text-xs font-bold text-slate-400">Tasa de Interés</dt>
                    <dd className="text-sm font-bold text-slate-700">{prestamo.tasaInteres}%</dd>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-xs font-bold text-slate-400">{isArticle ? 'Precio de Venta' : 'Monto Total a Pagar'}</dt>
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

      {showClienteModal && (
        <ClientePortalModal
          clientId={prestamo.clienteId}
          onClose={() => setShowClienteModal(false)}
        />
      )}
    </div>
  );
}
