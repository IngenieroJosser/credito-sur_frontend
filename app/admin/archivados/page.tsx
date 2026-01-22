'use client'

import { Archive, Search, Filter, RefreshCw, Trash2, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// Mock data para elementos archivados
const ARCHIVADOS_MOCK = [
  {
    id: 1,
    tipo: 'cliente',
    nombre: 'Juan Pérez',
    fechaEliminacion: '2024-01-20T10:30:00',
    motivo: 'Duplicado',
    usuarioEliminador: 'Admin'
  },
  {
    id: 2,
    tipo: 'prestamo',
    nombre: 'Préstamo #1234 - María Gómez',
    fechaEliminacion: '2024-01-19T15:45:00',
    motivo: 'Error en registro',
    usuarioEliminador: 'Coordinador'
  },
  {
    id: 3,
    tipo: 'usuario',
    nombre: 'Carlos Vendedor',
    fechaEliminacion: '2024-01-15T09:00:00',
    motivo: 'Baja de personal',
    usuarioEliminador: 'Super Admin'
  }
]

export default function ArchivadosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('todos')

  const filteredItems = ARCHIVADOS_MOCK.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.motivo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = tipoFiltro === 'todos' || item.tipo === tipoFiltro
    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        {/* Header Standard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900 tracking-wide mb-2 border border-slate-200">
              <Archive className="h-3.5 w-3.5" />
              <span>Historial de Eliminaciones</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Elementos </span><span className="text-orange-500">Archivados</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Consulta y restaura registros que han sido eliminados del sistema.
            </p>
          </div>

          <div className="flex items-center gap-3">
             <button className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all">
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-2.5 w-full bg-slate-50/50 focus:bg-white border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm placeholder:text-slate-400 font-medium"
            />
          </div>
          <div className="w-full md:w-64">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="pl-11 pr-10 py-2.5 w-full bg-slate-50/50 focus:bg-white border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm font-medium appearance-none cursor-pointer"
              >
                <option value="todos">Todos los tipos</option>
                <option value="cliente">Clientes</option>
                <option value="prestamo">Préstamos</option>
                <option value="usuario">Usuarios</option>
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-5 font-bold tracking-wider">Elemento</th>
                    <th className="px-6 py-5 font-bold tracking-wider">Tipo</th>
                    <th className="px-6 py-5 font-bold tracking-wider">Fecha Eliminación</th>
                    <th className="px-6 py-5 font-bold tracking-wider">Motivo</th>
                    <th className="px-6 py-5 font-bold tracking-wider">Eliminado Por</th>
                    <th className="px-8 py-5 font-bold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm border border-slate-200 transition-transform group-hover:scale-105",
                              item.tipo === 'cliente' && "bg-blue-50 text-blue-700",
                              item.tipo === 'prestamo' && "bg-emerald-50 text-emerald-700",
                              item.tipo === 'usuario' && "bg-amber-50 text-amber-700"
                            )}>
                              {item.nombre.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-slate-900">{item.nombre}</span>
                          </div>
                        </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border",
                          item.tipo === 'cliente' && "bg-blue-50 text-blue-700 border-blue-100",
                          item.tipo === 'prestamo' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                          item.tipo === 'usuario' && "bg-amber-50 text-amber-700 border-amber-100"
                        )}>
                          {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-slate-600 font-medium">
                        {new Date(item.fechaEliminacion).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 text-slate-600 font-medium">
                        {item.motivo}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {item.usuarioEliminador.charAt(0)}
                          </div>
                          <span className="text-sm text-slate-600 font-bold">{item.usuarioEliminador}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                          <button 
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Restaurar"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-slate-50 p-6 rounded-full mb-6 border border-slate-100 shadow-sm">
                <Archive className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No hay elementos archivados</h3>
              <p className="text-slate-500 max-w-sm font-medium">
                No se encontraron elementos que coincidan con los filtros actuales.
              </p>
              <button 
                onClick={() => {setSearchTerm(''); setTipoFiltro('todos')}}
                className="mt-8 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:scale-105 transition-all"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
