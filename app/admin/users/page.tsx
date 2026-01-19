'use client'

'use client'

import { useState } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  Edit2,
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronDown,
  Shield,
  Users,
  Mail,
  Briefcase,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface User {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: 'admin' | 'coordinator' | 'supervisor' | 'collector' | 'accountant';
  departamento: string;
  estado: 'active' | 'inactive' | 'suspended';
  fechaCreacion: string;
  ultimoAcceso: string;
  permisos: string[];
}

interface Permission {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
}

interface Role {
  id: string;
  nombre: string;
  label: string;
  descripcion: string;
  color: string;
  icon: React.ReactNode;
}

const UserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      nombre: 'María Rodríguez',
      email: 'maria.rodriguez@credifinance.com',
      telefono: '+52 55 1234 5678',
      rol: 'admin',
      departamento: 'Administración',
      estado: 'active',
      fechaCreacion: '2023-01-15',
      ultimoAcceso: 'Hoy 09:42',
      permisos: ['full_access', 'user_management', 'financial_reports']
    },
    {
      id: '2',
      nombre: 'Carlos Méndez',
      email: 'carlos.mendez@credifinance.com',
      telefono: '+52 55 2345 6789',
      rol: 'coordinator',
      departamento: 'Operaciones',
      estado: 'active',
      fechaCreacion: '2023-03-20',
      ultimoAcceso: 'Hoy 08:30',
      permisos: ['loan_approval', 'team_management', 'reports_view']
    },
    {
      id: '3',
      nombre: 'Ana López',
      email: 'ana.lopez@credifinance.com',
      telefono: '+52 55 3456 7890',
      rol: 'supervisor',
      departamento: 'Supervisión',
      estado: 'active',
      fechaCreacion: '2023-05-10',
      ultimoAcceso: 'Ayer 14:20',
      permisos: ['collection_supervision', 'reports_view']
    },
    {
      id: '4',
      nombre: 'Pedro Gómez',
      email: 'pedro.gomez@credifinance.com',
      telefono: '+52 55 4567 8901',
      rol: 'collector',
      departamento: 'Cobranza',
      estado: 'active',
      fechaCreacion: '2023-07-25',
      ultimoAcceso: 'Hoy 10:15',
      permisos: ['collection_management', 'client_view']
    },
    {
      id: '5',
      nombre: 'Laura Sánchez',
      email: 'laura.sanchez@credifinance.com',
      telefono: '+52 55 5678 9012',
      rol: 'accountant',
      departamento: 'Contabilidad',
      estado: 'inactive',
      fechaCreacion: '2023-09-05',
      ultimoAcceso: '10 Mar 16:45',
      permisos: ['financial_operations', 'reports_view']
    },
    {
      id: '6',
      nombre: 'Roberto Vargas',
      email: 'roberto.vargas@credifinance.com',
      telefono: '+52 55 6789 0123',
      rol: 'collector',
      departamento: 'Cobranza',
      estado: 'active',
      fechaCreacion: '2023-11-15',
      ultimoAcceso: 'Hoy 11:20',
      permisos: ['collection_management']
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [, setIsEditModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUserRole] = useState<'admin' | 'coordinator'>('admin');

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    rol: 'collector' as User['rol'],
    departamento: '',
    estado: 'active' as User['estado']
  });

  const [permissions] = useState<Permission[]>([
    { id: 'full_access', nombre: 'Acceso Total', categoria: 'Sistema', descripcion: 'Acceso completo a todas las funciones' },
    { id: 'user_management', nombre: 'Gestión de Usuarios', categoria: 'Sistema', descripcion: 'Crear, editar y desactivar usuarios' },
    { id: 'financial_reports', nombre: 'Reportes Financieros', categoria: 'Finanzas', descripcion: 'Acceso a reportes financieros detallados' },
    { id: 'loan_approval', nombre: 'Aprobación de Préstamos', categoria: 'Operaciones', descripcion: 'Aprobar o rechazar solicitudes de préstamo' },
    { id: 'team_management', nombre: 'Gestión de Equipo', categoria: 'Operaciones', descripcion: 'Supervisar y asignar tareas al equipo' },
    { id: 'collection_supervision', nombre: 'Supervisión de Cobranza', categoria: 'Cobranza', descripcion: 'Supervisar actividades de cobranza' },
    { id: 'collection_management', nombre: 'Gestión de Cobranza', categoria: 'Cobranza', descripcion: 'Realizar actividades de cobranza' },
    { id: 'client_view', nombre: 'Visualización de Clientes', categoria: 'Clientes', descripcion: 'Ver información de clientes' },
    { id: 'financial_operations', nombre: 'Operaciones Financieras', categoria: 'Finanzas', descripcion: 'Realizar operaciones financieras' },
    { id: 'reports_view', nombre: 'Visualización de Reportes', categoria: 'Reportes', descripcion: 'Ver reportes generales' }
  ]);

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const roles: Role[] = [
    { id: 'admin', nombre: 'Administrador', label: 'Administrador', descripcion: 'Acceso total al sistema', color: '#08557f', icon: <Shield className="h-3 w-3" /> },
    { id: 'coordinator', nombre: 'Coordinador', label: 'Coordinador', descripcion: 'Gestión operativa', color: '#10b981', icon: <Users className="h-3 w-3" /> },
    { id: 'supervisor', nombre: 'Supervisor', label: 'Supervisor', descripcion: 'Supervisión y control', color: '#8b5cf6', icon: <Eye className="h-3 w-3" /> },
    { id: 'collector', nombre: 'Cobrador', label: 'Cobrador', descripcion: 'Gestión de cobranza', color: '#f59e0b', icon: <Briefcase className="h-3 w-3" /> },
    { id: 'accountant', nombre: 'Contable', label: 'Contable', descripcion: 'Operaciones financieras', color: '#ef4444', icon: <Sparkles className="h-3 w-3" /> }
  ];

  const roleFilters = [
    { id: 'all', label: 'Todos', nombre: 'Todos', color: 'gray' },
    ...roles
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.rol === filterRole;
    const matchesStatus = filterStatus === 'all' || user.estado === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.estado === 'active').length,
    admins: users.filter(u => u.rol === 'admin').length,
    inactive: users.filter(u => u.estado !== 'active').length
  };

  const handleOpenCreateModal = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      rol: 'collector',
      departamento: '',
      estado: 'active'
    });
    setSelectedPermissions([]);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    if (user.rol === 'admin' && currentUserRole !== 'admin') {
      return;
    }

    setSelectedUser(user);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono,
      rol: user.rol,
      departamento: user.departamento,
      estado: user.estado
    });
    setSelectedPermissions(user.permisos);
    setIsEditModalOpen(true);
  };

  const handleOpenPermissionsModal = (user: User) => {
    if (user.rol === 'admin' && currentUserRole !== 'admin') {
      return;
    }

    setSelectedUser(user);
    setSelectedPermissions(user.permisos);
    setIsPermissionsModalOpen(true);
  };

  const handleOpenDeleteModal = (user: User) => {
    if (user.rol === 'admin') {
      return;
    }

    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleCreateUser = () => {
    const newUser: User = {
      id: (users.length + 1).toString(),
      ...formData,
      fechaCreacion: new Date().toLocaleDateString('es-ES'),
      ultimoAcceso: 'Hoy ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      permisos: selectedPermissions
    };

    setUsers([...users, newUser]);
    setIsCreateModalOpen(false);
  };

  const handleToggleUserStatus = () => {
    if (!selectedUser) return;

    if (selectedUser.rol === 'admin') {
      return;
    }

    const updatedUsers = users.map(user => {
      if (user.id === selectedUser.id) {
        const newEstado: User['estado'] = user.estado === 'active' ? 'inactive' : 'active';
        return { ...user, estado: newEstado };
      }
      return user;
    });

    setUsers(updatedUsers);
    setIsDeleteModalOpen(false);
  };

  const getStatusColor = (estado: User['estado']) => {
    switch (estado) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-gray-400';
      case 'suspended': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (estado: User['estado']) => {
    switch (estado) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'suspended': return 'Suspendido';
      default: return 'Desconocido';
    }
  };

  const getStatusIcon = (estado: User['estado']) => {
    switch (estado) {
      case 'active': return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'inactive': return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
      case 'suspended': return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default: return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-white via-gray-50 to-gray-100">
      {/* Header elegante */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-linear-to-br from-[#08557f] to-[#063a58] rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h1 className="ml-3 text-lg font-light text-gray-800">
                  <span className="font-normal text-[#08557f]">Gestión</span> de Usuarios
                </h1>
              </div>

              {/* Indicador de rol sutil */}
              <div className="hidden md:block">
                <div className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  {currentUserRole === 'admin' ? 'Administrador' : 'Coordinador'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Barra de búsqueda sútil */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-40 md:w-56 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none text-sm placeholder-gray-400"
                />
              </div>

              {/* Botón crear usuario */}
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-[#08557f] hover:text-[#08557f] transition-all duration-200"
              >
                <UserPlus className="h-4 w-4" />
                <span className="text-sm font-medium">Nuevo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Estadísticas elegantes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Usuarios Totales', value: stats.total, color: '#08557f', icon: <Users className="h-4 w-4" /> },
            { label: 'Activos', value: stats.active, color: '#10b981', icon: <Check className="h-4 w-4" /> },
            { label: 'Administradores', value: stats.admins, color: '#8b5cf6', icon: <Shield className="h-4 w-4" /> },
            { label: 'Inactivos', value: stats.inactive, color: '#f59e0b', icon: <EyeOff className="h-4 w-4" /> }
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-light text-gray-800 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
                <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${stat.color}10` }}>
                  <div style={{ color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros elegantes */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Filtros:</span>
              </div>

              {/* Filtro por rol - diseño minimalista */}
              <div className="flex items-center space-x-2">
                {roleFilters.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setFilterRole(role.id)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all ${filterRole === role.id
                        ? 'bg-[#08557f] text-white'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-500 font-light">
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </div>
          </div>
        </div>

        {/* Tabla de usuarios elegante */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Acceso</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-9 h-9 bg-linear-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.nombre.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-800">{user.nombre}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                          style={{
                            backgroundColor: `${roles.find(r => r.id === user.rol)?.color}10`,
                            color: roles.find(r => r.id === user.rol)?.color
                          }}
                        >
                          {roles.find(r => r.id === user.rol)?.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{roles.find(r => r.id === user.rol)?.nombre}</div>
                          <div className="text-xs text-gray-500">{user.departamento}</div>
                        </div>
                        {user.rol === 'admin' && (
                          <div className="ml-2">
                            <Shield className="h-3 w-3 text-[#08557f]" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(user.estado)}
                        <span className={`ml-2 text-sm font-medium ${getStatusColor(user.estado)}`}>
                          {getStatusText(user.estado)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{user.ultimoAcceso}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 text-gray-400 hover:text-[#08557f] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                          disabled={user.rol === 'admin' && currentUserRole !== 'admin'}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenPermissionsModal(user)}
                          className="p-2 text-gray-400 hover:text-[#fb851b] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Permisos"
                          disabled={user.rol === 'admin' && currentUserRole !== 'admin'}
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(user)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title={user.estado === 'active' ? 'Desactivar' : 'Activar'}
                          disabled={user.rol === 'admin'}
                        >
                          {user.estado === 'active' ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nota de protección elegante */}
        <div className="mt-8 p-4 bg-linear-to-r from-[#08557f]/5 to-transparent border border-[#08557f]/10 rounded-xl">
          <div className="flex items-center">
            <div className="p-2 bg-[#08557f]/10 rounded-lg mr-3">
              <Shield className="h-5 w-5 text-[#08557f]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#08557f] mb-1">Protección de Administradores</h3>
              <p className="text-sm text-gray-600">
                Los administradores tienen protección especial. Solo pueden ser modificados por otros administradores y no pueden ser desactivados.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de creación elegante */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-800">Nuevo Usuario</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Complete los datos del nuevo usuario</p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-300 focus:border-[#08557f] focus:outline-none transition-colors"
                    placeholder="Nombre y apellidos"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Correo</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-300 focus:border-[#08557f] focus:outline-none transition-colors"
                      placeholder="usuario@credifinance.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-300 focus:border-[#08557f] focus:outline-none transition-colors"
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-300 focus:border-[#08557f] focus:outline-none transition-colors"
                    placeholder="Ej: Cobranza, Administración"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                    <select
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value as User['rol'] })}
                      className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-300 focus:border-[#08557f] focus:outline-none transition-colors appearance-none"
                    >
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-10 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value as User['estado'] })}
                      className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-300 focus:border-[#08557f] focus:outline-none transition-colors appearance-none"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="suspended">Suspendido</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-[#08557f] text-white rounded-lg hover:bg-[#063a58] transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Crear Usuario</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de permisos elegante */}
      {isPermissionsModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl border border-gray-200 shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-800">Permisos del Usuario</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedUser.nombre}</p>
                </div>
                <button
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {permissions.map(permission => (
                  <div
                    key={permission.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedPermissions.includes(permission.id)
                        ? 'border-[#08557f] bg-[#08557f]/5'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => {
                      if (selectedPermissions.includes(permission.id)) {
                        setSelectedPermissions(selectedPermissions.filter(p => p !== permission.id));
                      } else {
                        setSelectedPermissions([...selectedPermissions, permission.id]);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-6 h-6 rounded flex items-center justify-center ${selectedPermissions.includes(permission.id)
                              ? 'bg-[#08557f] text-white'
                              : 'bg-gray-100 text-gray-400'
                            }`}>
                            {selectedPermissions.includes(permission.id) ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">{permission.nombre}</h3>
                            <p className="text-sm text-gray-500">{permission.descripcion}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 pl-9">{permission.categoria}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (selectedUser) {
                      const updatedUsers = users.map(user =>
                        user.id === selectedUser.id
                          ? { ...user, permisos: selectedPermissions }
                          : user
                      );
                      setUsers(updatedUsers);
                      setIsPermissionsModalOpen(false);
                    }
                  }}
                  className="px-4 py-2 bg-[#08557f] text-white rounded-lg hover:bg-[#063a58] transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <Key className="h-4 w-4" />
                  <span>Guardar Permisos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación elegante */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-xl">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-linear-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {selectedUser.estado === 'active' ? 'Desactivar Usuario' : 'Activar Usuario'}
                </h3>
                <p className="text-gray-600 mb-6 text-sm">
                  {selectedUser.estado === 'active'
                    ? `¿Desactivar a ${selectedUser.nombre}? El usuario perderá acceso al sistema.`
                    : `¿Activar a ${selectedUser.nombre}? El usuario recuperará acceso al sistema.`
                  }
                </p>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleToggleUserStatus}
                  className={`px-6 py-2 rounded-lg text-white text-sm font-medium transition-colors ${selectedUser.estado === 'active'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-500 hover:bg-green-600'
                    }`}
                >
                  {selectedUser.estado === 'active' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
