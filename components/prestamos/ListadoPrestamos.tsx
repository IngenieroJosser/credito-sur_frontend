'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  DollarSign,
  Filter,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { PRESTAMOS_MOCK, Prestamo, EstadoPrestamo } from './data';
import FiltroRuta from '@/components/filtros/FiltroRuta';
import EditarPrestamoModal from '@/components/prestamos/EditarPrestamoModal';

interface Filtros {
  estado: string;
  cliente: string;
  fechaDesde: string;
  fechaHasta: string;
  riesgo: string;
  busqueda: string;
  ruta: string;
}

const ListadoPrestamosElegante = () => {
  const router = useRouter();
  const pathname = usePathname();
  const isCoordinador = pathname?.includes('/coordinador');
  const baseRoute = isCoordinador ? '/coordinador/creditos' : '/admin/prestamos';
  
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({
    estado: 'todos',
    cliente: 'todos',
    fechaDesde: '',
    fechaHasta: '',
    riesgo: 'todos',
    busqueda: '',
    ruta: 'todas'
  });
  const [paginaActual, setPaginaActual] = useState(1);
  const [prestamosPorPagina] = useState(8);
  const [cargando, setCargando] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [idPrestamoAEditar, setIdPrestamoAEditar] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setPrestamos(PRESTAMOS_MOCK); // Mostrar todos
      setCargando(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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

  const prestamosFiltrados = prestamos.filter(prestamo => {
    // if (prestamo.tipoProducto !== 'efectivo') return false; // REMOVED FILTER
    if (filtros.estado !== 'todos' && prestamo.estado !== filtros.estado) return false;
    if (filtros.cliente !== 'todos' && prestamo.clienteId !== filtros.cliente) return false;
    if (filtros.riesgo !== 'todos' && prestamo.riesgo !== filtros.riesgo) return false;
    if (filtros.ruta !== 'todas' && filtros.ruta !== '' && prestamo.ruta !== filtros.ruta) return false;
    
    if (filtros.busqueda && !prestamo.cliente.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
        !prestamo.producto.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
        !prestamo.id.toLowerCase().includes(filtros.busqueda.toLowerCase())) return false;
    
    return true;
  });

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
      case 'EN_MORA': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'INCUMPLIDO': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'PERDIDA': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PAGADO': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
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
    router.push(`${baseRoute}/${id}`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10">
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200 px-6 py-4 md:px-8 supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-blue-600">Listado</span> <span className="text-orange-500">Créditos</span>
              </h1>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Gestión y monitoreo de cartera de créditos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href={`${baseRoute}/nuevo`}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm group"
            >
              <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
              Nuevo Crédito
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{estadisticas.total}</p>
          </div>
          
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Activos</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{estadisticas.activos}</p>
          </div>
          
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">En Mora</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{estadisticas.atrasados + estadisticas.morosos}</p>
          </div>
          
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cartera</p>
            <p className="text-lg font-bold text-slate-900 tracking-tight truncate" title={formatCurrency(estadisticas.montoTotal)}>
              {formatCurrency(estadisticas.montoTotal)}
            </p>
          </div>
          
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pendiente</p>
            <p className="text-lg font-bold text-slate-900 tracking-tight truncate" title={formatCurrency(estadisticas.montoPendiente)}>
              {formatCurrency(estadisticas.montoPendiente)}
            </p>
          </div>
          
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Mora Total</p>
            <p className="text-lg font-bold text-slate-900 tracking-tight truncate" title={formatCurrency(estadisticas.moraTotal)}>
              {formatCurrency(estadisticas.moraTotal)}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, ID o producto..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900/20 transition-all placeholder:text-slate-400"
              value={filtros.busqueda}
              onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
              <div className="relative min-w-[180px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-slate-400" />
                </div>
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900/20 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="ACTIVO">Activos</option>
                  <option value="EN_MORA">En Mora</option>
                  <option value="PAGADO">Pagados</option>
                </select>
              </div>

              <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex items-center gap-2">
                 <FiltroRuta 
                    onRutaChange={(r) => setFiltros(prev => ({ ...prev, ruta: r || 'todas' }))}
                    selectedRutaId={filtros.ruta === 'todas' ? null : filtros.ruta}
                    className="min-w-[180px]"
                    showAllOption={true}
                    hideLabel={true}
                 />
              </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider text-slate-600">Préstamo / Cliente</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-slate-600">Producto</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-slate-600">Estado</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-slate-600 text-right">Monto</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-slate-600 text-right">Pendiente</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-slate-600 text-center">Progreso</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-slate-600 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cargando ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-10 bg-slate-100 rounded-lg w-48"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-2 bg-slate-100 rounded-full w-24 mx-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-8 bg-slate-100 rounded-lg w-8 ml-auto"></div></td>
                    </tr>
                  ))
                ) : prestamosPaginados.length > 0 ? (
                  prestamosPaginados.map((prestamo) => (
                    <tr 
                      key={prestamo.id} 
                      onClick={() => irADetallePrestamo(prestamo.id)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-slate-700 transition-colors">{prestamo.id}</span>
                          <span className="text-xs font-medium text-slate-500">{prestamo.cliente}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 font-medium">
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
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatCurrency(prestamo.montoTotal)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "font-bold",
                          prestamo.montoPendiente > 0 ? "text-slate-700" : "text-emerald-600"
                        )}>
                          {formatCurrency(prestamo.montoPendiente)}
                        </span>
                        {prestamo.moraAcumulada && prestamo.moraAcumulada > 0 && (
                          <div className="text-[10px] text-rose-500 font-bold mt-0.5">
                            + {formatCurrency(prestamo.moraAcumulada)} mora
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-center">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-slate-900 rounded-full transition-all duration-500"
                              style={{ width: `${(prestamo.cuotasPagadas / prestamo.cuotasTotales) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {prestamo.cuotasPagadas}/{prestamo.cuotasTotales} cuotas
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div 
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            onClick={() => irADetallePrestamo(prestamo.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setIdPrestamoAEditar(prestamo.id)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Editar préstamo"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Eliminar préstamo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4">
                        <Search className="h-8 w-8 text-slate-300" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">No se encontraron préstamos</h3>
                      <p className="text-slate-500 mt-1 font-medium">Intenta ajustar los filtros de búsqueda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs text-slate-500 font-medium">
            <span>
              Mostrando {prestamosPaginados.length} de {prestamosFiltrados.length} resultados
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => cambiarPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
              >
                <ChevronLeft className="h-3 w-3" /> Anterior
              </button>
              <button 
                onClick={() => cambiarPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas || totalPaginas === 0}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
              >
                Siguiente <ChevronRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      
      {idPrestamoAEditar && (
        <EditarPrestamoModal 
          id={idPrestamoAEditar}
          onClose={() => setIdPrestamoAEditar(null)}
          onSuccess={() => {
            setIdPrestamoAEditar(null);
            // Re-fetch or update local state
          }}
        />
      )}
    </div>
  );
};

export default ListadoPrestamosElegante;
