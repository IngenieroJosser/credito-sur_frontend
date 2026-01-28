'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientesService, Cliente, MOCK_CLIENTES } from '@/services/clientes-service';
import {
  Search,
  User,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FiltroRuta from '@/components/filtros/FiltroRuta';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';

type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';

// Extender el tipo cliente con info de comportamiento para el coordinador
interface ClienteCoordinador extends Cliente {
  score: number; // 0-100
  tendencia: 'SUBE' | 'BAJA' | 'ESTABLE';
  ultimaVisita: string;
}

const ClientesCoordinador = () => {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteCoordinador[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await clientesService.obtenerClientes()
        const rawData = Array.isArray(data) ? data : MOCK_CLIENTES
        
        // Mapear a datos enriquecidos para el coordinador
        const enriched: ClienteCoordinador[] = rawData.map(c => ({
          ...c,
          score: Math.floor(Math.random() * (100 - 40 + 1)) + 40,
          tendencia: Math.random() > 0.6 ? 'SUBE' : Math.random() > 0.3 ? 'ESTABLE' : 'BAJA',
          ultimaVisita: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }))

        if (mounted) setClientes(enriched)
      } catch {
        if (mounted) setClientes([])
      } finally {
        if (mounted) setIsLoading(false)
      }
    })()

    return () => { mounted = false }
  }, [])

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiesgo, setFilterRiesgo] = useState<string>('all');
  const [filterRuta, setFilterRuta] = useState<string | null>(null);

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = 
      `${cliente.nombres} ${cliente.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.dni.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRiesgo = filterRiesgo === 'all' || cliente.nivelRiesgo === filterRiesgo;
    const matchesRuta = !filterRuta || filterRuta === '' || cliente.rutaId === filterRuta;
    
    return matchesSearch && matchesRiesgo && matchesRuta;
  });

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

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-8 py-8 space-y-8 text-slate-900">
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-blue-200 text-[#08557f] rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-sm font-black text-sm active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Buen Comportamiento</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{clientes.filter(c => c.score >= 80).length} Clientes</h3>
              <p className="text-xs text-slate-500 mt-1">Con puntaje superior a 80 pts</p>
           </div>
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">En Riesgo</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{clientes.filter(c => c.score < 50).length} Clientes</h3>
              <p className="text-xs text-slate-500 mt-1">Requieren intervención o cobro jurídico</p>
           </div>
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score Promedio</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">
                {clientes.length > 0 ? (clientes.reduce((acc, c) => acc + c.score, 0) / clientes.length).toFixed(1) : 0} Pts
              </h3>
              <p className="text-xs text-slate-500 mt-1">Promedio global de la cartera</p>
           </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white border border-slate-200 p-4 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Filtro de Ruta Integrado con estilo estándar */}
            <div className="bg-slate-50 p-1 rounded-xl border border-slate-200">
                <FiltroRuta 
                    onRutaChange={setFilterRuta} 
                    selectedRutaId={filterRuta}
                    className="w-48"
                    showAllOption={true}
                />
            </div>
            
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
               {['all', 'VERDE', 'AMARILLO', 'ROJO'].map(r => (
                 <button 
                  key={r}
                  onClick={() => setFilterRiesgo(r)}
                  className={cn("px-4 py-2 text-xs font-bold rounded-xl transition-all border", filterRiesgo === r ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100")}
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
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
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
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">Cargando base de datos...</td></tr>
              ) : filteredClientes.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{c.nombres} {c.apellidos}</p>
                    <p className="text-[10px] text-slate-500">{c.telefono}</p>
                  </td>
                  <td className="px-6 py-4">
                     <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border", getRiesgoColor(c.nivelRiesgo))}>
                        {c.nivelRiesgo}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold">
                    <div className="flex flex-col items-center">
                      <span className={cn("text-lg", getScoreColor(c.score))}>{c.score}</span>
                      <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className={cn("h-full", c.score >= 70 ? 'bg-emerald-500' : 'bg-rose-500')} style={{ width: `${c.score}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-bold text-xs">
                       <RenderTendencia t={c.tendencia} />
                       <span className="text-slate-600">{c.tendencia}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {c.ultimaVisita}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => router.push(`/coordinador/clientes/${c.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <NuevoClienteModal 
          onClose={() => setIsModalOpen(false)} 
          onClienteCreado={(nuevo) => {
            console.log('Cliente creado:', nuevo);
            setIsModalOpen(false);
            // Opcionalmente actualizar la lista local
          }} 
        />
      )}
    </div>
  );
};

export default ClientesCoordinador;
