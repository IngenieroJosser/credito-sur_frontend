/**
 * JERARQUÍA DE ROLES DEL SISTEMA
 * 
 * 1. SUPER_ADMINISTRADOR (Rol Protegido - Máximo Nivel)
 *    - Acceso TOTAL al sistema sin restricciones
 *    - Módulos exclusivos: Sistema (Configuración, Backups, Sincronización)
 *    - Módulos exclusivos: Administración (Usuarios, Roles, Auditoría)
 *    - Acceso total a operaciones, finanzas y gestión
 * 
 * 2. ADMIN (Administrador General)
 *    - Acceso a todas las operaciones y finanzas
 *    - NO tiene acceso a módulos de Sistema
 *    - NO puede gestionar usuarios ni roles
 *    - Puede ver auditoría pero no modificarla
 * 
 * 3. COORDINADOR
 *    - Gestión de créditos, clientes, rutas
 *    - Aprobaciones operativas
 *    - Reportes operativos
 * 
 * 4. SUPERVISOR
 *    - Supervisión de cobradores y rutas
 *    - Reportes operativos
 * 
 * 5. COBRADOR
 *    - Gestión de cobranzas en campo
 *    - Solicitudes de crédito y clientes
 * 
 * 6. CONTADOR
 *    - Módulos financieros y contables
 *    - Tesorería, inventario, reportes financieros
 */
