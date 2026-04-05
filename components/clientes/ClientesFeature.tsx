'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNotification } from '@/components/providers/NotificationProvider';
import { clientesService, Cliente } from '@/services/clientes-service';
import { ClienteAdmin } from '@/lib/clientes-data';
import { usePermission } from '@/hooks/usePermission';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { usePageFocusRefresh } from '@/hooks/usePageFocusRefresh';
import {
  Search,
  Filter,
  UserPlus,
  Users,
  User,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Eye,
  Pencil,
  AlertTriangle,
  Ban,
  DollarSign,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import FiltroRuta from '@/components/filtros/FiltroRuta';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import ClientePortalModal from '@/components/cliente/ClientePortalModal';
import { offlineStore } from '@/lib/offline/offlineDb';
import { WifiOff } from 'lucide-react';
import { ExportButton } from '@/components/ui/ExportButton';
import { exportService } from '@/services/export-service';

// Tipos locales
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';

interface ClientesFeatureProps {
  initialClientes: ClienteAdmin[];
  basePath?: string;
  defaultFilterRiesgo?: string;
  defaultFilterEstado?: 'GENERAL' | 'MORA' | 'VENCIDAS';
}

export default function ClientesFeature({ 
  initialClientes, 
  basePath = '/admin/clientes',
  defaultFilterRiesgo = 'all',
  defaultFilterEstado = 'GENERAL'
}: ClientesFeatureProps) {
  const { can, canForPath } = usePermission();
  
  // Verificación de permisos más robusta
  const permitido = can('CLIENTES_VIEW') || canForPath(basePath);
  const puedeCrear = can('CLIENTES_CREATE') || canForPath(basePath);
  const puedeEditar = can('CLIENTES_EDIT') || canForPath(basePath);
  const puedeEliminar = can('CLIENTES_DELETE') || canForPath(basePath);
  
  const { showNotification } = useNotification();
  
  const [clientes, setClientes] = useState<ClienteAdmin[]>(initialClientes);
  const [dataSource, setDataSource] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    if (initialClientes.length === 0) {
      offlineStore.getAll<ClienteAdmin>('clientes').then((offlineData) => {
        if (offlineData.length > 0) {
          setClientes(offlineData);
          setDataSource('offline');
        }
      }).catch(() => {});
    } else {
      offlineStore.saveMany('clientes', initialClientes).catch(() => {});
    }
  }, [initialClientes]);

  const refetch = useCallback(async () => {
    try {
      const fresh = await clientesService.obtenerTodos();
      if (Array.isArray(fresh) && fresh.length > 0) {
        setClientes(fresh as ClienteAdmin[]);
        offlineStore.saveMany('clientes', fresh as ClienteAdmin[]).catch(() => {});
        setDataSource('online');
        return;
      }
      const cached = await offlineStore.getAll<ClienteAdmin>('clientes');
      if (cached.length > 0) { setClientes(cached); setDataSource('offline'); }
    } catch {
      offlineStore.getAll<ClienteAdmin>('clientes').then((cached) => {
        if (cached.length > 0) { setClientes(cached); setDataSource('offline'); }
      }).catch(() => {});
    }
  }, []);

  // Tiempo real: refresca ante cualquier cambio del backend
  useRealtimeData(
    ['clientes_actualizados', 'prestamos_actualizados', 'pagos_actualizados', 'rutas_actualizadas', 'dashboards_actualizados'],
    refetch,
  );

  // Refresca silenciosamente al volver al foco o al reconectar el socket
  usePageFocusRefresh(refetch);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiesgo, setFilterRiesgo] = useState<string>(defaultFilterRiesgo);
  const [filterEstadoCuenta, setFilterEstadoCuenta] = useState<'GENERAL' | 'MORA' | 'VENCIDAS'>(defaultFilterEstado);
  const [filterRuta, setFilterRuta] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Cliente | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  const RenderTendencia =({ t }: { t: string }) => {
    if (t === 'SUBE') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (t === 'BAJA') return <TrendingDown className="h-4 w-4 text-rose-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return 'text-emerald-600 bg-emerald-50 ring-emerald-600/20';
      case 'AMARILLO': return 'text-amber-600 bg-amber-50 ring-amber-600/20';
      case 'ROJO': return 'text-rose-600 bg-rose-50 ring-rose-600/20';
      case 'LISTA_NEGRA': return 'text-slate-800 bg-slate-200 ring-slate-600/20';
      default: return 'text-slate-600 bg-slate-50 ring-slate-600/20';
    }
  };

  const getRiesgoIcon = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return <CheckCircle className="h-4 w-4" />;
      case 'AMARILLO': return <AlertTriangle className="h-4 w-4" />;
      case 'ROJO': return <AlertCircle className="h-4 w-4" />;
      case 'LISTA_NEGRA': return <Ban className="h-4 w-4" />;
    }
  };

  const handleDeleteClick = (cliente: Cliente) => {
    setClientToDelete(cliente);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      await clientesService.eliminarCliente(clientToDelete.id);
      setClientes((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
      showNotification('success', 'El cliente ha sido archivado exitosamente', 'Cliente Archivado');
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 500) {
        setClientes((prev) => prev.filter((c) => c.id !== clientToDelete.id));
        setIsDeleteModalOpen(false);
        setClientToDelete(null);
        showNotification('warning', 'Cliente eliminado del cache local (no existía en el servidor)', 'Cliente Offline Eliminado');
      } else {
        showNotification('error', 'No se pudo archivar el cliente. Por favor intente de nuevo.', 'Error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = {
    total: clientes.length,
    verde: clientes.filter(c => c.nivelRiesgo === 'VERDE').length,
    amarillo: clientes.filter(c => c.nivelRiesgo === 'AMARILLO').length,
    rojo: clientes.filter(c => c.nivelRiesgo === 'ROJO').length,
    listaNegra: clientes.filter(c => c.enListaNegra).length,
    totalDeuda: clientes.reduce((sum, c) => sum + (c.montoTotal ?? 0), 0),
    totalMora: clientes.reduce((sum, c) => sum + (c.montoMora ?? 0), 0)
  };

  const esMora = (cliente: ClienteAdmin) => (cliente.montoMora ?? 0) > 0 || (cliente.diasMora ?? 0) > 0;
  const esVencida = (cliente: ClienteAdmin) => (cliente.diasMora ?? 0) >= 30;

  const totalClientesMora = useMemo(() => clientes.filter(esMora).length, [clientes]);
  const totalClientesVencidas = useMemo(() => clientes.filter(esVencida).length, [clientes]);

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = 
      `${cliente.nombres || ''} ${cliente.apellidos || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.dni || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.correo && cliente.correo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRiesgo = filterRiesgo === 'all' || cliente.nivelRiesgo === filterRiesgo;
    const matchesRuta = !filterRuta || filterRuta === '' || cliente.rutaId === filterRuta;
    const matchesEstado = 
      filterEstadoCuenta === 'GENERAL' ? true :
      filterEstadoCuenta === 'MORA' ? esMora(cliente) :
      esVencida(cliente);

    return matchesSearch && matchesRiesgo && matchesRuta && matchesEstado;
  });

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClientes.slice(indexOfFirstItem, indexOfLastItem);

  if (!permitido) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 font-bold border border-slate-200">
            <Users className="h-3.5 w-3.5" />
            <span>Acceso no autorizado</span>
          </div>
          <p className="mt-4 text-slate-500 font-medium">No tienes permisos para ver Clientes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      </div>
      
      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-xs text-primary tracking-wide font-bold border border-primary/20 mb-2">
              <User className="h-3.5 w-3.5" />
              <span>Gestión de Clientes</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Listado de </span><span className="text-orange-500">Clientes</span>
            </h1>
          </div>
          {puedeCrear && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm"
            >
              <UserPlus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
              Nuevo Cliente
            </button>
          )}
          <ExportButton
            onExportExcel={() =>
              exportService.exportClientes('excel', {
                nivelRiesgo: filterRiesgo !== 'all' ? filterRiesgo : undefined,
                ruta: filterRuta || undefined,
                search: searchTerm || undefined,
              })
            }
            onExportPDF={() =>
              exportService.exportClientes('pdf', {
                nivelRiesgo: filterRiesgo !== 'all' ? filterRiesgo : undefined,
                ruta: filterRuta || undefined,
                search: searchTerm || undefined,
              })
            }
            label="Exportar Clientes"
          />
        </div>

        {dataSource === 'offline' && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
            <WifiOff className="h-3.5 w-3.5" />
            Mostrando datos guardados localmente. Algunos datos pueden no estar actualizados.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clientes</span>
              <User className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          
          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Buen Estado</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.verde}</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Riesgo Medio</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.amarillo}</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Alto Riesgo</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.rojo}</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mora Total</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalMora)}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
              <div className="flex items-center gap-1.5 bg-slate-100/50 p-1 rounded-xl border border-slate-200">
                {[
                  { id: 'GENERAL' as const, label: `Todos (${stats.total})` },
                  { id: 'MORA' as const, label: `Mora (${totalClientesMora})` },
                  { id: 'VENCIDAS' as const, label: `Vencidas (${totalClientesVencidas})` },
                ].map((filtro) => (
                  <button
                    key={filtro.id}
                    onClick={() => {
                      setFilterEstadoCuenta(filtro.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap ${
                      filterEstadoCuenta === filtro.id 
                        ? 'bg-white text-primary shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 mx-1 md:block hidden" />

              {[
                { id: 'all', label: 'Riesgo: Todos' },
                { id: 'VERDE', label: 'Al Día' },
                { id: 'AMARILLO', label: 'Riesgo' },
                { id: 'ROJO', label: 'Rojo' },
                { id: 'LISTA_NEGRA', label: 'Lista Negra' }
              ].map((filtro) => (
                <button
                  key={filtro.id}
                  onClick={() => {
                    setFilterRiesgo(filtro.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                    filterRiesgo === filtro.id 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 mx-1 md:block hidden" />

              <FiltroRuta 
                  onRutaChange={setFilterRuta} 
                  selectedRutaId={filterRuta}
                  layout="wrap"
                  showAllOption={true}
                  hideLabel={true}
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
              {[
                { id: 'all', label: 'Todos' },
                { id: 'VERDE', label: 'Al Día' },
                { id: 'AMARILLO', label: 'Riesgo' },
                { id: 'ROJO', label: 'Mora' },
                { id: 'LISTA_NEGRA', label: 'Lista' }
              ].map((filtro) => (
                <button
                  key={filtro.id}
                  onClick={() => {
                    setFilterRiesgo(filtro.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                    filterRiesgo === filtro.id 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, cédula o teléfono..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-primary transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="hidden md:block bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Finanzas</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tendencia</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.length > 0 ? (
                  currentItems.map((cliente, index) => {
                    const isPending = cliente.estadoAprobacion === 'PENDIENTE' || cliente.id?.includes('offline') || cliente.id?.includes('temp');
                    return (
                    <tr
                      key={cliente.id || `client-${index}`}
                      className={cn(
                        "transition-colors group cursor-pointer",
                        isPending ? "bg-amber-50/50 hover:bg-amber-100/50" : "hover:bg-slate-50/50"
                      )}
                      onClick={() => {
                        setSelectedClientId(cliente.id);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                              isPending ? 'bg-amber-100 text-amber-700' :
                              cliente.nivelRiesgo === 'VERDE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : cliente.nivelRiesgo === 'AMARILLO'
                                  ? 'bg-amber-100 text-amber-700'
                                  : cliente.nivelRiesgo === 'ROJO'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isPending ? <Clock className="h-5 w-5" /> : (
                              <>
                                {cliente.nombres?.charAt(0) || '?'}
                                {cliente.apellidos?.charAt(0) || ''}
                              </>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              {(cliente.nombres || cliente.apellidos) ? `${cliente.nombres} ${cliente.apellidos}` : 'Cliente sin nombre'}
                              {isPending && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 text-[9px] font-black text-amber-700 uppercase tracking-tighter border border-amber-200">
                                  {cliente.id?.includes('offline') ? 'OFFLINE' : 'PENDIENTE'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center mt-0.5 font-mono font-medium">
                              CC: {cliente.dni}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-inset ${getRiesgoColor(
                              cliente.nivelRiesgo || 'VERDE' as any
                            )}`}
                          >
                            <span className="mr-1.5">{getRiesgoIcon(cliente.nivelRiesgo || 'VERDE' as any)}</span>
                            {(cliente.nivelRiesgo || 'VERDE').replace('_', ' ')}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-bold">
                         {cliente.score && (
                          <div className="flex flex-col items-center">
                            <span className={`text-lg ${getScoreColor(cliente.score)}`}>{cliente.score}</span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                              <div className={`h-full ${cliente.score >= 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${cliente.score}%` }} />
                            </div>
                          </div>
                         )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-900">
                            {formatCurrency(cliente.montoTotal ?? 0)}
                          </div>
                          {(cliente.montoMora ?? 0) > 0 && (
                            <div className="text-xs text-rose-600 font-bold flex items-center">
                              Mora: {formatCurrency(cliente.montoMora ?? 0)}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {cliente.tendencia && (
                          <div className="flex items-center gap-2 font-bold text-xs">
                             <RenderTendencia t={cliente.tendencia} />
                             <span className="text-slate-600">{cliente.tendencia}</span>
                          </div>
                        )}
                        {cliente.ultimaVisita && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium mt-1">
                            <Calendar className="h-3 w-3" />
                            {cliente.ultimaVisita}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm font-medium text-slate-600">
                            <Phone className="h-3 w-3 mr-2 text-slate-400" />
                            {cliente.telefono}
                          </div>
                          {cliente.correo && (
                            <div className="flex items-center text-xs font-medium text-slate-500">
                              <Mail className="h-3 w-3 mr-2 text-slate-400" />
                              {cliente.correo}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedClientId(cliente.id);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {puedeEditar && (
                            <button
                              onClick={() => {
                                setClientToEdit(cliente);
                                setIsEditModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {puedeEliminar && (
                            <button
                              onClick={() => handleDeleteClick(cliente)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-500">
                      No se encontraron resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs text-slate-500">
             <span>Mostrando {currentItems.length} de {filteredClientes.length} resultados</span>
             <div className="flex gap-2">
               <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50">Anterior</button>
               <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50">Siguiente</button>
             </div>
          </div>
        </div>

        <div className="md:hidden space-y-4">
          {currentItems.map((cliente, index) => {
            const isPending = cliente.estadoAprobacion === 'PENDIENTE' || cliente.id?.includes('offline') || cliente.id?.includes('temp');
            return (
            <div 
              key={cliente.id || `client-${index}`} 
              className={cn(
                "border rounded-2xl p-4 transition-all",
                isPending ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-white border-slate-200"
              )}
              onClick={() => { setSelectedClientId(cliente.id); setIsDetailsModalOpen(true); }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                   <div className={cn(
                     "w-10 h-10 rounded-lg flex items-center justify-center font-bold",
                     isPending ? "bg-amber-100 text-amber-700" : "bg-slate-100"
                   )}>
                     {isPending ? <Clock className="h-5 w-5" /> : (cliente.nombres?.charAt(0) || '?')}
                   </div>
                   <div>
                     <div className="font-bold flex items-center gap-2">
                       {cliente.nombres} {cliente.apellidos}
                       {isPending && (
                         <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-[8px] font-black text-amber-700 uppercase tracking-tighter">OFFLINE</span>
                       )}
                     </div>
                     <div className="text-xs text-slate-500 font-mono">CC: {cliente.dni}</div>
                   </div>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold",
                  isPending ? "bg-amber-200/50 text-amber-700" : getRiesgoColor(cliente.nivelRiesgo || 'VERDE' as any)
                )}>
                  {isPending ? 'PENDIENTE' : (cliente.nivelRiesgo || 'VERDE').replace('_', ' ')}
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                 <div className="text-sm font-bold">{formatCurrency(cliente.montoTotal ?? 0)}</div>
                 <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setSelectedClientId(cliente.id); setIsDetailsModalOpen(true); }} className="p-2 text-slate-400"><Eye className="h-4 w-4" /></button>
                    {puedeEditar && <button onClick={() => { setClientToEdit(cliente); setIsEditModalOpen(true); }} className="p-2 text-slate-400"><Pencil className="h-4 w-4" /></button>}
                    {puedeEliminar && <button onClick={() => handleDeleteClick(cliente)} className="p-2 text-slate-400"><Trash2 className="h-4 w-4" /></button>}
                 </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Archivado"
        footer={
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleteModalOpen(false)} 
              disabled={isDeleting}
              className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDelete} 
              disabled={isDeleting} 
              className="px-6 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-all duration-200 shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? 'Archivando...' : 'Sí, archivar'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 font-medium">
          ¿Estás seguro que deseas archivar al cliente <span className="font-bold text-slate-900">{clientToDelete?.nombres} {clientToDelete?.apellidos}</span>?
        </p>
      </Modal>

      {isCreateModalOpen && (
        <NuevoClienteModal
          onClose={() => setIsCreateModalOpen(false)}
          onClienteCreado={(nuevo: Cliente) => {
            setClientes([nuevo as ClienteAdmin, ...clientes]);
            setIsCreateModalOpen(false);
            showNotification('success', 'Cliente registrado exitosamente', 'Registro Exitoso');
          }}
        />
      )}

      {isEditModalOpen && clientToEdit && (
        <NuevoClienteModal
          cliente={clientToEdit}
          esEdicion={true}
          onClose={() => {
            setIsEditModalOpen(false);
            setClientToEdit(null);
          }}
          onClienteCreado={(editado: Cliente) => {
            setClientes(prev => prev.map((c) => {
              if (c.id !== editado.id) return c;
              const patch = editado as any;
              return {
                ...c,
                ...patch,
                score: patch.score ?? c.score,
                tendencia: patch.tendencia ?? c.tendencia,
                montoTotal: patch.montoTotal ?? c.montoTotal,
                montoMora: patch.montoMora ?? c.montoMora,
                ultimaVisita: patch.ultimaVisita ?? c.ultimaVisita,
                prestamosActivos: patch.prestamosActivos ?? c.prestamosActivos,
              } as ClienteAdmin;
            }));
            setIsEditModalOpen(false);
            setClientToEdit(null);
            showNotification('success', 'Los datos del cliente han sido actualizados', 'Cliente Actualizado');
          }}
        />
      )}


      {isDetailsModalOpen && selectedClientId && (
        <ClientePortalModal clientId={selectedClientId} onClose={() => { setIsDetailsModalOpen(false); setSelectedClientId(null); }} />
      )}
    </div>
  );
}
