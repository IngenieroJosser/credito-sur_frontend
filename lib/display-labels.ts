export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  ADMINISTRADOR: 'Administrador',
  SUPER_ADMINISTRADOR: 'Super Administrador',
  COORDINADOR: 'Coordinador',
  SUPERVISOR: 'Supervisor',
  COBRADOR: 'Cobrador',
  CONTADOR: 'Contable',
  PUNTO_DE_VENTA: 'Punto de Venta',
}

const ENUM_LABELS: Record<string, string> = {
  CIERRE_PENDIENTE: 'Cierre pendiente',
  PAGO_REGULARIZADO: 'Pago regularizado',
  JORNADA_PENDIENTE_CERRADA: 'Jornada pendiente cerrada',
  REGULARIZACION_LIMPIA: 'Regularización limpia',
  ADMINISTRATIVO_CON_OBSERVACION: 'Cierre administrativo con observación',
  SOLICITUD_DINERO: 'Solicitud de dinero',
  SOLICITUD_BASE_EFECTIVO: 'Solicitud de base de efectivo',
  NUEVO_CLIENTE: 'Nuevo cliente',
  NUEVO_PRESTAMO: 'Nuevo préstamo',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
}

export function formatRoleLabel(role?: string | null) {
  const key = String(role || '').trim().toUpperCase()
  if (!key) return 'Usuario'
  return ROLE_LABELS[key] || humanizeEnumLabel(key)
}

export function humanizeEnumLabel(value?: string | null) {
  const key = String(value || '').trim().toUpperCase()
  if (!key) return ''
  if (ENUM_LABELS[key]) return ENUM_LABELS[key]

  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
