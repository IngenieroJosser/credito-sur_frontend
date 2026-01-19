'use client';

import React, { useState } from 'react';
import { 
  User, Phone, Mail, MapPin, Calendar, FileText, 
  DollarSign, TrendingUp, AlertCircle, CheckCircle,
  Edit, Download, Printer, MessageSquare, 
  Shield, CreditCard, PieChart, Filter, MoreVertical,
  Plus, ExternalLink,
  BarChart,
  Smartphone, Zap, RefreshCw, Bell,
  CreditCard as CreditCardIcon
} from 'lucide-react';

// Interfaces refinadas
interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  identificacion: string;
  telefono: string;
  email: string;
  direccion: string;
  fechaRegistro: string;
  scoreCrediticio: number;
  estado: 'activo' | 'en_mora' | 'bloqueado' | 'completado';
  riesgo: 'bajo' | 'medio' | 'alto';
  limiteCredito: number;
  saldoDisponible: number;
  ingresosMensuales: number;
  ocupacion: string;
  referenciaPersonal?: string;
  telefonoReferencia?: string;
  avatarColor: string;
}

interface Prestamo {
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
  estado: 'activo' | 'atrasado' | 'moroso' | 'pagado' | 'refinanciado';
  tasaInteres: number;
  diasMora?: number;
  moraAcumulada?: number;
  icono: React.ReactNode;
  categoria: string;
}

interface Pago {
  id: string;
  fecha: string;
  monto: number;
  cuota: number;
  metodo: string;
  estado: 'confirmado' | 'pendiente' | 'anulado';
  referencia?: string;
  icono: React.ReactNode;
}

interface Comentario {
  id: string;
  fecha: string;
  autor: string;
  rolAutor: string;
  contenido: string;
  tipo: 'observacion' | 'llamada' | 'visita' | 'incidencia';
  avatarColor: string;
}

interface ClienteDetalleProps {
  clienteId: string;
  rolUsuario?: 'administrador' | 'coordinador' | 'supervisor' | 'cobrador' | 'contable';
}

