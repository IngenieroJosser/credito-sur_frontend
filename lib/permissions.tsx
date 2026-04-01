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
 *    - Revisiones operativas
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
 * 
 * 7. PUNTO_DE_VENTA
 *    - Ventas de artículos (crédito y contado)
 *    - Catálogo de artículos (solo lectura)
 *    - Registro de clientes
 */
export type Rol = string;

import type { SidebarModulo } from '@/lib/types/autenticacion-type';

export interface ModuloPermiso {
  id: string;
  nombre: string;
  icono: string;
  path: string;
  roles: Rol[];
  submodulos?: ModuloPermiso[];
  isNew?: boolean; // Indicador de funcionalidad nueva
}

// Configuración completa de permisos por rol
export const permisosPorRol: Record<Rol, ModuloPermiso[]> = {
  SUPER_ADMINISTRADOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/admin', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR', 'COBRADOR', 'CONTADOR'] },
    { id: 'revisiones', nombre: 'Revisiones', icono: 'ShieldCheck', path: '/admin/revisiones', roles: ['SUPER_ADMINISTRADOR'], isNew: true },
    { 
      id: 'operaciones', 
      nombre: 'Operaciones', 
      icono: 'Briefcase', 
      path: '#', 
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'gestion-creditos', nombre: 'Créditos', icono: 'CreditCard', path: '/admin/creditos', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR'] },
        { id: 'rutas', nombre: 'Rutas', icono: 'Route', path: '/admin/rutas', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR'] },
        { id: 'seguimiento-pdv', nombre: 'Punto de Venta', icono: 'ShoppingBag', path: '/admin/operaciones/punto-de-venta', roles: ['SUPER_ADMINISTRADOR'], isNew: true },
      ]
    },
    {
      id: 'gestion-clientes',
      nombre: 'Gestión Clientes',
      icono: 'Users',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/admin/clientes', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'COBRADOR'] },
        { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/admin/cuentas-mora', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'SUPERVISOR', 'CONTADOR'], isNew: true },
        { id: 'cuentas-vencidas', nombre: 'Cuentas vencidas', icono: 'FileX2', path: '/admin/cuentas-vencidas', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'] },
        { id: 'archivados', nombre: 'Archivados', icono: 'Archive', path: '/admin/archivados', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'] },
      ]
    },
    {
      id: 'finanzas',
      nombre: 'Finanzas',
      icono: 'PieChart',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'contable', nombre: 'Movimientos', icono: 'Calculator', path: '/contable', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'] },
        { id: 'pagos-historial', nombre: 'Historial de pagos', icono: 'Banknote', path: '/pagos/historial', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'], isNew: true },
        { id: 'arqueo', nombre: 'Arqueo de Caja', icono: 'History', path: '/contable/cierre-caja', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'], isNew: true },
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
        { id: 'articulos', nombre: 'Artículos (Inventario)', icono: 'Package', path: '/admin/articulos', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'CONTADOR'] },
        { id: 'usuarios', nombre: 'Usuarios', icono: 'User', path: '/admin/users', roles: ['SUPER_ADMINISTRADOR'] },
        { id: 'auditoria', nombre: 'Auditoría', icono: 'FileText', path: '/admin/auditoria', roles: ['SUPER_ADMINISTRADOR'] },
      ] // Fin submodulos administracion
    },
    {
      id: 'sistema',
      nombre: 'Sistema',
      icono: 'Settings',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        { id: 'configuracion', nombre: 'Configuración', icono: 'Settings', path: '/sistema/configuracion', roles: ['SUPER_ADMINISTRADOR'] },
        { id: 'sincronizacion', nombre: 'Sincronización', icono: 'RefreshCw', path: '/sistema/sincronizacion', roles: ['SUPER_ADMINISTRADOR'] },
        { id: 'backups', nombre: 'Backups', icono: 'HardDrive', path: '/sistema/backups', roles: ['SUPER_ADMINISTRADOR'] },
      ]
    },
    { id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'ClipboardList', path: '/admin/reportes/operativos', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR'] },
  ],

  ADMIN: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/admin', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'] },
    { id: 'revisiones', nombre: 'Revisiones', icono: 'ShieldCheck', path: '/admin/revisiones', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'], isNew: true },
    { 
      id: 'operaciones', 
      nombre: 'Operaciones', 
      icono: 'Briefcase', 
      path: '#', 
      roles: ['SUPER_ADMINISTRADOR', 'ADMIN'],
      submodulos: [
        { id: 'gestion-creditos', nombre: 'Créditos', icono: 'CreditCard', path: '/admin/creditos', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR'] },
        { id: 'rutas', nombre: 'Rutas', icono: 'Route', path: '/admin/rutas', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR'] },
        { id: 'seguimiento-pdv', nombre: 'Punto de Venta', icono: 'ShoppingBag', path: '/admin/operaciones/punto-de-venta', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'], isNew: true },
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
        { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/admin/cuentas-mora', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'CONTADOR'], isNew: true },
        { id: 'cuentas-vencidas', nombre: 'Cuentas vencidas', icono: 'FileX2', path: '/admin/cuentas-vencidas', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'] },
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
        { id: 'contable', nombre: 'Movimientos', icono: 'Calculator', path: '/contable', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'CONTADOR'] },
        { id: 'pagos-historial', nombre: 'Historial de pagos', icono: 'Banknote', path: '/pagos/historial', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'CONTADOR'], isNew: true },
        { id: 'arqueo', nombre: 'Arqueo de Caja', icono: 'History', path: '/contable/cierre-caja', roles: ['SUPER_ADMINISTRADOR', 'ADMIN'], isNew: true },
        { id: 'reportes-financieros', nombre: 'Reportes financieros', icono: 'BarChart3', path: '/admin/reportes/financieros', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'CONTADOR'], isNew: true },
      ]
    },
    {
      id: 'administracion',
      nombre: 'Administración',
      icono: 'Shield',
      path: '#',
      roles: ['SUPER_ADMINISTRADOR', 'ADMIN'],
      submodulos: [
        { id: 'articulos', nombre: 'Artículos (Inventario)', icono: 'Package', path: '/admin/articulos', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'CONTADOR'] },
      ]
    },
    {
      id: 'sistema',
      nombre: 'Sistema',
      icono: 'Settings',
      path: '#',
      roles: ['ADMIN'],
      submodulos: [
        { id: 'sincronizacion', nombre: 'Sincronización', icono: 'RefreshCw', path: '/sistema/sincronizacion', roles: ['ADMIN'], isNew: true },
      ]
    },
    { id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'ClipboardList', path: '/admin/reportes/operativos', roles: ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
  ],

  COORDINADOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/coordinador', roles: ['COORDINADOR'] },
    { id: 'revisiones', nombre: 'Revisiones', icono: 'ShieldCheck', path: '/coordinador/revisiones', roles: ['COORDINADOR'], isNew: true },
    {
      id: 'operaciones',
      nombre: 'Operaciones',
      icono: 'Briefcase',
      path: '#',
      roles: ['COORDINADOR'],
      submodulos: [
        { id: 'gestion-creditos', nombre: 'Créditos', icono: 'CreditCard', path: '/coordinador/creditos', roles: ['COORDINADOR'] },
        { id: 'rutas', nombre: 'Rutas', icono: 'Route', path: '/coordinador/rutas', roles: ['COORDINADOR'] },
      ]
    },
    {
      id: 'gestion-clientes',
      nombre: 'Gestión Clientes',
      icono: 'Users',
      path: '#',
      roles: ['COORDINADOR'],
      submodulos: [
        { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/coordinador/clientes', roles: ['COORDINADOR'] },
        { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/cuentas-mora', roles: ['COORDINADOR'], isNew: true },
        { id: 'cuentas-vencidas', nombre: 'Cuentas vencidas', icono: 'FileX2', path: '/cuentas-vencidas', roles: ['COORDINADOR'] },
        { id: 'archivados', nombre: 'Archivados', icono: 'Archive', path: '/coordinador/archivados', roles: ['COORDINADOR'] },
        { id: 'articulos', nombre: 'Artículos (Inventario)', icono: 'Package', path: '/articulos', roles: ['COORDINADOR'] },
      ]
    },
    {
      id: 'finanzas',
      nombre: 'Finanzas',
      icono: 'PieChart',
      path: '#',
      roles: ['COORDINADOR'],
      submodulos: [
        { id: 'pagos-historial', nombre: 'Historial de pagos', icono: 'Banknote', path: '/pagos/historial', roles: ['COORDINADOR'], isNew: true },
      ]
    },
    {
      id: 'sistema',
      nombre: 'Sistema',
      icono: 'Settings',
      path: '#',
      roles: ['COORDINADOR'],
      submodulos: [
        { id: 'sincronizacion', nombre: 'Sincronización', icono: 'RefreshCw', path: '/sistema/sincronizacion', roles: ['COORDINADOR'], isNew: true },
      ]
    },
    { id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'ClipboardList', path: '/coordinador/reportes', roles: ['COORDINADOR'] },
  ],

  SUPERVISOR: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/supervisor', roles: ['SUPERVISOR'] },
    { id: 'revisiones', nombre: 'Revisiones', icono: 'ShieldCheck', path: '/supervisor/revisiones', roles: ['SUPERVISOR'], isNew: true },
    {
      id: 'operaciones',
      nombre: 'Operaciones',
      icono: 'Briefcase',
      path: '#',
      roles: ['SUPERVISOR'],
      submodulos: [
        { id: 'rutas', nombre: 'Rutas', icono: 'Route', path: '/supervisor/rutas', roles: ['SUPERVISOR'] },
      ]
    },
    {
      id: 'finanzas',
      nombre: 'Finanzas',
      icono: 'PieChart',
      path: '#',
      roles: ['SUPERVISOR'],
      submodulos: [
        { id: 'contable', nombre: 'Movimientos', icono: 'Calculator', path: '/contable', roles: ['SUPERVISOR'] },
      ]
    },
    {
      id: 'gestion-clientes',
      nombre: 'Gestión Clientes',
      icono: 'Users',
      path: '#',
      roles: ['SUPERVISOR'],
      submodulos: [
        { id: 'clientes', nombre: 'Clientes', icono: 'Users', path: '/supervisor/clientes', roles: ['SUPERVISOR'] },
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
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/contable', roles: ['CONTADOR'] },
    {
      id: 'gestion-clientes',
      nombre: 'Gestión Clientes',
      icono: 'Users',
      path: '#',
      roles: ['CONTADOR'],
      submodulos: [
        { id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path: '/cuentas-mora', roles: ['CONTADOR'], isNew: true },
        { id: 'cuentas-vencidas', nombre: 'Cuentas vencidas', icono: 'FileX2', path: '/cuentas-vencidas', roles: ['CONTADOR'] },
      ]
    },
    {
      id: 'finanzas',
      nombre: 'Finanzas',
      icono: 'PieChart',
      path: '#',
      roles: ['CONTADOR'],
      submodulos: [
        { id: 'contable', nombre: 'Movimientos', icono: 'Calculator', path: '/contable', roles: ['CONTADOR'] },
        { id: 'pagos-historial', nombre: 'Historial de pagos', icono: 'Banknote', path: '/pagos/historial', roles: ['CONTADOR'], isNew: true },
        { id: 'arqueo', nombre: 'Arqueo de Caja', icono: 'Landmark', path: '/contable/cierre-caja', roles: ['CONTADOR'], isNew: true },
        { id: 'reportes-financieros', nombre: 'Reportes financieros', icono: 'BarChart3', path: '/reportes/financieros', roles: ['CONTADOR'], isNew: true },
      ]
    },
    {
      id: 'administracion',
      nombre: 'Administración',
      icono: 'Shield',
      path: '#',
      roles: ['CONTADOR'],
      submodulos: [
        { id: 'articulos', nombre: 'Artículos (Inventario)', icono: 'Package', path: '/articulos', roles: ['CONTADOR'] },
      ]
    },
  ],

  PUNTO_DE_VENTA: [
    { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path: '/punto-de-venta', roles: ['PUNTO_DE_VENTA'] },
    { id: 'creditos-articulos', nombre: 'Créditos Artículos', icono: 'ShoppingBag', path: '/creditos-articulos', roles: ['PUNTO_DE_VENTA'] },
    { id: 'articulos', nombre: 'Catálogo', icono: 'Package', path: '/articulos', roles: ['PUNTO_DE_VENTA'] },
  ],
};

// Configuración de roles conocidos
const ROLES_CONOCIDOS = ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'SUPERVISOR', 'COBRADOR', 'CONTADOR', 'PUNTO_DE_VENTA'];

// Mapa de iconos de Lucide React
import {
  Eye,
  Home,
  LayoutDashboard,
  Bell,
  CreditCard,
  ShoppingBag,
  ShieldCheck,
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
  Map as MapIcon,
  HardDrive,
  Landmark,
  History,
  ClipboardList,
  Briefcase,
  Calculator,
  BarChart3,
  Key,
  FileText,
  FileX2,
  RefreshCw,
  UserCircle,
  AlertTriangle,
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
  'FileX2': <FileX2 className="h-4 w-4" />,
  'Shield': <Shield className="h-4 w-4" />,
  'Settings': <Settings className="h-4 w-4" />,
  'CheckCircle2': <CheckCircle2 className="h-4 w-4" />,
  'Receipt': <Receipt className="h-4 w-4" />,
  'Wallet': <Wallet className="h-4 w-4" />,
  'Map': <MapIcon className="h-4 w-4" />,
  'HardDrive': <HardDrive className="h-4 w-4" />,
  'Landmark': <Landmark className="h-4 w-4" />,
  'History': <History className="h-4 w-4" />,
  'ClipboardList': <ClipboardList className="h-4 w-4" />,
  'Briefcase': <Briefcase className="h-4 w-4" />,
  'Calculator': <Calculator className="h-4 w-4" />,
  'BarChart3': <BarChart3 className="h-4 w-4" />,
  'Key': <Key className="h-4 w-4" />,
  'FileText': <FileText className="h-4 w-4" />,
  'RefreshCw': <RefreshCw className="h-4 w-4" />,
  'UserCircle': <UserCircle className="h-4 w-4" />,
  'ShieldCheck': <ShieldCheck className="h-4 w-4" />,
  'AlertTriangle': <AlertTriangle className="h-4 w-4" />,
};

export const getIconComponent = (iconName: string): React.ReactNode => {
  const icon = iconosMap[iconName];
  if (!icon && process.env.NODE_ENV !== 'production') {
    console.warn('[sidebar] missing icon component for iconName:', iconName);
  }
  return icon || <Eye className="h-4 w-4" />;
};

export const obtenerModulosPorRol = (rol: Rol): ModuloPermiso[] => {
  return permisosPorRol[rol as keyof typeof permisosPorRol] || [];
};

// ... (rest of the code remains the same)
const ACTION_ICON_MAP: Record<string, string> = {
  // Base action ids
  dashboard: 'LayoutDashboard',
  role: 'Shield',
  roles: 'Shield',
  user: 'User',
  users: 'User',
  usuario: 'User',
  usuarios: 'User',
  audit: 'FileText',
  auditoria: 'FileText',
  backup: 'HardDrive',
  backups: 'HardDrive',
  // Dynamic action ids seen from backend (snake_case)
  'late-fee': 'AlertCircle',
  'late-fee-manage': 'AlertCircle',
  cash: 'Landmark',
  'cash-manage': 'Landmark',
  cost: 'Calculator',
  cost_manage: 'Calculator',
  expense: 'Wallet',
  expense_manage: 'Wallet',
  report: 'ClipboardList',
  report_view: 'ClipboardList',
  'report-financial': 'BarChart3',
  client: 'Users',
  clients: 'Users',
  cliente: 'Users',
  clientes: 'Users',
  loan: 'CreditCard',
  loans: 'CreditCard',
  prestamo: 'CreditCard',
  prestamos: 'CreditCard',
  payment: 'Receipt',
  payments: 'Receipt',
  pago: 'Receipt',
  pagos: 'Receipt',
  route: 'Route',
  routes: 'Route',
  accounting: 'Calculator',
  contable: 'Calculator',
  contabilidad: 'Calculator',
  'gestion-creditos': 'CreditCard',
  creditos: 'CreditCard',
  rutas: 'Route',
  'cuentas-mora': 'AlertCircle',
  mora: 'AlertCircle',
  'cuentas-vencidas': 'FileX2',
  vencidas: 'FileX2',
  archivados: 'Archive',
  articulos: 'Package',
  inventario: 'Package',
  'reportes-financieros': 'BarChart3',
  'reportes-operativos': 'ClipboardList',
  reportes: 'ClipboardList',
  configuracion: 'Settings',
  sistema: 'Settings',
  sincronizacion: 'RefreshCw',
  notificaciones: 'Bell',
  solicitudes: 'ClipboardList',
  'prestamos-dinero': 'CreditCard',
  'creditos-articulos': 'ShoppingBag',
  'revisiones': 'ShieldCheck',
  'conflictos-sinc': 'AlertTriangle',
  'seguimiento-pdv': 'ShoppingBag',
};

const normalizePermissionId = (id: string) => {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const isCuentasVencidas = (id?: string | null, ruta?: string | null) => {
  const key = normalizePermissionId(String(id || ''))
  const r = String(ruta || '').toLowerCase()
  return (
    key === 'cuentas-vencidas' ||
    key === 'cuentas-vencidas-view' ||
    key === 'cuentas-vencidas-ver' ||
    key.startsWith('cuentas-vencidas') ||
    r.includes('cuentas-vencidas')
  )
}

const inferIconName = (id: string, iconFromApi?: string | null) => {
  if (isCuentasVencidas(id)) return 'FileX2';
  if (iconFromApi) return iconFromApi;
  const key = normalizePermissionId(id);
  const base = key.split('-')[0] || '';
  const inferred = ACTION_ICON_MAP[key] || (base ? ACTION_ICON_MAP[base] : undefined) || ACTION_ICON_MAP[id];
  if (!inferred && process.env.NODE_ENV !== 'production') {
    console.warn('[sidebar] icon fallback Eye for action id:', id);
  }
  return inferred || 'Eye';
};

export const buildSidebarFromApi = (sidebarData: SidebarModulo[]): ModuloPermiso[] => {
  if (!sidebarData || sidebarData.length === 0) return [];

  // El dropdown de Cobranza NO debe existir en el aside
  // Créditos de Artículos tampoco debe aparecer porque el modal de créditos ya permite elegir el tipo
  const EXCLUDED_SIDEBAR_ROUTES = new Set<string>(['/cobranzas/notificaciones', '/cobranzas/solicitudes', '/creditos-articulos']);
  const EXCLUDED_SIDEBAR_ROUTE_PREFIXES = ['/cobranzas'];

  const isGranularActionId = (rawId: string) => {
    const id = String(rawId || '').toLowerCase();
    return /_(view|ver|create|crear|edit|editar|delete|eliminar|approve|aprobar|manage|gestionar|registrar|exportar|cierre)$/.test(id);
  };

  const isVerbLikeName = (rawName: string) => {
    const n = String(rawName || '').trim().toLowerCase();
    return /^(ver|crear|editar|eliminar|aprobar|gestionar|registrar|exportar)\b/.test(n);
  };

  const getItemScore = (item: SidebarModulo['items'][number]) => {
    let score = 0;
    if (item.ruta && item.ruta !== '#') score += 10;
    if (!isGranularActionId(item.id)) score += 5;
    if (!isVerbLikeName(item.nombre)) score += 3;
    if (item.icono) score += 1;
    return score;
  };

  const getCleanNameForRoute = (ruta: string) => {
    const r = ruta.split('?')[0]?.split('#')[0] || ruta;
    const ROUTE_LABELS: Record<string, string> = {
      '/admin/clientes': 'Clientes',
      '/coordinador/clientes': 'Clientes',
      '/supervisor/clientes': 'Clientes',
      '/admin/creditos': 'Créditos',
      '/coordinador/creditos': 'Créditos',
      '/admin/rutas': 'Rutas',
      '/coordinador/rutas': 'Rutas',
      '/supervisor/rutas': 'Rutas',
      '/contable': 'Movimientos',
      '/contable/cierre-caja': 'Arqueo de Caja',
      '/articulos': 'Artículos',
      '/reportes/financieros': 'Reportes Financieros',
      '/admin/users': 'Usuarios',
      '/admin/auditoria': 'Auditoría',
      '/admin/sistema/configuracion': 'Configuración',
      '/admin/sistema/sincronizacion': 'Sincronización',
      '/admin/sistema/backups': 'Backups',
      '/admin/reportes/operativos': 'Reportes Operativos',
      '/admin/pagos/historial': 'Historial de pagos',
      '/admin/pagos/registro': 'Registro de pagos',
    };

    return ROUTE_LABELS[r];
  };

  const getGroupKey = (rawModulo: string) => {
    const m = String(rawModulo || '').toLowerCase();
    if (m.includes('sistema') || m.includes('config') || m.includes('backup') || m.includes('sincron')) return 'sistema';
    if (m.includes('admin') || m.includes('usuario') || m.includes('rol') || m.includes('auditor')) return 'administracion';
    if (m.includes('finan') || m.includes('contab') || m.includes('caja') || m.includes('tesor') || m.includes('cash')) return 'finanzas';
    if (m.includes('report')) return 'reportes';
    if (m.includes('cliente') || m.includes('mora') || m.includes('vencid')) return 'gestion-clientes';
    return 'operaciones';
  };

  const GROUP_META: Record<string, { id: string; nombre: string; icono: string }> = {
    'gestion-clientes': { id: 'gestion-clientes', nombre: 'Gestión Clientes', icono: 'Users' },
    finanzas: { id: 'finanzas', nombre: 'Finanzas', icono: 'PieChart' },
    administracion: { id: 'administracion', nombre: 'Administración', icono: 'Shield' },
    sistema: { id: 'sistema', nombre: 'Sistema', icono: 'Settings' },
    operaciones: { id: 'operaciones', nombre: 'Operaciones', icono: 'Briefcase' },
    reportes: { id: 'reportes', nombre: 'Reportes', icono: 'ClipboardList' },
  };

  const grouped = new Map<string, ModuloPermiso>();
  const topLevel = new Map<string, ModuloPermiso>();

  for (const grupo of sidebarData) {
    const groupKey = getGroupKey(grupo.modulo);
    const meta = GROUP_META[groupKey] || GROUP_META.operaciones;
    const items = grupo.items || [];

    if (items.length === 1 && (items[0]?.id === 'dashboard' || items[0]?.ruta === '/admin')) {
      const item = items[0];
      topLevel.set('dashboard', {
        id: 'dashboard',
        nombre: item.nombre || 'Dashboard',
        icono: inferIconName(item.id, item.icono) || 'LayoutDashboard',
        path: item.ruta || '/admin',
        roles: [],
      });
      continue;
    }

    const byRoute = new Map<string, SidebarModulo['items'][number]>();
    for (const item of items) {
      const ruta = item.ruta?.trim();
      if (!ruta || ruta === '#') continue;
      if (EXCLUDED_SIDEBAR_ROUTE_PREFIXES.some((p) => ruta.startsWith(`${p}/`) || ruta === p)) continue;
      if (EXCLUDED_SIDEBAR_ROUTES.has(ruta)) continue;

      const existingItem = byRoute.get(ruta);
      if (!existingItem || getItemScore(item) > getItemScore(existingItem)) {
        byRoute.set(ruta, item);
      }
    }

    const existing = grouped.get(meta.id);
    const current: ModuloPermiso = existing || {
      id: meta.id,
      nombre: meta.nombre,
      icono: meta.icono,
      path: '#',
      roles: [],
      submodulos: [],
    };

    for (const item of byRoute.values()) {
      const cleanName = item.ruta ? getCleanNameForRoute(item.ruta) : undefined;
      const displayName =
        cleanName ||
        (isVerbLikeName(item.nombre)
          ? String(item.nombre || '').replace(/^(ver|crear|editar|eliminar|aprobar|gestionar|registrar|exportar)\s+/i, '')
          : item.nombre);

      const sub: ModuloPermiso = {
        id: item.id,
        nombre: displayName,
        icono: isCuentasVencidas(item.id, item.ruta) ? 'FileX2' : inferIconName(item.id, item.icono),
        path: item.ruta || '#',
        roles: [],
      };

      const subs = current.submodulos || [];
      if (!subs.some((s) => s.path === sub.path)) {
        subs.push(sub);
        current.submodulos = subs;
      }
    }

    if (current.submodulos && current.submodulos.length > 0) {
      grouped.set(meta.id, current);
    }
  }

  const order = ['dashboard', 'gestion-clientes', 'operaciones', 'finanzas', 'reportes', 'administracion', 'sistema'];
  const result: ModuloPermiso[] = [];
  const dashboard = topLevel.get('dashboard');
  if (dashboard) result.push(dashboard);

  for (const key of order) {
    if (key === 'dashboard') continue;
    const meta = GROUP_META[key];
    const mod = meta ? grouped.get(meta.id) : undefined;
    if (mod && mod.submodulos && mod.submodulos.length > 0) result.push(mod);
  }

  for (const mod of grouped.values()) {
    if (!result.some((r) => r.id === mod.id) && mod.submodulos && mod.submodulos.length > 0) result.push(mod);
  }

  return result;
};

// Obtener módulos: roles conocidos usan config estática curada, roles nuevos usan sidebar dinámico del backend
export const obtenerModulos = (rol: Rol, sidebarData?: SidebarModulo[]): ModuloPermiso[] => {
  const getRolePrefix = (r: Rol): string | null => {
    if (r === 'SUPER_ADMINISTRADOR' || r === 'ADMIN') return null;
    if (r === 'COBRADOR') return 'cobranzas';
    if (r === 'COORDINADOR') return 'coordinador';
    if (r === 'SUPERVISOR') return 'supervisor';
    if (r === 'CONTADOR') return 'contador';
    if (r === 'PUNTO_DE_VENTA') return 'punto-de-venta';
    return null;
  };

  const aliasPathForRole = (rawPath: string | undefined | null): string | undefined | null => {
    if (!rawPath || rawPath === '#') return rawPath;

    const rolePrefix = getRolePrefix(rol);
    if (!rolePrefix) return rawPath;

    const OVERRIDES: Record<string, string> = {
      '/admin/sistema/backups': `/${rolePrefix}/backups`,
      '/admin/pagos/historial': '/admin/pagos/historial',
    };
    if (OVERRIDES[rawPath]) return OVERRIDES[rawPath];

    if (rawPath === '/admin') return `/${rolePrefix}`;
    if (rawPath.startsWith('/admin/')) return `/${rolePrefix}${rawPath.slice('/admin'.length)}`;

    return rawPath;
  };

  const applyAliases = (modulos: ModuloPermiso[]): ModuloPermiso[] => {
    return modulos.map((m) => {
      if (!m.submodulos || m.submodulos.length === 0) {
        return { ...m, path: aliasPathForRole(m.path) as any };
      }
      return {
        ...m,
        path: aliasPathForRole(m.path) as any,
        submodulos: m.submodulos.map((s) => ({ ...s, path: aliasPathForRole(s.path) as any })),
      };
    });
  };

  const filterForFloatingButtons = (modulos: ModuloPermiso[]) => {
    if (rol !== 'PUNTO_DE_VENTA') return modulos;

    const HIDDEN_PATHS = new Set<string>([
      '/creditos-articulos',
      '/articulos',
      '/admin/clientes',
      '/punto-de-venta/clientes',
    ]);

    return modulos
      .filter((m) => !HIDDEN_PATHS.has(m.path || ''))
      .map((m) => {
        if (!m.submodulos || m.submodulos.length === 0) return m;
        return {
          ...m,
          submodulos: m.submodulos.filter((s) => !HIDDEN_PATHS.has(s.path || '')),
        };
      })
      .filter((m) => m.path !== '#' || (m.submodulos && m.submodulos.length > 0));
  };

  const ensureCuratedAdminModules = (modulos: ModuloPermiso[]): ModuloPermiso[] => {
    if (rol !== 'SUPER_ADMINISTRADOR' && rol !== 'ADMIN' && rol !== 'COORDINADOR' && rol !== 'SUPERVISOR') return modulos;

    const curated = obtenerModulosPorRol(rol);
    let result = [...modulos];

    // Fusionar de forma inteligente los módulos curados críticos sobre el dinámico
    curated.forEach((curatedMod) => {
      // Intentar encontrar el módulo principal (ej. "operaciones", "finanzas")
      const existingIdx = result.findIndex(m => m.id === curatedMod.id || m.nombre === curatedMod.nombre);
      
      // Casos especiales de posicionamiento
      if (curatedMod.id === 'revisiones' && existingIdx < 0) {
        const dashboardIndex = result.findIndex((m) => m.id === 'dashboard');
        const insertAt = dashboardIndex >= 0 ? dashboardIndex + 1 : 0;
        result.splice(insertAt, 0, curatedMod);
        return;
      }

      if (existingIdx < 0) {
        // Empujar todo el módulo si no existe y tiene elementos (Ej. Todo "operaciones" falta)
        if (curatedMod.submodulos && curatedMod.submodulos.length > 0) {
            result.push(curatedMod);
        } else if (curatedMod.isNew) {
            result.push(curatedMod);
        }
      } else {
        // Si el módulo ya existe, combinar los submódulos que falten
        const existingMod = result[existingIdx];
        const curatedSubs = curatedMod.submodulos || [];
        const existingSubs = existingMod.submodulos || [];
        const mergedSubs = [...existingSubs];
        
        curatedSubs.forEach((s) => {
          if (!mergedSubs.some((e) => e.id === s.id || e.path === s.path)) {
            mergedSubs.push(s);
          }
        });

        // Actualizar el módulo con los submódulos combinados
        result[existingIdx] = { ...existingMod, submodulos: mergedSubs };
      }
    });

    return result;
  };

  const ensureStableIds = (modulos: ModuloPermiso[]): ModuloPermiso[] => {
    const stableId = (m: ModuloPermiso, parentId?: string) => {
      if (m.id) return m.id;
      const base = String(m.path || m.nombre || '').trim();
      const norm = base
        .toLowerCase()
        .replace(/^\/+/, '')
        .replace(/[^a-z0-9]+/g, '-');
      return `${parentId ? `${parentId}-` : ''}${norm || 'modulo'}`;
    };

    return modulos.map((m) => {
      const id = stableId(m);
      if (!m.submodulos || m.submodulos.length === 0) return { ...m, id };
      return {
        ...m,
        id,
        submodulos: m.submodulos.map((s) => ({ ...s, id: stableId(s, id) })),
      };
    });
  };

  const dedupeArticulos = (modulos: ModuloPermiso[]): ModuloPermiso[] => {
    const normalizePath = (p?: string | null) => (p ? p.split('?')[0]?.split('#')[0] : p) || '';
    let hasAdminArticulos = false;
    for (const m of modulos) {
      if (normalizePath(m.path) === '/admin/articulos') hasAdminArticulos = true;
      for (const s of m.submodulos || []) {
        if (normalizePath(s.path) === '/admin/articulos') hasAdminArticulos = true;
      }
    }
    if (!hasAdminArticulos) return modulos;

    const filterOut = (p?: string | null) => normalizePath(p) === '/articulos';
    return modulos
      .filter((m) => !filterOut(m.path))
      .map((m) => {
        if (!m.submodulos || m.submodulos.length === 0) return m;
        const subs = m.submodulos.filter((s) => !filterOut(s.path));
        return { ...m, submodulos: subs };
      })
      .filter((m) => m.path !== '#' || (m.submodulos && m.submodulos.length > 0));
  };

  if (sidebarData && sidebarData.length > 0) {
    const dynamic = filterForFloatingButtons(applyAliases(buildSidebarFromApi(sidebarData)));
    return ensureStableIds(dedupeArticulos(ensureCuratedAdminModules(dynamic)));
  }
  if (ROLES_CONOCIDOS.includes(rol)) {
    return ensureStableIds(dedupeArticulos(ensureCuratedAdminModules(filterForFloatingButtons(applyAliases(obtenerModulosPorRol(rol))))));
  }
  return ensureStableIds(dedupeArticulos(ensureCuratedAdminModules(filterForFloatingButtons(applyAliases(buildSidebarFromApi(sidebarData || []))))));
};

// Verificar si un usuario tiene acceso a una ruta
export const tieneAcceso = (rol: Rol, path: string, permisos?: string[]): boolean => {
  const normalizado = path.split('?')[0]?.split('#')[0] ?? path;

  // Rutas unificadas accesibles para todos los roles autenticados
  if (normalizado === '/perfil') return true;
  if (normalizado === '/notificaciones') return true;

  // Si tenemos permisos dinámicos, usarlos para verificar acceso
  if (permisos && permisos.length > 0) {
    // SUPER_ADMINISTRADOR tiene acceso total
    if (rol === 'SUPER_ADMINISTRADOR') return true;

    // Verificar si algún permiso tiene una ruta que coincida
    // Los permisos son acciones como 'dashboard', 'clientes', 'contable', etc.
    // Necesitamos mapear la ruta a una acción conocida
    const rutaAAccion: Record<string, string> = {
      '/admin': 'dashboard',
      '/coordinador': 'dashboard',
      '/supervisor': 'dashboard',
      '/cobranzas': 'dashboard',
      '/contable': 'contable',
      '/creditos': 'gestion-creditos',
      '/admin/creditos': 'gestion-creditos',
      '/coordinador/creditos': 'gestion-creditos',
      '/rutas': 'rutas',
      '/admin/rutas': 'rutas',
      '/coordinador/rutas': 'rutas',
      '/supervisor/rutas': 'rutas',
      '/clientes': 'clientes',
      '/admin/clientes': 'clientes',
      '/coordinador/clientes': 'clientes',
      '/supervisor/clientes': 'clientes',
      '/cobranzas/clientes': 'clientes',
      '/cuentas-mora': 'cuentas-mora',
      '/cuentas-vencidas': 'cuentas-vencidas',
      '/archivados': 'archivados',
      '/admin/archivados': 'archivados',
      '/contable/cierre-caja': 'arqueo',
      '/articulos': 'articulos',
      '/reportes/financieros': 'reportes-financieros',
      '/users': 'usuarios',
      '/admin/users': 'usuarios',
      '/auditoria': 'auditoria',
      '/admin/auditoria': 'auditoria',
      '/sistema/configuracion': 'configuracion',
      '/admin/sistema/configuracion': 'configuracion',
      '/sistema/sincronizacion': 'sincronizacion',
      '/admin/sistema/sincronizacion': 'sincronizacion',
      '/sistema/backups': 'backups',
      '/admin/sistema/backups': 'backups',
      '/reportes/operativos': 'reportes-operativos',
      '/admin/reportes/operativos': 'reportes-operativos',
      '/coordinador/reportes': 'reportes-operativos',
      '/supervisor/reportes/operativos': 'reportes-operativos',
      '/pagos': 'pagos',
      '/admin/pagos': 'pagos',
      '/prestamos': 'prestamos',
      '/admin/prestamos': 'prestamos',
      '/cobranzas/prestamos/nuevo': 'prestamos-dinero',
      '/cobranzas/notificaciones': 'notificaciones',
      '/cobranzas/solicitudes': 'solicitudes',
      '/creditos-articulos': 'creditos-articulos',
      '/punto-de-venta': 'dashboard',
      '/revisiones': 'revisiones',
      '/admin/revisiones': 'revisiones',
      '/coordinador/revisiones': 'revisiones',
      '/supervisor/revisiones': 'revisiones',
      '/conflictos': 'conflictos-sinc',
      '/admin/conflictos': 'conflictos-sinc',
      '/coordinador/conflictos': 'conflictos-sinc',
    };

    // Match exacto
    const accion = rutaAAccion[normalizado];
    if (accion && permisos.includes(accion)) return true;

    // Match por prefijo (para sub-rutas dinámicas como /admin/rutas/[id])
    for (const [ruta, acc] of Object.entries(rutaAAccion)) {
      if (ruta !== '/' && normalizado.startsWith(`${ruta}/`) && permisos.includes(acc)) return true;
    }

    // Excepciones legacy: notificaciones y perfil con prefijo de rol
    if (normalizado.endsWith('/notificaciones') || normalizado.endsWith('/perfil')) return true;

    return false;
  }

  // Fallback estático (para roles que aún no tienen permisos dinámicos)
  const modulos = permisosPorRol[rol as keyof typeof permisosPorRol];
  if (!modulos) return false;

  const rutasPermitidas = modulos
    .flatMap((m) => [m.path, ...(m.submodulos?.map((s) => s.path) ?? [])])
    .filter((p): p is string => Boolean(p) && p !== '#');

  // /creditos-articulos accesible para SUPER_ADMIN/ADMIN aunque no esté en su sidebar
  if (normalizado.startsWith('/creditos-articulos') && (rol === 'SUPER_ADMINISTRADOR' || rol === 'ADMIN')) return true;

  // Excepciones Globales: Permitir acceso a Notificaciones y Perfil role-prefixed
  const prefijoRol = rol === 'COBRADOR' ? '/cobranzas' : 
                    rol === 'CONTADOR' ? '/contador' : 
                    rol === 'PUNTO_DE_VENTA' ? '/punto-de-venta' :
                    rol === 'SUPER_ADMINISTRADOR' || rol === 'ADMIN' ? '/admin' :
                    rol === 'COORDINADOR' ? '/coordinador' : '/supervisor';

  if (normalizado.endsWith('/notificaciones') || normalizado.endsWith('/perfil')) {
    return normalizado.startsWith(prefijoRol);
  }

  if (rol === 'CONTADOR' && normalizado === '/contador/notificaciones') return true;

  if (rutasPermitidas.includes(normalizado)) return true;

  return rutasPermitidas.some((base) => {
    if (base === '/admin' || base === '/cobranzas' || base === '/contador' || base === '/') return false;
    return normalizado.startsWith(`${base}/`);
  });
};
