'use client';

import React, { useState } from 'react';
import {
  User, Phone, Mail, MapPin, Calendar, FileText,
  DollarSign, TrendingUp, AlertCircle, CheckCircle,
  MessageSquare,
  CreditCard, Filter,
  Plus, ExternalLink,
  Camera,
  Image as ImageIcon,
  Map as MapIcon
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ExportButton } from '@/components/ui/ExportButton';
import DetallePrestamoModal from '@/components/prestamos/DetallePrestamoModal';

// Interfaces alineadas con Prisma y el Dominio
export type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
export type EstadoAprobacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';
export type EstadoPrestamo = 'BORRADOR' | 'PENDIENTE_APROBACION' | 'ACTIVO' | 'EN_MORA' | 'PAGADO' | 'INCUMPLIDO' | 'PERDIDA';

export interface Cliente {
  id: string;
  codigo: string;
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  telefono: string;
  direccion: string | null;
  referencia: string | null;
  nivelRiesgo: NivelRiesgo;
  puntaje: number;
  enListaNegra: boolean;
  estadoAprobacion: EstadoAprobacion;
  // Campos auxiliares para UI
  fechaRegistro: string;
  ocupacion?: string;
  avatarColor?: string;
  ruta?: string;
  fotos?: string[];
}

export interface Prestamo {
  id: string;
  producto: string;
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
  cuotasTotales: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  fechaInicio: string;
  fechaVencimiento: string;
  proximoPago: string;
  estado: EstadoPrestamo;
  tasaInteres: number;
  diasMora?: number;
  moraAcumulada?: number;
  icono: React.ReactNode;
  categoria: string;
}

export interface Pago {
  id: string;
  fecha: string;
  monto: number;
  cuota: number;
  metodo: string;
  estado: 'confirmado' | 'pendiente' | 'anulado';
  referencia?: string;
  icono: React.ReactNode;
}

export interface Comentario {
  id: string;
  fecha: string;
  autor: string;
  rolAutor: string;
  contenido: string;
  tipo: 'observacion' | 'llamada' | 'visita' | 'incidencia';
  avatarColor: string;
}

interface ClienteDetalleProps {
  cliente: Cliente;
  prestamos: Prestamo[];
  pagos: Pago[];
  comentarios: Comentario[];
  onContact?: () => void;
  onNewLoan?: () => void;
}

