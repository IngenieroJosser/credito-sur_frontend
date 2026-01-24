// Definición de roles y sus permisos
export type Rol = 'SUPER_ADMINISTRADOR' | 'COORDINADOR' | 'SUPERVISOR' | 'COBRADOR' | 'CONTADOR';

export interface ModuloPermiso {
  id: string;
  nombre: string;
  icono: string;
  path: string;
  roles: Rol[];
  submodulos?: ModuloPermiso[];
}

// Configuración completa de permisos por rol
export const permisosPorRol: Record<Rol, ModuloPermiso[]> = {
  SUPER_ADMINISTRADOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'Activity', path: '/admin', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR', 'COBRADOR', 'CONTADOR'] },
    { 
      id: 'operaciones', 
      nombre: 'Operaciones', 
      icono: 'Briefcase', 
      path: '#', 
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'prestamos-dinero', nombre: 'Préstamos Dinero', icono: 'CreditCard', path: '/admin/prestamos', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR'] },
        { id: 'creditos-articulos', nombre: 'Créditos Artículos', icono: 'ShoppingBag', path: '/admin/creditos-articulos', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR'] },
        { id: 'rutas', nombre: 'Rutas', icono: 'Route', path: '/admin/rutas', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR'] },
        { id: 'aprobar-cobrador', nombre: 'Aprobaciones', icono: 'CheckCircle2', path: '/admin/aprobaciones', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR'] },
      ]
    },
    {
      id: 'gestion-clientes',
      nombre: 'Gestión Clientes',
      icono: 'Users',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/admin/clientes', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'COBRADOR', 'CONTADOR'] },
        { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/admin/cuentas-mora', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR', 'CONTADOR'] },
        { id: 'archivados', nombre: 'Archivados', icono: 'Archive', path: '/admin/archivados', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'] },
      ]
    },
    {
      id: 'finanzas',
      nombre: 'Finanzas',
      icono: 'PieChart',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'contable', nombre: 'Módulo contable', icono: 'Calculator', path: '/admin/contable', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'] },
        { id: 'tesoreria', nombre: 'Tesorería', icono: 'Landmark', path: '/admin/tesoreria', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'] },
        { id: 'articulos', nombre: 'Artículos (Inventario)', icono: 'Package', path: '/admin/articulos', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'] },
        { id: 'reportes-financieros', nombre: 'Reportes financieros', icono: 'BarChart3', path: '/admin/reportes/financieros', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'] },
      ]
    },
    {
      id: 'administracion',
      nombre: 'Administración',
      icono: 'Shield',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'usuarios', nombre: 'Usuarios', icono: 'User', path: '/admin/users', roles: ['SUPER_ADMINISTRADOR'] },
        { id: 'roles-permisos', nombre: 'Roles y permisos', icono: 'Key', path: '/admin/roles-permisos', roles: ['SUPER_ADMINISTRADOR'] },
        { id: 'auditoria', nombre: 'Auditoría', icono: 'FileText', path: '/admin/auditoria', roles: ['SUPER_ADMINISTRADOR'] },
      ]
    },
    {
      id: 'sistema',
      nombre: 'Sistema',
      icono: 'Settings',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'configuracion', nombre: 'Configuración', icono: 'Settings', path: '/admin/sistema/configuracion', roles: ['SUPER_ADMINISTRADOR'] },
        { id: 'sincronizacion', nombre: 'Sincronización', icono: 'RefreshCw', path: '/admin/sistema/sincronizacion', roles: ['SUPER_ADMINISTRADOR'] },
        { id: 'backups', nombre: 'Backups', icono: 'HardDrive', path: '/admin/sistema/backups', roles: ['SUPER_ADMINISTRADOR'] },
      ]
    },
    { id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'ClipboardList', path: '/admin/reportes/operativos', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR'] },
    { id: 'perfil', nombre: 'Perfil', icono: 'UserCircle', path: '/admin/perfil', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR', 'COBRADOR', 'CONTADOR'] },
  ],

  COORDINADOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'Activity', path: '/admin', roles: ['COORDINADOR'] },
    { id: 'prestamos-dinero', nombre: 'Préstamos Dinero', icono: 'CreditCard', path: '/admin/prestamos', roles: ['COORDINADOR'] },
    { id: 'creditos-articulos', nombre: 'Créditos Artículos', icono: 'ShoppingBag', path: '/admin/creditos-articulos', roles: ['COORDINADOR'] },
    { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/admin/clientes', roles: ['COORDINADOR'] },
    { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/admin/cuentas-mora', roles: ['COORDINADOR'] },
    { id: 'rutas', nombre: 'Rutas', icono: 'Route', path: '/admin/rutas', roles: ['COORDINADOR'] },
    { id: 'aprobar-cobrador', nombre: 'Aprobaciones', icono: 'CheckCircle2', path: '/admin/aprobaciones', roles: ['COORDINADOR'] },
    { id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'PieChart', path: '/admin/reportes/operativos', roles: ['COORDINADOR'] },
    { id: 'perfil', nombre: 'Perfil', icono: 'User', path: '/admin/perfil', roles: ['COORDINADOR'] },
  ],

  SUPERVISOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'Activity', path: '/admin', roles: ['SUPERVISOR'] },
    { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/admin/clientes', roles: ['SUPERVISOR'] },
    { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/admin/cuentas-mora', roles: ['SUPERVISOR'] },
    { id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'PieChart', path: '/admin/reportes/operativos', roles: ['SUPERVISOR'] },
    { id: 'perfil', nombre: 'Perfil', icono: 'User', path: '/admin/perfil', roles: ['SUPERVISOR'] },
  ],

  COBRADOR: [
    { id: 'dashboard', nombre: 'Inicio', icono: 'Activity', path: '/admin', roles: ['COBRADOR'] },
    { id: 'rutas', nombre: 'Mi Ruta', icono: 'Map', path: '/admin/rutas', roles: ['COBRADOR'] },
    { id: 'prestamos-dinero', nombre: 'Solicitar Crédito', icono: 'CreditCard', path: '/admin/prestamos/nuevo', roles: ['COBRADOR'] },
    { id: 'clientes', nombre: 'Nuevo Cliente', icono: 'Users', path: '/admin/clientes/nuevo', roles: ['COBRADOR'] },
    { id: 'solicitudes', nombre: 'Solicitudes', icono: 'ClipboardList', path: '/admin/solicitudes', roles: ['COBRADOR'] },
    { id: 'perfil', nombre: 'Mi Perfil', icono: 'User', path: '/admin/perfil', roles: ['COBRADOR'] },
  ],

  CONTADOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'Activity', path: '/admin', roles: ['CONTADOR'] },
    { id: 'contable', nombre: 'Módulo contable', icono: 'PieChart', path: '/admin/contable', roles: ['CONTADOR'] },
    { id: 'tesoreria', nombre: 'Tesorería', icono: 'CreditCard', path: '/admin/tesoreria', roles: ['CONTADOR'] },
    { id: 'articulos', nombre: 'Artículos (Inventario)', icono: 'Package', path: '/admin/articulos', roles: ['CONTADOR'] },
    { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/admin/clientes', roles: ['CONTADOR'] },
    { id: 'cuentas-mora', nombre: 'Pérdidas', icono: 'AlertCircle', path: '/admin/cuentas-mora', roles: ['CONTADOR'] },
    { id: 'archivados', nombre: 'Archivados', icono: 'Archive', path: '/admin/archivados', roles: ['CONTADOR'] },
    { id: 'reportes-financieros', nombre: 'Reportes financieros', icono: 'PieChart', path: '/admin/reportes/financieros', roles: ['CONTADOR'] },
    { id: 'perfil', nombre: 'Perfil', icono: 'User', path: '/admin/perfil', roles: ['CONTADOR'] },
  ],
};

