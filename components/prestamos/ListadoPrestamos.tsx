'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Plus,
  CreditCard,
  Package,
  Zap,
  Ban,
  DollarSign
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { PRESTAMOS_MOCK, Prestamo, EstadoPrestamo } from './data';

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
  const [cargando, setCargando] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Usamos setTimeout para evitar advertencias de setState síncrono y simular carga
    const timer = setTimeout(() => {
      setMounted(true);
      setPrestamos(PRESTAMOS_MOCK);
      setCargando(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Estadísticas
  const estadisticas = {
    total: prestamos.length,
    activos: prestamos.filter(p => p.estado === 'ACTIVO').length,
    atrasados: prestamos.filter(p => p.estado === 'EN_MORA').length,
    morosos: prestamos.filter(p => p.estado === 'INCUMPLIDO' || p.estado === 'PERDIDA').length,
    pagados: prestamos.filter(p => p.estado === 'PAGADO').length,
    cancelados: prestamos.filter(p => p.estado === 'PERDIDA').length,
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

  const getEstadoColor = (estado: EstadoPrestamo) => {
    switch(estado) {
      case 'ACTIVO': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'PENDIENTE_APROBACION': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'EN_MORA': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'INCUMPLIDO': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'PERDIDA': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'PAGADO': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getEstadoIcono = (estado: EstadoPrestamo) => {
    switch(estado) {
      case 'ACTIVO': return <TrendingUp className="w-3 h-3" />;
      case 'PENDIENTE_APROBACION': return <Clock className="w-3 h-3" />;
      case 'EN_MORA': return <Clock className="w-3 h-3" />;
      case 'INCUMPLIDO': return <AlertCircle className="w-3 h-3" />;
      case 'PERDIDA': return <Ban className="w-3 h-3" />;
      case 'PAGADO': return <CheckCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const getProductoIcono = (tipo?: string) => {
    switch(tipo) {
      case 'electrodomestico': return <Package className="w-4 h-4" />;
      case 'efectivo': return <DollarSign className="w-4 h-4" />;
      case 'mueble': return <Package className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const irADetallePrestamo = (id: string) => {
    router.push(`/admin/prestamos/${id}`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10 p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide font-medium border border-[#08557f]/10 mb-2">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Gestión de Créditos</span>
            </div>
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">
              Listado de <span className="font-semibold text-[#08557f]">Préstamos</span>
            </h1>
            <p className="text-gray-500 mt-1 font-light">
              Administra y monitorea la cartera de créditos activos y morosos.
            </p>
          </div>
          <Link 
            href="/admin/prestamos/nuevo"
            className="inline-flex items-center justify-center gap-2 bg-[#08557f] text-white px-5 py-3 rounded-xl hover:bg-[#064364] transition-all shadow-lg shadow-[#08557f]/20 hover:shadow-[#08557f]/30 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">Nuevo Préstamo</span>
          </Link>
        </div>

        {/* Estadísticas Minimalistas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 group-hover:text-[#08557f] transition-colors">Total</p>
            <p className="text-2xl font-light text-gray-900">{estadisticas.total}</p>
          </div>
          
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-2">Activos</p>
            <p className="text-2xl font-light text-gray-900">{estadisticas.activos}</p>
          </div>
          
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-2">En Mora</p>
            <p className="text-2xl font-light text-gray-900">{estadisticas.atrasados + estadisticas.morosos}</p>
          </div>
          
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 group-hover:text-[#08557f] transition-colors">Cartera</p>
            <p className="text-lg font-light text-gray-900 truncate" title={formatCurrency(estadisticas.montoTotal)}>
              {formatCurrency(estadisticas.montoTotal)}
            </p>
          </div>
          
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 group-hover:text-[#08557f] transition-colors">Pendiente</p>
            <p className="text-lg font-light text-gray-900 truncate" title={formatCurrency(estadisticas.montoPendiente)}>
              {formatCurrency(estadisticas.montoPendiente)}
            </p>
          </div>
          
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
            <p className="text-xs font-medium text-rose-600 uppercase tracking-wider mb-2">Mora Total</p>
            <p className="text-lg font-light text-gray-900 truncate" title={formatCurrency(estadisticas.moraTotal)}>
              {formatCurrency(estadisticas.moraTotal)}
            </p>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={filtros.busqueda}
              onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
              placeholder="Buscar por cliente, producto o ID..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border-none bg-gray-50/50 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-[#08557f]/10 transition-all text-sm font-medium placeholder:text-gray-400"
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
              className="px-4 py-2.5 rounded-xl border-none bg-gray-50 text-sm font-medium text-gray-600 focus:ring-2 focus:ring-[#08557f]/10 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <option value="todos">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="EN_MORA">En Mora</option>
              <option value="PAGADO">Pagados</option>
            </select>
          </div>
        </div>

        {/* Tabla de Préstamos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Préstamo / Cliente</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Producto</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Monto</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Pendiente</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-center">Progreso</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cargando ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-10 bg-gray-100 rounded-lg w-48"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20 ml-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20 ml-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-2 bg-gray-100 rounded-full w-24 mx-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded-lg w-8 ml-auto"></div></td>
                    </tr>
                  ))
                ) : prestamosPaginados.length > 0 ? (
                  prestamosPaginados.map((prestamo) => (
                    <tr 
                      key={prestamo.id} 
                      onClick={() => irADetallePrestamo(prestamo.id)}
                      className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 group-hover:text-[#08557f] transition-colors">{prestamo.id}</span>
                          <span className="text-xs text-gray-500">{prestamo.cliente}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          {getProductoIcono(prestamo.tipoProducto)}
                          <span>{prestamo.producto}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                          getEstadoColor(prestamo.estado)
                        )}>
                          {getEstadoIcono(prestamo.estado)}
                          {prestamo.estado.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatCurrency(prestamo.montoTotal)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "font-medium",
                          prestamo.montoPendiente > 0 ? "text-gray-700" : "text-emerald-600"
                        )}>
                          {formatCurrency(prestamo.montoPendiente)}
                        </span>
                        {prestamo.moraAcumulada && prestamo.moraAcumulada > 0 && (
                          <div className="text-[10px] text-rose-500 font-medium mt-0.5">
                            + {formatCurrency(prestamo.moraAcumulada)} mora
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-center">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#08557f] rounded-full transition-all duration-500"
                              style={{ width: `${(prestamo.cuotasPagadas / prestamo.cuotasTotales) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {prestamo.cuotasPagadas}/{prestamo.cuotasTotales} cuotas
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-[#08557f] hover:bg-[#08557f]/5 rounded-lg transition-all">
                          <ChevronRightIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="inline-flex p-4 rounded-full bg-gray-50 mb-4">
                        <Search className="h-8 w-8 text-gray-300" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">No se encontraron préstamos</h3>
                      <p className="text-gray-500 mt-1">Intenta ajustar los filtros de búsqueda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
            <span className="font-medium">
              Mostrando {prestamosPaginados.length} de {prestamosFiltrados.length} resultados
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => cambiarPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="h-3 w-3" /> Anterior
              </button>
              <button 
                onClick={() => cambiarPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas || totalPaginas === 0}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-1 transition-colors"
              >
                Siguiente <ChevronRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListadoPrestamosElegante;
