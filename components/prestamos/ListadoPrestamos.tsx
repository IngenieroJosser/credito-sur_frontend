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
import { ExportButton } from '@/components/ui/ExportButton';
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
      offlineStore.saveMany('prestamos', response.prestamos).catch(() => {});
      
    } catch (err) {
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
    const handler = () => handleRefresh();
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

  const handleExportExcel = async () => {
    try {
      showNotification('info', 'Generando archivo Excel...', 'Exportando');
      await exportService.exportLoans('excel', {
        estado: filtros.estado !== 'todos' ? filtros.estado : undefined,
        ruta: filtros.ruta !== 'todas' ? filtros.ruta : undefined,
        search: filtros.busqueda || undefined,
      });
      showNotification('success', 'Archivo descargado correctamente', 'Exportación Exitosa');
    } catch (err) {
      showNotification('error', 'Error al exportar. Intente de nuevo.', 'Error');
    }
  };

  const handleExportPDF = async () => {
    try {
      showNotification('info', 'Generando archivo PDF...', 'Exportando');
      await exportService.exportLoans('pdf', {
        estado: filtros.estado !== 'todos' ? filtros.estado : undefined,
        ruta: filtros.ruta !== 'todas' ? filtros.ruta : undefined,
        search: filtros.busqueda || undefined,
      });
      showNotification('success', 'Archivo descargado correctamente', 'Exportación Exitosa');
    } catch (err) {
      showNotification('error', 'Error al exportar. Intente de nuevo.', 'Error');
    }
  };

  const prestamosFiltrados = prestamos.filter(prestamo => {
    if (filtros.riesgo !== 'todos' && prestamo.riesgo !== filtros.riesgo) return false;
    if (filtros.cliente !== 'todos' && prestamo.clienteId !== filtros.cliente) return false;
    return true;
  });

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

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10">
        <div className="sticky top-0 z-30 bg-white border-b px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Listado Créditos</h1>
          </div>
          <div className="flex gap-2">
            <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
            <button onClick={handleRefresh} className="p-2 border rounded-xl"><RefreshCw className={refreshing ? 'animate-spin' : ''} /></button>
            {puedeCrear && <button onClick={() => setShowCrearCreditoModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">Nuevo Crédito</button>}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-white border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                   <th className="px-6 py-4 text-left">Préstamo</th>
                   <th className="px-6 py-4 text-left">Estado</th>
                   <th className="px-6 py-4 text-right">Monto</th>
                   <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prestamosPaginados.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setIdPrestamoDetalle(p.id)}>
                    <td className="px-6 py-4 font-bold">{p.numeroPrestamo}<br/><span className="text-xs font-normal text-slate-500">{p.cliente}</span></td>
                    <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded-full text-[10px] font-bold", getEstadoColor(p.estado))}>{p.estado}</span></td>
                    <td className="px-6 py-4 text-right font-bold">{formatCurrency(p.montoTotal)}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                       <button onClick={() => setIdPrestamoDetalle(p.id)}><Eye className="h-4 w-4" /></button>
                       <button onClick={() => setIdPrestamoAEditar(p.id)}><Edit2 className="h-4 w-4" /></button>
                       <button onClick={() => setPrestamoAEliminar(p.id)}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {idPrestamoDetalle && <DetallePrestamoModal id={idPrestamoDetalle} onClose={() => setIdPrestamoDetalle(null)} />}
      {idPrestamoAEditar && (
        <EditarPrestamoModal 
          id={idPrestamoAEditar} 
          onClose={() => setIdPrestamoAEditar(null)} 
          onSuccess={() => { setIdPrestamoAEditar(null); showNotification('success', 'Préstamo actualizado', 'Éxito'); handleRefresh(); }} 
        />
      )}
      {showCrearCreditoModal && <CrearCreditoModal isOpen={showCrearCreditoModal} onClose={() => setShowCrearCreditoModal(false)} onConfirm={async (data) => { /* logic */ showNotification('success', 'Crédito creado', 'Éxito'); handleRefresh(); setShowCrearCreditoModal(false); }} />}
      <ConfirmModal isOpen={!!prestamoAEliminar} onClose={() => setPrestamoAEliminar(null)} onConfirm={handleEliminarPrestamo} title="Archivar" message="¿Seguro?" confirmText="Archivar" variant="warning" />
    </div>
  );
};

export default ListadoPrestamosElegante;
