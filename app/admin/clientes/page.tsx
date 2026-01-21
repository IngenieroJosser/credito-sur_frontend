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
  AlertCircle,
  CheckCircle,
  Eye,
  Pencil,
  AlertTriangle,
  Ban,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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
  const [clientes] = useState<Cliente[]>([
    {
      id: '1',
      codigo: 'CL-001',
      dni: '1.020.123.456',
      nombres: 'María',
      apellidos: 'González',
      correo: 'maria.gonzalez@email.com',
      telefono: '310 555 1212',
      direccion: 'Av. El Dorado #123, Bogotá',
      referencia: 'Frente a la panadería',
      nivelRiesgo: 'VERDE',
      puntaje: 95,
      enListaNegra: false,
      estadoAprobacion: 'APROBADO',
      prestamosActivos: 2,
      montoTotal: 12500000,
      montoMora: 0,
      diasMora: 0,
      ultimoPago: '15/03/2024'
    },
    {
      id: '2',
      codigo: 'CL-002',
      dni: '52.345.678',
      nombres: 'Carlos',
      apellidos: 'Rodríguez',
      correo: 'carlos.rodriguez@email.com',
      telefono: '315 555 2323',
      direccion: 'Calle 45 #67-89, Medellín',
      referencia: 'Casa azul rejas negras',
      nivelRiesgo: 'ROJO',
      puntaje: 45,
      enListaNegra: false,
      estadoAprobacion: 'APROBADO',
      prestamosActivos: 1,
      montoTotal: 8500000,
      montoMora: 1250000,
      diasMora: 12,
      ultimoPago: '28/02/2024'
    },
    {
      id: '3',
      codigo: 'CL-003',
      dni: '79.456.789',
      nombres: 'Ana',
      apellidos: 'Martínez',
      correo: 'ana.martinez@email.com',
      telefono: '300 555 3434',
      direccion: 'Urb. Las Acacias, Cali',
      referencia: null,
      nivelRiesgo: 'AMARILLO',
      puntaje: 72,
      enListaNegra: false,
      estadoAprobacion: 'APROBADO',
      prestamosActivos: 3,
      montoTotal: 28500000,
      montoMora: 0,
      diasMora: 5,
      ultimoPago: '10/03/2024'
    },
    {
      id: '4',
      codigo: 'CL-004',
      dni: '99.999.999',
      nombres: 'Pedro',
      apellidos: 'Pérez',
      correo: null,
      telefono: '316 555 9999',
      direccion: 'Barrio Central',
      referencia: null,
      nivelRiesgo: 'LISTA_NEGRA',
      puntaje: 0,
      enListaNegra: true,
      estadoAprobacion: 'APROBADO',
      prestamosActivos: 0,
      montoTotal: 5000000, // Deuda incobrable
      montoMora: 5000000,
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

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10">
        {/* Header Elegante */}
        <div className="px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide font-medium border border-[#08557f]/10 mb-2">
                <User className="h-3.5 w-3.5" />
                <span>Gestión de Cartera</span>
              </div>
              <h1 className="text-3xl font-light text-gray-900 tracking-tight">
                Listado de <span className="font-semibold text-[#08557f]">Clientes</span>
              </h1>
            </div>
            <Link
              href="/admin/clientes/nuevo"
              className="px-5 py-2.5 bg-[#08557f] text-white rounded-xl hover:bg-[#064364] transition-all text-sm font-medium flex items-center gap-2 shadow-lg shadow-[#08557f]/20 hover:shadow-[#08557f]/30 hover:-translate-y-0.5 transform duration-200"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Cliente
            </Link>
          </div>
        </div>

        <div className="p-8 space-y-8">
        {/* Estadísticas Elegantes */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Clientes</span>
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-3xl font-light text-gray-900">{stats.total}</p>
            <div className="mt-2 text-xs text-gray-400">registrados</div>
          </div>
          
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-[#08557f] uppercase tracking-wider">Buen Estado</span>
              <CheckCircle className="w-4 h-4 text-[#08557f]" />
            </div>
            <p className="text-3xl font-light text-gray-900">{stats.verde}</p>
            <div className="mt-2 text-xs text-gray-400">clientes al día</div>
          </div>

          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-yellow-600 uppercase tracking-wider">Riesgo Medio</span>
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-3xl font-light text-gray-900">{stats.amarillo}</p>
            <div className="mt-2 text-xs text-gray-400">seguimiento</div>
          </div>

          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-red-600 uppercase tracking-wider">Alto Riesgo</span>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-3xl font-light text-gray-900">{stats.rojo}</p>
            <div className="mt-2 text-xs text-gray-400">acción requerida</div>
          </div>

          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mora Total</span>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-3xl font-light text-gray-900">{formatCurrency(stats.totalMora)}</p>
            <div className="mt-2 text-xs text-gray-400">acumulada</div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <Filter className="h-4 w-4 text-gray-400 shrink-0 mr-2" />
            
            {[
              { id: 'all', label: 'Todos' },
              { id: 'VERDE', label: 'Al Día' },
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
                className={`px-4 py-2 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                  filterRiesgo === filtro.id 
                    ? 'bg-[#08557f] text-white shadow-md shadow-[#08557f]/20' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente, DNI o teléfono..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] text-sm text-gray-900 transition-all"
            />
          </div>
        </div>

        {/* Tabla Elegante */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finanzas</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-gray-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          cliente.nivelRiesgo === 'VERDE' ? 'bg-green-50 text-green-600' :
                          cliente.nivelRiesgo === 'AMARILLO' ? 'bg-yellow-50 text-yellow-600' :
                          cliente.nivelRiesgo === 'ROJO' ? 'bg-red-50 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {cliente.nombres.charAt(0)}{cliente.apellidos.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{cliente.nombres} {cliente.apellidos}</div>
                          <div className="text-xs text-gray-500 flex items-center mt-0.5 font-mono">
                            {cliente.dni}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRiesgoColor(cliente.nivelRiesgo)} bg-opacity-10 border border-current border-opacity-20`}>
                          <span className="mr-1.5">{getRiesgoIcon(cliente.nivelRiesgo)}</span>
                          {cliente.nivelRiesgo.replace('_', ' ')}
                        </div>
                        {cliente.enListaNegra && (
                          <div className="flex items-center text-xs text-red-600 font-medium px-1">
                            <Ban className="h-3 w-3 mr-1" />
                            Lista Negra
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(cliente.montoTotal)}
                        </div>
                        {cliente.montoMora > 0 && (
                          <div className="text-xs text-red-600 flex items-center">
                            Mora: {formatCurrency(cliente.montoMora)}
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
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/clientes/${cliente.id}`}
                          className="p-2 text-gray-400 hover:text-[#08557f] hover:bg-[#08557f]/5 rounded-lg transition-colors"
                          title="Ver Expediente"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/clientes/${cliente.id}/editar`}
                          className="p-2 text-gray-400 hover:text-[#08557f] hover:bg-[#08557f]/5 rounded-lg transition-colors"
                          title="Editar cliente"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Paginación Elegante */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredClientes.length)} de {filteredClientes.length}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:shadow-none transition-all"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:shadow-none transition-all"
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
    </div>
  );
};

export default ClientesPage;
