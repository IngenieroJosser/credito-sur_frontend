'use client'

import { useState } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  User,
  Phone,
  Mail,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit2,
  MessageCircle,
  Calendar,
  Shield,
  X,
  Save,
  MapPin,
  Briefcase,
  CreditCard,
  History,
  Bell
} from 'lucide-react';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
  ocupacion: string;
  fechaNacimiento: string;
  estado: 'activo' | 'moroso' | 'en_mora' | 'inactivo' | 'nuevo';
  ultimoPago: string;
  proximoPago: string;
  prestamosActivos: number;
  montoTotal: number;
  montoMora: number;
  diasMora: number;
  scoreCredito: number;
  historialPagos: Array<{
    fecha: string;
    monto: number;
    metodo: string;
    estado: string;
  }>;
  contactoEmergencia: {
    nombre: string;
    telefono: string;
    parentesco: string;
  };
}

const ClientesPage = () => {
  // Datos estáticos
  const [clientes, setClientes] = useState<Cliente[]>([
    {
      id: '1',
      nombre: 'María',
      apellido: 'González',
      documento: 'V-12345678',
      telefono: '+58 412 555 1212',
      email: 'maria.gonzalez@email.com',
      direccion: 'Av. Principal #123, Caracas',
      ocupacion: 'Ingeniera',
      fechaNacimiento: '1985-03-15',
      estado: 'activo',
      ultimoPago: '15/03/2024',
      proximoPago: '15/04/2024',
      prestamosActivos: 2,
      montoTotal: 12500,
      montoMora: 0,
      diasMora: 0,
      scoreCredito: 85,
      historialPagos: [
        { fecha: '15/03/2024', monto: 1250, metodo: 'Transferencia', estado: 'Completado' },
        { fecha: '15/02/2024', monto: 1250, metodo: 'Efectivo', estado: 'Completado' }
      ],
      contactoEmergencia: {
        nombre: 'Carlos González',
        telefono: '+58 414 555 1213',
        parentesco: 'Esposo'
      }
    },
    {
      id: '2',
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      documento: 'V-23456789',
      telefono: '+58 414 555 2323',
      email: 'carlos.rodriguez@email.com',
      direccion: 'Calle 45 #67-89, Valencia',
      ocupacion: 'Comerciante',
      fechaNacimiento: '1978-07-22',
      estado: 'en_mora',
      ultimoPago: '28/02/2024',
      proximoPago: '05/03/2024',
      prestamosActivos: 1,
      montoTotal: 8500,
      montoMora: 1250,
      diasMora: 12,
      scoreCredito: 45,
      historialPagos: [
        { fecha: '28/02/2024', monto: 850, metodo: 'Transferencia', estado: 'Completado' },
        { fecha: '28/01/2024', monto: 850, metodo: 'Efectivo', estado: 'Completado' }
      ],
      contactoEmergencia: {
        nombre: 'Ana Rodríguez',
        telefono: '+58 412 555 2324',
        parentesco: 'Esposa'
      }
    },
    {
      id: '3',
      nombre: 'Ana',
      apellido: 'Martínez',
      documento: 'V-34567890',
      telefono: '+58 424 555 3434',
      email: 'ana.martinez@email.com',
      direccion: 'Urbanización Las Acacias, Maracaibo',
      ocupacion: 'Doctora',
      fechaNacimiento: '1990-11-05',
      estado: 'moroso',
      ultimoPago: '10/03/2024',
      proximoPago: '10/04/2024',
      prestamosActivos: 3,
      montoTotal: 28500,
      montoMora: 0,
      diasMora: 0,
      scoreCredito: 72,
      historialPagos: [
        { fecha: '10/03/2024', monto: 2850, metodo: 'Transferencia', estado: 'Completado' },
        { fecha: '10/02/2024', monto: 2850, metodo: 'Tarjeta', estado: 'Completado' }
      ],
      contactoEmergencia: {
        nombre: 'José Martínez',
        telefono: '+58 416 555 3435',
        parentesco: 'Hermano'
      }
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const itemsPerPage = 8;

  // Formulario para nuevo cliente
  const [newCliente, setNewCliente] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    email: '',
    direccion: '',
    ocupacion: '',
    fechaNacimiento: '',
    contactoEmergenciaNombre: '',
    contactoEmergenciaTelefono: '',
    contactoEmergenciaParentesco: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewCliente(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateCliente = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nuevoCliente: Cliente = {
      id: (clientes.length + 1).toString(),
      nombre: newCliente.nombre,
      apellido: newCliente.apellido,
      documento: newCliente.documento,
      telefono: newCliente.telefono,
      email: newCliente.email,
      direccion: newCliente.direccion,
      ocupacion: newCliente.ocupacion,
      fechaNacimiento: newCliente.fechaNacimiento,
      estado: 'nuevo',
      ultimoPago: '-',
      proximoPago: '-',
      prestamosActivos: 0,
      montoTotal: 0,
      montoMora: 0,
      diasMora: 0,
      scoreCredito: 75,
      historialPagos: [],
      contactoEmergencia: {
        nombre: newCliente.contactoEmergenciaNombre,
        telefono: newCliente.contactoEmergenciaTelefono,
        parentesco: newCliente.contactoEmergenciaParentesco
      }
    };

    setClientes([...clientes, nuevoCliente]);
    setIsCreateModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewCliente({
      nombre: '',
      apellido: '',
      documento: '',
      telefono: '',
      email: '',
      direccion: '',
      ocupacion: '',
      fechaNacimiento: '',
      contactoEmergenciaNombre: '',
      contactoEmergenciaTelefono: '',
      contactoEmergenciaParentesco: ''
    });
  };

  const handleOpenDetail = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDetailModalOpen(true);
  };

  // Formateador de números
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  // Estadísticas
  const stats = {
    total: clientes.length,
    activos: clientes.filter(c => c.estado === 'activo').length,
    morosos: clientes.filter(c => c.estado === 'moroso').length,
    enMora: clientes.filter(c => c.estado === 'en_mora').length,
    nuevos: clientes.filter(c => c.estado === 'nuevo').length,
    totalMonto: clientes.reduce((sum, c) => sum + c.montoTotal, 0),
    totalMora: clientes.reduce((sum, c) => sum + c.montoMora, 0)
  };

  // Filtros y búsqueda
  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = 
      `${cliente.nombre} ${cliente.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = filterEstado === 'all' || cliente.estado === filterEstado;
    
    return matchesSearch && matchesEstado;
  });

  // Paginación
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClientes.slice(indexOfFirstItem, indexOfLastItem);

  const getEstadoColor = (estado: Cliente['estado']) => {
    switch (estado) {
      case 'activo': return 'text-green-600';
      case 'moroso': return 'text-yellow-600';
      case 'en_mora': return 'text-red-600';
      case 'inactivo': return 'text-gray-400';
      case 'nuevo': return 'text-blue-600';
      default: return 'text-gray-400';
    }
  };

  const getEstadoBg = (estado: Cliente['estado']) => {
    switch (estado) {
      case 'activo': return 'bg-green-50';
      case 'moroso': return 'bg-yellow-50';
      case 'en_mora': return 'bg-red-50';
      case 'inactivo': return 'bg-gray-50';
      case 'nuevo': return 'bg-blue-50';
      default: return 'bg-gray-50';
    }
  };

  const getEstadoText = (estado: Cliente['estado']) => {
    switch (estado) {
      case 'activo': return 'Al día';
      case 'moroso': return 'Moroso';
      case 'en_mora': return 'En mora';
      case 'inactivo': return 'Inactivo';
      case 'nuevo': return 'Nuevo';
      default: return 'Desconocido';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-light text-gray-800">Clientes</h1>
                <p className="text-xs text-gray-500">Gestión de cartera</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span className="text-sm font-medium">Nuevo Cliente</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { 
              label: 'Total', 
              value: stats.total.toString(), 
              color: 'var(--primary)', 
              icon: <User className="h-4 w-4" /> 
            },
            { 
              label: 'Al día', 
              value: stats.activos.toString(), 
              color: '#10b981', 
              icon: <CheckCircle className="h-4 w-4" /> 
            },
            { 
              label: 'En mora', 
              value: stats.enMora.toString(), 
              color: '#ef4444', 
              icon: <AlertCircle className="h-4 w-4" /> 
            },
            { 
              label: 'Monto Total', 
              value: `$${formatNumber(stats.totalMonto)}`, 
              color: '#8b5cf6', 
              icon: <DollarSign className="h-4 w-4" /> 
            }
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-light text-gray-800">{stat.value}</div>
                <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${stat.color}10` }}>
                  <div style={{ color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Panel de control */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Filtrar:</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'activo', label: 'Al día' },
                  { id: 'moroso', label: 'Morosos' },
                  { id: 'en_mora', label: 'En mora' },
                  { id: 'nuevo', label: 'Nuevos' }
                ].map((filtro) => (
                  <button
                    key={filtro.id}
                    onClick={() => {
                      setFilterEstado(filtro.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                      filterEstado === filtro.id 
                        ? 'bg-primary text-white' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Tabla de clientes */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Préstamos</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-800">{cliente.nombre} {cliente.apellido}</div>
                          <div className="text-xs text-gray-500">
                            <div className="flex items-center">
                              <Shield className="h-3 w-3 mr-1" />
                              {cliente.documento}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getEstadoColor(cliente.estado)}`}></div>
                        <div>
                          <div className={`text-sm font-medium ${getEstadoColor(cliente.estado)}`}>
                            {getEstadoText(cliente.estado)}
                          </div>
                          {cliente.diasMora > 0 && (
                            <div className="text-xs text-red-500">
                              {cliente.diasMora} días
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-lg font-light text-gray-800">{cliente.prestamosActivos}</div>
                        {cliente.prestamosActivos > 0 && (
                          <div className={`text-xs px-2 py-1 ${getEstadoBg(cliente.estado)} ${getEstadoColor(cliente.estado)} rounded-full`}>
                            Activos
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-800">
                          ${formatNumber(cliente.montoTotal)}
                        </div>
                        {cliente.montoMora > 0 && (
                          <div className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full inline-block">
                            ${formatNumber(cliente.montoMora)} mora
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {cliente.telefono}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {cliente.email}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenDetail(cliente)}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-secondary hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredClientes.length)} de {filteredClientes.length} clientes
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#08557f] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de creación de cliente */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-800">Nuevo Cliente</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Complete los datos del nuevo cliente</p>
            </div>
            
            <form onSubmit={handleCreateCliente} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={newCliente.nombre}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Nombre"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    value={newCliente.apellido}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Apellido"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Documento</label>
                  <input
                    type="text"
                    name="documento"
                    value={newCliente.documento}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="V-12345678"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={newCliente.telefono}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="+58 412 555 1212"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={newCliente.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="cliente@email.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="fechaNacimiento"
                    value={newCliente.fechaNacimiento}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ocupación</label>
                  <input
                    type="text"
                    name="ocupacion"
                    value={newCliente.ocupacion}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Profesión u oficio"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={newCliente.direccion}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Dirección completa"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Contacto de Emergencia</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Nombre</label>
                    <input
                      type="text"
                      name="contactoEmergenciaNombre"
                      value={newCliente.contactoEmergenciaNombre}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Nombre completo"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Teléfono</label>
                    <input
                      type="tel"
                      name="contactoEmergenciaTelefono"
                      value={newCliente.contactoEmergenciaTelefono}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Teléfono"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Parentesco</label>
                    <input
                      type="text"
                      name="contactoEmergenciaParentesco"
                      value={newCliente.contactoEmergenciaParentesco}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Ej: Esposo/a, Padre, etc."
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Crear Cliente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalles del cliente */}
      {isDetailModalOpen && selectedCliente && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-4xl border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-800">{selectedCliente.nombre} {selectedCliente.apellido}</h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{selectedCliente.documento}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getEstadoBg(selectedCliente.estado)} ${getEstadoColor(selectedCliente.estado)}`}>
                        {getEstadoText(selectedCliente.estado)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Información personal */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Información Personal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Teléfono</span>
                        </div>
                        <div className="text-gray-800">{selectedCliente.telefono}</div>
                      </div>
                      
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Email</span>
                        </div>
                        <div className="text-gray-800">{selectedCliente.email}</div>
                      </div>
                      
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Dirección</span>
                        </div>
                        <div className="text-gray-800">{selectedCliente.direccion}</div>
                      </div>
                      
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Briefcase className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Ocupación</span>
                        </div>
                        <div className="text-gray-800">{selectedCliente.ocupacion}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Información financiera */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Información Financiera
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Préstamos Activos</span>
                          <div className="text-lg font-medium text-gray-800">{selectedCliente.prestamosActivos}</div>
                        </div>
                      </div>
                      
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Monto Total</span>
                          <div className="text-lg font-medium text-gray-800">${formatNumber(selectedCliente.montoTotal)}</div>
                        </div>
                      </div>
                      
                      {selectedCliente.montoMora > 0 && (
                        <div className="p-4 border border-red-200 bg-red-50 rounded-lg md:col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-red-600">Monto en Mora</span>
                            <div className="text-lg font-medium text-red-600">${formatNumber(selectedCliente.montoMora)}</div>
                          </div>
                          <div className="text-xs text-red-500">{selectedCliente.diasMora} días de mora</div>
                        </div>
                      )}
                      
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">Score Crediticio</span>
                        </div>
                        <div className={`text-lg font-medium px-3 py-1 rounded-full inline-block ${getScoreColor(selectedCliente.scoreCredito)}`}>
                          {selectedCliente.scoreCredito}/100
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Historial de pagos */}
                  {selectedCliente.historialPagos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                        <History className="h-4 w-4 mr-2" />
                        Historial de Pagos Recientes
                      </h3>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Monto</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Método</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedCliente.historialPagos.map((pago, index) => (
                                <tr key={index} className="border-b border-gray-100 last:border-0">
                                  <td className="px-4 py-2 text-sm text-gray-600">{pago.fecha}</td>
                                  <td className="px-4 py-2 text-sm text-gray-800">${formatNumber(pago.monto)}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{pago.metodo}</td>
                                  <td className="px-4 py-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      pago.estado === 'Completado' 
                                        ? 'bg-green-50 text-green-600' 
                                        : 'bg-yellow-50 text-yellow-600'
                                    }`}>
                                      {pago.estado}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Panel lateral */}
                <div className="space-y-6">
                  {/* Contacto de emergencia */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Bell className="h-4 w-4 mr-2" />
                      Contacto de Emergencia
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500">Nombre</div>
                        <div className="text-sm text-gray-800">{selectedCliente.contactoEmergencia.nombre}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Teléfono</div>
                        <div className="text-sm text-gray-800">{selectedCliente.contactoEmergencia.telefono}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Parentesco</div>
                        <div className="text-sm text-gray-800">{selectedCliente.contactoEmergencia.parentesco}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Próximo pago */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Próximo Pago
                    </h3>
                    <div className="text-center">
                      <div className="text-2xl font-light text-gray-800 mb-1">{selectedCliente.proximoPago}</div>
                      <div className="text-xs text-gray-500">Fecha estimada</div>
                    </div>
                  </div>
                  
                  {/* Acciones rápidas */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Acciones</h3>
                    <div className="space-y-2">
                      <button className="w-full flex items-center justify-center px-3 py-2 bg-[#08557f] text-white rounded-lg hover:bg-[#063a58] transition-colors text-sm">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar Cliente
                      </button>
                      <button className="w-full flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Enviar Recordatorio
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesPage;
