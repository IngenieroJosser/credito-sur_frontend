import type { SidebarModulo } from '@/lib/types/autenticacion-type';

export type Rol = string;

export interface ModuloPermiso {
  id: string;
  nombre: string;
  icono: string;
  path: string;
  roles: Rol[];
  submodulos?: ModuloPermiso[];
  isNew?: boolean;
}

// Plantillas de módulos para evitar duplicación masiva de código (SonarQube Refactor)
const T = {
  DASHBOARD: (role: Rol, path: string) => ({ id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard', path, roles: [role] }),
  REVISIONES: (role: Rol, path: string) => ({ id: 'revisiones', nombre: 'Revisiones', icono: 'ShieldCheck', path, roles: [role], isNew: true }),
  
  // Operaciones
  CREDITOS: (role: Rol, path: string) => ({ id: 'gestion-creditos', nombre: 'Créditos', icono: 'CreditCard', path, roles: [role] }),
  RUTAS: (role: Rol, path: string) => ({ id: 'rutas', nombre: 'Rutas', icono: 'Route', path, roles: [role] }),
  PDV_FOLLOW: (role: Rol, path: string) => ({ id: 'seguimiento-pdv', nombre: 'Punto de Venta', icono: 'ShoppingBag', path, roles: [role], isNew: true }),
  
  // Gestión Clientes
  CLIENTES: (role: Rol, path: string) => ({ id: 'clientes', nombre: 'Clientes', icono: 'Users', path, roles: [role] }),
  MORA: (role: Rol, path: string) => ({ id: 'cuentas-mora', nombre: 'Cuentas en mora', icono: 'AlertCircle', path, roles: [role], isNew: true }),
  VENCIDAS: (role: Rol, path: string) => ({ id: 'cuentas-vencidas', nombre: 'Cuentas vencidas', icono: 'FileX2', path, roles: [role] }),
  ARCHIVADOS: (role: Rol, path: string) => ({ id: 'archivados', nombre: 'Archivados', icono: 'Archive', path, roles: [role] }),
  
  // Finanzas
  MOVIMIENTOS: (role: Rol, path: string) => ({ id: 'contable', nombre: 'Movimientos', icono: 'Calculator', path, roles: [role] }),
  PAGOS_HIST: (role: Rol, path: string) => ({ id: 'pagos-historial', nombre: 'Historial de Pagos y Gastos', icono: 'Banknote', path, roles: [role], isNew: true }),
  ARQUEO: (role: Rol, path: string) => ({ id: 'arqueo', nombre: 'Arqueo de Caja', icono: 'History', path, roles: [role], isNew: true }),
  REP_FINAN: (role: Rol, path: string) => ({ id: 'reportes-financieros', nombre: 'Reportes financieros', icono: 'BarChart3', path, roles: [role] }),
  
  // Administración
  USUARIOS: (role: Rol, path: string) => ({ id: 'usuarios', nombre: 'Gestionar Usuarios', icono: 'User', path, roles: [role] }),
  AUDITORIA: (role: Rol, path: string) => ({ id: 'auditoria', nombre: 'Auditoría', icono: 'FileText', path, roles: [role], isNew: true }),
  
  // Sistema
  CONFIG: (role: Rol, path: string) => ({ id: 'configuracion', nombre: 'Configuración', icono: 'Settings', path, roles: [role] }),
  BACKUP: (role: Rol, path: string) => ({ id: 'backups', nombre: 'Backups', icono: 'HardDrive', path, roles: [role], isNew: true }),
  SYNC: (role: Rol, path: string) => ({ id: 'sincronizacion', nombre: 'Sincronización', icono: 'RefreshCw', path, roles: [role], isNew: true }),
  
  // Otros
  REP_OPER: (role: Rol, path: string) => ({ id: 'reportes-operativos', nombre: 'Reportes operativos', icono: 'ClipboardList', path, roles: [role] }),
  INVENTARIO: (role: Rol, path: string) => ({ id: 'articulos', nombre: 'Artículos (Inventario)', icono: 'Package', path, roles: [role] }),
  NOTIF: (role: Rol, path: string) => ({ id: 'notificaciones', nombre: 'Notificaciones', icono: 'Bell', path, roles: [role] }),
  SOLICITUDES: (role: Rol, path: string) => ({ id: 'solicitudes', nombre: 'Solicitudes', icono: 'ClipboardList', path, roles: [role] }),
  PRESTAMO_DINERO: (role: Rol, path: string) => ({ id: 'prestamos-dinero', nombre: 'Solicitar Crédito', icono: 'CreditCard', path, roles: [role] }),
  CRED_ART: (role: Rol, path: string) => ({ id: 'creditos-articulos', nombre: 'Créditos Artículos', icono: 'ShoppingBag', path, roles: [role] }),
};

export const permisosPorRol: Record<Rol, ModuloPermiso[]> = {
  SUPER_ADMINISTRADOR: [
    T.DASHBOARD('SUPER_ADMINISTRADOR', '/admin'),
    T.REVISIONES('SUPER_ADMINISTRADOR', '/admin/revisiones'),
    { 
      id: 'operaciones', nombre: 'Operaciones', icono: 'Briefcase', path: '#', roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        T.CREDITOS('SUPER_ADMINISTRADOR', '/admin/creditos'),
        T.RUTAS('SUPER_ADMINISTRADOR', '/admin/rutas'),
        T.PDV_FOLLOW('SUPER_ADMINISTRADOR', '/admin/operaciones/punto-de-venta'),
      ]
    },
    {
      id: 'gestion-clientes', nombre: 'Gestión Clientes', icono: 'Users', path: '#', roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        T.CLIENTES('SUPER_ADMINISTRADOR', '/admin/clientes'),
        T.MORA('SUPER_ADMINISTRADOR', '/admin/cuentas-mora'),
        T.VENCIDAS('SUPER_ADMINISTRADOR', '/admin/cuentas-vencidas'),
        T.ARCHIVADOS('SUPER_ADMINISTRADOR', '/admin/archivados'),
      ]
    },
    {
      id: 'finanzas', nombre: 'Finanzas', icono: 'PieChart', path: '#', roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        T.MOVIMIENTOS('SUPER_ADMINISTRADOR', '/contable'),
        T.PAGOS_HIST('SUPER_ADMINISTRADOR', '/pagos/historial'),
        T.ARQUEO('SUPER_ADMINISTRADOR', '/contable/cierre-caja'),
        T.REP_FINAN('SUPER_ADMINISTRADOR', '/admin/reportes/financieros'),
      ]
    },
    {
      id: 'administracion', nombre: 'Administración', icono: 'Shield', path: '#', roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        T.AUDITORIA('SUPER_ADMINISTRADOR', '/admin/auditoria'),
        T.INVENTARIO('SUPER_ADMINISTRADOR', '/admin/articulos'),
      ]
    },
    {
      id: 'sistema', nombre: 'Sistema', icono: 'Settings', path: '#', roles: ['SUPER_ADMINISTRADOR'],
      submodulos: [
        T.USUARIOS('SUPER_ADMINISTRADOR', '/admin/users'),
        T.CONFIG('SUPER_ADMINISTRADOR', '/admin/sistema/configuracion'),
        T.SYNC('SUPER_ADMINISTRADOR', '/admin/sistema/sincronizacion'),
        T.BACKUP('SUPER_ADMINISTRADOR', '/admin/sistema/backups'),
      ]
    },
  ],
  ADMIN: [
    T.DASHBOARD('ADMIN', '/admin'),
    T.REVISIONES('ADMIN', '/admin/revisiones'),
    { 
      id: 'operaciones', nombre: 'Operaciones', icono: 'Briefcase', path: '#', roles: ['ADMIN'],
      submodulos: [
        T.CREDITOS('ADMIN', '/admin/creditos'),
        T.RUTAS('ADMIN', '/admin/rutas'),
        T.PDV_FOLLOW('ADMIN', '/admin/operaciones/punto-de-venta'),
      ]
    },
    {
      id: 'gestion-clientes', nombre: 'Gestión Clientes', icono: 'Users', path: '#', roles: ['ADMIN'],
      submodulos: [
        T.CLIENTES('ADMIN', '/admin/clientes'),
        T.MORA('ADMIN', '/admin/cuentas-mora'),
        T.VENCIDAS('ADMIN', '/admin/cuentas-vencidas'),
        T.ARCHIVADOS('ADMIN', '/admin/archivados'),
      ]
    },
    {
      id: 'finanzas', nombre: 'Finanzas', icono: 'PieChart', path: '#', roles: ['ADMIN'],
      submodulos: [
        T.MOVIMIENTOS('ADMIN', '/contable'),
        T.PAGOS_HIST('ADMIN', '/pagos/historial'),
        T.ARQUEO('ADMIN', '/contable/cierre-caja'),
        T.REP_FINAN('ADMIN', '/admin/reportes/financieros'),
      ]
    },
    {
      id: 'administracion', nombre: 'Administración', icono: 'Shield', path: '#', roles: ['ADMIN'],
      submodulos: [
        T.INVENTARIO('ADMIN', '/admin/articulos'),
      ]
    },
    {
      id: 'sistema', nombre: 'Sistema', icono: 'Settings', path: '#', roles: ['ADMIN'],
      submodulos: [
        T.SYNC('ADMIN', '/sistema/sincronizacion'),
      ]
    },
  ],
  COORDINADOR: [
    T.DASHBOARD('COORDINADOR', '/coordinador'),
    T.REVISIONES('COORDINADOR', '/coordinador/revisiones'),
    {
      id: 'operaciones', nombre: 'Operaciones', icono: 'Briefcase', path: '#', roles: ['COORDINADOR'],
      submodulos: [
        T.CREDITOS('COORDINADOR', '/coordinador/creditos'),
        T.RUTAS('COORDINADOR', '/coordinador/rutas'),
      ]
    },
    {
      id: 'gestion-clientes', nombre: 'Gestión Clientes', icono: 'Users', path: '#', roles: ['COORDINADOR'],
      submodulos: [
        T.CLIENTES('COORDINADOR', '/coordinador/clientes'),
        T.MORA('COORDINADOR', '/coordinador/cuentas-mora'),
        T.VENCIDAS('COORDINADOR', '/coordinador/cuentas-vencidas'),
        T.ARCHIVADOS('COORDINADOR', '/coordinador/archivados'),
      ]
    },
    {
      id: 'finanzas', nombre: 'Finanzas', icono: 'PieChart', path: '#', roles: ['COORDINADOR'],
      submodulos: [ T.PAGOS_HIST('COORDINADOR', '/coordinador/pagos/historial') ]
    },
    {
      id: 'administracion', nombre: 'Administración', icono: 'Shield', path: '#', roles: ['COORDINADOR'],
      submodulos: [ T.INVENTARIO('COORDINADOR', '/coordinador/articulos') ]
    },
  ],
  SUPERVISOR: [
    T.DASHBOARD('SUPERVISOR', '/supervisor'),
    T.REVISIONES('SUPERVISOR', '/supervisor/revisiones'),
    {
      id: 'operaciones', nombre: 'Operaciones', icono: 'Briefcase', path: '#', roles: ['SUPERVISOR'],
      submodulos: [ T.RUTAS('SUPERVISOR', '/supervisor/rutas') ]
    },
    {
      id: 'gestion-clientes', nombre: 'Gestión Clientes', icono: 'Users', path: '#', roles: ['SUPERVISOR'],
      submodulos: [ 
        T.CLIENTES('SUPERVISOR', '/supervisor/clientes'),
        T.MORA('SUPERVISOR', '/supervisor/cuentas-mora'),
        T.VENCIDAS('SUPERVISOR', '/supervisor/cuentas-vencidas')
      ]
    }
  ],
  COBRADOR: [
    T.DASHBOARD('COBRADOR', '/cobranzas'),
    T.PRESTAMO_DINERO('COBRADOR', '/cobranzas/prestamos/nuevo'),
    T.CLIENTES('COBRADOR', '/cobranzas/clientes/nuevo'),
    T.NOTIF('COBRADOR', '/cobranzas/notificaciones'),
    T.SOLICITUDES('COBRADOR', '/cobranzas/solicitudes'),
  ],
  CONTADOR: [
    {
      id: 'gestion-clientes', nombre: 'Gestión Clientes', icono: 'Users', path: '#', roles: ['CONTADOR'],
      submodulos: [
        T.MORA('CONTADOR', '/contador/cuentas-mora'),
        T.VENCIDAS('CONTADOR', '/contador/cuentas-vencidas'),
      ]
    },
    {
      id: 'finanzas', nombre: 'Finanzas', icono: 'PieChart', path: '#', roles: ['CONTADOR'],
      submodulos: [
        T.MOVIMIENTOS('CONTADOR', '/contador/contable'),
        T.PAGOS_HIST('CONTADOR', '/contador/pagos/historial'),
        T.ARQUEO('CONTADOR', '/contador/contable/cierre-caja'),
        T.REP_FINAN('CONTADOR', '/contador/reportes/financieros'),
      ]
    },
    {
      id: 'administracion', nombre: 'Administración', icono: 'Shield', path: '#', roles: ['CONTADOR'],
      submodulos: [ T.INVENTARIO('CONTADOR', '/contador/articulos') ]
    },
  ],
  PUNTO_DE_VENTA: [
    T.CRED_ART('PUNTO_DE_VENTA', '/creditos-articulos'),
    T.INVENTARIO('PUNTO_DE_VENTA', '/articulos'),
  ],
};

