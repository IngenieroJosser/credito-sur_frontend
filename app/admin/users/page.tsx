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
  ChevronDown,
  Shield,
  Users,
  Mail,
  Briefcase,
  AlertCircle,
  Sparkles
} from 'lucide-react';

// Tipos adaptados a los enums de Prisma
type RolUsuario = 'SUPER_ADMINISTRADOR' | 'COORDINADOR' | 'SUPERVISOR' | 'COBRADOR' | 'CONTADOR';
type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

interface User {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: RolUsuario;
  departamento: string;
  estado: EstadoUsuario;
  fechaCreacion: string;
  ultimoAcceso: string;
  permisos: string[];
}

interface Role {
  id: RolUsuario;
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
      rol: 'SUPER_ADMINISTRADOR',
      departamento: 'Administración',
      estado: 'ACTIVO',
      fechaCreacion: '2023-01-15',
      ultimoAcceso: 'Hoy 09:42',
      permisos: ['full_access', 'user_management', 'financial_reports']
    },
    {
      id: '2',
      nombre: 'Carlos Méndez',
      email: 'carlos.mendez@credifinance.com',
      telefono: '+52 55 2345 6789',
      rol: 'COORDINADOR',
      departamento: 'Operaciones',
      estado: 'ACTIVO',
      fechaCreacion: '2023-03-20',
      ultimoAcceso: 'Hoy 08:30',
      permisos: ['loan_approval', 'team_management', 'reports_view']
    },
    {
      id: '3',
      nombre: 'Ana López',
      email: 'ana.lopez@credifinance.com',
      telefono: '+52 55 3456 7890',
      rol: 'SUPERVISOR',
      departamento: 'Supervisión',
      estado: 'ACTIVO',
      fechaCreacion: '2023-05-10',
      ultimoAcceso: 'Ayer 14:20',
      permisos: ['collection_supervision', 'reports_view']
    },
    {
      id: '4',
      nombre: 'Pedro Gómez',
      email: 'pedro.gomez@credifinance.com',
      telefono: '+52 55 4567 8901',
      rol: 'COBRADOR',
      departamento: 'Cobranza',
      estado: 'ACTIVO',
      fechaCreacion: '2023-07-25',
      ultimoAcceso: 'Hoy 10:15',
      permisos: ['collection_management', 'client_view']
    },
    {
      id: '5',
      nombre: 'Laura Sánchez',
      email: 'laura.sanchez@credifinance.com',
      telefono: '+52 55 5678 9012',
      rol: 'CONTADOR',
      departamento: 'Contabilidad',
      estado: 'INACTIVO',
      fechaCreacion: '2023-09-05',
      ultimoAcceso: '10 Mar 16:45',
      permisos: ['financial_operations', 'reports_view']
    },
    {
      id: '6',
      nombre: 'Roberto Vargas',
      email: 'roberto.vargas@credifinance.com',
      telefono: '+52 55 6789 0123',
      rol: 'COBRADOR',
      departamento: 'Cobranza',
      estado: 'ACTIVO',
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
  const [, setIsPermissionsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUserRole] = useState<RolUsuario>('SUPER_ADMINISTRADOR');

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    rol: 'COBRADOR' as User['rol'],
    departamento: '',
    estado: 'ACTIVO' as User['estado']
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const roles: Role[] = [
    { id: 'SUPER_ADMINISTRADOR', nombre: 'Administrador', label: 'Administrador', descripcion: 'Acceso total al sistema', color: 'var(--primary)', icon: <Shield className="h-3 w-3" /> },
    { id: 'COORDINADOR', nombre: 'Coordinador', label: 'Coordinador', descripcion: 'Gestión operativa', color: 'var(--success)', icon: <Users className="h-3 w-3" /> },
    { id: 'SUPERVISOR', nombre: 'Supervisor', label: 'Supervisor', descripcion: 'Supervisión y control', color: 'var(--info)', icon: <Eye className="h-3 w-3" /> },
    { id: 'COBRADOR', nombre: 'Cobrador', label: 'Cobrador', descripcion: 'Gestión de cobranza', color: 'var(--warning)', icon: <Briefcase className="h-3 w-3" /> },
    { id: 'CONTADOR', nombre: 'Contable', label: 'Contable', descripcion: 'Operaciones financieras', color: 'var(--danger)', icon: <Sparkles className="h-3 w-3" /> }
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
    active: users.filter(u => u.estado === 'ACTIVO').length,
    admins: users.filter(u => u.rol === 'SUPER_ADMINISTRADOR').length,
    inactive: users.filter(u => u.estado !== 'ACTIVO').length
  };

  const handleOpenCreateModal = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      rol: 'COBRADOR',
      departamento: '',
      estado: 'ACTIVO'
    });
    setSelectedPermissions([]);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    if (user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR') {
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
    if (user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR') {
      return;
    }

    setSelectedUser(user);
    setSelectedPermissions(user.permisos);
    setIsPermissionsModalOpen(true);
  };

  const handleOpenDeleteModal = (user: User) => {
    if (user.rol === 'SUPER_ADMINISTRADOR') {
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

    if (selectedUser.rol === 'SUPER_ADMINISTRADOR') {
      return;
    }

    const updatedUsers = users.map(user => {
      if (user.id === selectedUser.id) {
        const newEstado: User['estado'] = user.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        return { ...user, estado: newEstado };
      }
      return user;
    });

    setUsers(updatedUsers);
    setIsDeleteModalOpen(false);
  };

  const getStatusColor = (estado: User['estado']) => {
    switch (estado) {
      case 'ACTIVO': return 'text-green-600';
      case 'INACTIVO': return 'text-gray-400';
      case 'SUSPENDIDO': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (estado: User['estado']) => {
    switch (estado) {
      case 'ACTIVO': return 'Activo';
      case 'INACTIVO': return 'Inactivo';
      case 'SUSPENDIDO': return 'Suspendido';
      default: return 'Desconocido';
    }
  };

  const getStatusIcon = (estado: User['estado']) => {
    switch (estado) {
      case 'ACTIVO': return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'INACTIVO': return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
      case 'SUSPENDIDO': return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default: return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      {/* Header elegante */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h1 className="ml-3 text-lg font-light text-gray-800">
                  <span className="font-normal text-primary">Gestión</span> de Usuarios
                </h1>
              </div>

              {/* Indicador de rol sutil */}
              <div className="hidden md:block">
                <div className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  {currentUserRole === 'SUPER_ADMINISTRADOR' ? 'Administrador' : 'Coordinador'}
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
                  className="pl-10 pr-4 py-2 w-40 md:w-56 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none text-sm placeholder-gray-400"
                />
              </div>

              {/* Botón crear usuario */}
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-primary hover:text-primary transition-all duration-200"
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
            { label: 'Usuarios Totales', value: stats.total, color: 'var(--primary)', icon: <Users className="h-4 w-4" /> },
            { label: 'Activos', value: stats.active, color: 'var(--success)', icon: <Check className="h-4 w-4" /> },
            { label: 'Administradores', value: stats.admins, color: 'var(--info)', icon: <Shield className="h-4 w-4" /> },
            { label: 'Inactivos', value: stats.inactive, color: 'var(--warning)', icon: <EyeOff className="h-4 w-4" /> }
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
                        ? 'bg-primary text-white'
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
                        <div className="w-9 h-9 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
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
                        {user.rol === 'SUPER_ADMINISTRADOR' && (
                          <div className="ml-2">
                            <Shield className="h-3 w-3 text-primary" />
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
                          className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                          disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenPermissionsModal(user)}
                          className="p-2 text-gray-400 hover:text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                          title="Permisos"
                          disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(user)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title={user.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                          disabled={user.rol === 'SUPER_ADMINISTRADOR'}
                        >
                          {user.estado === 'ACTIVO' ? (
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
      </main>

      {/* Modales (Simplificados para esta vista) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-100 shadow-lg p-6">
            <h2 className="text-lg font-medium mb-4 text-gray-800">Nuevo Usuario</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-primary focus:outline-none"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-primary focus:outline-none"
                  placeholder="Ej. juan@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <div className="relative">
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value as RolUsuario})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-primary focus:outline-none appearance-none bg-white"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Crear Usuario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm border border-gray-100 shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedUser.estado === 'ACTIVO' ? '¿Desactivar usuario?' : '¿Activar usuario?'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {selectedUser.estado === 'ACTIVO' 
                ? `El usuario ${selectedUser.nombre} perderá acceso al sistema.`
                : `El usuario ${selectedUser.nombre} recuperará el acceso al sistema.`
              }
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleUserStatus}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  selectedUser.estado === 'ACTIVO' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {selectedUser.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
