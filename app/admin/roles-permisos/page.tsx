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
    // Sistema
    { id: '1', modulo: 'Sistema', accion: 'full_access', nombre: 'Acceso Total', descripcion: 'Control total del sistema', categoria: 'administracion', activo: true },
    { id: '2', modulo: 'Sistema', accion: 'user_manage', nombre: 'Gestión Usuarios', descripcion: 'Crear, editar y eliminar usuarios', categoria: 'administracion', activo: true },
    
    // Créditos
    { id: '3', modulo: 'Créditos', accion: 'loan_create', nombre: 'Crear Préstamos', descripcion: 'Registrar nuevos préstamos', categoria: 'escritura', activo: true },
    { id: '4', modulo: 'Créditos', accion: 'loan_approve', nombre: 'Aprobar Préstamos', descripcion: 'Autorizar solicitudes de crédito', categoria: 'administracion', activo: true },
    { id: '5', modulo: 'Créditos', accion: 'loan_view', nombre: 'Ver Préstamos', descripcion: 'Consultar listado y detalles', categoria: 'lectura', activo: true },
    
    // Cobranza
    { id: '6', modulo: 'Cobranza', accion: 'payment_create', nombre: 'Registrar Pagos', descripcion: 'Ingresar pagos de cuotas', categoria: 'escritura', activo: true },
    { id: '7', modulo: 'Cobranza', accion: 'late_fee_manage', nombre: 'Gestionar Moras', descripcion: 'Configurar intereses por mora', categoria: 'administracion', activo: true },
    
    // Clientes
    { id: '8', modulo: 'Clientes', accion: 'client_create', nombre: 'Crear Clientes', descripcion: 'Registrar nuevos clientes', categoria: 'escritura', activo: true },
    { id: '9', modulo: 'Clientes', accion: 'client_view', nombre: 'Ver Clientes', descripcion: 'Consultar base de clientes', categoria: 'lectura', activo: true },
    { id: '10', modulo: 'Clientes', accion: 'client_blacklist', nombre: 'Lista Negra', descripcion: 'Gestionar lista negra', categoria: 'eliminacion', activo: true },
    
    // Reportes
    { id: '11', modulo: 'Reportes', accion: 'report_view', nombre: 'Ver Reportes', descripcion: 'Visualizar reportes operativos', categoria: 'lectura', activo: true },
    { id: '12', modulo: 'Reportes', accion: 'report_financial', nombre: 'Reportes Financieros', descripcion: 'Acceso a datos sensibles', categoria: 'administracion', activo: true },
    
    // Finanzas
    { id: '13', modulo: 'Finanzas', accion: 'accounting_manage', nombre: 'Gestión Contable', descripcion: 'Costos y gastos operativos', categoria: 'administracion', activo: true },
    { id: '14', modulo: 'Finanzas', accion: 'cash_manage', nombre: 'Control de Cajas', descripcion: 'Arqueos y movimientos', categoria: 'administracion', activo: true }
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
      case 'lectura': return 'text-[#08557f] bg-[#08557f]/5 border-[#08557f]/10';
      case 'escritura': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'eliminacion': return 'text-red-600 bg-red-50 border-red-100';
      case 'administracion': return 'text-purple-600 bg-purple-50 border-purple-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-light text-gray-800 mb-2">Acceso Restringido</h1>
          <p className="text-gray-600 mb-6 text-sm">
            Esta sección es exclusiva para administradores del sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
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

      <div className="relative z-10 mx-auto max-w-7xl space-y-8 p-6 md:p-8 lg:p-12">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#08557f]/5 px-2.5 py-0.5 text-xs font-medium text-[#08557f] mb-2">
              <Shield className="h-3.5 w-3.5" />
              <span>Seguridad del Sistema</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-gray-900">
              Roles y <span className="font-semibold">Permisos</span>
            </h1>
            <p className="text-base text-gray-500 max-w-2xl font-light">
              Gestiona los niveles de acceso y responsabilidades de los usuarios en CrediSur.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateRoleModal}
              className="inline-flex items-center gap-2 rounded-lg bg-[#08557f] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#064364] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Rol</span>
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Roles', value: roles.length, color: 'text-[#08557f]', bgColor: 'bg-[#08557f]/5', icon: <Shield className="h-5 w-5" /> },
            { label: 'Total Permisos', value: allPermissions.length, color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: <Key className="h-5 w-5" /> },
            { label: 'Roles Sistema', value: roles.filter(r => r.esSistema).length, color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Settings className="h-5 w-5" /> },
            { label: 'Roles Personalizados', value: roles.filter(r => !r.esSistema).length, color: 'text-amber-600', bgColor: 'bg-amber-50', icon: <Users className="h-5 w-5" /> }
          ].map((stat, index) => (
            <div
              key={index}
              className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-gray-200/50 hover:shadow-sm transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-2xl font-light text-gray-900 mt-2 tracking-tight">{stat.value}</h3>
                </div>
                <div className={cn("p-2.5 rounded-lg transition-colors", stat.bgColor, stat.color)}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Roles */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-200/50 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-medium text-gray-900">Roles Definidos</h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">{roles.length}</span>
              </div>
              
              <div className="divide-y divide-gray-50">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className="p-5 hover:bg-gray-50/50 transition-colors group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${role.esSistema ? 'bg-[#08557f]' : 'bg-amber-500'}`}></div>
                        <h3 className="font-medium text-gray-900">{role.nombre}</h3>
                      </div>
                      {role.esSistema && (
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200 uppercase tracking-wide">
                          Sistema
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed font-light">{role.descripcion}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-gray-400 flex items-center bg-gray-50 px-2 py-1 rounded-md">
                        <Users className="h-3 w-3 mr-1.5" />
                        {role.usuariosAsignados} usuarios
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenPermissionsModal(role)}
                          className="p-2 text-gray-400 hover:text-[#08557f] hover:bg-[#08557f]/5 rounded-lg transition-colors"
                          title="Gestionar Permisos"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        {!role.esSistema && (
                          <>
                            <button
                              onClick={() => handleOpenEditRoleModal(role)}
                              className="p-2 text-gray-400 hover:text-[#08557f] hover:bg-[#08557f]/5 rounded-lg transition-colors"
                              title="Editar Rol"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteRoleModal(role)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Rol"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[#08557f]/5 border border-[#08557f]/10 rounded-2xl p-5 flex items-start space-x-3">
              <Info className="h-5 w-5 text-[#08557f] mt-0.5 shrink-0" />
              <p className="text-sm text-[#08557f] leading-relaxed font-light">
                Los roles de sistema no pueden ser eliminados ni renombrados para garantizar la integridad de CrediSur, pero puedes ajustar sus permisos específicos.
              </p>
            </div>
          </div>

          {/* Panel de Permisos */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200/50 rounded-2xl shadow-sm h-full flex flex-col overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-medium text-gray-900">Catálogo de Permisos</h2>
                    <p className="text-sm text-gray-500 mt-1 font-light">Capacidades disponibles en el sistema</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <select
                      value={filterModule}
                      onChange={(e) => setFilterModule(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#08557f] focus:border-[#08557f] cursor-pointer hover:border-gray-300 transition-colors"
                    >
                      <option value="all">Todos los módulos</option>
                      {modules.map(module => (
                        <option key={module} value={module}>{module}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar permiso por nombre o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#08557f] focus:border-[#08557f] transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredPermissions.map(permission => (
                    <div 
                      key={permission.id} 
                      className="group bg-white border border-gray-200/60 rounded-xl p-4 hover:border-[#08557f]/30 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide border", getCategoryColor(permission.categoria))}>
                          {permission.modulo}
                        </span>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", getCategoryColor(permission.categoria))}>
                          {getCategoryLabel(permission.categoria)}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-[#08557f] transition-colors">{permission.nombre}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed font-light">{permission.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Crear/Editar Rol */}
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 transform transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedRole ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <button onClick={() => setIsCreateRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre del Rol</label>
                <input
                  type="text"
                  value={roleFormData.nombre}
                  onChange={(e) => setRoleFormData({...roleFormData, nombre: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="Ej. Auditor Externo"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label>
                <textarea
                  value={roleFormData.descripcion}
                  onChange={(e) => setRoleFormData({...roleFormData, descripcion: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all text-sm h-24 resize-none"
                  placeholder="Describe las responsabilidades de este rol..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={() => setIsCreateRoleModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRole}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg shadow-sm transition-colors flex items-center gap-2"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar rol?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Estás a punto de eliminar el rol <span className="font-bold text-gray-800">{selectedRole.nombre}</span>. 
                Esta acción no se puede deshacer y afectará a {selectedRole.usuariosAsignados} usuarios asignados.
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setIsDeleteRoleModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteRole}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors flex items-center gap-2"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Permisos: {selectedRole.nombre}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedPermissions.length} permisos activos
                </p>
              </div>
              <button onClick={() => setIsPermissionsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              <div className="space-y-6">
                {modules.map(module => {
                  const modulePermissions = allPermissions.filter(p => p.modulo === module);
                  return (
                    <div key={module} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          {module}
                        </h3>
                        <div className="flex gap-2">
                          <button 
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
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
                                  ? "bg-[#08557f]/5 border-[#08557f]/20 shadow-sm" 
                                  : "bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              <div className={cn(
                                "mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                              )}>
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                              </div>
                              <div>
                                <h4 className={cn("text-sm font-medium mb-0.5", isSelected ? "text-blue-900" : "text-gray-900")}>
                                  {permission.nombre}
                                </h4>
                                <p className={cn("text-xs leading-relaxed", isSelected ? "text-blue-700" : "text-gray-500")}>
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
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Los cambios se aplicarán inmediatamente después de guardar.
              </span>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleSaveRole(); // Reuses logic to save permissions
                    setIsPermissionsModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Guardar Permisos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementPage;
