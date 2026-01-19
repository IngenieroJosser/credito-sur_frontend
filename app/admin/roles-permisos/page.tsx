'use client'

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
  Trash2
} from 'lucide-react';

interface Permission {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  modulo: string;
  categoria: 'lectura' | 'escritura' | 'eliminacion' | 'administracion';
  activo: boolean;
}

interface Role {
  id: string;
  nombre: string;
  descripcion: string;
  nivel: number;
  esSistema: boolean;
  usuariosAsignados: number;
  permisos: string[];
}

const RoleManagementPage = () => {
  const [currentUserRole] = useState<'admin' | 'coordinator' | 'supervisor' | 'collector' | 'accountant'>('admin');
  const [roles, setRoles] = useState<Role[]>([
    {
      id: '1',
      nombre: 'Administrador',
      descripcion: 'Acceso completo al sistema',
      nivel: 100,
      esSistema: true,
      usuariosAsignados: 3,
      permisos: ['full_access']
    },
    {
      id: '2',
      nombre: 'Coordinador',
      descripcion: 'Gestión operativa',
      nivel: 80,
      esSistema: false,
      usuariosAsignados: 5,
      permisos: ['loan_approval', 'team_management', 'reports_view', 'collection_view']
    },
    {
      id: '3',
      nombre: 'Supervisor',
      descripcion: 'Supervisión y control',
      nivel: 60,
      esSistema: false,
      usuariosAsignados: 8,
      permisos: ['collection_supervision', 'reports_view', 'client_view']
    },
    {
      id: '4',
      nombre: 'Cobrador',
      descripcion: 'Gestión de cobranza',
      nivel: 40,
      esSistema: false,
      usuariosAsignados: 15,
      permisos: ['collection_management', 'client_view', 'payment_register']
    },
    {
      id: '5',
      nombre: 'Contable',
      descripcion: 'Operaciones financieras',
      nivel: 50,
      esSistema: false,
      usuariosAsignados: 4,
      permisos: ['financial_operations', 'reports_view', 'accounting_management']
    }
  ]);

  const [allPermissions, setAllPermissions] = useState<Permission[]>([
    // Sistema
    { id: '1', codigo: 'full_access', nombre: 'Acceso Total', descripcion: 'Acceso completo', modulo: 'Sistema', categoria: 'administracion', activo: true },
    { id: '2', codigo: 'user_management', nombre: 'Gestión Usuarios', descripcion: 'Crear y editar usuarios', modulo: 'Sistema', categoria: 'administracion', activo: true },
    { id: '3', codigo: 'role_management', nombre: 'Gestión Roles', descripcion: 'Configurar roles', modulo: 'Sistema', categoria: 'administracion', activo: true },
    
    // Créditos
    { id: '4', codigo: 'loan_create', nombre: 'Crear Préstamos', descripcion: 'Registrar créditos', modulo: 'Créditos', categoria: 'escritura', activo: true },
    { id: '5', codigo: 'loan_approval', nombre: 'Aprobar Préstamos', descripcion: 'Aprobar solicitudes', modulo: 'Créditos', categoria: 'administracion', activo: true },
    { id: '6', codigo: 'loan_view', nombre: 'Ver Préstamos', descripcion: 'Consultar créditos', modulo: 'Créditos', categoria: 'lectura', activo: true },
    
    // Cobranza
    { id: '7', codigo: 'collection_management', nombre: 'Gestión Cobranza', descripcion: 'Actividades cobranza', modulo: 'Cobranza', categoria: 'escritura', activo: true },
    { id: '8', codigo: 'collection_supervision', nombre: 'Supervisión', descripcion: 'Supervisar cobranza', modulo: 'Cobranza', categoria: 'administracion', activo: true },
    
    // Clientes
    { id: '9', codigo: 'client_create', nombre: 'Crear Clientes', descripcion: 'Registrar clientes', modulo: 'Clientes', categoria: 'escritura', activo: true },
    { id: '10', codigo: 'client_view', nombre: 'Ver Clientes', descripcion: 'Consultar clientes', modulo: 'Clientes', categoria: 'lectura', activo: true },
    
    // Reportes
    { id: '11', codigo: 'reports_generate', nombre: 'Generar Reportes', descripcion: 'Crear reportes', modulo: 'Reportes', categoria: 'escritura', activo: true },
    { id: '12', codigo: 'reports_view', nombre: 'Ver Reportes', descripcion: 'Consultar reportes', modulo: 'Reportes', categoria: 'lectura', activo: true },
    
    // Finanzas
    { id: '13', codigo: 'financial_operations', nombre: 'Operaciones Financieras', descripcion: 'Operaciones financieras', modulo: 'Finanzas', categoria: 'escritura', activo: true },
    { id: '14', codigo: 'accounting_management', nombre: 'Gestión Contable', descripcion: 'Operaciones contables', modulo: 'Finanzas', categoria: 'administracion', activo: true }
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
    descripcion: '',
    nivel: 50
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const isAdmin = currentUserRole === 'admin';

  const modules = Array.from(new Set(allPermissions.map(p => p.modulo)));

  const filteredPermissions = allPermissions.filter(permission => {
    const matchesSearch = 
      permission.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = filterModule === 'all' || permission.modulo === filterModule;
    const matchesCategory = filterCategory === 'all' || permission.categoria === filterCategory;
    
    return matchesSearch && matchesModule && matchesCategory;
  });

  const getCategoryColor = (categoria: string) => {
    switch (categoria) {
      case 'lectura': return 'text-blue-500 bg-blue-50';
      case 'escritura': return 'text-green-500 bg-green-50';
      case 'eliminacion': return 'text-red-500 bg-red-50';
      case 'administracion': return 'text-purple-500 bg-purple-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getCategoryText = (categoria: string) => {
    switch (categoria) {
      case 'lectura': return 'L';
      case 'escritura': return 'E';
      case 'eliminacion': return 'D';
      case 'administracion': return 'A';
      default: return categoria;
    }
  };

  const handleOpenEditRoleModal = (role: Role) => {
    if (role.esSistema) return;
    setSelectedRole(role);
    setRoleFormData({
      nombre: role.nombre,
      descripcion: role.descripcion,
      nivel: role.nivel
    });
    setSelectedPermissions(role.permisos);
  };

  const handleOpenPermissionsModal = (role: Role) => {
    if (role.esSistema) return;
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
    setRoleFormData({
      nombre: '',
      descripcion: '',
      nivel: 50
    });
    setSelectedPermissions([]);
    setIsCreateRoleModalOpen(true);
  };

  const handleCreateRole = () => {
    const newRole: Role = {
      id: (roles.length + 1).toString(),
      ...roleFormData,
      esSistema: false,
      usuariosAsignados: 0,
      permisos: selectedPermissions
    };
    
    setRoles([...roles, newRole]);
    setIsCreateRoleModalOpen(false);
  };

  const handleDeleteRole = () => {
    if (!selectedRole) return;
    
    const updatedRoles = roles.filter(role => role.id !== selectedRole.id);
    setRoles(updatedRoles);
    setIsDeleteRoleModalOpen(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-light text-gray-800 mb-2">Acceso Restringido</h1>
          <p className="text-gray-600 mb-6 text-sm">
            Exclusivo para administradores del sistema
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-light text-gray-800">Roles y Permisos</h1>
                <p className="text-xs text-gray-500">Gestión granular del sistema</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleOpenCreateRoleModal}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-primary hover:text-primary transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Nuevo Rol</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Estadísticas minimalistas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Roles', value: roles.length, color: '#08557f' },
            { label: 'Permisos', value: allPermissions.length, color: '#10b981' },
            { label: 'Sistema', value: roles.filter(r => r.esSistema).length, color: '#8b5cf6' },
            { label: 'Personalizados', value: roles.filter(r => !r.esSistema).length, color: '#f59e0b' }
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white border border-gray-100 rounded-xl p-4"
            >
              <div className="text-2xl font-light text-gray-800 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de roles - Minimalista */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-medium text-gray-700">Roles</h2>
                <span className="text-xs text-gray-500">{roles.length} roles</span>
              </div>
              
              <div className="space-y-3">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className={`p-3 border rounded-lg transition-all ${role.esSistema ? 'border-primary/20' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${role.esSistema ? 'bg-primary' : 'bg-gray-300'}`}></div>
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{role.nombre}</div>
                          <div className="text-xs text-gray-500">{role.usuariosAsignados} usuarios</div>
                        </div>
                      </div>
                      {role.esSistema && (
                        <span className="text-[10px] font-medium px-2 py-1 bg-primary/10 text-primary rounded">
                          Sistema
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3">{role.descripcion}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Nivel <span className="font-medium">{role.nivel}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenPermissionsModal(role)}
                          className={`p-1.5 rounded transition-colors ${role.esSistema
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-400 hover:text-secondary hover:bg-gray-100'
                            }`}
                          disabled={role.esSistema}
                        >
                          <Key className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleOpenEditRoleModal(role)}
                          className={`p-1.5 rounded transition-colors ${role.esSistema
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-400 hover:text-primary hover:bg-gray-100'
                            }`}
                          disabled={role.esSistema}
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteRoleModal(role)}
                          className={`p-1.5 rounded transition-colors ${role.esSistema
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
                            }`}
                          disabled={role.esSistema}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel de permisos - Ultra minimalista */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-medium text-gray-700 mb-1">Permisos</h2>
                  <p className="text-xs text-gray-500">Gestión granular de capacidades</p>
                </div>
                
                <div className="flex items-center space-x-2 mt-3 md:mt-0">
                  <select
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">Todos los módulos</option>
                    {modules.map(module => (
                      <option key={module} value={module}>{module}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">Todas las categorías</option>
                    <option value="lectura">Lectura</option>
                    <option value="escritura">Escritura</option>
                    <option value="administracion">Administración</option>
                  </select>
                </div>
              </div>

              {/* Búsqueda ultra minimalista */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar permisos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                />
              </div>

              {/* Lista de permisos - Layout compacto */}
              <div className="space-y-2">
                {filteredPermissions.map(permission => (
                  <div key={permission.id} className="group">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${permission.activo ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{permission.nombre}</div>
                          <div className="text-xs text-gray-500">{permission.descripcion}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(permission.categoria)}`}>
                          {getCategoryText(permission.categoria)}
                        </span>
                        
                        <button
                          onClick={() => {
                            setAllPermissions(prev =>
                              prev.map(p =>
                                p.id === permission.id
                                  ? { ...p, activo: !p.activo }
                                  : p
                              )
                            );
                          }}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${permission.activo ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${permission.activo ? 'translate-x-4' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    {/* Línea divisoria sutil */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nota de seguridad elegante */}
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <p className="text-xs text-gray-600">
                  Los permisos definen capacidades específicas. Asigne con cuidado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de creación de rol - Ultra minimalista */}
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-100 shadow-lg">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-gray-800">Nuevo Rol</h2>
                <button
                  onClick={() => setIsCreateRoleModalOpen(false)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={roleFormData.nombre}
                    onChange={(e) => setRoleFormData({ ...roleFormData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                    placeholder="Ej: Auditor"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Descripción</label>
                  <textarea
                    value={roleFormData.descripcion}
                    onChange={(e) => setRoleFormData({ ...roleFormData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                    rows={2}
                    placeholder="Descripción breve"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Nivel de Acceso: {roleFormData.nivel}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={roleFormData.nivel}
                    onChange={(e) => setRoleFormData({...roleFormData, nivel: parseInt(e.target.value)})}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6 pt-6 border-t border-gray-100">
                <button
                  onClick={() => setIsCreateRoleModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRole}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
                >
                  Crear Rol
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de permisos - Elegante y compacto */}
      {isPermissionsModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl border border-gray-100 shadow-lg">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium text-gray-800">Permisos del Rol</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedRole.nombre}</p>
                </div>
                <button
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allPermissions.map(permission => (
                  <div
                    key={permission.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedPermissions.includes(permission.codigo)
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-100 hover:border-gray-200'
                      }`}
                    onClick={() => {
                      if (selectedPermissions.includes(permission.codigo)) {
                        setSelectedPermissions(selectedPermissions.filter(p => p !== permission.codigo));
                      } else {
                        setSelectedPermissions([...selectedPermissions, permission.codigo]);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedPermissions.includes(permission.codigo)
                            ? 'bg-primary border-primary'
                            : 'border-gray-300'
                          }`}>
                          {selectedPermissions.includes(permission.codigo) && (
                            <Check className="h-2.5 w-2.5 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800 text-sm">{permission.nombre}</h3>
                          <p className="text-xs text-gray-500">{permission.descripcion}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100">
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (selectedRole) {
                      const updatedRoles = roles.map(role =>
                        role.id === selectedRole.id
                          ? { ...role, permisos: selectedPermissions }
                          : role
                      );
                      setRoles(updatedRoles);
                      setIsPermissionsModalOpen(false);
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de eliminación - Minimalista */}
      {isDeleteRoleModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-100 shadow-lg">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="text-base font-medium text-gray-800 mb-2">Eliminar Rol</h3>
                <p className="text-gray-600 text-sm mb-6">
                  ¿Eliminar el rol {selectedRole.nombre}? {selectedRole.usuariosAsignados > 0 
                    ? `${selectedRole.usuariosAsignados} usuarios perderán acceso.`
                    : 'No hay usuarios asignados.'}
                </p>
              </div>
              
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => setIsDeleteRoleModalOpen(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteRole}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
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