const ROLES_CONOCIDOS = Object.keys(permisosPorRol);

import {
  Eye, Home, LayoutDashboard, Bell, CreditCard, ShoppingBag, ShieldCheck, Banknote, Users, AlertCircle,
  Route, Package, PieChart, User, Archive, Shield, Settings, CheckCircle2, Receipt, Wallet, Map as MapIcon,
  HardDrive, Landmark, History, ClipboardList, Briefcase, Calculator, BarChart3, Key, FileText, FileX2,
  RefreshCw, UserCircle, AlertTriangle
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
  return permisosPorRol[rol] || [];
};

const ACTION_ICON_MAP: Record<string, string> = {
  dashboard: 'LayoutDashboard', role: 'Shield', roles: 'Shield', user: 'User', users: 'User', usuario: 'User', usuarios: 'User',
  audit: 'FileText', auditoria: 'FileText', backup: 'HardDrive', backups: 'HardDrive', 
  'late-fee': 'AlertCircle', 'late-fee-manage': 'AlertCircle', cash: 'Landmark', 'cash-manage': 'Landmark',
  cost: 'Calculator', cost_manage: 'Calculator', expense: 'Wallet', expense_manage: 'Wallet',
  report: 'ClipboardList', report_view: 'ClipboardList', 'report-financial': 'BarChart3',
  client: 'Users', clients: 'Users', cliente: 'Users', clientes: 'Users',
  loan: 'CreditCard', loans: 'CreditCard', prestamo: 'CreditCard', prestamos: 'CreditCard',
  payment: 'Receipt', payments: 'Receipt', pago: 'Receipt', pagos: 'Receipt',
  route: 'Route', routes: 'Route', accounting: 'Calculator', contable: 'Calculator', contabilidad: 'Calculator',
  'gestion-creditos': 'CreditCard', creditos: 'CreditCard', rutas: 'Route',
  'cuentas-mora': 'AlertCircle', mora: 'AlertCircle', 'cuentas-vencidas': 'FileX2', vencidas: 'FileX2',
  archivados: 'Archive', articulos: 'Package', inventario: 'Package', 'reportes-financieros': 'BarChart3',
  'reportes-operativos': 'ClipboardList', reportes: 'ClipboardList', configuracion: 'Settings',
  sistema: 'Settings', sincronizacion: 'RefreshCw', notificaciones: 'Bell', solicitudes: 'ClipboardList',
  'prestamos-dinero': 'CreditCard', 'creditos-articulos': 'ShoppingBag', 'revisiones': 'ShieldCheck',
  'conflictos-sinc': 'AlertTriangle', 'seguimiento-pdv': 'ShoppingBag',
};

