'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  UserPlus,
  User,
  Phone,
  Mail,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit2,
  Shield,
  MapPin,
  AlertTriangle,
  Ban
} from 'lucide-react';

// Tipos alineados con Prisma Schema
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
type EstadoAprobacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';

interface Cliente {
  id: string;
  codigo: string;
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  telefono: string;
  direccion: string | null;
  referencia: string | null;
  nivelRiesgo: NivelRiesgo;
  puntaje: number;
  enListaNegra: boolean;
  estadoAprobacion: EstadoAprobacion;
  // Campos calculados / UI helpers (simulados por ahora)
  prestamosActivos: number;
  montoTotal: number;
  montoMora: number;
  diasMora: number;
  ultimoPago?: string;
}

const ClientesPage = () => {
  // Datos simulados alineados con la estructura
  const [clientes, setClientes] = useState<Cliente[]>([
    {
      id: '1',
      codigo: 'CL-001',
      dni: 'V-12345678',
      nombres: 'María',
      apellidos: 'González',
      correo: 'maria.gonzalez@email.com',
      telefono: '+58 412 555 1212',
      direccion: 'Av. Principal #123, Caracas',
      referencia: 'Frente a la panadería',
      nivelRiesgo: 'VERDE',
      puntaje: 95,
      enListaNegra: false,
      estadoAprobacion: 'APROBADO',
      prestamosActivos: 2,
      montoTotal: 12500,
      montoMora: 0,
      diasMora: 0,
      ultimoPago: '15/03/2024'
    },
    {
      id: '2',
      codigo: 'CL-002',
      dni: 'V-23456789',
      nombres: 'Carlos',
      apellidos: 'Rodríguez',
      correo: 'carlos.rodriguez@email.com',
      telefono: '+58 414 555 2323',
      direccion: 'Calle 45 #67-89, Valencia',
      referencia: 'Casa azul rejas negras',
      nivelRiesgo: 'ROJO',
      puntaje: 45,
      enListaNegra: false,
      estadoAprobacion: 'APROBADO',
      prestamosActivos: 1,
      montoTotal: 8500,
      montoMora: 1250,
      diasMora: 12,
      ultimoPago: '28/02/2024'
    },
    {
      id: '3',
      codigo: 'CL-003',
      dni: 'V-34567890',
      nombres: 'Ana',
      apellidos: 'Martínez',
      correo: 'ana.martinez@email.com',
      telefono: '+58 424 555 3434',
      direccion: 'Urb. Las Acacias, Maracaibo',
      referencia: null,
      nivelRiesgo: 'AMARILLO',
      puntaje: 72,
      enListaNegra: false,
      estadoAprobacion: 'APROBADO',
      prestamosActivos: 3,
      montoTotal: 28500,
      montoMora: 0,
      diasMora: 5,
      ultimoPago: '10/03/2024'
    },
    {
      id: '4',
      codigo: 'CL-004',
      dni: 'V-99999999',
      nombres: 'Pedro',
      apellidos: 'Pérez',
      correo: null,
      telefono: '+58 416 555 9999',
      direccion: 'Barrio Central',
      referencia: null,
      nivelRiesgo: 'LISTA_NEGRA',
      puntaje: 0,
      enListaNegra: true,
      estadoAprobacion: 'APROBADO',
      prestamosActivos: 0,
      montoTotal: 5000, // Deuda incobrable
      montoMora: 5000,
      diasMora: 120,
      ultimoPago: '01/01/2024'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiesgo, setFilterRiesgo] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Estadísticas
  const stats = {
    total: clientes.length,
    verde: clientes.filter(c => c.nivelRiesgo === 'VERDE').length,
    amarillo: clientes.filter(c => c.nivelRiesgo === 'AMARILLO').length,
    rojo: clientes.filter(c => c.nivelRiesgo === 'ROJO').length,
    listaNegra: clientes.filter(c => c.enListaNegra).length,
    totalDeuda: clientes.reduce((sum, c) => sum + c.montoTotal, 0),
    totalMora: clientes.reduce((sum, c) => sum + c.montoMora, 0)
  };

  // Filtros y búsqueda
  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = 
      `${cliente.nombres} ${cliente.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.correo && cliente.correo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRiesgo = filterRiesgo === 'all' || cliente.nivelRiesgo === filterRiesgo;
    
    return matchesSearch && matchesRiesgo;
  });

  // Paginación
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClientes.slice(indexOfFirstItem, indexOfLastItem);

  // Helpers de UI
  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return 'text-green-600 bg-green-50';
      case 'AMARILLO': return 'text-yellow-600 bg-yellow-50';
      case 'ROJO': return 'text-red-600 bg-red-50';
      case 'LISTA_NEGRA': return 'text-gray-800 bg-gray-200';
      default: return 'text-gray-600 bg-gray-50';
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

  const formatNumber = (num: number): string => {
    return num.toLocaleString('es-VE', { minimumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
                <p className="text-sm text-gray-500">Gestión de cartera y riesgos</p>
              </div>
            </div>

            <Link
              href="/admin/clientes/nuevo"
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm hover:shadow-md"
            >
              <UserPlus className="h-4 w-4" />
              <span className="font-medium">Nuevo Cliente</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <User className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">Total Clientes</div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-semibold text-gray-900">{stats.verde}</div>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">Buen Comportamiento</div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-semibold text-gray-900">{stats.amarillo}</div>
              <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">Riesgo Medio</div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-semibold text-gray-900">{stats.rojo}</div>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">Alto Riesgo</div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-semibold text-gray-900">{stats.listaNegra}</div>
              <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                <Ban className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">Lista Negra</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600 mr-2">Filtrar:</span>
              
              {[
                { id: 'all', label: 'Todos' },
                { id: 'VERDE', label: 'Normal' },
                { id: 'AMARILLO', label: 'Riesgo' },
                { id: 'ROJO', label: 'Mora' },
                { id: 'LISTA_NEGRA', label: 'Lista Negra' }
              ].map((filtro) => (
                <button
                  key={filtro.id}
                  onClick={() => {
                    setFilterRiesgo(filtro.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                    filterRiesgo === filtro.id 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, DNI..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente / DNI</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Riesgo / Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deuda</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium text-sm">
                          {cliente.nombres.charAt(0)}{cliente.apellidos.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{cliente.nombres} {cliente.apellidos}</div>
                          <div className="text-xs text-gray-500 flex items-center mt-0.5">
                            <Shield className="h-3 w-3 mr-1 text-gray-400" />
                            {cliente.dni}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiesgoColor(cliente.nivelRiesgo)} border-current bg-opacity-10`}>
                          <span className="mr-1.5">{getRiesgoIcon(cliente.nivelRiesgo)}</span>
                          {cliente.nivelRiesgo.replace('_', ' ')}
                        </div>
                        {cliente.enListaNegra && (
                          <div className="flex items-center text-xs text-red-600 font-medium">
                            <Ban className="h-3 w-3 mr-1" />
                            En Lista Negra
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          ${formatNumber(cliente.montoTotal)}
                        </div>
                        {cliente.montoMora > 0 && (
                          <div className="text-xs text-red-600 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Mora: ${formatNumber(cliente.montoMora)}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-2 text-gray-400" />
                          {cliente.telefono}
                        </div>
                        {cliente.correo && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Mail className="h-3 w-3 mr-2 text-gray-400" />
                            {cliente.correo}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/clientes/${cliente.id}`}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/clientes/${cliente.id}/editar`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredClientes.length)} de {filteredClientes.length}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs border rounded hover:bg-white disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs border rounded hover:bg-white disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientesPage;
