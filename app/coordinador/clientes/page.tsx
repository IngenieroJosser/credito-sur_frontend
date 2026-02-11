'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clientesService, Cliente, ClientesFilters } from '@/services/cliente-service';
import {
  Search,
  User,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  UserPlus,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FiltroRuta from '@/components/filtros/FiltroRuta';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import { formatErrorForComponent } from '@/lib/api/api';
import AnimacionCarga from '@/components/ui/AnimacionCarga';

type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';

// Extender el tipo cliente con info de comportamiento para el coordinador
interface ClienteCoordinador extends Cliente {
  score: number; // 0-100
  tendencia: 'SUBE' | 'BAJA' | 'ESTABLE';
  ultimaVisita: string;
}

const ClientesCoordinador = () => {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteCoordinador[]>([]); // Inicializado como array vacío
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    buenComportamiento: 0,
    enRiesgo: 0,
    scorePromedio: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadClientes = useCallback(async (filters: ClientesFilters = {}) => {
    try {
      if (!refreshing) setIsLoading(true);
      setError(null);
      
      const response = await clientesService.obtenerClientes(filters);
      
      // Verificar si response.clientes existe, sino usar array vacío
      const clientesData = response?.clientes || [];
      
      // Los datos ya vienen con score, tendencia y ultimaVisita del backend
      setClientes(clientesData as ClienteCoordinador[]);
      
      // Asegúrate de que estadisticas tenga valores por defecto si viene undefined
      setEstadisticas({
        total: response?.estadisticas?.total || 0,
        buenComportamiento: response?.estadisticas?.buenComportamiento || 0,
        enRiesgo: response?.estadisticas?.enRiesgo || 0,
        scorePromedio: response?.estadisticas?.scorePromedio || 0
      });
      
    } catch (err) {
      const errorMessage = formatErrorForComponent(err);
      setError(errorMessage);
      console.error('Error loading clients:', err);
      // Asegurar que clientes sea array vacío en caso de error
      setClientes([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiesgo, setFilterRiesgo] = useState<string>('all');
  const [filterRuta, setFilterRuta] = useState<string | null>(null);

  const handleFilterChange = () => {
    const filters: ClientesFilters = {
      nivelRiesgo: filterRiesgo !== 'all' ? filterRiesgo : undefined,
      ruta: filterRuta || undefined,
      search: searchTerm || undefined,
    };
    loadClientes(filters);
  };

  useEffect(() => {
    // Usar debounce para evitar demasiadas llamadas a la API
    const timeoutId = setTimeout(() => {
      handleFilterChange();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterRiesgo, filterRuta]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadClientes();
  };

  const handleNewClientCreated = async (cliente: any) => {
    // Recargar la lista después de crear un cliente
    await loadClientes();
  };

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'AMARILLO': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ROJO': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'LISTA_NEGRA': return 'bg-slate-800 text-white border-slate-700';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  const RenderTendencia = ({ t }: { t: string }) => {
    if (t === 'SUBE') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (t === 'BAJA') return <TrendingDown className="h-4 w-4 text-rose-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  // Verificar si hay clientes para mostrar
  const hasClientes = clientes && clientes.length > 0;

  // Estado de error
  if (isLoading) {
    return <AnimacionCarga texto="Cargando clientes..." />
  }

  if (error && clientes.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="p-4 rounded-3xl bg-white border border-rose-100 shadow-lg inline-block mb-6">
            <AlertCircle className="h-12 w-12 text-rose-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Error al cargar clientes</h3>
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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-8 py-8 space-y-8 text-slate-900">
        {/* Estado de carga durante refresh */}
        {refreshing && (
          <div className="fixed top-20 right-4 z-50">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-[#08557f] animate-spin" />
              <span className="text-xs font-bold text-slate-600">Actualizando datos...</span>
            </div>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 mb-2">
              <User className="h-3.5 w-3.5 text-blue-500" />
              <span>Análisis de Comportamiento</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Cartera de </span><span className="text-slate-900">Clientes</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Monitorea el cumplimiento y hábito de pago de cada cliente.</p>
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
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-blue-200 text-[#08557f] rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-sm font-black text-sm active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Buen Comportamiento</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {estadisticas?.buenComportamiento || 0} Clientes
            </h3>
            <p className="text-xs text-slate-500 mt-1">Con puntaje superior a 80 pts</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">En Riesgo</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">
              {estadisticas?.enRiesgo || 0} Clientes
            </h3>
            <p className="text-xs text-slate-500 mt-1">Requieren intervención o cobro jurídico</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score Promedio</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">
              {estadisticas?.scorePromedio ? estadisticas.scorePromedio.toFixed(1) : '0.0'} Pts
            </h3>
            <p className="text-xs text-slate-500 mt-1">Promedio global de la cartera</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white border border-slate-200 p-4 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <FiltroRuta 
                onRutaChange={setFilterRuta} 
                selectedRutaId={filterRuta}
                showAllOption={true}
            />
            
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
               {['all', 'VERDE', 'AMARILLO', 'ROJO'].map(r => (
                 <button 
                  key={r}
                  onClick={() => setFilterRiesgo(r)}
                  disabled={isLoading}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-xl transition-all border",
                    filterRiesgo === r 
                      ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" 
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                 >
                   {r === 'all' ? 'Todos' : r}
                 </button>
               ))}
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente / Contacto</th>
                <th className="px-6 py-4">Cumplimiento</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4">Tendencia</th>
                <th className="px-6 py-4">Últ. Visita</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic-header">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-slate-100 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-slate-100 rounded-full w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 bg-slate-100 rounded w-12 mx-auto"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 bg-slate-100 rounded w-8 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : hasClientes ? (
                clientes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{c.nombres} {c.apellidos}</p>
                      <p className="text-[10px] text-slate-500">{c.telefono}</p>
                    </td>
                    <td className="px-6 py-4">
                     <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border", getRiesgoColor(c.nivelRiesgo as NivelRiesgo))}>
                        {c.nivelRiesgo}
                     </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      <div className="flex flex-col items-center">
                        <span className={cn("text-lg", getScoreColor(c.score || c.puntaje || 0))}>
                          {c.score || c.puntaje || 0}
                        </span>
                        <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={cn("h-full", (c.score || c.puntaje || 0) >= 70 ? 'bg-emerald-500' : 'bg-rose-500')} 
                            style={{ width: `${Math.min((c.score || c.puntaje || 0), 100)}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-bold text-xs">
                         <RenderTendencia t={c.tendencia || 'ESTABLE'} />
                         <span className="text-slate-600">{c.tendencia || 'ESTABLE'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {c.ultimaVisita || 'Nunca'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => router.push(`/coordinador/clientes/${c.id}`)} 
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4">
                      <Search className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No se encontraron clientes</h3>
                    <p className="text-slate-500 mt-1 font-medium">
                      {error ? 'Hubo un error al cargar los datos' : 'Intenta ajustar los filtros de búsqueda'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <NuevoClienteModal 
          onClose={() => setIsModalOpen(false)} 
          onClienteCreado={handleNewClientCreated} 
        />
      )}
    </div>
  );
};

export default ClientesCoordinador;