export type Rol = 'SUPER_ADMINISTRADOR' | 'ADMIN' | 'COORDINADOR' | 'SUPERVISOR' | 'COBRADOR' | 'CONTADOR';

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
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/admin', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR', 'COBRADOR', 'CONTADOR'] },
    { 
      id: 'operaciones', 
      nombre: 'Operaciones', 
      icono: 'Briefcase', 
      path: '#', 
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'gestion-creditos', nombre: 'Créditos', icono: 'CreditCard', path: '/admin/creditos', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR'] },
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
        { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/admin/clientes', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'COBRADOR'] },
        { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/admin/cuentas-mora', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR', 'CONTADOR'] },
        { id: 'archivados', nombre: 'Archivados', icono: 'Archive', path: '/admin/archivados', roles: ['SUPER_ADMINISTRADOR'] },
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
  ],

  ADMIN: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/admin', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'] },
    { 
      id: 'operaciones', 
      nombre: 'Operaciones', 
      icono: 'Briefcase', 
      path: '#', 
      roles: ['SUPER_ADMINISTRADOR', 'ADMIN'],
      submodulos: [
        { id: 'gestion-creditos', nombre: 'Créditos', icono: 'CreditCard', path: '/admin/creditos', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR'] },
        { id: 'rutas', nombre: 'Rutas', icono: 'Route', path: '/admin/rutas', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR'] },
        { id: 'aprobar-cobrador', nombre: 'Aprobaciones', icono: 'CheckCircle2', path: '/admin/aprobaciones', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR'] },
      ]
    },
    {
      id: 'gestion-clientes',
      nombre: 'Gestión Clientes',
      icono: 'Users',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR', 'ADMIN'],
      submodulos: [
        { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/admin/clientes', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'COBRADOR'] },
        { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/admin/cuentas-mora', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'SUPERVISOR', 'CONTADOR'] },
        { id: 'cuentas-vencidas', nombre: 'Cuentas vencidas', icono: 'Archive', path: '/admin/cuentas-vencidas', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'] },
        { id: 'archivados', nombre: 'Archivados', icono: 'Archive', path: '/admin/archivados', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'] },
      ]
    },
    {
      id: 'finanzas',
      nombre: 'Finanzas',
      icono: 'PieChart',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR', 'ADMIN'],
      submodulos: [
        { id: 'contable', nombre: 'Módulo contable', icono: 'Calculator', path: '/admin/contable', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'CONTADOR'] },
        { id: ' tesoreria', nombre: 'Tesorería', icono: 'Landmark', path: '/admin/tesoreria', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'CONTADOR'] },
        { id: 'articulos', nombre: 'Artículos (Inventario)', icono: 'Package', path: '/admin/articulos', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'CONTADOR'] },
        { id: 'reportes-financieros', nombre: 'Reportes financieros', icono: 'BarChart3', path: '/admin/reportes/financieros', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'CONTADOR'] },
      ]
    },
    { id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'ClipboardList', path: '/admin/reportes/operativos', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
  ],

  COORDINADOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/coordinador', roles: ['COORDINADOR'] },
    {
      id: 'gestion',
      nombre: 'Gestión',
      icono: 'Briefcase',
      path: '#',
      roles: ['COORDINADOR'],
      submodulos: [
        { id: 'gestion-creditos', nombre: 'Créditos', icono: 'CreditCard', path: '/coordinador/creditos', roles: ['COORDINADOR'] },
        { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/coordinador/clientes', roles: ['COORDINADOR'] },
        { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/coordinador/cuentas-mora', roles: ['COORDINADOR'] },
        { id: 'cuentas-vencidas', nombre: 'Cuentas vencidas', icono: 'Archive', path: '/coordinador/cuentas-vencidas', roles: ['COORDINADOR'] },
      ]
    },
    {
      id: 'operaciones',
      nombre: 'Operaciones',
      icono: 'Settings',
      path: '#',
      roles: ['COORDINADOR'],
      submodulos: [
        { id: 'rutas', nombre: 'Rutas', icono: 'Route', path: '/coordinador/rutas', roles: ['COORDINADOR'] },
        { id: 'aprobar-cobrador', nombre: 'Aprobaciones', icono: 'CheckCircle2', path: '/coordinador/aprobaciones', roles: ['COORDINADOR'] },
      ]
    },
    { id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'ClipboardList', path: '/coordinador/reportes', roles: ['COORDINADOR'] },
  ],

  SUPERVISOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/supervisor', roles: ['SUPERVISOR'] },
    {
      id: 'supervision',
      nombre: 'Supervisión',
      icono: 'Eye',
      path: '#',
      roles: ['SUPERVISOR'],
      submodulos: [
        { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/supervisor/clientes', roles: ['SUPERVISOR'] },
        { id: 'rutas', nombre: 'Rutas', icono: 'Route', path: '/supervisor/rutas', roles: ['SUPERVISOR'] },
      ]
    },
    { id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'ClipboardList', path: '/supervisor/reportes/operativos', roles: ['SUPERVISOR'] },
  ],

  COBRADOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/cobranzas', roles: ['COBRADOR'] },
    { id: 'prestamos-dinero', nombre: 'Solicitar Crédito', icono: 'CreditCard', path: '/cobranzas/prestamos/nuevo', roles: ['COBRADOR'] },
    { id: 'clientes', nombre: 'Nuevo Cliente', icono: 'Users', path: '/cobranzas/clientes/nuevo', roles: ['COBRADOR'] },
    { id: 'notificaciones', nombre: 'Notificaciones', icono: 'Bell', path: '/cobranzas/notificaciones', roles: ['COBRADOR'] },
    { id: 'solicitudes', nombre: 'Solicitudes', icono: 'ClipboardList', path: '/cobranzas/solicitudes', roles: ['COBRADOR'] },
  ],

  CONTADOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/contador', roles: ['CONTADOR'] },
    {
      id: 'finanzas',
      nombre: 'Finanzas',
      icono: 'PieChart',
      path: '#',
      roles: ['CONTADOR'],
      submodulos: [
        { id: 'contable', nombre: 'Módulo contable', icono: 'Calculator', path: '/contador/contable', roles: ['CONTADOR'] },
        { id: 'tesoreria', nombre: 'Tesorería', icono: 'Landmark', path: '/contador/tesoreria', roles: ['CONTADOR'] },
        { id: 'articulos', nombre: 'Artículos (Inventario)', icono: 'Package', path: '/contador/articulos', roles: ['CONTADOR'] },
      ]
    },
    {
      id: 'reportes',
      nombre: 'Reportes',
      icono: 'ClipboardList',
      path: '#',
      roles: ['CONTADOR'],
      submodulos: [
        { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/contador/cuentas-mora', roles: ['CONTADOR'] },
        { id: 'cuentas-vencidas', nombre: 'Cuentas vencidas', icono: 'Archive', path: '/contador/cuentas-vencidas', roles: ['CONTADOR'] },
        { id: 'reportes-financieros', nombre: 'Reportes financieros', icono: 'BarChart3', path: '/contador/reportes/financieros', roles: ['CONTADOR'] },
      ]
    },
  ],
};

// Mapa de iconos de Lucide React
import {
  Eye,
  Home,
  LayoutDashboard,
  Bell,
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
  'Eye': <Eye className="h-4 w-4" />,
  'Home': <Home className="h-4 w-4" />,
  'LayoutDashboard': <LayoutDashboard className="h-4 w-4" />,
  'Bell': <Bell className="h-4 w-4" />,
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
  return iconosMap[iconName] || <Eye className="h-4 w-4" />;
};

// Obtener módulos filtrados por rol
export const obtenerModulosPorRol = (rol: Rol): ModuloPermiso[] => {
  return permisosPorRol[rol] || [];
};

// Verificar si un usuario tiene acceso a una ruta
export const tieneAcceso = (rol: Rol, path: string): boolean => {
  const modulos = permisosPorRol[rol];
  if (!modulos) return false;

  const rutasPermitidas = modulos
    .flatMap((m) => [m.path, ...(m.submodulos?.map((s) => s.path) ?? [])])
    .filter((p): p is string => Boolean(p) && p !== '#');

  const normalizado = path.split('?')[0]?.split('#')[0] ?? path;

  // Excepciones Globales: Permitir acceso a Notificaciones y Perfil solo si están bajo su prefijo de rol
  const prefijoRol = rol === 'COBRADOR' ? '/cobranzas' : 
                    rol === 'CONTADOR' ? '/contador' : 
                    rol === 'SUPER_ADMINISTRADOR' || rol === 'ADMIN' ? '/admin' :
                    rol === 'COORDINADOR' ? '/coordinador' : '/supervisor'

  if (normalizado.endsWith('/notificaciones') || normalizado.endsWith('/perfil')) {
    return normalizado.startsWith(prefijoRol);
  }

  // Excepción específica legacy (mantenida por precaución)
  if (rol === 'CONTADOR' && normalizado === '/contador/notificaciones') return true;

  // Match exacto
  if (rutasPermitidas.includes(normalizado)) return true;

  // Match por subruta (para rutas dinámicas tipo /admin/rutas/[id])
  return rutasPermitidas.some((base) => {
    if (base === '/admin' || base === '/cobranzas' || base === '/contador' || base === '/') return false;
    return normalizado.startsWith(`${base}/`);
  });
};