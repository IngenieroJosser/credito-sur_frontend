export type MovimientoClasificable = {
  tipo?: string
  tipoReferencia?: string
  monto?: number
  concepto?: string | null
  accountCode?: string | null
  accountName?: string | null
  categoria?: string | null
  direction?: 'IN' | 'OUT' | null
  impactoCaja?: number | null
}

const REFERENCIAS_NO_INGRESO = new Set([
  'CUOTA_INICIAL',
  'RESTAURACION_CUOTA_INICIAL',
  'REVERSO_CUOTA_INICIAL',
  'VENTA_ARTICULO',
  'AJUSTE',
  'REVERSO_CUOTA_INICIAL',
  'ABONO_DEUDA',
  'PRESTAMO',
  'DESEMBOLSO',
  'SOLICITUD_BASE',
  'SOLICITUD_BASE_EFECTIVO',
  'APERTURA_CAJA',
  'TRANSFERENCIA_INTERNA',
  'CIERRE_RUTA',
  'ACTIVACION_RUTA',
])

const REFERENCIAS_NO_EGRESO = new Set([
  'AJUSTE',
  'VENTA_ARTICULO',
  'DEUDA_COBRADOR',
  'PRESTAMO',
  'DESEMBOLSO',
  'SOLICITUD_BASE',
  'SOLICITUD_BASE_EFECTIVO',
  'APERTURA_CAJA',
  'TRANSFERENCIA_INTERNA',
  'CIERRE_RUTA',
  'ACTIVACION_RUTA',
])

const normalize = (value?: string | null) => String(value || '').toUpperCase()

const mencionaArticulo = (m: MovimientoClasificable) => {
  const text = `${m.accountName || ''} ${m.categoria || ''}`.toUpperCase()
  return text.includes('ARTICULO') || text.includes('ARTÍCULO')
}

export const esCuotaInicialContable = (m: MovimientoClasificable) => {
  const tipo = normalize(m.tipo)
  const referencia = normalize(m.tipoReferencia)
  return (
    (tipo === 'INGRESO' && (referencia === 'CUOTA_INICIAL' || referencia === 'RESTAURACION_CUOTA_INICIAL')) ||
    (tipo === 'EGRESO' && referencia === 'REVERSO_CUOTA_INICIAL')
  )
}

// Ingreso operativo: incrementa resultado del negocio. No es simplemente una entrada de caja.
export const esIngresoOperativoContable = (m: MovimientoClasificable) => {
  if (normalize(m.tipo) !== 'INGRESO') return false
  if (Number(m.monto || 0) <= 0) return false

  const accountCode = String(m.accountCode || '')
  if (accountCode.startsWith('3.4')) return false
  if (mencionaArticulo(m)) return false

  return !REFERENCIAS_NO_INGRESO.has(normalize(m.tipoReferencia))
}

// Ingreso contable general del panel: cuentas de resultado 3.x,
// separando cuotas iniciales/artículos porque tienen su propia tarjeta.
// No incluye entradas de caja/base 1.x aunque el movimiento tenga tipo INGRESO.
export const esIngresoContableGeneral = (m: MovimientoClasificable) => {
  if (normalize(m.tipo) !== 'INGRESO') return false
  if (Number(m.monto || 0) <= 0) return false

  const accountCode = String(m.accountCode || '')
  if (accountCode.startsWith('3.4')) return false
  if (mencionaArticulo(m)) return false
  if (esCuotaInicialContable(m)) return false

  return accountCode.startsWith('3.')
}

// Egreso operativo: gasto real del negocio. No es desembolso de cartera, reverso ni traslado interno.
export const esEgresoOperativoContable = (m: MovimientoClasificable) => {
  if (normalize(m.tipo) !== 'EGRESO') return false
  if (Number(m.monto || 0) <= 0) return false

  const accountCode = String(m.accountCode || '')
  if (accountCode && !accountCode.startsWith('4.')) return false
  if (mencionaArticulo(m)) return false

  return !REFERENCIAS_NO_EGRESO.has(normalize(m.tipoReferencia))
}

export const getEntradaCajaFisica = (m: MovimientoClasificable & { impactoCaja?: number | null }) => {
  const impacto = Number(m.impactoCaja || 0)
  return impacto > 0 ? impacto : 0
}

export const getSalidaCajaFisica = (m: MovimientoClasificable & { impactoCaja?: number | null }) => {
  const impacto = Number(m.impactoCaja || 0)
  return impacto < 0 ? Math.abs(impacto) : 0
}

