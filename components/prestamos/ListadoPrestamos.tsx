'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Trash2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import FiltroRuta from '@/components/filtros/FiltroRuta';
import EditarPrestamoModal from '@/components/prestamos/EditarPrestamoModal';
import DetallePrestamoModal from '@/components/prestamos/DetallePrestamoModal';
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal';
import { useNotification } from '@/components/providers/NotificationProvider';
import { loansService, Loan, LoansFilters } from '@/services/loans-service';
import { formatErrorForComponent } from '@/lib/api/api';
import { usePermission } from '@/hooks/usePermission';

import { exportService } from '@/services/export-service';
import { offlineStore } from '@/lib/offline/offlineDb';
import { prestamosService } from '@/services/prestamos-service';
import { WifiOff } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useNotificaciones } from '@/components/providers/NotificacionesProvider';

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
  const { showNotification } = useNotification();
  const router = useRouter();
  const pathname = usePathname();
  const { can, canForPath } = usePermission();
  
  const isCoordinador = pathname?.includes('/coordinador');
  const isSupervisor = pathname?.includes('/supervisor');
  const baseRoute = isCoordinador ? '/coordinador/creditos' : isSupervisor ? '/supervisor/creditos' : '/creditos';
  const permitido = can('CREDITOS_VIEW') || can('LOANS_VIEW') || canForPath(baseRoute);
  const puedeCrear = can('CREDITOS_CREATE') || can('LOANS_CREATE') || canForPath(baseRoute);
  
  const [prestamos, setPrestamos] = useState<Loan[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    activos: 0,
    atrasados: 0,
    morosos: 0,
    pagados: 0,
    cancelados: 0,
    montoTotal: 0,
    montoPendiente: 0,
    moraTotal: 0
  });
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
  const [refreshing, setRefreshing] = useState(false);
  const [showCrearCreditoModal, setShowCrearCreditoModal] = useState(false);
  const [totalPrestamos, setTotalPrestamos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'online' | 'offline'>('online');
  const [prestamoAEliminar, setPrestamoAEliminar] = useState<string | null>(null);
  const [idPrestamoDetalle, setIdPrestamoDetalle] = useState<string | null>(null);
  const { socket } = useNotificaciones();

  const loadPrestamos = useCallback(async () => {
    try {
      if (!refreshing) setCargando(true);
      setError(null);
      
      const filters: LoansFilters = {
        estado: filtros.estado !== 'todos' ? filtros.estado : undefined,
        ruta: filtros.ruta !== 'todas' ? filtros.ruta : undefined,
        search: filtros.busqueda || undefined,
        page: paginaActual,
        limit: prestamosPorPagina,
      };

      const response = await loansService.getLoans(filters);
      setPrestamos(response.prestamos);
      setEstadisticas(response.estadisticas);
      setTotalPrestamos(response.paginacion.total);
      setDataSource('online');
      // Cache para offline
      offlineStore.saveMany('prestamos', response.prestamos).catch(() => {});
      
    } catch (err) {
      // Fallback offline
      try {
        const offData = await offlineStore.getAll<Loan>('prestamos');
        if (offData.length > 0) {
          setPrestamos(offData);
          setTotalPrestamos(offData.length);
          setDataSource('offline');
          setError(null);
          return;
        }
      } catch { /* ignore */ }
      setError(formatErrorForComponent(err));
      setPrestamos([]);
      setTotalPrestamos(0);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [filtros, paginaActual, prestamosPorPagina, refreshing]);

  // Initial mount - solo se ejecuta una vez al cargar el componente
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      loadPrestamos();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadPrestamos();
    }
  }, [filtros, paginaActual, loadPrestamos, mounted]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPrestamos();
  }, [loadPrestamos]);

  useEffect(() => {
    if (!socket) return;

    const handler = () => {
      handleRefresh();
    };

    socket.on('prestamos_actualizados', handler);

    return () => {
      socket.off('prestamos_actualizados', handler);
    };
  }, [socket, handleRefresh]);

  const handleEliminarPrestamo = async () => {
    if (!prestamoAEliminar) return;
    
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      
      await loansService.deleteLoan(prestamoAEliminar, user.id);
      showNotification('success', 'El préstamo ha sido archivado exitosamente', 'Préstamo Archivado');
      setPrestamoAEliminar(null);
      handleRefresh();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'No se pudo archivar el préstamo';
      showNotification('error', Array.isArray(msg) ? msg.join(', ') : msg, 'Error al Archivar');
    }
  };



  // Client-side filters for fields not handled by backend
  const prestamosFiltrados = prestamos.filter(prestamo => {
    if (filtros.riesgo !== 'todos' && prestamo.riesgo !== filtros.riesgo) return false;
    if (filtros.cliente !== 'todos' && prestamo.clienteId !== filtros.cliente) return false;
    return true;
  });

  // Backend already paginates — don't slice again
  const prestamosPaginados = prestamosFiltrados;
  const totalPaginas = Math.ceil(totalPrestamos / prestamosPorPagina);

  const cambiarPagina = (pagina: number) => {
    setPaginaActual(pagina);
  };

  const getEstadoColor = (estado: string) => {
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

  const getEstadoIcono = (estado: string) => {
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
    setIdPrestamoDetalle(id);
  };

  if (!mounted) return null;

  if (!permitido) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 font-bold border border-slate-200">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Acceso no autorizado</span>
          </div>
          <p className="mt-4 text-slate-500 font-medium">No tienes permisos para ver Créditos.</p>
        </div>
      </div>
    )
  }

  // Estado de error
  if (error && !prestamos.length && cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="p-4 rounded-3xl bg-white border border-rose-100 shadow-lg inline-block mb-6">
            <AlertCircle className="h-12 w-12 text-rose-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Error al cargar préstamos</h3>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-2 bg-[#08557f] text-white font-bold rounded-xl hover:bg-[#063a58] transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

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

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Actualizar lista"
            >
              <RefreshCw className={`h-4 w-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {puedeCrear && (
              <button
                onClick={() => setShowCrearCreditoModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm group"
              >
                <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
                Nuevo Crédito
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Estado de carga durante refresh */}
        {refreshing && (
          <div className="fixed top-20 right-4 z-50">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-[#08557f] animate-spin" />
              <span className="text-xs font-bold text-slate-600">Actualizando datos...</span>
            </div>
          </div>
        )}

        {/* Banner offline */}
        {dataSource === 'offline' && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
            <WifiOff className="h-3.5 w-3.5" />
            Mostrando datos guardados localmente. Algunos datos pueden no estar actualizados.
          </div>
        )}

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
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">En Mora</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{estadisticas.atrasados}</p>
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
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Cuentas Vencidas</p>
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
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900/20 transition-all placeholder:text-slate-400"
              value={filtros.busqueda}
              onChange={(e) => {
                setFiltros(prev => ({ ...prev, busqueda: e.target.value }));
                setPaginaActual(1); // Resetear a primera página al buscar
              }}
              disabled={cargando}
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto items-end flex-wrap">
              <FiltroRuta 
                onRutaChange={(r) => {
                  setFiltros(prev => ({ ...prev, ruta: r || 'todas' }));
                  setPaginaActual(1);
                }}
                selectedRutaId={filtros.ruta === 'todas' ? null : filtros.ruta}
                className="w-full md:w-auto"
                showAllOption={true}
                layout="wrap"
                hideLabel={true}
              />

              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
                
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'ACTIVO', label: 'Activos' },
                  { id: 'EN_MORA', label: 'En Mora' },
                  { id: 'PAGADO', label: 'Pagados' }
                ].map((filtro) => (
                  <button
                    key={filtro.id}
                    onClick={() => {
                      setFiltros(prev => ({ ...prev, estado: filtro.id }));
                      setPaginaActual(1);
                    }}
                    disabled={cargando}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                      filtros.estado === filtro.id 
                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                        : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>
          </div>
        </div>

        {/* Tabla - Desktop */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
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
                          <span className="font-bold text-slate-900 group-hover:text-slate-700 transition-colors">{prestamo.numeroPrestamo}</span>
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
                              style={{ width: `${prestamo.progreso}%` }}
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
                          {can('CREDITOS_EDIT') || can('LOANS_EDIT') || canForPath(baseRoute) ? (
                            <button 
                              onClick={() => setIdPrestamoAEditar(prestamo.id)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Editar préstamo"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          ) : null}
                          {can('CREDITOS_DELETE') || can('LOANS_DELETE') || canForPath(baseRoute) ? (
                            <button 
                              onClick={() => setPrestamoAEliminar(prestamo.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Marcar como pérdida"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
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
              Mostrando {Math.min(prestamosPaginados.length, prestamosPorPagina)} de {totalPrestamos} resultados
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => cambiarPagina(paginaActual - 1)}
                disabled={paginaActual === 1 || cargando}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
              >
                <ChevronLeft className="h-3 w-3" /> Anterior
              </button>
              <button 
                onClick={() => cambiarPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas || totalPaginas === 0 || cargando}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
              >
                Siguiente <ChevronRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Vista de Cards - Móvil */}
        <div className="md:hidden space-y-4">
          {cargando ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 animate-pulse">
                <div className="h-6 bg-slate-100 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
              </div>
            ))
          ) : prestamosPaginados.length > 0 ? (
            prestamosPaginados.map((prestamo) => (
              <div
                key={prestamo.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
                onClick={() => irADetallePrestamo(prestamo.id)}
              >
                {/* Header del Card */}
                <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{prestamo.numeroPrestamo}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{prestamo.cliente}</div>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border flex-shrink-0 ml-2",
                    getEstadoColor(prestamo.estado)
                  )}>
                    {getEstadoIcono(prestamo.estado)}
                    {prestamo.estado.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Producto */}
                <div className="mb-3">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Producto</div>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    {getProductoIcono(prestamo.tipoProducto)}
                    <span>{prestamo.producto}</span>
                  </div>
                </div>

                {/* Montos */}
                <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Monto Total</div>
                    <div className="text-lg font-bold text-slate-900">{formatCurrency(prestamo.montoTotal)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Pendiente</div>
                    <div className={cn(
                      "text-lg font-bold",
                      prestamo.montoPendiente > 0 ? "text-slate-700" : "text-emerald-600"
                    )}>
                      {formatCurrency(prestamo.montoPendiente)}
                    </div>
                    {prestamo.moraAcumulada && prestamo.moraAcumulada > 0 && (
                      <div className="text-[10px] text-rose-500 font-bold mt-0.5">
                        + {formatCurrency(prestamo.moraAcumulada)} mora
                      </div>
                    )}
                  </div>
                </div>

                {/* Progreso */}
                <div className="mb-3">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Progreso</div>
                  <div className="flex flex-col gap-1">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-900 rounded-full transition-all duration-500"
                        style={{ width: `${prestamo.progreso}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-bold">
                      {prestamo.cuotasPagadas}/{prestamo.cuotasTotales} cuotas ({prestamo.progreso}%)
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => irADetallePrestamo(prestamo.id)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Ver detalle"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {can('CREDITOS_EDIT') || can('LOANS_EDIT') || canForPath(baseRoute) ? (
                    <button 
                      onClick={() => setIdPrestamoAEditar(prestamo.id)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      title="Editar préstamo"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  ) : null}
                  {can('CREDITOS_DELETE') || can('LOANS_DELETE') || canForPath(baseRoute) ? (
                    <button 
                      onClick={() => setPrestamoAEliminar(prestamo.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Marcar como pérdida"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="inline-flex p-4 rounded-full bg-slate-50">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No se encontraron préstamos</h3>
                <p className="text-slate-500 font-medium">Intenta ajustar los filtros de búsqueda.</p>
              </div>
            </div>
          )}

          {/* Paginación Móvil */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="text-center">
                Mostrando {Math.min(prestamosPaginados.length, prestamosPorPagina)} de {totalPrestamos} resultados
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1 || cargando}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-1 transition-colors text-slate-700"
                >
                  <ChevronLeft className="h-3 w-3" /> Anterior
                </button>
                <button 
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas || totalPaginas === 0 || cargando}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-1 transition-colors text-slate-700"
                >
                  Siguiente <ChevronRightIcon className="h-3 w-3" />
                </button>
              </div>
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
            handleRefresh();
          }}
        />
      )}

      {idPrestamoDetalle && (
        <DetallePrestamoModal
          id={idPrestamoDetalle}
          onClose={() => setIdPrestamoDetalle(null)}
        />
      )}

      {/* Modal de Crear Crédito */}
      <CrearCreditoModal
        isOpen={showCrearCreditoModal}
        onClose={() => setShowCrearCreditoModal(false)}
        onConfirm={async (data) => {
          try {
            // Obtener userId del token
            const token = localStorage.getItem('token');
            let userId = '';
            if (token) {
              try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                userId = payload.sub || payload.id || '';
              } catch { /* ignore */ }
            }

            const isArticulo = String(data.creditType || '').toLowerCase() === 'articulo';
            const esContado = isArticulo && (
              (data.numCuotas !== undefined && data.numCuotas === 1) ||
              (data.plazoMeses !== undefined && data.plazoMeses === 1)
            );
            const freq = esContado ? 'MENSUAL' : (data.frecuenciaPago || 'DIARIO');

            // Si es artículo, usamos lo que ya calculó el modal
            // Si es préstamo, calculamos plazoMeses
            let plazoMeses = data.plazoMeses || 1;
            if (!isArticulo) {
              const numCuotas = data.cuotasTotales || 1;
              switch (freq) {
                case 'DIARIO': plazoMeses = Math.ceil(numCuotas / 30); break;
                case 'SEMANAL': plazoMeses = Math.ceil(numCuotas / 4); break;
                case 'QUINCENAL': plazoMeses = Math.ceil(numCuotas / 2); break;
                case 'MENSUAL': plazoMeses = numCuotas; break;
              }
            } else if (esContado) {
              plazoMeses = 1;
            }

            const backendData: any = {
              clienteId: data.clienteCreditoId,
              tipoPrestamo: isArticulo ? 'ARTICULO' : 'EFECTIVO',
              monto: data.monto || 0,
              tasaInteres: esContado ? 0 : (data.tasaInteres || 0),
              tasaInteresMora: 2.0,
              plazoMeses: data.plazoMeses || 1,
              cantidadCuotas: data.cantidadCuotas || data.cuotas || 0,
              cuotas: data.cuotas || data.cantidadCuotas || 0,
              frecuenciaPago: freq,
              tipoAmortizacion: data.tipoInteres || 'INTERES_SIMPLE',
              fechaInicio: data.fechaInicio || new Date().toISOString().split('T')[0],
              creadoPorId: userId,
              notas: data.notas // IMPORTANTE: Pasar las notas
            };

            if (data.articuloId) {
              backendData.productoId = data.articuloId;
              if (data.precioProductoId) {
                backendData.precioProductoId = data.precioProductoId;
              }
            }

            if (!esContado) {
              if (data.cuotaInicialArticulo) {
                backendData.cuotaInicial = data.cuotaInicialArticulo;
              }
              if (data.fechaPrimerCobro) {
                backendData.fechaPrimerCobro = data.fechaPrimerCobro;
              }
            }

            if (esContado) {
              backendData.notas = 'Venta de artículo de contado';
            }

            console.log('[CREAR_PRESTAMO_PAYLOAD]', backendData);
            const response = await prestamosService.crearPrestamo(backendData);
            console.log('[CREDITO_CREADO] Respuesta del backend:', response);
            
            showNotification('success', 'El crédito ha sido creado exitosamente', 'Crédito Creado');
            setShowCrearCreditoModal(false);
            
            // Esperar un momento para que la BD se actualice antes de refrescar
            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (paginaActual === 1) {
              handleRefresh();
            } else {
              setPaginaActual(1);
            }
          } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'No se pudo crear el crédito';
            showNotification('error', Array.isArray(msg) ? msg.join(', ') : msg, 'Error al Crear Crédito');
          }
        }}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={!!prestamoAEliminar}
        onClose={() => setPrestamoAEliminar(null)}
        onConfirm={handleEliminarPrestamo}
        title="Archivar Préstamo"
        message="¿Está seguro de que desea archivar este préstamo? El préstamo será archivado y podrá ser restaurado desde la sección de Archivados."
        confirmText="Archivar"
        cancelText="Cancelar"
        variant="warning"
      />
    </div>
  );
};

export default ListadoPrestamosElegante;
