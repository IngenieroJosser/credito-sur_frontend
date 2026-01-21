'use client';

import React, { useState } from 'react';
import { 
  User, Phone, Mail, MapPin, Calendar, FileText, 
  DollarSign, TrendingUp, AlertCircle, CheckCircle,
  Edit, MessageSquare, 
  Shield, CreditCard, PieChart, Filter,
  Plus, ExternalLink,
  BarChart,
  Download, Bell
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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
  rolUsuario?: string;
  onEdit?: () => void;
  onContact?: () => void;
  onNewLoan?: () => void;
}

const ClienteDetalleElegante: React.FC<ClienteDetalleProps> = ({ 
  cliente, 
  prestamos, 
  pagos, 
  comentarios,
  onEdit,
  onContact,
  onNewLoan
}) => {
  const [activeTab, setActiveTab] = useState<'prestamos' | 'pagos' | 'comentarios' | 'analitica'>('prestamos');

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
      case 'ACTIVO': return 'text-green-600 bg-green-50';
      case 'EN_MORA': return 'text-red-600 bg-red-50';
      case 'PENDIENTE_APROBACION': return 'text-amber-600 bg-amber-50';
      case 'PAGADO': return 'text-blue-600 bg-blue-50';
      case 'INCUMPLIDO': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Función para obtener color de riesgo
  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch(riesgo) {
      case 'VERDE': return 'text-green-600 bg-green-50';
      case 'AMARILLO': return 'text-amber-600 bg-amber-50';
      case 'ROJO': return 'text-red-600 bg-red-50';
      case 'LISTA_NEGRA': return 'text-white bg-gray-900';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Función para obtener porcentaje de progreso
  const getProgressPercentage = (pagado: number, total: number) => {
    if (total === 0) return 0;
    return (pagado / total) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      {/* Header minimalista */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${cliente.avatarColor || 'bg-primary'}`}>
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-gray-900">{cliente.nombres} {cliente.apellidos}</h1>
                <p className="text-gray-500 text-sm">Código: {cliente.codigo} • DNI: {cliente.dni}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onEdit}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
            <button 
              onClick={onContact}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Contactar
            </button>
          </div>
        </div>

        {/* Información rápida */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
            <div className="p-2 rounded-lg bg-blue-50">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Teléfono</p>
              <p className="font-medium">{cliente.telefono}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
            <div className="p-2 rounded-lg bg-blue-50">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium truncate">{cliente.correo || 'No registrado'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
            <div className="p-2 rounded-lg bg-blue-50">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dirección</p>
              <p className="font-medium truncate">{cliente.direccion || 'No registrada'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
            <div className="p-2 rounded-lg bg-blue-50">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Registro</p>
              <p className="font-medium">{cliente.fechaRegistro}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Tarjeta de crédito total */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Crédito Total</p>
                <p className="text-2xl font-light text-gray-900 mt-1">{formatCurrency(totales.totalPrestamos)}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiesgoColor(cliente.nivelRiesgo)}`}>
                Riesgo {cliente.nivelRiesgo}
              </span>
              <div className="text-xs text-gray-500">Score: {cliente.puntaje}/100</div>
            </div>
          </div>

          {/* Tarjeta de saldo pendiente */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Saldo Pendiente</p>
                <p className="text-2xl font-light text-primary mt-1">${totales.totalPendiente.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                {formatCurrency(totales.totalPagado)} pagado
              </div>
              <div className="text-xs font-medium text-green-600">
                {(getProgressPercentage(totales.totalPagado, totales.totalPrestamos)).toFixed(1)}%
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full"
                style={{ width: `${getProgressPercentage(totales.totalPagado, totales.totalPrestamos)}%` }}
              />
            </div>
          </div>

          {/* Tarjeta de préstamos activos */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Préstamos Activos</p>
                <p className="text-2xl font-light text-gray-900 mt-1">{totales.prestamosActivos}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${cliente.estadoAprobacion === 'APROBADO' ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'}`}>
                {cliente.estadoAprobacion}
              </span>
              {totales.prestamosEnMora > 0 && (
                <div className="text-xs font-medium text-red-600">
                  {totales.prestamosEnMora} en mora
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta de mora acumulada */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Mora Acumulada</p>
                <p className="text-2xl font-light text-red-600 mt-1">${totales.totalMora.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {totales.prestamosEnMora} préstamos con retraso
            </div>
          </div>
        </div>
      </div>

      {/* Navegación elegante por pestañas */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-white rounded-2xl p-2 border border-gray-200 max-w-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('prestamos')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'prestamos' 
                ? 'bg-gray-100 text-primary shadow-inner' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Préstamos
          </button>
          <button
            onClick={() => setActiveTab('pagos')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'pagos' 
                ? 'bg-gray-100 text-primary shadow-inner' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Pagos
          </button>
          <button
            onClick={() => setActiveTab('comentarios')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'comentarios' 
                ? 'bg-gray-100 text-primary shadow-inner' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Comentarios
          </button>
          <button
            onClick={() => setActiveTab('analitica')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'analitica' 
                ? 'bg-gray-100 text-primary shadow-inner' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BarChart className="w-4 h-4" />
            Análisis
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Contenido de préstamos */}
        {activeTab === 'prestamos' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-light text-gray-900 mb-2">Préstamos Activos</h2>
                <p className="text-gray-500 text-sm">{prestamos.length} préstamos registrados</p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtrar
                </button>
                <button 
                  onClick={onNewLoan}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Préstamo
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {prestamos.map((prestamo) => (
                <div key={prestamo.id} className="group p-6 rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-blue-50 text-primary">
                        {prestamo.icono}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{prestamo.producto}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(prestamo.estado)}`}>
                            {prestamo.estado.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {prestamo.fechaInicio} - {prestamo.fechaVencimiento}
                          </span>
                          <span>ID: {prestamo.id}</span>
                        </div>
                        
                        {/* Progreso del préstamo */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Progreso de pago</span>
                            <span className="font-medium text-gray-900">
                              {Math.round(getProgressPercentage(prestamo.montoPagado, prestamo.montoTotal))}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${getProgressPercentage(prestamo.montoPagado, prestamo.montoTotal)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-6 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Cuotas Pagadas</p>
                            <p className="font-medium">{prestamo.cuotasPagadas}/{prestamo.cuotasTotales}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Monto Pendiente</p>
                            <p className="font-medium text-gray-900">${prestamo.montoPendiente}</p>
                          </div>
                          {prestamo.diasMora ? (
                             <div>
                               <p className="text-gray-500 text-xs">Días Mora</p>
                               <p className="font-medium text-red-600">{prestamo.diasMora} días</p>
                             </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-light text-gray-900">{formatCurrency(prestamo.montoTotal)}</p>
                      <p className="text-sm text-gray-500 mb-4">Monto Total</p>
                      <button className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
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
                <h2 className="text-xl font-light text-gray-900 mb-2">Historial de Pagos</h2>
                <p className="text-gray-500 text-sm">{pagos.length} transacciones registradas</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium text-gray-700 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>

            <div className="space-y-3">
              {pagos.map((pago) => (
                <div key={pago.id} className="group p-5 rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-blue-50 text-primary">
                        {pago.icono}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium text-gray-900">Pago #{pago.id}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            pago.estado === 'confirmado' ? 'bg-green-50 text-green-600' :
                            pago.estado === 'pendiente' ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {pago.estado.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{pago.fecha}</span>
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                            Cuota {pago.cuota}
                          </span>
                          <span>{pago.metodo}</span>
                          {pago.referencia && (
                            <span className="text-gray-400">Ref: {pago.referencia}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xl font-light text-gray-900">${pago.monto}</p>
                        <p className="text-sm text-gray-500">Monto</p>
                      </div>
                      <button className="p-2 text-gray-400 hover:text-primary transition-colors">
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
                <h2 className="text-xl font-light text-gray-900 mb-2">Seguimiento y Comentarios</h2>
                <p className="text-gray-500 text-sm">{comentarios.length} interacciones registradas</p>
              </div>
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                Nuevo Comentario
              </button>
            </div>

            <div className="space-y-6">
              {comentarios.map((comentario) => (
                <div key={comentario.id} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium ${comentario.avatarColor}`}>
                    {comentario.autor.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{comentario.autor}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">{comentario.rolAutor}</span>
                        </div>
                        <span className="text-xs text-gray-500">{comentario.fecha}</span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{comentario.contenido}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          comentario.tipo === 'llamada' ? 'bg-purple-50 text-purple-600' :
                          comentario.tipo === 'visita' ? 'bg-blue-50 text-blue-600' :
                          comentario.tipo === 'incidencia' ? 'bg-red-50 text-red-600' :
                          'bg-gray-100 text-gray-600'
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

        {/* Contenido de analítica */}
        {activeTab === 'analitica' && (
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-light text-gray-900 mb-2">Análisis de Riesgo</h2>
              <p className="text-gray-500 text-sm">Evaluación basada en comportamiento de pagos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Score Card */}
                <div className="p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50">
                  <h3 className="font-medium text-gray-900 mb-4">Score Crediticio</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-gray-200"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * cliente.puntaje) / 100}
                          className="text-primary"
                        />
                      </svg>
                      <span className="absolute text-2xl font-light text-gray-900">{cliente.puntaje}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">
                        El score se actualiza mensualmente basado en la puntualidad de pagos.
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${cliente.puntaje}%` }}
                          />
                        </div>
                        <span className="font-medium">{cliente.puntaje}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comportamiento de pago */}
                <div className="p-6 rounded-xl border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-4">Comportamiento de Pago</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Puntualidad</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full w-4/5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-xl border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-4">Acciones de Riesgo</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center group">
                      <Bell className="w-5 h-5 text-gray-600 group-hover:text-primary mb-2" />
                      <span className="text-sm font-medium">Recordatorio</span>
                    </button>
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center group">
                      <Shield className="w-5 h-5 text-gray-600 group-hover:text-primary mb-2" />
                      <span className="text-sm font-medium">Riesgo</span>
                    </button>
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center group">
                      <PieChart className="w-5 h-5 text-gray-600 group-hover:text-primary mb-2" />
                      <span className="text-sm font-medium">Análisis</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-xl border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-4">Referencias</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-gray-50">
                      <p className="font-medium">{cliente.referencia || 'No registrada'}</p>
                      <p className="text-xs text-gray-500 mt-2">Referencia Personal</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer con estadísticas */}
      <div className="mt-8 flex flex-wrap gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Cliente activo desde {cliente.fechaRegistro}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>{prestamos.length} préstamos gestionados</span>
        </div>
      </div>
    </div>
  );
};

export default ClienteDetalleElegante;
