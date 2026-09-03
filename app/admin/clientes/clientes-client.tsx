'use client';


import Paginador from '@/components/ui/Paginador'
import { useState } from 'react';
import { useNotification } from '@/components/providers/NotificationProvider';
import { clientesService, Cliente } from '@/services/clientes-service';
import { ClienteAdmin } from '@/lib/clientes-data';
import { usePermission } from '@/hooks/usePermission';
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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import FiltroRuta from '@/components/filtros/FiltroRuta';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import { getBogotaDateKey } from '@/lib/rutas-core';
import ClientePortalModal from '@/components/cliente/ClientePortalModal';

// Tipos locales
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';

interface ClientesClientProps {
  initialClientes: ClienteAdmin[];
}

export default function ClientesClient({ initialClientes }: ClientesClientProps) {
  const { can, canForPath } = usePermission();
  const permitido = can('CLIENTES_VIEW') || canForPath('/clientes');
  const puedeCrear = can('CLIENTES_CREATE') || canForPath('/clientes');
  const puedeEditar = can('CLIENTES_EDIT') || canForPath('/clientes');
  const puedeEliminar = can('CLIENTES_DELETE') || canForPath('/clientes');
  
  // Hook de notificaciones para dar feedback visual al usuario (ej: "Cliente eliminado")
  const { showNotification } = useNotification();
  
  // Estado local de clientes, inicializado con lo que recibimos del servidor (SSR)
  const [clientes, setClientes] = useState<ClienteAdmin[]>(initialClientes);

  // --- CONTROLES DE INTERFAZ & FILTROS ---
  // Buscador textual: busca por nombre, cédula o correo
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtro por semáforo de riesgo: 'all', 'VERDE', 'AMARILLO', 'ROJO', 'LISTA_NEGRA'
  const [filterRiesgo, setFilterRiesgo] = useState<string>('all');
  
  // Filtro por ruta específica asignada
  const [filterRuta, setFilterRuta] = useState<string | null>(null);
  
  // Control de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Número de clientes por página para mantener la tabla limpia

  // --- GESTIÓN DE MODALES ---
  // Modal de confirmación para eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // Flag de carga durante el borrado

  // Modales de creación, edición y detalles
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Nuevo Cliente
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false); // Ver Expediente
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Editar Cliente
  const [clientToEdit, setClientToEdit] = useState<Cliente | null>(null);

  // --- AYUDAS VISUALES (HELPERS) ---
  
  // Determina el color del Score crediticio (Verde = bueno, Rojo = malo)
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  // Icono visual para la tendencia (si el cliente mejora o empeora su comportamiento)
  const RenderTendencia =({ t }: { t: string }) => {
    if (t === 'SUBE') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (t === 'BAJA') return <TrendingDown className="h-4 w-4 text-rose-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  // Estilos CSS (Colores y Fondos) según el nivel de riesgo
  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return 'text-emerald-600 bg-emerald-50 ring-emerald-600/20';
      case 'AMARILLO': return 'text-amber-600 bg-amber-50 ring-amber-600/20';
      case 'ROJO': return 'text-rose-600 bg-rose-50 ring-rose-600/20';
      case 'LISTA_NEGRA': return 'text-slate-800 bg-slate-200 ring-slate-600/20';
      default: return 'text-slate-600 bg-slate-50 ring-slate-600/20';
    }
  };

  // Icono representativo para cada nivel de riesgo
  const getRiesgoIcon = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return <CheckCircle className="h-4 w-4" />;
      case 'AMARILLO': return <AlertTriangle className="h-4 w-4" />;
      case 'ROJO': return <AlertCircle className="h-4 w-4" />;
      case 'LISTA_NEGRA': return <Ban className="h-4 w-4" />;
    }
  };

  // --- LÓGICA DE NEGOCIO ---

  // Prepara la eliminación de un cliente (abre modal)
  const handleDeleteClick = (cliente: Cliente) => {
    setClientToDelete(cliente);
    setIsDeleteModalOpen(true);
  };

  // Ejecuta la eliminación real contra el servicio
  const confirmDelete = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      await clientesService.eliminarCliente(clientToDelete.id);
      
      // Actualizamos la lista localmente para que desaparezca al instante
      setClientes((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
      showNotification('success', 'El cliente ha sido eliminado exitosamente', 'Cliente Eliminado');
    } catch (error) {
      console.error('Ups, falló la eliminación:', error);
      showNotification('error', 'No se pudo eliminar el cliente. Por favor intente de nuevo.', 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Cálculo de estadísticas en tiempo real basado en los clientes cargados
  const stats = {
    total: clientes.length,
    verde: clientes.filter(c => c.nivelRiesgo === 'VERDE').length,
    amarillo: clientes.filter(c => c.nivelRiesgo === 'AMARILLO').length,
    rojo: clientes.filter(c => c.nivelRiesgo === 'ROJO').length,
    listaNegra: clientes.filter(c => c.enListaNegra).length,
    totalDeuda: clientes.reduce((sum, c) => sum + (c.montoTotal ?? 0), 0),
    totalMora: clientes.reduce((sum, c) => sum + (c.montoMora ?? 0), 0)
  };

  // --- FILTRADO DE DATOS ---
  // Aquí aplicamos los filtros de búsqueda, riesgo y ruta combinados
  const filteredClientes = clientes.filter(cliente => {
    // 1. Buscador texto
    const matchesSearch = 
      `${cliente.nombres || ''} ${cliente.apellidos || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.dni || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.correo && cliente.correo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 2. Filtro Riesgo
    const matchesRiesgo = filterRiesgo === 'all' || cliente.nivelRiesgo === filterRiesgo;
    
    // 3. Filtro Ruta
    const matchesRuta = !filterRuta || filterRuta === '' || cliente.rutaId === filterRuta;
    
    return matchesSearch && matchesRiesgo && matchesRuta;
  });

  // --- PAGINACIÓN ---
  // Calculamos qué segmento del array mostramos
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
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      </div>
      
      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        
        {/* Header Standard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-xs text-primary tracking-wide font-bold border border-primary/20 mb-2">
              <User className="h-3.5 w-3.5" />
              <span>Gestión de Cartera</span>
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
        </div>

        {/* Estadísticas Elegantes */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clientes</span>
              <User className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">registrados</div>
          </div>
          
          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Buen Estado</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.verde}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">clientes al día</div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Riesgo Medio</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.amarillo}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">seguimiento</div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Alto Riesgo</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.rojo}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">acción requerida</div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mora Total</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalMora)}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">acumulada</div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* Filtro de Ruta Integrado */}
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 w-full md:w-auto">
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

        {/* Tabla Elegante */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
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
                  currentItems.map((cliente, index) => (
                    <tr
                      key={cliente.id || `client-${index}`}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedClientId(cliente.id);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                              cliente.nivelRiesgo === 'VERDE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : cliente.nivelRiesgo === 'AMARILLO'
                                  ? 'bg-amber-100 text-amber-700'
                                  : cliente.nivelRiesgo === 'ROJO'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cliente.nombres?.charAt(0) || '?'}
                            {cliente.apellidos?.charAt(0) || ''}
                          </div>
                          <div className="ml-4">
                            <div className="font-bold text-slate-900">
                              {(cliente.nombres || cliente.apellidos) ? `${cliente.nombres} ${cliente.apellidos}` : 'Cliente sin nombre'}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center mt-0.5 font-mono font-medium">
                              {cliente.dni}
                            </div>
                            {cliente.estadoAprobacion && cliente.estadoAprobacion !== 'APROBADO' && (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 uppercase">
                                  {cliente.estadoAprobacion === 'PENDIENTE' ? 'Pendiente de Aprobación' : cliente.estadoAprobacion}
                                </span>
                              </div>
                            )}
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
                            <span className="mr-1.5">{getRiesgoIcon(cliente.nivelRiesgo || 'VERDE' as any) || <AlertCircle className="h-4 w-4" />}</span>
                            {(cliente.nivelRiesgo || 'VERDE').replace('_', ' ')}
                          </div>
                          {cliente.enListaNegra && (
                            <div className="flex items-center text-xs text-rose-600 font-bold px-1">
                              <Ban className="h-3 w-3 mr-1" />
                              Lista Negra
                            </div>
                          )}
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
                            <div className="flex items-center text-xs font-medium text-slate-500 min-w-0">
                              <Mail className="h-3 w-3 mr-2 text-slate-400 shrink-0" />
                              <span className="truncate" title={cliente.correo || undefined}>{cliente.correo}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div
                          className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setSelectedClientId(cliente.id);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver Expediente"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {puedeEditar && (
                            <button
                              onClick={() => {
                                setClientToEdit(cliente);
                                setIsEditModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Editar cliente"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {puedeEliminar && (
                            <button
                              onClick={() => handleDeleteClick(cliente)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar cliente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr key="empty-state">
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                           <Users className="h-8 w-8 text-slate-200" />
                         </div>
                         <div className="space-y-1">
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Sin Clientes Disponibles</h3>
                           <p className="text-[11px] text-slate-500 font-medium">No se encontraron registros que coincidan con los filtros aplicados.</p>
                         </div>
                         <button 
                           onClick={() => {
                             setSearchTerm('');
                             setFilterRiesgo('all');
                             setFilterRuta(null);
                           }}
                           className="mt-2 text-[10px] font-black text-blue-600 border-b border-blue-600 pb-0.5 hover:text-blue-800 hover:border-blue-800 transition-all uppercase tracking-widest"
                         >
                           Limpiar Filtros
                         </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
            <Paginador
              pagina={currentPage}
              totalPaginas={totalPages}
              onCambiar={setCurrentPage}
              resumen={`Mostrando ${currentItems.length} de ${filteredClientes.length} resultados`}
              className="mt-0"
            />
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Eliminación"
        footer={
          <>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              disabled={isDeleting}
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-lg shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, eliminar cliente'}
            </button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-full">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-slate-600">
              ¿Estás seguro que deseas eliminar al cliente <span className="font-bold text-slate-900">{clientToDelete?.nombres} {clientToDelete?.apellidos}</span>?
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Esta acción no se puede deshacer y eliminará todos los préstamos asociados.
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal de Creación - Actualiza lista local */}
      {isCreateModalOpen && (
        <NuevoClienteModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onClienteCreado={(newClient: any) => {
            const enriched: ClienteAdmin = {
              ...newClient,
              id: newClient.id || newClient.aprobacionId || newClient.clienteCodigo || `temp-${Date.now()}`,
              codigo: newClient.codigo || newClient.clienteCodigo || 'PENDIENTE',
              score: 100,
              tendencia: 'ESTABLE',
              ultimaVisita: getBogotaDateKey(new Date())
            };
            setClientes(prev => [enriched, ...prev]);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Modal de Edición */}
      {isEditModalOpen && clientToEdit && (
        <NuevoClienteModal 
          cliente={clientToEdit}
          esEdicion={true}
          onClose={() => {
            setIsEditModalOpen(false);
            setClientToEdit(null);
          }} 
          onClienteCreado={(updatedClient) => {
            setClientes(prev => prev.map((c) => {
              if (c.id !== updatedClient.id) return c;
              const patch = updatedClient as any;
              return {
                ...c,
                ...patch,
                score: patch.score ?? (c as any).score,
                tendencia: patch.tendencia ?? (c as any).tendencia,
                montoTotal: patch.montoTotal ?? (c as any).montoTotal,
                montoMora: patch.montoMora ?? (c as any).montoMora,
                ultimaVisita: patch.ultimaVisita ?? (c as any).ultimaVisita,
                prestamosActivos: patch.prestamosActivos ?? (c as any).prestamosActivos,
              } as any;
            }));
            setIsEditModalOpen(false);
            setClientToEdit(null);
          }}
        />
      )}

      {/* Modal de Detalles del Cliente */}
      {isDetailsModalOpen && selectedClientId && (
        <ClientePortalModal 
          clientId={selectedClientId} 
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedClientId(null);
          }} 
          rolUsuario="admin"
        />
      )}
    </div>
  );
}
