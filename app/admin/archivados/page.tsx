'use client'

import { Archive, Search, Filter, RefreshCw, Trash2, RotateCcw } from 'lucide-react'
import { useState } from 'react'

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Elementos Archivados
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial de elementos eliminados y papelera de reciclaje
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-[#08557f] hover:bg-[#08557f]/5 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <div className="sm:col-span-8 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border-none bg-white shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-[#08557f]/10 transition-all text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <div className="sm:col-span-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border-none bg-white shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-[#08557f]/10 transition-all text-sm text-gray-900 appearance-none cursor-pointer"
            >
              <option value="todos">Todos los tipos</option>
              <option value="cliente">Clientes</option>
              <option value="prestamo">Préstamos</option>
              <option value="usuario">Usuarios</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">Elemento</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Eliminado por</th>
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{item.nombre}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.motivo}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${item.tipo === 'cliente' ? 'bg-blue-50 text-blue-700' : 
                        item.tipo === 'prestamo' ? 'bg-emerald-50 text-emerald-700' : 
                        'bg-purple-50 text-purple-700'}`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {item.usuarioEliminador}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(item.fechaEliminacion).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Restaurar"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Archive className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No hay elementos archivados</h3>
            <p className="text-sm text-gray-500 mt-1">
              Los elementos que elimines aparecerán aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
