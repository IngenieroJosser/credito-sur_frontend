'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Route,
  Users,
  Search,
  Eye,
  User,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

// --- TYPES ---
interface ClienteMock {
  id: string
  nombre: string
  direccion: string
  telefono: string
  deudaTotal: number
  cuotaDiaria: number
  ultimoPago: string
  estado: 'AL_DIA' | 'PENDIENTE' | 'MORA_LEVE' | 'MORA_GRAVE' | 'PAGO_HOY'
  diasAtraso: number
}

interface RutaMock {
  id: string
  nombre: string
  codigo: string
  cobrador: string
  clientes: number
  estado: 'ACTIVA' | 'PENDIENTE'
  avance: number
  meta: number
  recaudo: number
  isPersonal: boolean
  listaClientes: ClienteMock[]
}

// --- MOCK DATA ---
const MOCK_RUTAS_SUPERVISOR: RutaMock[] = [
  {
    id: 'RT-SUP',
    nombre: 'Mi Ruta Personal',
    codigo: 'SUP-001',
    cobrador: 'Supervisor (Tú)',
    clientes: 15,
    estado: 'ACTIVA',
    avance: 92,
    meta: 500000,
    recaudo: 460000,
    isPersonal: true,
    listaClientes: []
  },
  {
    id: 'RT-001',
    nombre: 'Ruta Norte Independencia',
    codigo: 'NOR-001',
    cobrador: 'Carlos Rodríguez',
    clientes: 45, 
    estado: 'ACTIVA',
    avance: 65,
    meta: 2500000,
    recaudo: 1625000,
    isPersonal: false,
    listaClientes: []
  },
  {
    id: 'RT-002',
    nombre: 'Ruta Centro Comercial',
    codigo: 'CEN-002',
    cobrador: 'Ana María López',
    clientes: 28,
    estado: 'ACTIVA',
    avance: 45,
    meta: 3800000,
    recaudo: 1710000,
    isPersonal: false,
    listaClientes: []
  },
  {
    id: 'RT-003',
    nombre: 'Ruta Sur - Expansión',
    codigo: 'SUR-003',
    cobrador: 'Jorge Martínez',
    clientes: 12,
    estado: 'PENDIENTE',
    avance: 0,
    meta: 1200000,
    recaudo: 0,
    isPersonal: false,
    listaClientes: []
  }
]

export default function SupervisorRutasPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  
  // Filtro
  const rutasFiltradas = MOCK_RUTAS_SUPERVISOR.filter(r => 
    r.nombre.toLowerCase().includes(search.toLowerCase()) ||
    r.cobrador.toLowerCase().includes(search.toLowerCase()) ||
    r.codigo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-600 opacity-10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        
        {/* Header Updated Colors */}
        <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700 tracking-wide font-bold border border-blue-100 mb-2">
              <Route className="h-3.5 w-3.5" />
              <span>Gestión Operativa</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              <span className="text-blue-600">Mis Rutas</span> <span className="text-orange-500">y Zonas</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm max-w-2xl">
              Supervisión de territorios asignados y mi ruta personal.
            </p>
        </div>

        {/* Stats Rapidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <MapPin className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Rutas</p>
                    <h3 className="text-2xl font-black text-slate-900">{MOCK_RUTAS_SUPERVISOR.length}</h3>
                </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Meta Global</p>
                    <h3 className="text-2xl font-black text-slate-900">{formatCurrency(MOCK_RUTAS_SUPERVISOR.reduce((acc, r) => acc + r.meta, 0))}</h3>
                </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Sin Actividad</p>
                    <h3 className="text-2xl font-black text-slate-900">
                        {MOCK_RUTAS_SUPERVISOR.filter(r => r.recaudo === 0).length}
                    </h3>
                </div>
             </div>
        </div>

        {/* Tabla */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4 bg-slate-50/50">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar ruta o cobrador..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 text-sm font-medium text-slate-900"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold tracking-wider">Ruta</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Responsable</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Cartera</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Avance</th>
                      <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rutasFiltradas.map((ruta) => (
                      <tr 
                        key={ruta.id}
                        className={`hover:bg-slate-50/80 transition-colors group ${ruta.isPersonal ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${ruta.isPersonal ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              <Route className="w-5 h-5" />
                            </div>
                            <div>
                               <div className="font-bold text-slate-900 flex items-center gap-2">
                                   {ruta.nombre}
                                   {ruta.isPersonal && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-sm">YO</span>}
                               </div>
                               <div className="text-xs text-slate-500 font-medium">{ruta.codigo}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2 text-slate-700 font-medium">
                               <User className="h-4 w-4 text-slate-400" />
                               {ruta.cobrador}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border',
                                ruta.estado === 'ACTIVA' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                'bg-orange-50 text-orange-700 border-orange-100'
                            )}>
                                {ruta.estado}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-1 font-bold text-slate-600">
                               <Users className="h-4 w-4 text-slate-400" />
                               {ruta.clientes}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="w-32">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-bold text-slate-700">{ruta.avance}%</span>
                                    <span className="text-slate-500">{formatCurrency(ruta.recaudo)}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${ruta.avance > 0 ? 'bg-blue-600' : 'bg-slate-300'}`} 
                                        style={{ width: `${ruta.avance}%` }}
                                    />
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => router.push(`/supervisor/rutas/${ruta.id}`)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver Detalle de Ruta"
                            >
                                <Eye className="h-4 w-4" />
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>

             <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs text-slate-500 font-medium">
                <span>Viendo {rutasFiltradas.length} rutas</span>
             </div>
        </div>
      </div>
    </div>
  )
}
