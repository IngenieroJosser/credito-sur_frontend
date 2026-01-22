'use client';

import { useState } from 'react';
import {
  Shield,
  Lock,
  Check,
  X,
  Search,
  Edit2,
  Plus,
  AlertCircle,
  Key,
  Trash2,
  Save,
  Info,
  Users,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos alineados con Prisma Schema
interface Permission {
  id: string;
  modulo: string;
  accion: string; // equivale a codigo
  nombre: string;
  descripcion: string;
  categoria: 'lectura' | 'escritura' | 'eliminacion' | 'administracion'; // UI helper
  activo: boolean; // UI helper
}

interface Role {
  id: string;
  nombre: string;
  descripcion: string;
  esSistema: boolean;
  usuariosAsignados: number; // UI helper (count)
  permisos: string[]; // IDs de permisos
}

const RoleManagementPage = () => {
  // Simulación de usuario actual (esto vendría del contexto de auth)
  const [currentUserRole] = useState<'SUPER_ADMINISTRADOR' | 'COORDINADOR' | 'SUPERVISOR' | 'COBRADOR' | 'CONTADOR'>('SUPER_ADMINISTRADOR');

  // Datos iniciales alineados con los Enums de Prisma y estructura propuesta
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 'SUPER_ADMINISTRADOR',
      nombre: 'Administrador',
      descripcion: 'Control total del sistema y configuración',
      esSistema: true,
      usuariosAsignados: 1,
      permisos: ['all']
    },
    {
      id: 'COORDINADOR',
      nombre: 'Coordinador',
      descripcion: 'Gestión operativa, aprobación de préstamos y rutas',
      esSistema: true,
      usuariosAsignados: 2,
      permisos: ['loan_approve', 'route_manage', 'user_view', 'report_view']
    },
    {
      id: 'SUPERVISOR',
      nombre: 'Supervisor',
      descripcion: 'Supervisión de campo y control de gastos',
      esSistema: true,
      usuariosAsignados: 3,
      permisos: ['expense_approve', 'route_view', 'report_view']
    },
    {
      id: 'COBRADOR',
      nombre: 'Cobrador',
      descripcion: 'Operaciones de campo, cobros y registro de clientes',
      esSistema: true,
      usuariosAsignados: 8,
      permisos: ['payment_create', 'client_create', 'loan_request']
    },
    {
      id: 'CONTADOR',
      nombre: 'Contable',
      descripcion: 'Gestión financiera, cajas y auditoría de costos',
      esSistema: true,
      usuariosAsignados: 1,
      permisos: ['accounting_manage', 'report_financial']
    }
  ]);

  const [allPermissions] = useState<Permission[]>([
    // Usuarios & Sistema
    { id: 'sys_1', modulo: 'Usuarios', accion: 'user_view', nombre: 'Ver Usuarios', descripcion: 'Visualizar lista de usuarios', categoria: 'lectura', activo: true },
    { id: 'sys_2', modulo: 'Usuarios', accion: 'user_manage', nombre: 'Gestionar Usuarios', descripcion: 'Crear, editar y eliminar usuarios', categoria: 'administracion', activo: true },
    { id: 'sys_3', modulo: 'Sistema', accion: 'role_manage', nombre: 'Gestionar Roles', descripcion: 'Configurar roles y permisos', categoria: 'administracion', activo: true },
    { id: 'sys_4', modulo: 'Sistema', accion: 'audit_view', nombre: 'Auditoría', descripcion: 'Ver registro de eventos', categoria: 'lectura', activo: true },
    { id: 'sys_5', modulo: 'Sistema', accion: 'backup_manage', nombre: 'Respaldos', descripcion: 'Gestionar copias de seguridad', categoria: 'administracion', activo: true },

    // Clientes
    { id: 'cli_1', modulo: 'Clientes', accion: 'client_view', nombre: 'Ver Clientes', descripcion: 'Consultar base de clientes', categoria: 'lectura', activo: true },
    { id: 'cli_2', modulo: 'Clientes', accion: 'client_create', nombre: 'Crear Clientes', descripcion: 'Registrar nuevos clientes', categoria: 'escritura', activo: true },
    { id: 'cli_3', modulo: 'Clientes', accion: 'client_edit', nombre: 'Editar Clientes', descripcion: 'Modificar datos de clientes', categoria: 'escritura', activo: true },
    { id: 'cli_4', modulo: 'Clientes', accion: 'client_approve', nombre: 'Aprobar Clientes', descripcion: 'Validar nuevos clientes', categoria: 'administracion', activo: true },
    { id: 'cli_5', modulo: 'Clientes', accion: 'client_blacklist', nombre: 'Lista Negra', descripcion: 'Gestionar lista negra', categoria: 'eliminacion', activo: true },

    // Préstamos
    { id: 'loan_1', modulo: 'Préstamos', accion: 'loan_view', nombre: 'Ver Préstamos', descripcion: 'Consultar préstamos', categoria: 'lectura', activo: true },
    { id: 'loan_2', modulo: 'Préstamos', accion: 'loan_create', nombre: 'Crear Préstamos', descripcion: 'Registrar solicitudes', categoria: 'escritura', activo: true },
    { id: 'loan_3', modulo: 'Préstamos', accion: 'loan_approve', nombre: 'Aprobar Préstamos', descripcion: 'Autorizar créditos', categoria: 'administracion', activo: true },
    { id: 'loan_4', modulo: 'Préstamos', accion: 'loan_reschedule', nombre: 'Reprogramar', descripcion: 'Autorizar cambios de fecha', categoria: 'administracion', activo: true },
    { id: 'loan_5', modulo: 'Préstamos', accion: 'loan_special_interest', nombre: 'Intereses Especiales', descripcion: 'Autorizar tasas especiales', categoria: 'administracion', activo: true },

    // Cobranzas
    { id: 'coll_1', modulo: 'Cobranzas', accion: 'payment_view', nombre: 'Ver Pagos', descripcion: 'Consultar historial de pagos', categoria: 'lectura', activo: true },
    { id: 'coll_2', modulo: 'Cobranzas', accion: 'payment_create', nombre: 'Registrar Pagos', descripcion: 'Ingresar abonos y cuotas', categoria: 'escritura', activo: true },
    { id: 'coll_3', modulo: 'Cobranzas', accion: 'late_fee_manage', nombre: 'Gestionar Moras', descripcion: 'Configurar/Perdonar moras', categoria: 'administracion', activo: true },

    // Rutas
    { id: 'route_1', modulo: 'Rutas', accion: 'route_view', nombre: 'Ver Rutas', descripcion: 'Visualizar rutas asignadas', categoria: 'lectura', activo: true },
    { id: 'route_2', modulo: 'Rutas', accion: 'route_manage', nombre: 'Gestionar Rutas', descripcion: 'Crear y asignar rutas', categoria: 'administracion', activo: true },

    // Contabilidad
    { id: 'acc_1', modulo: 'Contabilidad', accion: 'accounting_view', nombre: 'Ver Contabilidad', descripcion: 'Consultar movimientos', categoria: 'lectura', activo: true },
    { id: 'acc_2', modulo: 'Contabilidad', accion: 'cost_manage', nombre: 'Costos Productos', descripcion: 'Gestionar costos base', categoria: 'administracion', activo: true },
    { id: 'acc_3', modulo: 'Contabilidad', accion: 'expense_manage', nombre: 'Gastos Operativos', descripcion: 'Registrar gastos', categoria: 'escritura', activo: true },
    { id: 'acc_4', modulo: 'Contabilidad', accion: 'cash_manage', nombre: 'Control de Cajas', descripcion: 'Arqueos y cierres', categoria: 'administracion', activo: true },

    // Reportes
    { id: 'rep_1', modulo: 'Reportes', accion: 'report_view', nombre: 'Ver Reportes', descripcion: 'Reportes operativos básicos', categoria: 'lectura', activo: true },
    { id: 'rep_2', modulo: 'Reportes', accion: 'report_financial', nombre: 'Reportes Financieros', descripcion: 'Reportes de dinero y utilidad', categoria: 'administracion', activo: true },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterCategory] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [isDeleteRoleModalOpen, setIsDeleteRoleModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [roleFormData, setRoleFormData] = useState({
    nombre: '',
    descripcion: ''
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const isAdmin = currentUserRole === 'SUPER_ADMINISTRADOR';

  const modules = Array.from(new Set(allPermissions.map(p => p.modulo)));

  const filteredPermissions = allPermissions.filter(permission => {
    const matchesSearch = 
      permission.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = filterModule === 'all' || permission.modulo === filterModule;
    const matchesCategory = filterCategory === 'all' || permission.categoria === filterCategory;
    
    return matchesSearch && matchesModule && matchesCategory;
  });

  const getCategoryColor = (categoria: string) => {
    switch (categoria) {
      case 'lectura': return 'text-sky-700 bg-sky-50 border-sky-100';
      case 'escritura': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'eliminacion': return 'text-rose-700 bg-rose-50 border-rose-100';
      case 'administracion': return 'text-slate-700 bg-slate-100 border-slate-200';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  const getCategoryLabel = (categoria: string) => {
    switch (categoria) {
      case 'lectura': return 'Lectura';
      case 'escritura': return 'Escritura';
      case 'eliminacion': return 'Eliminación';
      case 'administracion': return 'Admin';
      default: return categoria;
    }
  };

  const handleOpenEditRoleModal = (role: Role) => {
    if (role.esSistema) return;
    setSelectedRole(role);
    setRoleFormData({
      nombre: role.nombre,
      descripcion: role.descripcion
    });
    setSelectedPermissions(role.permisos);
    setIsCreateRoleModalOpen(true);
  };

  const handleOpenPermissionsModal = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permisos);
    setIsPermissionsModalOpen(true);
  };

  const handleOpenDeleteRoleModal = (role: Role) => {
    if (role.esSistema) return;
    setSelectedRole(role);
    setIsDeleteRoleModalOpen(true);
  };

  const handleOpenCreateRoleModal = () => {
    setSelectedRole(null);
    setRoleFormData({
      nombre: '',
      descripcion: ''
    });
    setSelectedPermissions([]);
    setIsCreateRoleModalOpen(true);
  };

  const handleSaveRole = () => {
    if (selectedRole) {
      // Edit existing
      setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, ...roleFormData, permisos: selectedPermissions } : r));
    } else {
      // Create new
      const newRole: Role = {
        id: (roles.length + 1).toString(),
        ...roleFormData,
        esSistema: false,
        usuariosAsignados: 0,
        permisos: selectedPermissions
      };
      setRoles([...roles, newRole]);
    }
    setIsCreateRoleModalOpen(false);
  };

  const handleDeleteRole = () => {
    if (!selectedRole) return;
    const updatedRoles = roles.filter(role => role.id !== selectedRole.id);
    setRoles(updatedRoles);
    setIsDeleteRoleModalOpen(false);
  };

  const togglePermission = (permissionAction: string) => {
    if (selectedPermissions.includes(permissionAction)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permissionAction));
    } else {
      setSelectedPermissions([...selectedPermissions, permissionAction]);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acceso Restringido</h1>
          <p className="text-slate-600 mb-6 text-sm font-medium">
            Esta sección es exclusiva para administradores del sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        {/* Header Standard Integrado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900 tracking-wide mb-2 border border-slate-200">
              <Shield className="h-3.5 w-3.5" />
              <span>Configuración de Seguridad</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Roles y </span><span className="text-orange-500">Permisos</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Gestiona los niveles de acceso y capacidades de cada rol en el sistema.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateRoleModal}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Rol</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          {[
            { label: 'Total Roles', value: roles.length, color: 'text-slate-700', bgColor: 'bg-slate-100', icon: <Shield className="h-5 w-5" /> },
            { label: 'Total Permisos', value: allPermissions.length, color: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: <Key className="h-5 w-5" /> },
            { label: 'Roles Sistema', value: roles.filter(r => r.esSistema).length, color: 'text-sky-700', bgColor: 'bg-sky-50', icon: <Settings className="h-5 w-5" /> },
            { label: 'Roles Personalizados', value: roles.filter(r => !r.esSistema).length, color: 'text-amber-700', bgColor: 'bg-amber-50', icon: <Users className="h-5 w-5" /> }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          {/* Lista de Roles */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 text-lg">Roles Definidos</h2>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    {roles.length} roles
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1 font-medium">Selecciona un rol para ver sus permisos</p>
              </div>

              <div className="px-4 pt-4">
                <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
                  <div className="p-2 bg-sky-100/50 rounded-lg shrink-0">
                    <Info className="h-4 w-4 text-sky-700" />
                  </div>
                  <p className="text-xs text-sky-800 leading-relaxed font-medium">
                    Los roles de sistema no pueden ser eliminados ni renombrados para garantizar la integridad de CrediSur, pero puedes ajustar sus permisos específicos.
                  </p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => {
                      setSelectedRole(role);
                      setSelectedPermissions(role.permisos);
                    }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all cursor-pointer group relative",
                      selectedRole?.id === role.id
                        ? "border-slate-900 bg-slate-50/80 shadow-sm"
                        : "border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg transition-colors",
                          selectedRole?.id === role.id ? "bg-white shadow-sm" : "bg-slate-100 group-hover:bg-white group-hover:shadow-sm"
                        )}>
                          <Shield className={cn(
                            "h-4 w-4",
                            selectedRole?.id === role.id ? "text-slate-900" : "text-slate-500"
                          )} />
                        </div>
                        <div>
                          <h3 className={cn(
                            "font-bold text-sm",
                            selectedRole?.id === role.id ? "text-slate-900" : "text-slate-700"
                          )}>
                            {role.nombre}
                          </h3>
                          {role.esSistema && (
                            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                              SISTEMA
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500">{role.usuariosAsignados}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2 pl-[3.25rem]">
                      {role.descripcion}
                    </p>

                    <div className="mt-3 pl-[3.25rem] flex items-center justify-between">
                      <div className="flex -space-x-1.5">
                        {[...Array(Math.min(3, role.usuariosAsignados))].map((_, i) => (
                          <div key={i} className="w-5 h-5 rounded-full bg-slate-200 border border-white ring-1 ring-white" />
                        ))}
                        {role.usuariosAsignados > 3 && (
                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[9px] font-bold text-slate-500">
                            +{role.usuariosAsignados - 3}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenPermissionsModal(role); }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Gestionar Permisos"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>
                        {!role.esSistema && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEditRoleModal(role); }}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Editar Rol"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenDeleteRoleModal(role); }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar Rol"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel de Permisos */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">Catálogo de Permisos</h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Capacidades disponibles en el sistema</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <select
                      value={filterModule}
                      onChange={(e) => setFilterModule(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent cursor-pointer hover:border-slate-300 transition-colors"
                    >
                      <option value="all">Todos los módulos</option>
                      {modules.map(module => (
                        <option key={module} value={module}>{module}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar permiso por nombre o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredPermissions.map(permission => (
                    <div 
                      key={permission.id} 
                      className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border", getCategoryColor(permission.categoria))}>
                          {permission.modulo}
                        </span>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", getCategoryColor(permission.categoria))}>
                          {getCategoryLabel(permission.categoria)}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-slate-700 transition-colors">{permission.nombre}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">{permission.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Modal de Crear/Editar Rol */}
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-slate-100 transform transition-all">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl shrink-0">
              <h2 className="text-xl font-bold text-slate-900">
                {selectedRole ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <button onClick={() => setIsCreateRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-8">
                {/* Información General */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Información General
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre del Rol <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={roleFormData.nombre}
                        onChange={(e) => setRoleFormData({...roleFormData, nombre: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-sm font-medium"
                        placeholder="Ej. Auditor Externo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Descripción</label>
                      <input
                        type="text"
                        value={roleFormData.descripcion}
                        onChange={(e) => setRoleFormData({...roleFormData, descripcion: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-sm font-medium"
                        placeholder="Breve descripción de responsabilidades"
                      />
                    </div>
                  </div>
                </div>

                {/* Selección de Permisos */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Permisos del Sistema
                    </h3>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                      {selectedPermissions.length} seleccionados
                    </span>
                  </div>

                  <div className="space-y-4">
                    {modules.map(module => {
                      const modulePermissions = allPermissions.filter(p => p.modulo === module);
                      const moduleIds = modulePermissions.map(p => p.accion);
                      const allSelected = moduleIds.every(id => selectedPermissions.includes(id));
                      const someSelected = moduleIds.some(id => selectedPermissions.includes(id));

                      return (
                        <div key={module} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  if (allSelected) {
                                    setSelectedPermissions(prev => prev.filter(id => !moduleIds.includes(id)));
                                  } else {
                                    setSelectedPermissions(prev => [...new Set([...prev, ...moduleIds])]);
                                  }
                                }}
                                className={cn(
                                  "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                  allSelected ? "bg-slate-900 border-slate-900 text-white" : 
                                  someSelected ? "bg-slate-900 border-slate-900 text-white" : "border-slate-300 bg-white"
                                )}
                              >
                                {allSelected && <Check className="h-3.5 w-3.5" />}
                                {!allSelected && someSelected && <div className="w-2 h-0.5 bg-white rounded-full" />}
                              </button>
                              <h3 className="font-bold text-slate-900">{module}</h3>
                            </div>
                          </div>
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {modulePermissions.map(permission => {
                              const isSelected = selectedPermissions.includes(permission.accion);
                              return (
                                <div 
                                  key={permission.id}
                                  onClick={() => togglePermission(permission.accion)}
                                  className={cn(
                                    "cursor-pointer border rounded-xl p-3 transition-all duration-200 flex items-start gap-3 select-none",
                                    isSelected 
                                      ? "bg-slate-900/5 border-slate-900/20 shadow-sm" 
                                      : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  <div className={cn(
                                    "mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                    isSelected ? "bg-slate-900 border-slate-900 text-white" : "border-slate-300 bg-white"
                                  )}>
                                    {isSelected && <Check className="h-3.5 w-3.5" />}
                                  </div>
                                  <div>
                                    <h4 className={cn("text-sm font-bold mb-0.5", isSelected ? "text-slate-900" : "text-slate-700")}>
                                      {permission.nombre}
                                    </h4>
                                    <p className={cn("text-xs leading-relaxed font-medium", isSelected ? "text-slate-600" : "text-slate-500")}>
                                      {permission.descripcion}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end space-x-3 shrink-0">
              <button
                onClick={() => setIsCreateRoleModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRole}
                className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Guardar Rol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eliminar Rol */}
      {isDeleteRoleModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <AlertCircle className="h-8 w-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar rol?</h3>
              <p className="text-slate-500 text-sm mb-6 font-medium">
                Estás a punto de eliminar el rol <span className="font-bold text-slate-900">{selectedRole.nombre}</span>. 
                Esta acción no se puede deshacer y afectará a {selectedRole.usuariosAsignados} usuarios asignados.
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setIsDeleteRoleModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteRole}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Permisos */}
      {isPermissionsModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Permisos: {selectedRole.nombre}
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {selectedPermissions.length} permisos activos
                </p>
              </div>
              <button onClick={() => setIsPermissionsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="space-y-6">
                {modules.map(module => {
                  const modulePermissions = allPermissions.filter(p => p.modulo === module);
                  return (
                    <div key={module} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
                          {module}
                        </h3>
                        <div className="flex gap-2">
                          <button 
                            className="text-xs text-slate-600 hover:text-slate-900 font-bold px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                            onClick={() => {
                              const moduleIds = modulePermissions.map(p => p.accion);
                              const allSelected = moduleIds.every(id => selectedPermissions.includes(id));
                              
                              if (allSelected) {
                                setSelectedPermissions(prev => prev.filter(id => !moduleIds.includes(id)));
                              } else {
                                setSelectedPermissions(prev => [...new Set([...prev, ...moduleIds])]);
                              }
                            }}
                          >
                            Seleccionar todos
                          </button>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {modulePermissions.map(permission => {
                          const isSelected = selectedPermissions.includes(permission.accion);
                          return (
                            <div 
                              key={permission.id}
                              onClick={() => togglePermission(permission.accion)}
                              className={cn(
                                "cursor-pointer border rounded-xl p-3 transition-all duration-200 flex items-start gap-3",
                                isSelected 
                                  ? "bg-slate-900/5 border-slate-900/20 shadow-sm" 
                                  : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                              )}
                            >
                              <div className={cn(
                                "mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                isSelected ? "bg-slate-900 border-slate-900 text-white" : "border-slate-300 bg-white"
                              )}>
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                              </div>
                              <div>
                                <h4 className={cn("text-sm font-bold mb-0.5", isSelected ? "text-slate-900" : "text-slate-700")}>
                                  {permission.nombre}
                                </h4>
                                <p className={cn("text-xs leading-relaxed font-medium", isSelected ? "text-slate-600" : "text-slate-500")}>
                                  {permission.descripcion}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">
                Los cambios se aplicarán inmediatamente después de guardar.
              </span>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleSaveRole(); // Reuses logic to save permissions
                    setIsPermissionsModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 transition-colors flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Guardar Permisos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoleManagementPage;
