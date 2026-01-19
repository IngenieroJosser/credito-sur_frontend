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
  Users
} from 'lucide-react';

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

  const [allPermissions, setAllPermissions] = useState<Permission[]>([
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
  const [filterCategory, setFilterCategory] = useState<string>('all');
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
      case 'lectura': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'escritura': return 'text-green-600 bg-green-50 border-green-100';
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
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Roles y Permisos</h1>
                <p className="text-sm text-gray-500">Gestión de acceso y seguridad del sistema</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleOpenCreateRoleModal}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Nuevo Rol</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Roles', value: roles.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Permisos', value: allPermissions.length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Roles Sistema', value: roles.filter(r => r.esSistema).length, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Roles Personalizados', value: roles.filter(r => !r.esSistema).length, color: 'text-orange-600', bg: 'bg-orange-50' }
          ].map((stat, index) => (
            <div key={index} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className={`text-2xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Roles */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-semibold text-gray-800">Roles Definidos</h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{roles.length}</span>
              </div>
              
              <div className="divide-y divide-gray-50">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className="p-4 hover:bg-gray-50 transition-colors group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${role.esSistema ? 'bg-primary' : 'bg-orange-400'}`}></div>
                        <h3 className="font-medium text-gray-900">{role.nombre}</h3>
                      </div>
                      {role.esSistema && (
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                          Sistema
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{role.descripcion}</p>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-xs text-gray-400 flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {role.usuariosAsignados} usuarios
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenPermissionsModal(role)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="Gestionar Permisos"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        {!role.esSistema && (
                          <>
                            <button
                              onClick={() => handleOpenEditRoleModal(role)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar Rol"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteRoleModal(role)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700">
                Los roles de sistema no pueden ser eliminados ni renombrados, pero puedes ajustar sus permisos específicos según sea necesario.
              </p>
            </div>
          </div>

          {/* Panel de Permisos */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm h-full flex flex-col">
              <div className="p-5 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-800">Catálogo de Permisos</h2>
                    <p className="text-sm text-gray-500 mt-1">Capacidades disponibles en el sistema</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <select
                      value={filterModule}
                      onChange={(e) => setFilterModule(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
                  {filteredPermissions.map(permission => (
                    <div 
                      key={permission.id} 
                      className="border border-gray-100 rounded-lg p-3 hover:border-primary/30 hover:shadow-sm transition-all bg-white"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${getCategoryColor(permission.categoria)} border`}>
                          {permission.modulo}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${getCategoryColor(permission.categoria)}`}>
                          {getCategoryLabel(permission.categoria)}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-800 text-sm mb-1">{permission.nombre}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{permission.descripcion}</p>
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedRole ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <button onClick={() => setIsCreateRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Rol</label>
                <input
                  type="text"
                  value={roleFormData.nombre}
                  onChange={(e) => setRoleFormData({...roleFormData, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Ej. Auditor Externo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={roleFormData.descripcion}
                  onChange={(e) => setRoleFormData({...roleFormData, descripcion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-24 resize-none"
                  placeholder="Describe las responsabilidades de este rol..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/50 rounded-b-xl">
              <button
                onClick={() => setIsCreateRoleModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRole}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm font-medium text-sm flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Rol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Permisos */}
      {isPermissionsModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Permisos del Rol: <span className="text-primary">{selectedRole.nombre}</span></h2>
                <p className="text-sm text-gray-500">Configura qué acciones puede realizar este rol</p>
              </div>
              <button onClick={() => setIsPermissionsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allPermissions.map(permission => (
                  <div 
                    key={permission.id}
                    onClick={() => togglePermission(permission.accion)}
                    className={`
                      cursor-pointer border rounded-xl p-4 transition-all duration-200 relative overflow-hidden
                      ${selectedPermissions.includes(permission.accion) 
                        ? 'bg-white border-primary shadow-sm ring-1 ring-primary/10' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getCategoryColor(permission.categoria)}`}>
                        {permission.modulo}
                      </span>
                      {selectedPermissions.includes(permission.accion) && (
                        <div className="bg-primary text-white rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <h3 className={`font-medium text-sm mb-1 ${selectedPermissions.includes(permission.accion) ? 'text-primary' : 'text-gray-700'}`}>
                      {permission.nombre}
                    </h3>
                    <p className="text-xs text-gray-500 leading-snug">{permission.descripcion}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-white rounded-b-xl">
              <button
                onClick={() => setIsPermissionsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permisos: selectedPermissions } : r));
                  setIsPermissionsModalOpen(false);
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm font-medium text-sm flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eliminar Rol */}
      {isDeleteRoleModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-gray-100">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">¿Eliminar rol?</h2>
              <p className="text-sm text-gray-600 mb-6">
                Estás a punto de eliminar el rol <span className="font-medium text-gray-900">{selectedRole.nombre}</span>. 
                Esta acción no se puede deshacer y afectará a los usuarios que tengan este rol asignado.
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setIsDeleteRoleModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteRole}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-medium text-sm"
                >
                  Eliminar
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