const ClienteDetalleElegante: React.FC<ClienteDetalleProps> = ({ clienteId }) => {
  const [activeTab, setActiveTab] = useState<'prestamos' | 'pagos' | 'comentarios' | 'analitica'>('prestamos');
  
  // Datos del cliente con diseño minimalista
  const [cliente] = useState<Cliente>({
    id: clienteId,
    nombre: 'Carlos',
    apellido: 'Rodríguez',
    identificacion: '12.345.678',
    telefono: '+1 (555) 123-4567',
    email: 'c.rodriguez@email.com',
    direccion: 'Av. Principal 123, Sector Norte',
    fechaRegistro: '15 Mar 2022',
    scoreCrediticio: 78,
    estado: 'activo',
    riesgo: 'medio',
    limiteCredito: 15000,
    saldoDisponible: 5200,
    ingresosMensuales: 3500,
    ocupacion: 'Ingeniero de Sistemas',
    referenciaPersonal: 'María González',
    telefonoReferencia: '+1 (555) 987-6543',
    avatarColor: 'bg-gradient-to-br from-primary to-primary-light'
  });

  const [prestamos] = useState<Prestamo[]>([
    {
      id: 'PR-2023-001',
      producto: 'Refrigeradora Samsung',
      montoTotal: 1200,
      montoPagado: 720,
      montoPendiente: 480,
      cuotasTotales: 12,
      cuotasPagadas: 7,
      cuotasPendientes: 5,
      fechaInicio: '15/01/2023',
      fechaVencimiento: '15/12/2023',
      proximoPago: '15 Ago 2023',
      estado: 'activo',
      tasaInteres: 1.5,
      diasMora: 0,
      icono: <Smartphone className="w-5 h-5" />,
      categoria: 'Electrodomésticos'
    },
    {
      id: 'PR-2022-045',
      producto: 'Lavadora LG',
      montoTotal: 850,
      montoPagado: 850,
      montoPendiente: 0,
      cuotasTotales: 10,
      cuotasPagadas: 10,
      cuotasPendientes: 0,
      fechaInicio: '10/06/2022',
      fechaVencimiento: '10/03/2023',
      proximoPago: '-',
      estado: 'pagado',
      tasaInteres: 1.8,
      diasMora: 0,
      icono: <RefreshCw className="w-5 h-5" />,
      categoria: 'Electrodomésticos'
    },
    {
      id: 'PR-2023-012',
      producto: 'Cocina a Gas',
      montoTotal: 650,
      montoPagado: 325,
      montoPendiente: 325,
      cuotasTotales: 8,
      cuotasPagadas: 4,
      cuotasPendientes: 4,
      fechaInicio: '05/03/2023',
      fechaVencimiento: '05/10/2023',
      proximoPago: '05 Ago 2023',
      estado: 'atrasado',
      tasaInteres: 1.6,
      diasMora: 7,
      moraAcumulada: 12.50,
      icono: <Zap className="w-5 h-5" />,
      categoria: 'Electrodomésticos'
    }
  ]);

  const [pagos] = useState<Pago[]>([
    {
      id: 'PA-00123',
      fecha: '15 Jul 2023',
      monto: 100,
      cuota: 7,
      metodo: 'Transferencia',
      estado: 'confirmado',
      referencia: 'TRX-789456',
      icono: <CreditCardIcon className="w-5 h-5" />
    },
    {
      id: 'PA-00122',
      fecha: '15 Jun 2023',
      monto: 100,
      cuota: 6,
      metodo: 'Efectivo',
      estado: 'confirmado',
      icono: <DollarSign className="w-5 h-5" />
    },
    {
      id: 'PA-00121',
      fecha: '15 May 2023',
      monto: 100,
      cuota: 5,
      metodo: 'Tarjeta',
      estado: 'confirmado',
      referencia: 'TARJ-123456',
      icono: <CreditCardIcon className="w-5 h-5" />
    }
  ]);

  const [comentarios] = useState<Comentario[]>([
    {
      id: 'COM-001',
      fecha: '10 Ago 2023',
      autor: 'Ana Martínez',
      rolAutor: 'Supervisor',
      contenido: 'Cliente cumplió acuerdo de pago. Se comprometió a ponerse al día antes del 20/08.',
      tipo: 'llamada',
      avatarColor: 'bg-gradient-to-br from-purple-500 to-pink-500'
    },
    {
      id: 'COM-002',
      fecha: '05 Ago 2023',
      autor: 'Roberto Sánchez',
      rolAutor: 'Cobrador',
      contenido: 'Visita domiciliaria realizada. Cliente presentó justificativo médico por retraso.',
      tipo: 'visita',
      avatarColor: 'bg-gradient-to-br from-blue-500 to-cyan-500'
    }
  ]);

  const calcularTotales = () => {
    const totalPrestamos = prestamos.reduce((sum, p) => sum + p.montoTotal, 0);
    const totalPagado = prestamos.reduce((sum, p) => sum + p.montoPagado, 0);
    const totalPendiente = prestamos.reduce((sum, p) => sum + p.montoPendiente, 0);
    const prestamosActivos = prestamos.filter(p => p.estado === 'activo' || p.estado === 'atrasado').length;
    const prestamosEnMora = prestamos.filter(p => p.estado === 'atrasado' || p.estado === 'moroso').length;
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

  // Función para obtener color de estado
  const getEstadoColor = (estado: string) => {
    switch(estado) {
      case 'activo': return 'text-green-600 bg-green-50';
      case 'atrasado': return 'text-amber-600 bg-amber-50';
      case 'moroso': return 'text-red-600 bg-red-50';
      case 'pagado': return 'text-blue-600 bg-blue-50';
      case 'refinanciado': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Función para obtener color de riesgo
  const getRiesgoColor = (riesgo: string) => {
    switch(riesgo) {
      case 'bajo': return 'text-green-600 bg-green-50';
      case 'medio': return 'text-amber-600 bg-amber-50';
      case 'alto': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Función para obtener porcentaje de progreso
  const getProgressPercentage = (pagado: number, total: number) => {
    return (pagado / total) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-25 to-gray-50 p-4 md:p-8">
      {/* Header minimalista */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${cliente.avatarColor}`}>
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-gray-900">{cliente.nombre} {cliente.apellido}</h1>
                <p className="text-gray-500 text-sm">ID: {cliente.id} • CC: {cliente.identificacion}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium text-gray-700 flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Editar
            </button>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm">
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
              <p className="font-medium truncate">{cliente.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
            <div className="p-2 rounded-lg bg-blue-50">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dirección</p>
              <p className="font-medium truncate">{cliente.direccion}</p>
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
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Crédito Total</p>
                <p className="text-2xl font-light text-gray-900 mt-1">${totales.totalPrestamos.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiesgoColor(cliente.riesgo)}`}>
                Riesgo {cliente.riesgo}
              </span>
              <div className="text-xs text-gray-500">Score: {cliente.scoreCrediticio}/100</div>
            </div>
          </div>

          {/* Tarjeta de saldo pendiente */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Saldo Pendiente</p>
                <p className="text-2xl font-light text-primary mt-1">${totales.totalPendiente.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                ${totales.totalPagado.toLocaleString()} pagado
              </div>
              <div className="text-xs font-medium text-green-600">
                {(getProgressPercentage(totales.totalPagado, totales.totalPrestamos)).toFixed(1)}%
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
                style={{ width: `${getProgressPercentage(totales.totalPagado, totales.totalPrestamos)}%` }}
              />
            </div>
          </div>

          {/* Tarjeta de préstamos activos */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Préstamos Activos</p>
                <p className="text-2xl font-light text-gray-900 mt-1">{totales.prestamosActivos}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(cliente.estado)}`}>
                {cliente.estado.toUpperCase()}
              </span>
              {totales.prestamosEnMora > 0 && (
                <div className="text-xs font-medium text-red-600">
                  {totales.prestamosEnMora} en mora
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta de mora acumulada */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Mora Acumulada</p>
                <p className="text-2xl font-light text-red-600 mt-1">${totales.totalMora.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100">
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
        <div className="flex space-x-1 bg-white/50 backdrop-blur-sm rounded-2xl p-2 border border-gray-200 max-w-2xl">
          <button
            onClick={() => setActiveTab('prestamos')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'prestamos' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Préstamos
          </button>
          <button
            onClick={() => setActiveTab('pagos')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'pagos' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Pagos
          </button>
          <button
            onClick={() => setActiveTab('comentarios')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'comentarios' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Comentarios
          </button>
          <button
            onClick={() => setActiveTab('analitica')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1 justify-center ${
              activeTab === 'analitica' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart className="w-4 h-4" />
            Análisis
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                <button className="px-4 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg hover:opacity-90 transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm">
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
                      <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                        {prestamo.icono}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{prestamo.producto}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(prestamo.estado)}`}>
                            {prestamo.estado.toUpperCase()}
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
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">Progreso del pago</span>
                            <span className="font-medium">{prestamo.cuotasPagadas}/{prestamo.cuotasTotales} cuotas</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
                              style={{ width: `${getProgressPercentage(prestamo.montoPagado, prestamo.montoTotal)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>${prestamo.montoPagado.toLocaleString()} pagado</span>
                            <span>${prestamo.montoPendiente.toLocaleString()} pendiente</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-light text-gray-900">${prestamo.montoTotal}</p>
                        <p className="text-sm text-gray-500">Total</p>
                      </div>
                      {prestamo.diasMora && prestamo.diasMora > 0 && (
                        <div className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full">
                          {prestamo.diasMora} días de mora
                        </div>
                      )}
                      <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                        <MoreVertical className="w-5 h-5" />
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
                <p className="text-gray-500 text-sm">{pagos.length} pagos registrados</p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
                <button className="px-4 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg hover:opacity-90 transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm">
                  <Plus className="w-4 h-4" />
                  Registrar Pago
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {pagos.map((pago) => (
                <div key={pago.id} className="group p-5 rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
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
              <button className="px-4 py-2 bg-gradient-to-r from-[#08557f] to-[#0a6a9e] text-white rounded-lg hover:opacity-90 transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm">
                <MessageSquare className="w-4 h-4" />
                Nuevo Comentario
              </button>
            </div>

            <div className="space-y-4">
              {comentarios.map((comentario) => (
                <div key={comentario.id} className="p-6 rounded-xl border border-gray-200 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${comentario.avatarColor}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">{comentario.autor}</span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            {comentario.rolAutor}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            comentario.tipo === 'llamada' ? 'bg-blue-50 text-blue-600' :
                            comentario.tipo === 'visita' ? 'bg-green-50 text-green-600' :
                            comentario.tipo === 'incidencia' ? 'bg-red-50 text-red-600' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {comentario.tipo.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{comentario.fecha}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{comentario.contenido}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contenido de análisis */}
        {activeTab === 'analitica' && (
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-light text-gray-900 mb-2">Análisis del Cliente</h2>
              <p className="text-gray-500 text-sm">Comportamiento y tendencias crediticias</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Información financiera */}
              <div className="space-y-6">
                <div className="p-6 rounded-xl border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-4">Información Financiera</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Límite de Crédito</span>
                      <span className="font-medium">${cliente.limiteCredito.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Saldo Disponible</span>
                      <span className="font-medium text-[#08557f]">${cliente.saldoDisponible.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Ingresos Mensuales</span>
                      <span className="font-medium">${cliente.ingresosMensuales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600">Score Crediticio</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                            style={{ width: `${cliente.scoreCrediticio}%` }}
                          />
                        </div>
                        <span className="font-medium">{cliente.scoreCrediticio}/100</span>
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
                        <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full w-4/5" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Frecuencia de Contacto</span>
                        <span className="font-medium">12/mes</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full w-3/5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones rápidas y referencias */}
              <div className="space-y-6">
                <div className="p-6 rounded-xl border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-[#08557f] hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center group">
                      <Printer className="w-5 h-5 text-gray-600 group-hover:text-[#08557f] mb-2" />
                      <span className="text-sm font-medium">Reporte</span>
                    </button>
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-[#08557f] hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center group">
                      <Bell className="w-5 h-5 text-gray-600 group-hover:text-[#08557f] mb-2" />
                      <span className="text-sm font-medium">Recordatorio</span>
                    </button>
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-[#08557f] hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center group">
                      <Shield className="w-5 h-5 text-gray-600 group-hover:text-[#08557f] mb-2" />
                      <span className="text-sm font-medium">Riesgo</span>
                    </button>
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-[#08557f] hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center group">
                      <PieChart className="w-5 h-5 text-gray-600 group-hover:text-[#08557f] mb-2" />
                      <span className="text-sm font-medium">Análisis</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-xl border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-4">Referencias</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
                      <p className="font-medium">{cliente.referenciaPersonal}</p>
                      <p className="text-sm text-gray-600 mt-1">{cliente.telefonoReferencia}</p>
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
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-secondary"></div>
          <span>Último pago: 15 Jul 2023</span>
        </div>
      </div>
    </div>
  );
};

export default ClienteDetalleElegante;
