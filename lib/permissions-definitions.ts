
export interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
  module: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // --- Módulo: Créditos ---
  {
    code: 'CREDITOS_VIEW',
    name: 'Ver Créditos',
    description: 'Permite acceder al módulo de gestión de créditos y ver el listado.',
    module: 'Creditos'
  },
  {
    code: 'CREDITOS_CREATE',
    name: 'Crear Créditos',
    description: 'Habilita el botón para registrar nuevos préstamos o créditos de artículos.',
    module: 'Creditos'
  },
  {
    code: 'CREDITOS_EDIT',
    name: 'Editar Créditos',
    description: 'Permite modificar las condiciones de un crédito existente.',
    module: 'Creditos'
  },
  {
    code: 'CREDITOS_DELETE',
    name: 'Eliminar/Anular Créditos',
    description: 'Permite marcar créditos como pérdida o eliminarlos.',
    module: 'Creditos'
  },

  // --- Módulo: Clientes ---
  {
    code: 'CLIENTES_VIEW',
    name: 'Ver Clientes',
    description: 'Permite acceder al directorio de clientes y ver sus expedientes.',
    module: 'Clientes'
  },
  {
    code: 'CLIENTES_CREATE',
    name: 'Crear Clientes',
    description: 'Permite registrar nuevos clientes en el sistema.',
    module: 'Clientes'
  },
  {
    code: 'CLIENTES_EDIT',
    name: 'Editar Clientes',
    description: 'Permite modificar datos personales y de contacto de los clientes.',
    module: 'Clientes'
  },
  {
    code: 'CLIENTES_DELETE',
    name: 'Eliminar Clientes',
    description: 'Permite eliminar clientes del sistema (solo si no tienen deuda activa).',
    module: 'Clientes'
  },

  // --- Módulo: Rutas ---
  {
    code: 'RUTAS_VIEW',
    name: 'Ver Rutas',
    description: 'Permite ver el listado de rutas y sus asignaciones.',
    module: 'Rutas'
  },
  {
    code: 'RUTAS_CREATE',
    name: 'Crear Rutas',
    description: 'Permite definir nuevas rutas de cobro.',
    module: 'Rutas'
  },
  {
    code: 'RUTAS_EDIT',
    name: 'Editar Rutas',
    description: 'Permite reasignar cobradores o modificar zonas de una ruta.',
    module: 'Rutas'
  },

  // --- Módulo: Cuentas Vencidas ---
  {
    code: 'CUENTAS_VENCIDAS_VIEW',
    name: 'Ver Cuentas Vencidas',
    description: 'Permite acceder al módulo de cuentas vencidas y cartera castigada.',
    module: 'CuentasVencidas'
  },
  {
    code: 'CUENTAS_VENCIDAS_GESTIONAR',
    name: 'Gestionar Cuentas Vencidas',
    description: 'Permite gestionar decisiones sobre cuentas vencidas (jurídico, refinanciación).',
    module: 'CuentasVencidas'
  },
  {
    code: 'CUENTAS_VENCIDAS_PROCESAR',
    name: 'Procesar Castigo Contable',
    description: 'Permite procesar castigos contables de cartera irrecuperable.',
    module: 'CuentasVencidas'
  },
  {
    code: 'CUENTAS_VENCIDAS_EXPORTAR',
    name: 'Exportar Cuentas Vencidas',
    description: 'Permite exportar reportes de cuentas vencidas en Excel o PDF.',
    module: 'CuentasVencidas'
  },

  // --- Módulo: Cuentas en Mora ---
  {
    code: 'CUENTAS_MORA_VIEW',
    name: 'Ver Cuentas en Mora',
    description: 'Permite acceder al módulo de cuentas en mora y cartera vencida.',
    module: 'CuentasMora'
  },
  {
    code: 'CUENTAS_MORA_EXPORTAR',
    name: 'Exportar Cuentas en Mora',
    description: 'Permite exportar reportes de cuentas en mora en Excel o PDF.',
    module: 'CuentasMora'
  },
  {
    code: 'CUENTAS_MORA_VER_PERFIL',
    name: 'Ver Perfil Cliente en Mora',
    description: 'Permite ver el perfil completo del cliente desde el módulo de mora.',
    module: 'CuentasMora'
  },

  // --- Módulo: Artículos / Inventario ---
  {
    code: 'ARTICULOS_VIEW',
    name: 'Ver Artículos',
    description: 'Permite acceder al catálogo de artículos e inventario.',
    module: 'Articulos'
  },
  {
    code: 'ARTICULOS_CREAR',
    name: 'Crear Artículos',
    description: 'Permite crear nuevos artículos en el inventario.',
    module: 'Articulos'
  },
  {
    code: 'ARTICULOS_EDITAR',
    name: 'Editar Artículos',
    description: 'Permite editar artículos existentes.',
    module: 'Articulos'
  },
  {
    code: 'ARTICULOS_ELIMINAR',
    name: 'Eliminar Artículos',
    description: 'Permite eliminar artículos del inventario.',
    module: 'Articulos'
  },

  // --- Módulo: Contable ---
  {
    code: 'CONTABLE_VIEW',
    name: 'Ver Módulo Contable',
    description: 'Permite acceder al módulo de gestión contable y financiera.',
    module: 'Contable'
  },
  {
    code: 'CONTABLE_REGISTRAR',
    name: 'Registrar Movimientos',
    description: 'Permite registrar ingresos y egresos en las cajas.',
    module: 'Contable'
  },
  {
    code: 'CONTABLE_CIERRE',
    name: 'Cierre de Caja',
    description: 'Permite realizar el cierre y arqueo de caja.',
    module: 'Contable'
  },

  // --- Módulo: Reportes ---
  {
    code: 'REPORTES_VIEW',
    name: 'Ver Reportes',
    description: 'Acceso a reportes financieros y operativos globales.',
    module: 'Reportes'
  },
  {
    code: 'REPORTES_FINANCIEROS_VIEW',
    name: 'Ver Reportes Financieros',
    description: 'Permite acceder al módulo de reportes financieros.',
    module: 'Reportes'
  },
  
  // --- Módulo: Créditos Artículos ---
  {
    code: 'CREDITOS_ARTICULOS_VIEW',
    name: 'Ver Créditos de Artículos',
    description: 'Permite acceder al módulo de créditos de artículos.',
    module: 'CreditosArticulos'
  },
  {
    code: 'CREDITOS_ARTICULOS_CREAR',
    name: 'Crear Créditos de Artículos',
    description: 'Permite crear nuevos créditos de artículos.',
    module: 'CreditosArticulos'
  },

  // --- Módulo: Auditoría ---
  {
    code: 'AUDIT_VIEW',
    name: 'Ver Auditoría',
    description: 'Permite acceder al módulo de auditoría del sistema.',
    module: 'Auditoria'
  },

  // --- Módulo: Configuración/Usuarios ---
  {
    code: 'USUARIOS_VIEW',
    name: 'Ver Usuarios',
    description: 'Permite ver la lista de usuarios del sistema.',
    module: 'Configuracion'
  },
  {
    code: 'USUARIOS_MANAGE',
    name: 'Gestionar Usuarios',
    description: 'Permite crear, editar y gestionar permisos de usuarios.',
    module: 'Configuracion'
  }
];

export const getPermissionDescription = (code: string) => {
  return PERMISSION_DEFINITIONS.find(p => p.code === code)?.description || 'Permiso del sistema';
};