const ClienteDetalleElegante: React.FC<ClienteDetalleProps> = ({
  cliente,
  prestamos,
  pagos,
  comentarios,
}) => {
  const [activeTab, setActiveTab] = useState<'resumen' | 'prestamos' | 'pagos' | 'comentarios' | 'fotos'>('resumen');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [idPrestamoAVer, setIdPrestamoAVer] = useState<string | null>(null);

  const calcularTotales = () => {
    const totalPrestamos = prestamos.reduce((sum, p) => sum + p.montoTotal, 0);
    const totalPagado = prestamos.reduce((sum, p) => sum + p.montoPagado, 0);
    const totalPendiente = prestamos.reduce((sum, p) => sum + p.montoPendiente, 0);
    const prestamosActivos = prestamos.filter(p => p.estado === 'ACTIVO' || p.estado === 'EN_MORA').length;
    const prestamosEnMora = prestamos.filter(p => p.estado === 'EN_MORA').length;
    const totalMora = prestamos.reduce((sum, p) => sum + (p.moraAcumulada || 0), 0);
    
    return {
      totalPrestamos,
      totalPagado,
      totalPendiente,
      prestamosActivos,
      prestamosEnMora,
      totalMora
    };
  };

  const totales = calcularTotales();

  // Función para obtener color de estado de préstamo
  const getEstadoColor = (estado: EstadoPrestamo) => {
    switch(estado) {
      case 'ACTIVO': return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'EN_MORA': return 'text-rose-700 bg-rose-50 border border-rose-200';
      case 'PENDIENTE_APROBACION': return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'PAGADO': return 'text-blue-700 bg-blue-50 border border-blue-200';
      case 'INCUMPLIDO': return 'text-slate-700 bg-slate-50 border border-slate-200';
      default: return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  // Función para obtener color de riesgo
  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch(riesgo) {
      case 'VERDE': return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'AMARILLO': return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'ROJO': return 'text-rose-700 bg-rose-50 border border-rose-200';
      case 'LISTA_NEGRA': return 'text-white bg-slate-900 border border-slate-900';
      default: return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  // Función para obtener porcentaje de progreso
  const getProgressPercentage = (pagado: number, total: number) => {
    if (total === 0) return 0;
    return (pagado / total) * 100;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>
      <div className="relative z-10">
      {/* Header minimalista */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 ${cliente.avatarColor || 'bg-primary'}`}>
                <User className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  <span className="text-blue-600">{cliente.nombres}</span> <span className="text-orange-500">{cliente.apellidos}</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                    {cliente.codigo}
                  </span>
                  <span className="text-slate-400 text-sm">•</span>
                  <span className="text-slate-500 text-sm font-medium">Cédula de Ciudadanía: {cliente.dni}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botones de acción removidos por requerimiento */}
          </div>
        </div>

        {/* Información rápida */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
              <Phone className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teléfono</p>
              <p className="font-bold text-slate-700">{cliente.telefono}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
              <Mail className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p>
              <p className="font-bold text-slate-700 break-all text-xs lg:text-sm">{cliente.correo || 'No registrado'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
              <MapPin className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dirección</p>
              <p className="font-bold text-slate-700 break-words">{cliente.direccion || 'No registrada'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
              <MapIcon className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ruta</p>
              <p className="font-bold text-slate-700">{cliente.ruta || 'No asignada'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Tarjeta de crédito total */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Crédito Total</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(totales.totalPrestamos)}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRiesgoColor(cliente.nivelRiesgo)}`}>
                Riesgo {cliente.nivelRiesgo}
              </span>
              <div className="text-xs font-bold text-slate-400">Score: {cliente.puntaje}/100</div>
            </div>
          </div>

          {/* Tarjeta de saldo pendiente */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Pendiente</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">${totales.totalPendiente.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center font-medium">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                {formatCurrency(totales.totalPagado)} pagado
              </div>
              <div className="text-xs font-bold text-green-600">
                {(getProgressPercentage(totales.totalPagado, totales.totalPrestamos)).toFixed(1)}%
              </div>
            </div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
              <div 
                className="h-full bg-slate-900 rounded-full"
                style={{ width: `${getProgressPercentage(totales.totalPagado, totales.totalPrestamos)}%` }}
              />
            </div>
          </div>

          {/* Tarjeta de préstamos activos */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Préstamos Activos</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{totales.prestamosActivos}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cliente.estadoAprobacion === 'APROBADO' ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                {cliente.estadoAprobacion}
              </span>
              {totales.prestamosEnMora > 0 && (
                <div className="text-xs font-bold text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {totales.prestamosEnMora} en mora
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta de mora acumulada */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mora Acumulada</p>
                <p className="text-3xl font-bold text-red-600 mt-2">${totales.totalMora.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="text-xs font-medium text-slate-500">
              {totales.prestamosEnMora} préstamos con retraso
            </div>
          </div>
        </div>
      </div>

      {/* Navegación elegante por pestañas */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-slate-100/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 max-w-2xl">
          <button
            onClick={() => setActiveTab('prestamos')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'prestamos' 
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Préstamos
          </button>
          <button
            onClick={() => setActiveTab('pagos')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'pagos' 
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Pagos
          </button>
          <button
            onClick={() => setActiveTab('comentarios')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'comentarios' 
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Comentarios
          </button>
          <button
            onClick={() => setActiveTab('fotos')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'fotos' 
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Camera className="w-4 h-4" />
            Fotos
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Contenido de préstamos */}
        {activeTab === 'prestamos' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Préstamos Activos</h2>
                <p className="text-slate-500 text-sm font-medium">{prestamos.length} préstamos registrados</p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200 text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtrar
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {prestamos.map((prestamo) => (
                <div key={prestamo.id} className="group p-6 rounded-2xl border border-slate-200 hover:border-blue-500/30 hover:shadow-md transition-all duration-300 bg-white/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                        {prestamo.icono}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-slate-900">{prestamo.producto}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getEstadoColor(prestamo.estado)}`}>
                            {prestamo.estado.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {prestamo.fechaInicio} - {prestamo.fechaVencimiento}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600">ID: {prestamo.id}</span>
                        </div>
                        
                        {/* Progreso del préstamo */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs mb-1 font-medium">
                            <span className="text-slate-500">Progreso de pago</span>
                            <span className="font-bold text-slate-900">
                              {Math.round(getProgressPercentage(prestamo.montoPagado, prestamo.montoTotal))}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                            <div 
                              className="h-full bg-slate-900 rounded-full transition-all duration-500"
                              style={{ width: `${getProgressPercentage(prestamo.montoPagado, prestamo.montoTotal)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-6 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Cuotas Pagadas</p>
                            <p className="font-bold text-slate-700 mt-1">{prestamo.cuotasPagadas}/{prestamo.cuotasTotales}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Monto Pendiente</p>
                            <p className="font-bold text-slate-900 mt-1">${prestamo.montoPendiente}</p>
                          </div>
                          {prestamo.diasMora ? (
                             <div>
                               <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Días Mora</p>
                               <p className="font-bold text-red-600 mt-1">{prestamo.diasMora} días</p>
                             </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(prestamo.montoTotal)}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Monto Total</p>
                      <button 
                        onClick={() => setIdPrestamoAVer(prestamo.id)}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-bold shadow-sm"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contenido de pagos */}
        {activeTab === 'pagos' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Historial de Pagos</h2>
                <p className="text-slate-500 text-sm font-medium">{pagos.length} transacciones registradas</p>
              </div>
              <ExportButton label="Exportar" />
            </div>

            <div className="space-y-3">
              {pagos.map((pago) => (
                <div key={pago.id} className="group p-5 rounded-2xl border border-slate-200 hover:border-blue-500/30 hover:shadow-sm transition-all duration-200 bg-white/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                        {pago.icono}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-slate-900">Pago #{pago.id}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            pago.estado === 'confirmado' ? 'bg-green-50 text-green-700 border-green-200' :
                            pago.estado === 'pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {pago.estado.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                          <span>{pago.fecha}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-bold border border-slate-200">
                            Cuota {pago.cuota}
                          </span>
                          <span>{pago.metodo}</span>
                          {pago.referencia && (
                            <span className="text-slate-400">Ref: {pago.referencia}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">${pago.monto}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto</p>
                      </div>
                      <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contenido de comentarios */}
        {activeTab === 'comentarios' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Seguimiento y Comentarios</h2>
                <p className="text-slate-500 text-sm font-medium">{comentarios.length} interacciones registradas</p>
              </div>
              <button 
                onClick={() => setIsNoteModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Nuevo Comentario
              </button>
            </div>

            <div className="space-y-6">
              {comentarios.map((comentario) => (
                <div key={comentario.id} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-md ${comentario.avatarColor}`}>
                    {comentario.autor.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="bg-slate-50 p-5 rounded-2xl rounded-tl-none border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{comentario.autor}</span>
                          <span className="text-xs px-2 py-0.5 bg-slate-200 rounded-full text-slate-600 font-bold">{comentario.rolAutor}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{comentario.fecha}</span>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{comentario.contenido}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                          comentario.tipo === 'llamada' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          comentario.tipo === 'visita' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          comentario.tipo === 'incidencia' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {comentario.tipo.charAt(0).toUpperCase() + comentario.tipo.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Contenido de Fotos */}
        {activeTab === 'fotos' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Galería del Cliente</h2>
                <p className="text-slate-500 text-sm font-medium">Documentos y fotografías de verificación</p>
              </div>
              <button className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all duration-200 text-sm font-bold flex items-center gap-2 active:scale-95 shadow-lg shadow-black/10">
                <Camera className="w-4 h-4" />
                Subir Foto
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {(cliente.fotos && cliente.fotos.length > 0) ? (
                cliente.fotos.map((foto, idx) => (
                  <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 transition-all hover:shadow-xl">
                    <img src={foto} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <p className="text-white text-xs font-bold font-sans">Verificación {idx + 1}</p>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50/50">
                    <ImageIcon className="w-8 h-8 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Foto de Perfil</p>
                  </div>
                  <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50/50">
                    <ImageIcon className="w-8 h-8 opacity-20" />
                    <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest">CC Frente</p>
                  </div>
                </div>
                
                {/* ID Back Placeholder */}
                <div className="aspect-[1.58/1] bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 p-4 text-slate-400">
                  <ImageIcon className="w-8 h-8" />
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest">CC Reverso</p>
                  </div>
                </div>
                  <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50/50">
                    <ImageIcon className="w-8 h-8 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Fachada Domicilio</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer con estadísticas */}
      <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-500 font-medium px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-100"></div>
          <span>Cliente activo desde {cliente.fechaRegistro}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-100"></div>
          <span>{prestamos.length} préstamos gestionados</span>
        </div>
      </div>
      </div>

      {/* Modal de Nuevo Comentario */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 scrollbar-hide">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Nuevo Comentario</h3>
                <p className="text-sm text-slate-500">Añada una observación sobre el cliente</p>
             </div>
             <div className="p-6">
                <textarea 
                  className="w-full h-32 p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 outline-none text-sm resize-none text-slate-900 font-medium"
                  placeholder="Escriba aquí sus observaciones..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="flex gap-3 mt-6">
                   <button 
                     onClick={() => setIsNoteModalOpen(false)}
                     className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={() => {
                       console.log('Sending note:', newNote);
                       setIsNoteModalOpen(false);
                       setNewNote('');
                     }}
                     className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
                   >
                     Guardar Nota
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {idPrestamoAVer && (
        <DetallePrestamoModal
          id={idPrestamoAVer}
          onClose={() => setIdPrestamoAVer(null)}
        />
      )}
    </div>
  );
};

export default ClienteDetalleElegante;