// Mapa de iconos de Lucide React
import {
  Activity,
  CreditCard,
  ShoppingBag,
  Banknote,
  Users,
  AlertCircle,
  Route,
  Package,
  PieChart,
  User,
  Archive,
  Shield,
  Settings,
  CheckCircle2,
  Receipt,
  Wallet,
  Map,
  HardDrive,
  Landmark,
  ClipboardList,
  Briefcase,
  Calculator,
  BarChart3,
  Key,
  FileText,
  RefreshCw,
  UserCircle,
  // Agregar más iconos según necesites
} from 'lucide-react';

export const iconosMap: Record<string, React.ReactNode> = {
  'Activity': <Activity className="h-4 w-4" />,
  'CreditCard': <CreditCard className="h-4 w-4" />,
  'ShoppingBag': <ShoppingBag className="h-4 w-4" />,
  'Banknote': <Banknote className="h-4 w-4" />,
  'Users': <Users className="h-4 w-4" />,
  'AlertCircle': <AlertCircle className="h-4 w-4" />,
  'Route': <Route className="h-4 w-4" />,
  'Package': <Package className="h-4 w-4" />,
  'PieChart': <PieChart className="h-4 w-4" />,
  'User': <User className="h-4 w-4" />,
  'Archive': <Archive className="h-4 w-4" />,
  'Shield': <Shield className="h-4 w-4" />,
  'Settings': <Settings className="h-4 w-4" />,
  'CheckCircle2': <CheckCircle2 className="h-4 w-4" />,
  'Receipt': <Receipt className="h-4 w-4" />,
  'Wallet': <Wallet className="h-4 w-4" />,
  'Map': <Map className="h-4 w-4" />,
  'HardDrive': <HardDrive className="h-4 w-4" />,
  'Landmark': <Landmark className="h-4 w-4" />,
  'ClipboardList': <ClipboardList className="h-4 w-4" />,
  'Briefcase': <Briefcase className="h-4 w-4" />,
  'Calculator': <Calculator className="h-4 w-4" />,
  'BarChart3': <BarChart3 className="h-4 w-4" />,
  'Key': <Key className="h-4 w-4" />,
  'FileText': <FileText className="h-4 w-4" />,
  'RefreshCw': <RefreshCw className="h-4 w-4" />,
  'UserCircle': <UserCircle className="h-4 w-4" />,
};

// Obtener icono por nombre
export const getIconComponent = (iconName: string): React.ReactNode => {
  return iconosMap[iconName] || <Activity className="h-4 w-4" />;
};

// Obtener módulos filtrados por rol
export const obtenerModulosPorRol = (rol: Rol): ModuloPermiso[] => {
  return permisosPorRol[rol] || [];
};

// Verificar si un usuario tiene acceso a una ruta
export const tieneAcceso = (rol: Rol, path: string): boolean => {
  const modulos = permisosPorRol[rol];
  if (!modulos) return false;
  
  return modulos.some(modulo => modulo.path === path);
};