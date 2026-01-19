'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, User, DollarSign, TrendingUp, Clock, 
  AlertCircle, CheckCircle, XCircle,
  Eye,
  ChevronLeft, ChevronRight as ChevronRightIcon, Plus,
  RefreshCw, Shield, FileText, CreditCard,
  Grid3x3, List, Package, Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Prestamo {
  id: string;
  cliente: string;
  clienteId: string;
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
  estado: 'activo' | 'atrasado' | 'moroso' | 'pagado' | 'cancelado';
  tasaInteres: number;
  diasMora?: number;
  moraAcumulada?: number;
  riesgo: 'bajo' | 'medio' | 'alto';
  icono: React.ReactNode;
}

interface Filtros {
  estado: string;
  cliente: string;
  fechaDesde: string;
  fechaHasta: string;
  riesgo: string;
  busqueda: string;
}

const ListadoPrestamosElegante = () => {
  const router = useRouter();
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({
    estado: 'todos',
    cliente: 'todos',
    fechaDesde: '',
    fechaHasta: '',
    riesgo: 'todos',
    busqueda: ''
  });
  const [paginaActual, setPaginaActual] = useState(1);
  const [prestamosPorPagina] = useState(8);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<'lista' | 'grid'>('lista');

  // Datos de ejemplo
  useEffect(() => {
    const datosEjemplo: Prestamo[] = [
      {
        id: 'PR-2023-001',
        cliente: 'Carlos Rodríguez',
        clienteId: 'CL-001',
        producto: 'Refrigeradora Samsung',
        montoTotal: 1200,
        montoPagado: 720,
        montoPendiente: 480,
        cuotasTotales: 12,
        cuotasPagadas: 7,
        cuotasPendientes: 5,
        fechaInicio: '15 Ene 2023',
        fechaVencimiento: '15 Dic 2023',
        proximoPago: '15 Ago 2023',
        estado: 'activo',
        tasaInteres: 1.5,
        diasMora: 0,
        riesgo: 'medio',
        icono: <Package className="w-4 h-4" />
      },
      {
        id: 'PR-2023-002',
        cliente: 'Ana Gómez',
        clienteId: 'CL-002',
        producto: 'Lavadora LG',
        montoTotal: 850,
        montoPagado: 850,
        montoPendiente: 0,
        cuotasTotales: 10,
        cuotasPagadas: 10,
        cuotasPendientes: 0,
        fechaInicio: '10 Jun 2022',
        fechaVencimiento: '10 Mar 2023',
        proximoPago: '-',
        estado: 'pagado',
        tasaInteres: 1.8,
        riesgo: 'bajo',
        icono: <CreditCard className="w-4 h-4" />
      },
      {
        id: 'PR-2023-003',
        cliente: 'Roberto Sánchez',
        clienteId: 'CL-003',
        producto: 'Cocina a Gas',
        montoTotal: 650,
        montoPagado: 325,
        montoPendiente: 325,
        cuotasTotales: 8,
        cuotasPagadas: 4,
        cuotasPendientes: 4,
        fechaInicio: '05 Mar 2023',
        fechaVencimiento: '05 Oct 2023',
        proximoPago: '05 Ago 2023',
        estado: 'atrasado',
        tasaInteres: 1.6,
        diasMora: 7,
        moraAcumulada: 12.50,
        riesgo: 'alto',
        icono: <Zap className="w-4 h-4" />
      },
      {
        id: 'PR-2023-004',
        cliente: 'María López',
        clienteId: 'CL-004',
        producto: 'Televisor 55"',
        montoTotal: 950,
        montoPagado: 190,
        montoPendiente: 760,
        cuotasTotales: 12,
        cuotasPagadas: 2,
        cuotasPendientes: 10,
        fechaInicio: '01 Abr 2023',
        fechaVencimiento: '01 Mar 2024',
        proximoPago: '01 Jun 2023',
        estado: 'activo',
        tasaInteres: 1.4,
        riesgo: 'bajo',
        icono: <DollarSign className="w-4 h-4" />
      },
      {
        id: 'PR-2023-005',
        cliente: 'Luis Fernández',
        clienteId: 'CL-005',
        producto: 'Aire Acondicionado',
        montoTotal: 1800,
        montoPagado: 450,
        montoPendiente: 1350,
        cuotasTotales: 18,
        cuotasPagadas: 3,
        cuotasPendientes: 15,
        fechaInicio: '20 May 2023',
        fechaVencimiento: '20 Oct 2024',
        proximoPago: '20 Ago 2023',
        estado: 'moroso',
        tasaInteres: 1.7,
        diasMora: 45,
        moraAcumulada: 67.80,
        riesgo: 'alto',
        icono: <Package className="w-4 h-4" />
      },
      {
        id: 'PR-2023-006',
        cliente: 'Carlos Rodríguez',
        clienteId: 'CL-001',
        producto: 'Microondas',
        montoTotal: 350,
        montoPagado: 350,
        montoPendiente: 0,
        cuotasTotales: 6,
        cuotasPagadas: 6,
        cuotasPendientes: 0,
        fechaInicio: '15 Nov 2022',
        fechaVencimiento: '15 Abr 2023',
        proximoPago: '-',
        estado: 'pagado',
        tasaInteres: 1.3,
        riesgo: 'bajo',
        icono: <CreditCard className="w-4 h-4" />
      },
      {
        id: 'PR-2023-007',
        cliente: 'Ana Gómez',
        clienteId: 'CL-002',
        producto: 'Refrigeradora Samsung',
        montoTotal: 1200,
        montoPagado: 600,
        montoPendiente: 600,
        cuotasTotales: 12,
        cuotasPagadas: 6,
        cuotasPendientes: 6,
        fechaInicio: '10 Feb 2023',
        fechaVencimiento: '10 Ene 2024',
        proximoPago: '10 Ago 2023',
        estado: 'activo',
        tasaInteres: 1.5,
        riesgo: 'medio',
        icono: <Zap className="w-4 h-4" />
      },
      {
        id: 'PR-2023-008',
        cliente: 'Pedro Martínez',
        clienteId: 'CL-006',
        producto: 'Lavadora LG',
        montoTotal: 850,
        montoPagado: 0,
        montoPendiente: 850,
        cuotasTotales: 10,
        cuotasPagadas: 0,
        cuotasPendientes: 10,
        fechaInicio: '01 Jun 2023',
        fechaVencimiento: '01 Mar 2024',
        proximoPago: '01 Jul 2023',
        estado: 'cancelado',
        tasaInteres: 1.8,
        riesgo: 'alto',
        icono: <DollarSign className="w-4 h-4" />
      }
    ];

    setTimeout(() => {
      setPrestamos(datosEjemplo);
      setCargando(false);
    }, 500);
  }, []);

  // Estadísticas
  const estadisticas = {
    total: prestamos.length,
    activos: prestamos.filter(p => p.estado === 'activo').length,
    atrasados: prestamos.filter(p => p.estado === 'atrasado').length,
    morosos: prestamos.filter(p => p.estado === 'moroso').length,
    pagados: prestamos.filter(p => p.estado === 'pagado').length,
    cancelados: prestamos.filter(p => p.estado === 'cancelado').length,
    montoTotal: prestamos.reduce((sum, p) => sum + p.montoTotal, 0),
    montoPendiente: prestamos.reduce((sum, p) => sum + p.montoPendiente, 0),
    moraTotal: prestamos.reduce((sum, p) => sum + (p.moraAcumulada || 0), 0)
  };

  // Filtrado de préstamos
  const prestamosFiltrados = prestamos.filter(prestamo => {
    if (filtros.estado !== 'todos' && prestamo.estado !== filtros.estado) return false;
    if (filtros.cliente !== 'todos' && prestamo.clienteId !== filtros.cliente) return false;
    if (filtros.riesgo !== 'todos' && prestamo.riesgo !== filtros.riesgo) return false;
    if (filtros.busqueda && !prestamo.cliente.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
        !prestamo.producto.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
        !prestamo.id.toLowerCase().includes(filtros.busqueda.toLowerCase())) return false;
    
    return true;
  });

  // Paginación
  const indiceUltimo = paginaActual * prestamosPorPagina;
  const indicePrimero = indiceUltimo - prestamosPorPagina;
  const prestamosPaginados = prestamosFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(prestamosFiltrados.length / prestamosPorPagina);

  const cambiarPagina = (pagina: number) => {
    setPaginaActual(pagina);
  };

  const getEstadoColor = (estado: string) => {
    switch(estado) {
      case 'activo': return 'bg-primary/10 text-primary';
      case 'atrasado': return 'bg-secondary/10 text-secondary';
      case 'moroso': return 'bg-red-100 text-red-600';
      case 'pagado': return 'bg-green-100 text-green-600';
      case 'cancelado': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getEstadoIcono = (estado: string) => {
    switch(estado) {
      case 'activo': return <TrendingUp className="w-3 h-3" />;
      case 'atrasado': return <Clock className="w-3 h-3" />;
      case 'moroso': return <AlertCircle className="w-3 h-3" />;
      case 'pagado': return <CheckCircle className="w-3 h-3" />;
      case 'cancelado': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const getRiesgoColor = (riesgo: string) => {
    switch(riesgo) {
      case 'bajo': return 'text-green-600';
      case 'medio': return 'text-secondary';
      case 'alto': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleFiltroChange = (key: keyof Filtros, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
    setPaginaActual(1);
  };

  const resetFiltros = () => {
    setFiltros({
      estado: 'todos',
      cliente: 'todos',
      fechaDesde: '',
      fechaHasta: '',
      riesgo: 'todos',
      busqueda: ''
    });
    setPaginaActual(1);
  };

  const irADetallePrestamo = (id: string) => {
    router.push(`/admin/prestamos/${id}`);
  };

  const irANuevoPrestamo = () => {
    router.push('/admin/prestamos/nuevo');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Elegante */}
      <div className="px-8 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light text-gray-900">Préstamos</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión y seguimiento de créditos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVista('lista')}
                className={`p-2 rounded-lg transition-colors ${vista === 'lista' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVista('grid')}
                className={`p-2 rounded-lg transition-colors ${vista === 'grid' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={irANuevoPrestamo}
              className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Préstamo
            </button>
          </div>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="px-8 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar préstamos, clientes o productos..."
              value={filtros.busqueda}
              onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm placeholder-gray-400"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
            </button>
            
            <button
              onClick={resetFiltros}
              className="px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Limpiar
            </button>
          </div>
        </div>

        {/* Filtros expandidos */}
        {mostrarFiltros && (
          <div className="mt-4 p-5 border border-gray-200 rounded-lg bg-white shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Estado del préstamo</label>
                <select
                  value={filtros.estado}
                  onChange={(e) => handleFiltroChange('estado', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activo</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="moroso">Moroso</option>
                  <option value="pagado">Pagado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Nivel de riesgo</label>
                <select
                  value={filtros.riesgo}
                  onChange={(e) => handleFiltroChange('riesgo', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="todos">Todos los riesgos</option>
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Cliente</label>
                <select
                  value={filtros.cliente}
                  onChange={(e) => handleFiltroChange('cliente', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="todos">Todos los clientes</option>
                  {Array.from(new Set(prestamos.map(p => p.clienteId))).map(clienteId => {
                    const cliente = prestamos.find(p => p.clienteId === clienteId);
                    return (
                      <option key={clienteId} value={clienteId}>
                        {cliente?.cliente}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Rango de fechas</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={filtros.fechaDesde}
                      onChange={(e) => handleFiltroChange('fechaDesde', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={filtros.fechaHasta}
                      onChange={(e) => handleFiltroChange('fechaHasta', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas elegantes */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">TOTAL</span>
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-light text-gray-900">{estadisticas.total}</p>
            <div className="mt-2 text-xs text-gray-500">préstamos</div>
          </div>
          
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-primary">ACTIVOS</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-light text-gray-900">{estadisticas.activos}</p>
            <div className="mt-2 text-xs text-gray-500">{((estadisticas.activos / estadisticas.total) * 100).toFixed(0)}% del total</div>
          </div>
          
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-secondary">EN MORA</span>
              <AlertCircle className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-2xl font-light text-gray-900">{estadisticas.atrasados + estadisticas.morosos}</p>
            <div className="mt-2 text-xs text-gray-500">requieren atención</div>
          </div>
          
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">MONTO TOTAL</span>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-light text-gray-900">{formatCurrency(estadisticas.montoTotal)}</p>
            <div className="mt-2 text-xs text-gray-500">en cartera</div>
          </div>
          
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">PENDIENTE</span>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-light text-gray-900">{formatCurrency(estadisticas.montoPendiente)}</p>
            <div className="mt-2 text-xs text-gray-500">por cobrar</div>
          </div>
          
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-red-600">MORA</span>
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-light text-gray-900">{formatCurrency(estadisticas.moraTotal)}</p>
            <div className="mt-2 text-xs text-gray-500">acumulada</div>
          </div>
        </div>
      </div>

      {/* Listado de préstamos */}
      <div className="px-8 pb-8">
        {cargando ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Vista de lista */}
            {vista === 'lista' && (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                {/* Encabezados */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="col-span-4 text-xs font-medium text-gray-500">PRÉSTAMO / CLIENTE</div>
                  <div className="col-span-2 text-xs font-medium text-gray-500">DETALLES</div>
                  <div className="col-span-2 text-xs font-medium text-gray-500">PROGRESO</div>
                  <div className="col-span-2 text-xs font-medium text-gray-500">ESTADO</div>
                  <div className="col-span-2 text-xs font-medium text-gray-500 text-right">ACCIÓN</div>
                </div>

                {/* Lista de préstamos */}
                <div className="divide-y divide-gray-100">
                  {prestamosPaginados.map((prestamo) => (
                    <div 
                      key={prestamo.id}
                      className="px-6 py-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Préstamo y Cliente */}
                        <div className="col-span-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/5">
                              {prestamo.icono}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium text-gray-900">{prestamo.id}</div>
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getEstadoColor(prestamo.estado)}`}>
                                  {getEstadoIcono(prestamo.estado)}
                                  {prestamo.estado.toUpperCase()}
                                </div>
                              </div>
                              <div className="text-sm text-gray-900 font-medium">{prestamo.cliente}</div>
                              <div className="text-xs text-gray-500">{prestamo.producto}</div>
                            </div>
                          </div>
                        </div>

                        {/* Detalles */}
                        <div className="col-span-2">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900">{formatCurrency(prestamo.montoTotal)}</div>
                            <div className="text-xs text-gray-500">
                              {prestamo.cuotasTotales} cuotas • {prestamo.tasaInteres}%
                            </div>
                            <div className="text-xs text-gray-500">{prestamo.fechaInicio} - {prestamo.fechaVencimiento}</div>
                          </div>
                        </div>

                        {/* Progreso */}
                        <div className="col-span-2">
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>{prestamo.cuotasPagadas}/{prestamo.cuotasTotales} cuotas</span>
                                <span>{formatCurrency(prestamo.montoPagado)}</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${(prestamo.cuotasPagadas / prestamo.cuotasTotales) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Próximo: {prestamo.proximoPago}
                            </div>
                          </div>
                        </div>

                        {/* Estado */}
                        <div className="col-span-2">
                          <div className="space-y-2">
                            <div className={`text-sm font-medium ${getRiesgoColor(prestamo.riesgo)}`}>
                              RIESGO {prestamo.riesgo.toUpperCase()}
                            </div>
                            {prestamo.moraAcumulada && prestamo.moraAcumulada > 0 && (
                              <div className="text-xs text-red-600">
                                Mora: {formatCurrency(prestamo.moraAcumulada)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acción */}
                        <div className="col-span-2 flex justify-end">
                          <button
                            onClick={() => irADetallePrestamo(prestamo.id)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vista de grid */}
            {vista === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {prestamosPaginados.map((prestamo) => (
                  <div 
                    key={prestamo.id}
                    className="border border-gray-200 rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all bg-white"
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getEstadoColor(prestamo.estado)}`}>
                              {getEstadoIcono(prestamo.estado)}
                              {prestamo.estado.toUpperCase()}
                            </div>
                            <div className={`text-xs font-medium ${getRiesgoColor(prestamo.riesgo)}`}>
                              • {prestamo.riesgo.toUpperCase()}
                            </div>
                          </div>
                          <h3 className="font-medium text-gray-900">{prestamo.id}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/5">
                          {prestamo.icono}
                        </div>
                      </div>

                      {/* Cliente y Producto */}
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-900 mb-1">
                          <User className="w-3 h-3" />
                          {prestamo.cliente}
                        </div>
                        <p className="text-sm text-gray-600">{prestamo.producto}</p>
                      </div>

                      {/* Monto y Tasa */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Monto total</div>
                          <div className="font-medium text-gray-900">{formatCurrency(prestamo.montoTotal)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Tasa</div>
                          <div className="font-medium text-gray-900">{prestamo.tasaInteres}%</div>
                        </div>
                      </div>

                      {/* Progreso */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-2">
                          <span>Progreso ({prestamo.cuotasPagadas}/{prestamo.cuotasTotales})</span>
                          <span>{((prestamo.cuotasPagadas / prestamo.cuotasTotales) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(prestamo.cuotasPagadas / prestamo.cuotasTotales) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Fechas */}
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>
                          <div>Inicio</div>
                          <div className="font-medium text-gray-900">{prestamo.fechaInicio}</div>
                        </div>
                        <div>
                          <div>Próximo pago</div>
                          <div className="font-medium text-gray-900">{prestamo.proximoPago}</div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="pt-4 border-t border-gray-100">
                        <button
                          onClick={() => irADetallePrestamo(prestamo.id)}
                          className="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mensaje cuando no hay resultados */}
            {prestamosPaginados.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-light text-gray-900 mb-2">No se encontraron préstamos</h3>
                <p className="text-gray-500 mb-6">
                  {filtros.estado !== 'todos' || filtros.busqueda || filtros.fechaDesde ? 
                    'Intenta cambiar los filtros de búsqueda' : 
                    'No hay préstamos registrados en el sistema'}
                </p>
                {(filtros.estado !== 'todos' || filtros.busqueda || filtros.fechaDesde) && (
                  <button
                    onClick={resetFiltros}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {/* Paginación elegante */}
            {prestamosFiltrados.length > prestamosPorPagina && (
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500 mb-4 sm:mb-0">
                  Mostrando <span className="font-medium text-gray-900">{indicePrimero + 1}-{Math.min(indiceUltimo, prestamosFiltrados.length)}</span> de <span className="font-medium text-gray-900">{prestamosFiltrados.length}</span> préstamos
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cambiarPagina(paginaActual - 1)}
                    disabled={paginaActual === 1}
                    className={`p-2 rounded-lg border ${
                      paginaActual === 1
                        ? 'border-gray-200 text-gray-400'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pagina: number;
                    if (totalPaginas <= 5) {
                      pagina = i + 1;
                    } else if (paginaActual <= 3) {
                      pagina = i + 1;
                    } else if (paginaActual >= totalPaginas - 2) {
                      pagina = totalPaginas - 4 + i;
                    } else {
                      pagina = paginaActual - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pagina}
                        onClick={() => cambiarPagina(pagina)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          pagina === paginaActual
                            ? 'bg-primary text-white'
                            : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pagina}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => cambiarPagina(paginaActual + 1)}
                    disabled={paginaActual === totalPaginas}
                    className={`p-2 rounded-lg border ${
                      paginaActual === totalPaginas
                        ? 'border-gray-200 text-gray-400'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer minimalista */}
      <div className="border-t border-gray-100 px-8 py-4">
        <div className="text-xs text-gray-500 text-center">
          Sistema de Gestión Crediticia • {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
    </div>
  );
};

export default ListadoPrestamosElegante;