export type EtiquetaMovimientoContable = {
  label: string
  positivo: boolean
  className: string
}

export const getEtiquetaMovimientoContable = (m: MovimientoClasificable): EtiquetaMovimientoContable => {
  const tipo = normalize(m.tipo)
  const ref = normalize(m.tipoReferencia)
  const accountCode = String(m.accountCode || '')
  const concepto = normalize(m.concepto)
  const referenciaId = normalize((m as any).referenciaId)
  const esReversa =
    (ref === 'AJUSTE' && referenciaId.startsWith('REVERSA:')) ||
    concepto.startsWith('REVERSA DE ASIENTO') ||
    concepto.startsWith('REVERSA DE DESEMBOLSO') ||
    concepto.includes('REVERSA DE ASIENTO') ||
    concepto.includes('REVERSO DE ASIENTO')

  const esReapertura = ref === 'AJUSTE' && referenciaId.startsWith('REAPERTURA:')

  // Detectar reversa de reapertura (cuando el concepto menciona reapertura o el referenciaId tiene patrón específico)
  const esReversaReapertura =
    esReversa &&
    (concepto.includes('REAPERTURA') || referenciaId.includes('REAPERTURA'))

  if (esIngresoOperativoContable(m)) {
    return { label: 'INGRESO', positivo: true, className: 'bg-emerald-100 text-emerald-700' }
  }
  if (esEgresoOperativoContable(m)) {
    return { label: 'GASTO', positivo: false, className: 'bg-rose-100 text-rose-700' }
  }
  if (ref === 'REVERSO_CUOTA_INICIAL') {
    return { label: 'REVERSO CUOTA', positivo: false, className: 'bg-slate-100 text-slate-700' }
  }
  if (esCuotaInicialContable(m) || (ref === 'VENTA_ARTICULO' && Number(m.monto || 0) > 0)) {
    return { label: 'CUOTA INICIAL', positivo: true, className: 'bg-amber-100 text-amber-700' }
  }
  if (esReapertura) {
    const impactoCaja = Number(m.impactoCaja || 0)
    const positivo = impactoCaja !== 0 ? impactoCaja > 0 : Number(m.monto || 0) >= 0
    return { label: 'REAPERTURA', positivo, className: 'bg-slate-100 text-slate-700' }
  }
  if (esReversaReapertura) {
    const impactoCaja = Number(m.impactoCaja || 0)
    const positivo = impactoCaja !== 0 ? impactoCaja > 0 : Number(m.monto || 0) >= 0
    return { label: 'REVERSA REAPERTURA', positivo, className: 'bg-slate-100 text-slate-700' }
  }
  if (esReversa) {
    const impactoCaja = Number(m.impactoCaja || 0)
    const positivo = impactoCaja !== 0 ? impactoCaja > 0 : Number(m.monto || 0) >= 0
    return { label: 'REVERSA', positivo, className: 'bg-slate-100 text-slate-700' }
  }
  if (ref === 'DESEMBOLSO' || ref === 'PRESTAMO' || concepto.includes('DESEMBOLSO')) {
    return { label: 'DESEMBOLSO', positivo: false, className: 'bg-blue-100 text-blue-700' }
  }
  if (ref === 'AJUSTE' || concepto.includes('REVERSO')) {
    const impactoCaja = Number(m.impactoCaja || 0)
    const positivo = impactoCaja !== 0
      ? impactoCaja > 0
      : Number(m.monto || 0) >= 0 && !accountCode.startsWith('3.4')
    return { label: 'AJUSTE', positivo, className: 'bg-slate-100 text-slate-700' }
  }
  if (tipo === 'TRANSFERENCIA' || ref === 'TRANSFERENCIA_INTERNA' || ref === 'CONSOLIDACION') {
    const positivo = m.direction === 'IN'
    return {
      label: positivo ? 'RECEPCIÓN' : 'ENVÍO',
      positivo,
      className: positivo ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700',
    }
  }
  if (mencionaArticulo(m)) {
    return { label: 'ARTÍCULO', positivo: Number(m.monto || 0) >= 0, className: 'bg-amber-100 text-amber-700' }
  }

  const positivo = tipo === 'INGRESO' || m.direction === 'IN'
  return {
    label: tipo || 'MOVIMIENTO',
    positivo,
    className: positivo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
  }
}
