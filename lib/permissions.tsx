import React from 'react';
import {
  TrendingUp,
  Target,
  AlertCircle,
  Activity,
  CreditCard,
  CheckCircle,
  Route,
  Users,
  DollarSign,
  AlertTriangle,
  Map,
  Wallet,
  Receipt,
  UserPlus,
  Banknote,
  FileX,
  Percent,
  Package,
  Calculator,
  Inbox,
  FileCheck,
  PieChart,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

/* =========================
   ROLES Y PERMISOS
========================= */

export type Rol =
  | 'SUPER_ADMINISTRADOR'
  | 'COORDINADOR'
  | 'SUPERVISOR'
  | 'COBRADOR'
  | 'CONTADOR';

export interface ModuloPermiso {
  id: string;
  nombre: string;
  icono?: IconName;
  path: string;
  roles: Rol[];
  submodulos?: ModuloPermiso[];
}

/* =========================
   MÉTRICAS
========================= */

export type IconName = keyof typeof iconMap;

export interface MetricasRol {
  mainMetrics: {
    title: string;
    value: number | string;
    isCurrency: boolean;
    change: number;
    icon: IconName;
    color: string;
  }[];
  quickAccess: {
    title: string;
    subtitle: string;
    icon: IconName;
    color: string;
    badge?: number;
    href: string;
  }[];
}

/* =========================
   ICONOS TIPADOS
========================= */

const iconMap: Record<string, LucideIcon> = {
  TrendingUp,
  Target,
  AlertCircle,
  Activity,
  CreditCard,
  CheckCircle,
  Route,
  Users,
  DollarSign,
  AlertTriangle,
  Map,
  Wallet,
  Receipt,
  UserPlus,
  Banknote,
  FileX,
  Percent,
  Package,
  Calculator,
  Inbox,
  FileCheck,
  PieChart,
};

export const getIconComponent = (iconName: IconName) => {
  const Icon = iconMap[iconName] ?? Activity;
  return <Icon className="h-4 w-4" />;
};

/* =========================
   PERMISOS POR ROL
========================= */

export const permisosPorRol: Record<
  Rol,
  {
    modulos: ModuloPermiso[];
    metricas: MetricasRol;
  }
> = {
  SUPER_ADMINISTRADOR: {
    modulos: [
      { id: 'dashboard', nombre: 'Dashboard', path: '/admin', roles: ['SUPER_ADMINISTRADOR'] },
      { id: 'prestamos', nombre: 'Créditos', path: '/admin/prestamos', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'COBRADOR'] },
      { id: 'cobranza', nombre: 'Cobranza', path: '/admin/pagos/registro', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'COBRADOR'] },
      { id: 'clientes', nombre: 'Clientes', path: '/admin/clientes', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'COBRADOR', 'CONTADOR'] },
      { id: 'mora', nombre: 'Cuentas en mora', path: '/admin/cuentas-mora', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR', 'CONTADOR'] },
      { id: 'rutas', nombre: 'Rutas', path: '/admin/rutas', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR'] },
      { id: 'articulos', nombre: 'Artículos', path: '/admin/articulos', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'] },
      { id: 'contable', nombre: 'Módulo contable', path: '/admin/contable', roles: ['SUPER_ADMINISTRADOR', 'CONTADOR'] },
      { id: 'usuarios', nombre: 'Usuarios', path: '/admin/users', roles: ['SUPER_ADMINISTRADOR'] },
      { id: 'roles', nombre: 'Roles y permisos', path: '/admin/roles-permisos', roles: ['SUPER_ADMINISTRADOR'] },
      { id: 'perfil', nombre: 'Perfil', path: '/admin/perfil', roles: ['SUPER_ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR', 'COBRADOR', 'CONTADOR'] },
    ],
    metricas: {
      mainMetrics: [
        {
          title: 'Capital Activo',
          value: 2850000000,
          isCurrency: true,
          change: 8.2,
          icon: 'TrendingUp',
          color: '#08557f',
        },
        {
          title: 'Recuperación',
          value: '94.2%',
          isCurrency: false,
          change: 2.1,
          icon: 'Target',
          color: '#10b981',
        },
        {
          title: 'Cartera Vencida',
          value: 45000000,
          isCurrency: true,
          change: -3.4,
          icon: 'AlertCircle',
          color: '#ef4444',
        },
        {
          title: 'Eficiencia',
          value: '87.3%',
          isCurrency: false,
          change: 1.8,
          icon: 'Activity',
          color: '#fb851b',
        },
      ],
      quickAccess: [
        {
          title: 'Nuevo Crédito',
          subtitle: 'Registro rápido',
          icon: 'CreditCard',
          color: '#08557f',
          badge: 3,
          href: '/admin/prestamos/nuevo',
        },
        {
          title: 'Cobranza',
          subtitle: 'Gestionar pagos',
          icon: 'Wallet',
          color: '#10b981',
          badge: 12,
          href: '/admin/pagos/registro',
        },
        {
          title: 'Clientes',
          subtitle: 'Base de datos',
          icon: 'Users',
          color: '#8b5cf6',
          href: '/admin/clientes',
        },
        {
          title: 'Análisis',
          subtitle: 'Reportes avanzados',
          icon: 'PieChart',
          color: '#fb851b',
          href: '/admin/reportes/operativos',
        },
      ],
    },
  },

  COORDINADOR: {
    modulos: [
      { id: 'dashboard', nombre: 'Dashboard', path: '/admin', roles: ['COORDINADOR'] },
      { id: 'prestamos', nombre: 'Créditos', path: '/admin/prestamos', roles: ['COORDINADOR'] },
      { id: 'clientes', nombre: 'Clientes', path: '/admin/clientes', roles: ['COORDINADOR'] },
      { id: 'perfil', nombre: 'Perfil', path: '/admin/perfil', roles: ['COORDINADOR'] },
    ],
    metricas: {
      mainMetrics: [
        {
          title: 'Créditos Pendientes',
          value: 15,
          isCurrency: false,
          change: 8.2,
          icon: 'CreditCard',
          color: '#08557f',
        },
      ],
      quickAccess: [],
    },
  },

  SUPERVISOR: {
    modulos: [
      { id: 'dashboard', nombre: 'Dashboard', path: '/admin', roles: ['SUPERVISOR'] },
      { id: 'clientes', nombre: 'Clientes', path: '/admin/clientes', roles: ['SUPERVISOR'] },
      { id: 'perfil', nombre: 'Perfil', path: '/admin/perfil', roles: ['SUPERVISOR'] },
    ],
    metricas: {
      mainMetrics: [],
      quickAccess: [],
    },
  },

  COBRADOR: {
    modulos: [
      { id: 'dashboard', nombre: 'Dashboard', path: '/admin', roles: ['COBRADOR'] },
      { id: 'ruta', nombre: 'Mi Ruta', path: '/admin/ruta-diaria', roles: ['COBRADOR'] },
      { id: 'perfil', nombre: 'Perfil', path: '/admin/perfil', roles: ['COBRADOR'] },
    ],
    metricas: {
      mainMetrics: [],
      quickAccess: [],
    },
  },

  CONTADOR: {
    modulos: [
      { id: 'dashboard', nombre: 'Dashboard', path: '/admin', roles: ['CONTADOR'] },
      { id: 'contable', nombre: 'Módulo contable', path: '/admin/contable', roles: ['CONTADOR'] },
      { id: 'perfil', nombre: 'Perfil', path: '/admin/perfil', roles: ['CONTADOR'] },
    ],
    metricas: {
      mainMetrics: [],
      quickAccess: [],
    },
  },
};

/* =========================
   HELPERS
========================= */

export const obtenerPermisosUsuario = (rol: Rol) => {
  return permisosPorRol[rol] ?? permisosPorRol.SUPER_ADMINISTRADOR;
};

export const tieneAcceso = (rol: Rol, path: string): boolean => {
  const permisos = permisosPorRol[rol];
  if (!permisos) return false;
  return permisos.modulos.some((modulo) => modulo.path === path);
};
