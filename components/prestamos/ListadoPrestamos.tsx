// app/components/prestamos/ListadoPrestamos.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Calendar, User, DollarSign, Clock, 
  AlertCircle, CheckCircle, XCircle, ChevronRight,
  Eye, MoreVertical, Download, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight as ChevronRightIcon, Plus,
  RefreshCw, BarChart, Shield, FileText, CreditCard
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
}

interface Filtros {
  estado: string;
  cliente: string;
  fechaDesde: string;
  fechaHasta: string;
  riesgo: string;
  busqueda: string;
}

const ListadoPrestamos = () => {
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
  const [prestamosPorPagina] = useState(10);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [cargando, setCargando] = useState(true);

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
        fechaInicio: '15/01/2023',
        fechaVencimiento: '15/12/2023',
        proximoPago: '15/08/2023',
        estado: 'activo',
        tasaInteres: 1.5,
        diasMora: 0,
        riesgo: 'medio'
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
        fechaInicio: '10/06/2022',
        fechaVencimiento: '10/03/2023',
        proximoPago: '-',
        estado: 'pagado',
        tasaInteres: 1.8,
        riesgo: 'bajo'
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
        fechaInicio: '05/03/2023',
        fechaVencimiento: '05/10/2023',
        proximoPago: '05/08/2023',
        estado: 'atrasado',
        tasaInteres: 1.6,
        diasMora: 7,
        moraAcumulada: 12.50,
        riesgo: 'alto'
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
        fechaInicio: '01/04/2023',
        fechaVencimiento: '01/03/2024',
        proximoPago: '01/06/2023',
        estado: 'activo',
        tasaInteres: 1.4,
        riesgo: 'bajo'
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
        fechaInicio: '20/05/2023',
        fechaVencimiento: '20/10/2024',
        proximoPago: '20/08/2023',
        estado: 'moroso',
        tasaInteres: 1.7,
        diasMora: 45,
        moraAcumulada: 67.80,
        riesgo: 'alto'
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
        fechaInicio: '15/11/2022',
        fechaVencimiento: '15/04/2023',
        proximoPago: '-',
        estado: 'pagado',
        tasaInteres: 1.3,
        riesgo: 'bajo'
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
        fechaInicio: '10/02/2023',
        fechaVencimiento: '10/01/2024',
        proximoPago: '10/08/2023',
        estado: 'activo',
        tasaInteres: 1.5,
        riesgo: 'medio'
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
        fechaInicio: '01/06/2023',
        fechaVencimiento: '01/03/2024',
        proximoPago: '01/07/2023',
        estado: 'cancelado',
        tasaInteres: 1.8,
        riesgo: 'alto'
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
    
    // Filtro por fechas
    if (filtros.fechaDesde) {
      const fechaInicio = new Date(prestamo.fechaInicio.split('/').reverse().join('-'));
      const fechaDesde = new Date(filtros.fechaDesde);
      if (fechaInicio < fechaDesde) return false;
    }
    
    if (filtros.fechaHasta) {
      const fechaInicio = new Date(prestamo.fechaInicio.split('/').reverse().join('-'));
      const fechaHasta = new Date(filtros.fechaHasta);
      if (fechaInicio > fechaHasta) return false;
    }
    
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
      case 'activo': return 'bg-green-100 text-green-800 border-green-200';
      case 'atrasado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'moroso': return 'bg-red-100 text-red-800 border-red-200';
      case 'pagado': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelado': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      case 'medio': return 'text-yellow-600';
      case 'alto': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
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
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light text-gray-900">Préstamos</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión y seguimiento de créditos</p>
          </div>
          <button
            onClick={irANuevoPrestamo}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Préstamo
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="text-center">
            <p className="text-2xl font-light text-gray-900">{estadisticas.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light text-green-600">{estadisticas.activos}</p>
            <p className="text-xs text-gray-500">Activos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light text-yellow-600">{estadisticas.atrasados}</p>
            <p className="text-xs text-gray-500">Atrasados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light text-red-600">{estadisticas.morosos}</p>
            <p className="text-xs text-gray-500">Morosos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light text-blue-600">{estadisticas.pagados}</p>
            <p className="text-xs text-gray-500">Pagados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light text-gray-600">{estadisticas.cancelados}</p>
            <p className="text-xs text-gray-500">Cancelados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light text-gray-900">{formatCurrency(estadisticas.montoTotal)}</p>
            <p className="text-xs text-gray-500">Monto Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light text-gray-900">{formatCurrency(estadisticas.montoPendiente)}</p>
            <p className="text-xs text-gray-500">Pendiente</p>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar préstamos, clientes o productos..."
              value={filtros.busqueda}
              onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            
            <button
              onClick={resetFiltros}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Limpiar
            </button>
          </div>
        </div>

        {/* Filtros expandidos */}
        {mostrarFiltros && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Estado</label>
                <select
                  value={filtros.estado}
                  onChange={(e) => handleFiltroChange('estado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                <label className="block text-xs font-medium text-gray-700 mb-2">Cliente</label>
                <select
                  value={filtros.cliente}
                  onChange={(e) => handleFiltroChange('cliente', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                <label className="block text-xs font-medium text-gray-700 mb-2">Riesgo</label>
                <select
                  value={filtros.riesgo}
                  onChange={(e) => handleFiltroChange('riesgo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="todos">Todos los riesgos</option>
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Fecha de inicio</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={filtros.fechaDesde}
                      onChange={(e) => handleFiltroChange('fechaDesde', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={filtros.fechaHasta}
                      onChange={(e) => handleFiltroChange('fechaHasta', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de préstamos */}
      <div className="px-6 py-4">
        {cargando ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {/* Encabezados de tabla - Solo visible en desktop */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-3">Préstamo / Cliente</div>
              <div className="col-span-2">Producto</div>
              <div className="col-span-2">Monto / Estado</div>
              <div className="col-span-2">Progreso / Próximo Pago</div>
              <div className="col-span-1">Riesgo</div>
              <div className="col-span-2 text-right">Acciones</div>
            </div>

            {/* Lista de préstamos */}
            <div className="divide-y divide-gray-200">
              {prestamosPaginados.map((prestamo) => (
                <div 
                  key={prestamo.id}
                  className="py-4 px-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 md:gap-4">
                    {/* Columna 1: Préstamo y Cliente */}
                    <div className="col-span-3 mb-4 md:mb-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-sm font-medium text-gray-900">{prestamo.id}</div>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getEstadoColor(prestamo.estado)}`}>
                              {getEstadoIcono(prestamo.estado)}
                              {prestamo.estado.toUpperCase()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-3 h-3" />
                            {prestamo.cliente}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {prestamo.fechaInicio} - {prestamo.fechaVencimiento}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Producto */}
                    <div className="col-span-2 mb-4 md:mb-0">
                      <div className="text-sm text-gray-900">{prestamo.producto}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {prestamo.cuotasTotales} cuotas • {prestamo.tasaInteres}%
                      </div>
                    </div>

                    {/* Columna 3: Monto y Estado */}
                    <div className="col-span-2 mb-4 md:mb-0">
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(prestamo.montoTotal)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Pagado: {formatCurrency(prestamo.montoPagado)}
                          </div>
                        </div>
                        {prestamo.diasMora && prestamo.diasMora > 0 && (
                          <div className="flex items-center gap-2 text-xs text-red-600">
                            <AlertCircle className="w-3 h-3" />
                            {prestamo.diasMora} días de mora
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna 4: Progreso y Próximo Pago */}
                    <div className="col-span-2 mb-4 md:mb-0">
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progreso</span>
                            <span>{prestamo.cuotasPagadas}/{prestamo.cuotasTotales}</span>
                          </div>
                          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gray-900 rounded-full"
                              style={{ width: `${(prestamo.cuotasPagadas / prestamo.cuotasTotales) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">
                          Próximo: {prestamo.proximoPago}
                        </div>
                      </div>
                    </div>

                    {/* Columna 5: Riesgo */}
                    <div className="col-span-1 mb-4 md:mb-0">
                      <div className={`text-sm font-medium ${getRiesgoColor(prestamo.riesgo)}`}>
                        {prestamo.riesgo.toUpperCase()}
                      </div>
                    </div>

                    {/* Columna 6: Acciones */}
                    <div className="col-span-2 flex justify-end">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => irADetallePrestamo(prestamo.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Vista móvil adicional */}
                  <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">Monto pendiente</div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(prestamo.montoPendiente)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Cuotas pendientes</div>
                        <div className="text-sm font-medium text-gray-900">
                          {prestamo.cuotasPendientes}
                        </div>
                      </div>
                      {prestamo.moraAcumulada && prestamo.moraAcumulada > 0 && (
                        <div className="col-span-2">
                          <div className="text-xs text-red-600">
                            Mora: {formatCurrency(prestamo.moraAcumulada)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {/* Paginación */}
            {prestamosFiltrados.length > prestamosPorPagina && (
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500 mb-4 sm:mb-0">
                  Mostrando {indicePrimero + 1} - {Math.min(indiceUltimo, prestamosFiltrados.length)} de {prestamosFiltrados.length} préstamos
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cambiarPagina(paginaActual - 1)}
                    disabled={paginaActual === 1}
                    className={`p-2 rounded-lg border ${
                      paginaActual === 1
                        ? 'border-gray-200 text-gray-400'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
                        className={`px-3 py-1 rounded-lg text-sm ${
                          pagina === paginaActual
                            ? 'bg-gray-900 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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

      {/* Footer con acciones rápidas */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="text-sm text-gray-500 mb-4 md:mb-0">
            Sistema de Gestión Crediticia • Última actualización: {new Date().toLocaleDateString()}
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              Reporte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListadoPrestamos;