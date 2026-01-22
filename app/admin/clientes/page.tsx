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
  DollarSign,
  Trash2
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
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-xs text-primary tracking-wide font-bold border border-primary/20 mb-2">
              <User className="h-3.5 w-3.5" />
              <span>Gestión de Cartera</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Listado de </span><span className="text-orange-500">Clientes</span>
            </h1>
          </div>
          <Link
            href="/admin/clientes/nuevo"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm"
          >
            <UserPlus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
            Nuevo Cliente
          </Link>
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
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <Filter className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
            
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
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  filterRiesgo === filtro.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, DNI o teléfono..."
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
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Finanzas</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                          cliente.nivelRiesgo === 'VERDE' ? 'bg-emerald-100 text-emerald-700' :
                          cliente.nivelRiesgo === 'AMARILLO' ? 'bg-amber-100 text-amber-700' :
                          cliente.nivelRiesgo === 'ROJO' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {cliente.nombres.charAt(0)}{cliente.apellidos.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="font-bold text-slate-900">{cliente.nombres} {cliente.apellidos}</div>
                          <div className="text-xs text-slate-500 flex items-center mt-0.5 font-mono font-medium">
                            {cliente.dni}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-inset ${getRiesgoColor(cliente.nivelRiesgo)}`}>
                          <span className="mr-1.5">{getRiesgoIcon(cliente.nivelRiesgo)}</span>
                          {cliente.nivelRiesgo.replace('_', ' ')}
                        </div>
                        {cliente.enListaNegra && (
                          <div className="flex items-center text-xs text-rose-600 font-bold px-1">
                            <Ban className="h-3 w-3 mr-1" />
                            Lista Negra
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900">
                          {formatCurrency(cliente.montoTotal)}
                        </div>
                        {cliente.montoMora > 0 && (
                          <div className="text-xs text-rose-600 font-bold flex items-center">
                            Mora: {formatCurrency(cliente.montoMora)}
                          </div>
                        )}
                      </div>
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
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/clientes/${cliente.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver Expediente"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/clientes/${cliente.id}/editar`}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Editar cliente"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Paginación Elegante */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredClientes.length)} de {filteredClientes.length}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg hover:bg-white hover:text-primary text-slate-600 disabled:opacity-50 disabled:hover:shadow-none transition-all"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg hover:bg-white hover:text-primary text-slate-600 disabled:opacity-50 disabled:hover:shadow-none transition-all"
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
