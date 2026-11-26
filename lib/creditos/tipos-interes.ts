import { TipoAmortizacion } from '@/types/enums'

export const OPCIONES_TIPO_INTERES = [
  { value: TipoAmortizacion.INTERES_SIMPLE, label: 'Interés Simple' },
  { value: TipoAmortizacion.INTERES_PLANO, label: 'Amortización' },
] as const

export function tipoInteresRegistrado(valor: unknown): TipoAmortizacion | '' {
  const tipo = typeof valor === 'string' ? valor.trim().toUpperCase() : ''
  if (tipo === TipoAmortizacion.FRANCESA) return TipoAmortizacion.FRANCESA
  return OPCIONES_TIPO_INTERES.find((opcion) => opcion.value === tipo)?.value ?? ''
}

export function etiquetaTipoInteres(valor: unknown): string {
  const tipo = tipoInteresRegistrado(valor)
  if (tipo === TipoAmortizacion.FRANCESA) return 'Francesa (histórica)'
  return OPCIONES_TIPO_INTERES.find((opcion) => opcion.value === tipo)?.label ?? 'No informado'
}
