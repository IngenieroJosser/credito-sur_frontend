'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
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
  Sparkles,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos adaptados a los enums de Prisma
type RolUsuario = 'SUPER_ADMINISTRADOR' | 'COORDINADOR' | 'SUPERVISOR' | 'COBRADOR' | 'CONTADOR';
type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

interface User {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  rol: RolUsuario;
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
  bgColor: string;
  icon: React.ReactNode;
}

const UserManagementPage = () => {
  // Mock del rol actual (en una implementación real vendría del contexto de autenticación)
  const currentUserRole: RolUsuario = 'SUPER_ADMINISTRADOR';

  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      nombres: 'María',
      apellidos: 'Rodríguez',
      correo: 'maria.rodriguez@credisur.com',
      telefono: '+57 300 123 4567',
      rol: 'SUPER_ADMINISTRADOR',
      estado: 'ACTIVO',
      fechaCreacion: '2023-01-15',
      ultimoAcceso: 'Hoy 09:42',
      permisos: ['full_access', 'user_management', 'financial_reports']
    },
    {
      id: '2',
      nombres: 'Carlos',
      apellidos: 'Méndez',
      correo: 'carlos.mendez@credisur.com',
      telefono: '+57 310 234 5678',
      rol: 'COORDINADOR',
      estado: 'ACTIVO',
      fechaCreacion: '2023-03-20',
      ultimoAcceso: 'Hoy 08:30',
      permisos: ['loan_approval', 'team_management', 'reports_view']
    },
    {
      id: '3',
      nombres: 'Ana',
      apellidos: 'López',
      correo: 'ana.lopez@credisur.com',
      telefono: '+57 320 345 6789',
      rol: 'SUPERVISOR',
      estado: 'ACTIVO',
      fechaCreacion: '2023-05-10',
      ultimoAcceso: 'Ayer 14:20',
      permisos: ['collection_supervision', 'reports_view']
    },
    {
      id: '4',
      nombres: 'Pedro',
      apellidos: 'Gómez',
      correo: 'pedro.gomez@credisur.com',
      telefono: '+57 315 456 7890',
      rol: 'COBRADOR',
      estado: 'ACTIVO',
      fechaCreacion: '2023-07-25',
      ultimoAcceso: 'Hoy 10:15',
      permisos: ['collection_management', 'client_view']
    },
    {
      id: '5',
      nombres: 'Laura',
      apellidos: 'Sánchez',
      correo: 'laura.sanchez@credisur.com',
      telefono: '+57 316 567 8901',
      rol: 'CONTADOR',
      estado: 'INACTIVO',
      fechaCreacion: '2023-09-05',
      ultimoAcceso: '10 Mar 16:45',
      permisos: ['financial_operations', 'reports_view']
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    contrasena: '',
    rol: 'COBRADOR' as RolUsuario,
    estado: 'ACTIVO' as EstadoUsuario
  });

  const roles: Role[] = [
    { id: 'SUPER_ADMINISTRADOR', nombre: 'Administrador', label: 'Administrador', descripcion: 'Acceso total al sistema', color: 'text-violet-600', bgColor: 'bg-violet-50', icon: <Shield className="h-3.5 w-3.5" /> },
    { id: 'COORDINADOR', nombre: 'Coordinador', label: 'Coordinador', descripcion: 'Gestión operativa', color: 'text-sky-600', bgColor: 'bg-sky-50', icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'SUPERVISOR', nombre: 'Supervisor', label: 'Supervisor', descripcion: 'Supervisión y control', color: 'text-violet-600', bgColor: 'bg-violet-50', icon: <Eye className="h-3.5 w-3.5" /> },
    { id: 'COBRADOR', nombre: 'Cobrador', label: 'Cobrador', descripcion: 'Gestión de cobranza', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: <Briefcase className="h-3.5 w-3.5" /> },
    { id: 'CONTADOR', nombre: 'Contable', label: 'Contable', descripcion: 'Operaciones financieras', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: <Sparkles className="h-3.5 w-3.5" /> }
  ];

  const roleFilters = [
    { id: 'all', label: 'Todos', nombre: 'Todos', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ...roles
  ];

  const filteredUsers = users.filter(user => {
    const fullName = `${user.nombres} ${user.apellidos}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      user.correo.toLowerCase().includes(searchTerm.toLowerCase());
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
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: '',
      contrasena: '',
      rol: 'COBRADOR',
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
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      telefono: user.telefono,
      contrasena: '', // No password on edit
      rol: user.rol,
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
      fechaCreacion: new Date().toLocaleDateString('es-CO'),
      ultimoAcceso: 'Hoy ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
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

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    const updatedUsers = users.map(user => {
      if (user.id === selectedUser.id) {
        return {
          ...user,
          ...formData
        };
      }
      return user;
    });

    setUsers(updatedUsers);
    setIsEditModalOpen(false);
  };

  const handleUpdatePermissions = () => {
    if (!selectedUser) return;

    const updatedUsers = users.map(user => {
      if (user.id === selectedUser.id) {
        return {
          ...user,
          permisos: selectedPermissions
        };
      }
      return user;
    });

    setUsers(updatedUsers);
    setIsPermissionsModalOpen(false);
  };

  const availablePermissions = [
    { id: 'full_access', label: 'Acceso Total', description: 'Control total del sistema' },
    { id: 'user_management', label: 'Gestión de Usuarios', description: 'Crear y editar usuarios' },
    { id: 'financial_reports', label: 'Reportes Financieros', description: 'Ver reportes contables' },
    { id: 'loan_approval', label: 'Aprobar Préstamos', description: 'Autorizar nuevos créditos' },
    { id: 'team_management', label: 'Gestión de Equipo', description: 'Administrar cobradores' },
    { id: 'collection_supervision', label: 'Supervisión de Cobranza', description: 'Monitorear rutas' },
    { id: 'reports_view', label: 'Ver Reportes', description: 'Acceso a reportes básicos' },
    { id: 'collection_management', label: 'Gestión de Cobro', description: 'Registrar pagos y visitas' },
    { id: 'client_view', label: 'Ver Clientes', description: 'Consultar información de clientes' },
    { id: 'financial_operations', label: 'Operaciones Financieras', description: 'Gestionar gastos y cajas' }
  ];

  const handleTogglePermission = (permissionId: string) => {
    if (selectedPermissions.includes(permissionId)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permissionId));
    } else {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    }
  };

  const getStatusColor = (estado: User['estado']) => {
    switch (estado) {
      case 'ACTIVO': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'INACTIVO': return 'text-slate-600 bg-slate-100 border-slate-200';
      case 'SUSPENDIDO': return 'text-rose-700 bg-rose-50 border-rose-100';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
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

  return (
    <>
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        {/* Header Standard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900 tracking-wide mb-2 border border-slate-200">
                <Users className="h-3.5 w-3.5" />
                <span>Gestión de Usuarios</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="text-blue-600">Usuarios del </span><span className="text-orange-500">Sistema</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Administra el acceso, roles y permisos de los usuarios de CrediSur.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4" />
                <span>Nuevo Usuario</span>
              </button>
            </div>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Usuarios Totales', value: stats.total, color: 'text-sky-700', bgColor: 'bg-sky-50', icon: <Users className="h-5 w-5" /> },
            { label: 'Activos', value: stats.active, color: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: <Check className="h-5 w-5" /> },
            { label: 'Administradores', value: stats.admins, color: 'text-violet-700', bgColor: 'bg-violet-50', icon: <Shield className="h-5 w-5" /> },
            { label: 'Inactivos', value: stats.inactive, color: 'text-slate-600', bgColor: 'bg-slate-100', icon: <EyeOff className="h-5 w-5" /> }
          ].map((stat, index) => (
            <div
              key={index}
              className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{stat.value}</h3>
                </div>
                <div className={cn("p-3 rounded-xl group-hover:scale-110 transition-transform duration-300", stat.bgColor, stat.color)}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros y Vistas */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="relative w-full md:w-64 lg:w-80">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-2.5 w-full bg-slate-50/50 focus:bg-white border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end overflow-x-auto pb-2 md:pb-0">
            <div className="flex flex-wrap items-center gap-1 bg-slate-50/50 p-1 rounded-xl border border-slate-200">
              {roleFilters.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setFilterRole(role.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                    filterRole === role.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>

            <div className="flex bg-slate-50/50 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>


        {/* Vista Lista (Tabla) */}
        {viewMode === 'list' ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 font-bold tracking-wider">Usuario</th>
                  <th className="px-6 py-5 font-bold tracking-wider">Rol</th>
                  <th className="px-6 py-5 font-bold tracking-wider">Estado</th>
                  <th className="px-6 py-5 font-bold tracking-wider">Último Acceso</th>
                  <th className="px-8 py-5 font-bold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const role = roles.find(r => r.id === user.rol);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 text-slate-600 font-bold text-xs shadow-sm">
                            {user.nombres.charAt(0)}{user.apellidos.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{user.nombres} {user.apellidos}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                              <Mail className="h-3 w-3" />
                              {user.correo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", role?.bgColor, role?.color)}>
                            {role?.icon}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{role?.nombre}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border",
                          getStatusColor(user.estado)
                        )}>
                          {getStatusText(user.estado)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-slate-500 font-medium">
                        {user.ultimoAcceso}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar"
                            disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenPermissionsModal(user)}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Permisos"
                            disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(user)}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              user.estado === 'ACTIVO' ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            )}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          /* Vista Grid (Tarjetas) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredUsers.map((user) => {
              const role = roles.find(r => r.id === user.rol);
              return (
                <div key={user.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 p-6 flex flex-col gap-4 group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 text-slate-600 font-bold text-sm shadow-sm group-hover:bg-slate-200 group-hover:text-slate-900 transition-colors">
                        {user.nombres.charAt(0)}{user.apellidos.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 line-clamp-1">{user.nombres} {user.apellidos}</h3>
                        <p className="text-xs text-slate-500 font-medium">{user.correo}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                      getStatusColor(user.estado)
                    )}>
                      {getStatusText(user.estado)}
                    </span>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                      <div className={cn("p-2 rounded-lg", role?.bgColor, role?.color)}>
                        {role?.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol asignado</div>
                        <div className="font-bold text-slate-900 text-sm">{role?.nombre}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 font-medium block mb-0.5">Departamento</span>
                        <span className="font-bold text-slate-700">{user.departamento}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 font-medium block mb-0.5">Último acceso</span>
                        <span className="font-bold text-slate-700">{user.ultimoAcceso}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-auto">
                    <button
                      onClick={() => handleOpenEditModal(user)}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Editar"
                      disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenPermissionsModal(user)}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Permisos"
                      disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(user)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        user.estado === 'ACTIVO' ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      )}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* Modals */}
      {mounted && createPortal(
        <>
          {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl p-8 transform scale-100 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 tracking-tight">Nuevo <span className="font-light text-slate-500">Usuario</span></h2>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombres</label>
                  <input
                    type="text"
                    value={formData.nombres}
                    onChange={(e) => setFormData({...formData, nombres: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Ej. Juan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellidos</label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Ej. Pérez"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({...formData, correo: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="Ej. juan@credisur.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Ej. 300 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
                  <input
                    type="password"
                    value={formData.contrasena}
                    onChange={(e) => setFormData({...formData, contrasena: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rol</label>
                <div className="relative">
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value as RolUsuario})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 appearance-none bg-white text-sm font-medium text-slate-900"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 transition-all transform active:scale-95"
                >
                  Crear Usuario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl p-8 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                selectedUser.estado === 'ACTIVO' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              )}>
                {selectedUser.estado === 'ACTIVO' ? <AlertCircle className="h-6 w-6" /> : <Check className="h-6 w-6" />}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {selectedUser.estado === 'ACTIVO' ? '¿Desactivar usuario?' : '¿Activar usuario?'}
              </h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                {selectedUser.estado === 'ACTIVO' 
                  ? `Estás a punto de desactivar el acceso de ${selectedUser.nombre}.` 
                  : `Se restablecerá el acceso para ${selectedUser.nombre}.`
                }
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleToggleUserStatus}
                  className={cn(
                    "flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all transform active:scale-95",
                    selectedUser.estado === 'ACTIVO' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  )}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>,
        document.body
      )}
    </>
  );
};

export default UserManagementPage;