const normalizePermissionId = (id: string) => String(id || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').replace(/[^a-z0-9-]/g, '');

const isCuentasVencidas = (id?: string | null, ruta?: string | null) => {
  const key = normalizePermissionId(String(id || ''));
  const r = String(ruta || '').toLowerCase();
  return key.startsWith('cuentas-vencidas') || r.includes('cuentas-vencidas');
};

const inferIconName = (id: string, iconFromApi?: string | null) => {
  if (isCuentasVencidas(id)) return 'FileX2';
  if (iconFromApi) return iconFromApi;
  const key = normalizePermissionId(id);
  const base = key.split('-')[0] || '';
  return ACTION_ICON_MAP[key] || (base ? ACTION_ICON_MAP[base] : undefined) || ACTION_ICON_MAP[id] || 'Eye';
};

export const buildSidebarFromApi = (sidebarData: SidebarModulo[]): ModuloPermiso[] => {
  if (!sidebarData || sidebarData.length === 0) return [];
  const EXCLUDED_SIDEBAR_ROUTES = new Set(['/cobranzas/notificaciones', '/cobranzas/solicitudes', '/creditos-articulos']);
  const EXCLUDED_SIDEBAR_IDS = new Set(['reportes-operativos']);
  const EXCLUDED_SIDEBAR_ROUTE_PREFIXES = ['/cobranzas'];

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

  sidebarData.forEach(grupo => {
    const groupKey = ((m: string) => {
      const ml = m.toLowerCase();
      if (ml.includes('sistema') || ml.includes('config') || ml.includes('usuario')) return 'sistema';
      if (ml.includes('admin')) return 'administracion';
      if (ml.includes('finan') || ml.includes('contab')) return 'finanzas';
      if (ml.includes('report')) return 'reportes';
      if (ml.includes('cliente') || ml.includes('mora')) return 'gestion-clientes';
      return 'operaciones';
    })(grupo.modulo);

    const meta = GROUP_META[groupKey as keyof typeof GROUP_META] || GROUP_META.operaciones;
    const items = grupo.items || [];

    if (items.length === 1 && (items[0]?.id === 'dashboard' || items[0]?.ruta === '/admin')) {
      topLevel.set('dashboard', { id: 'dashboard', nombre: items[0].nombre || 'Dashboard', icono: inferIconName(items[0].id, items[0].icono), path: items[0].ruta || '/admin', roles: [] });
      return;
    }

    const current = grouped.get(meta.id) || { ...meta, path: '#', roles: [], submodulos: [] };
    items.forEach(item => {
      const ruta = item.ruta?.trim();
      const itemKey = normalizePermissionId(item.id);
      if (
        EXCLUDED_SIDEBAR_IDS.has(itemKey) ||
        !ruta ||
        ruta === '#' ||
        EXCLUDED_SIDEBAR_ROUTE_PREFIXES.some(p => ruta.startsWith(`${p}/`)) ||
        EXCLUDED_SIDEBAR_ROUTES.has(ruta)
      ) return;
      
      let targetMeta = meta;
      if (itemKey === 'articulos' || itemKey === 'inventario') {
        targetMeta = GROUP_META.administracion;
      } else if (itemKey === 'usuarios' || itemKey === 'usuario') {
        targetMeta = GROUP_META.sistema;
      }

      const target = grouped.get(targetMeta.id) || { ...targetMeta, path: '#', roles: [], submodulos: [] };
      if (!target.submodulos!.some(s => s.path === ruta)) {
        target.submodulos!.push({ id: item.id, nombre: item.nombre, icono: inferIconName(item.id, item.icono), path: ruta, roles: [] });
      }
      if (target.submodulos!.length > 0) grouped.set(targetMeta.id, target);
    });
    if (current.submodulos!.length > 0) grouped.set(meta.id, current);
  });

  const order = ['dashboard', 'gestion-clientes', 'operaciones', 'finanzas', 'reportes', 'administracion', 'sistema'];
  const result: ModuloPermiso[] = [];
  if (topLevel.has('dashboard')) result.push(topLevel.get('dashboard')!);
  order.forEach(key => {
    const mod = grouped.get(key);
    if (mod) result.push(mod);
  });
  return result;
};

export const obtenerModulos = (rol: Rol, sidebarData?: SidebarModulo[]): ModuloPermiso[] => {
  const getRolePrefix = (r: Rol) => ({ COBRADOR: 'cobranzas', COORDINADOR: 'coordinador', SUPERVISOR: 'supervisor', CONTADOR: 'contador', PUNTO_DE_VENTA: 'punto-de-venta' } as any)[r] || null;
  const aliasPath = (p: string) => {
    if (!p || p === '#') return p;
    const prefix = getRolePrefix(rol);
    if (!prefix) return p;
    if (p === '/admin/sistema/backups') return `/${prefix}/backups`;
    if (p === '/admin/pagos/historial') return '/admin/pagos/historial';
    if (p === '/admin') return `/${prefix}`;
    return p.startsWith('/admin/') ? `/${prefix}${p.slice(6)}` : p;
  };

  const applyAliases = (mods: ModuloPermiso[]): ModuloPermiso[] => mods.map(m => ({ ...m, path: aliasPath(m.path), submodulos: m.submodulos?.map(s => ({ ...s, path: aliasPath(s.path) })) }));

  const BLOCKED_MODULES_BY_ROLE: Partial<Record<string, Set<string>>> = {
    SUPERVISOR: new Set(['reportes', 'reportes-operativos', 'reportes-financieros', 'finanzas']),
  };

  const ensureCurated = (mods: ModuloPermiso[]): ModuloPermiso[] => {
    const blocked = BLOCKED_MODULES_BY_ROLE[rol];
    const filtered = blocked ? mods.filter(m => !blocked.has(m.id)) : mods;
    if (!['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'SUPERVISOR'].includes(rol)) return filtered;
    const curated = obtenerModulosPorRol(rol);
    const res = [...filtered];
    curated.forEach(cm => {
      if (blocked?.has(cm.id)) return;
      const idx = res.findIndex(m => m.id === cm.id || m.nombre === cm.nombre);
      if (idx < 0) { if (cm.id === 'revisiones') res.splice(1, 0, cm); else res.push(cm); }
      else { res[idx].submodulos = [...(res[idx].submodulos || [])]; cm.submodulos?.forEach(cs => { if (!res[idx].submodulos!.some(es => es.id === cs.id || es.path === cs.path)) res[idx].submodulos!.push(cs); }); }
    });
    return res;
  };

  const base = sidebarData?.length ? buildSidebarFromApi(sidebarData) : (ROLES_CONOCIDOS.includes(rol) ? obtenerModulosPorRol(rol) : []);
  const modulos = ensureCurated(applyAliases(base));

  if (rol === 'CONTADOR') {
    return modulos.filter((modulo) => modulo.id !== 'dashboard');
  }

  return modulos;
};

export const tieneAcceso = (rol: Rol, path: string, permisos?: string[]): boolean => {
  if (!rol) return false;
  const norm = path.split('?')[0]?.split('#')[0] ?? path;
  if (['/perfil', '/notificaciones', '/perfil/notificaciones'].includes(norm)) return true;
  if (rol === 'SUPER_ADMINISTRADOR') return true;

  // 1. Prioridad Absoluta: Si el módulo está en la lista del rol, TIENE ACCESO.
  const modulos = obtenerModulosPorRol(rol);
  const allowed = modulos.flatMap(m => [m.path, ...(m.submodulos?.map(s => s.path) || [])]).filter(p => !!p && p !== '#');
  
  if (allowed.includes(norm) || allowed.some(a => a !== '/' && (norm + '/').startsWith(a + '/'))) {
    return true;
  }

  // 2. Fallback: Verificación por permisos granulares (para componentes o rutas no mapeadas estáticamente)
  if (permisos?.length) {
    const map: Record<string, string> = { 
      '/admin': 'dashboard', '/contable': 'contable', '/creditos': 'gestion-creditos', 
      '/rutas': 'rutas', '/clientes': 'clientes', '/users': 'usuarios', 
      '/sistema/configuracion': 'configuracion',
      '/cuentas-mora': 'CUENTAS_MORA_VIEW',
      '/cuentas-vencidas': 'CUENTAS_VENCIDAS_VIEW'
    };
    
    const cleanNorm = norm.replace(/^\/(admin|supervisor|coordinador|contador)\//, '/');
    if (map[cleanNorm] && permisos.includes(map[cleanNorm])) return true;
    if (map[norm] && permisos.includes(map[norm])) return true;
    
    return Object.entries(map).some(([r, a]) => norm.startsWith(`${r}/`) && permisos.includes(a));
  }

  return false;
};
