import { Banknote, CircleHelp, Package } from 'lucide-react'
import {
  normalizarTipoCredito,
  resolverTipoCreditoDeEntidad,
  type FuenteTipoCredito,
} from '@/lib/creditos/tipo-credito'

interface TipoCreditoIndicadorProps {
  tipo?: string | null
  credito?: FuenteTipoCredito | null
  mostrarTexto?: boolean
  modo?: 'texto' | 'icono' | 'compacto'
  className?: string
}

export default function TipoCreditoIndicador({
  tipo,
  credito,
  mostrarTexto = true,
  modo = 'texto',
  className = '',
}: TipoCreditoIndicadorProps) {
  const tipoNormalizado = normalizarTipoCredito(tipo) ?? resolverTipoCreditoDeEntidad(credito)
  const esArticulo = tipoNormalizado === 'ARTICULO'
  const esEfectivo = tipoNormalizado === 'EFECTIVO'
  const Icon = esArticulo ? Package : esEfectivo ? Banknote : CircleHelp
  const label = esArticulo
    ? 'Crédito de artículo'
    : esEfectivo
      ? 'Préstamo en efectivo'
      : 'Tipo de crédito no informado'

  const clasesModo =
    modo === 'icono'
      ? `h-5 w-5 justify-center rounded-md ring-1 ring-inset ${
          esArticulo
            ? 'bg-orange-50 ring-orange-200'
            : esEfectivo
              ? 'bg-emerald-50 ring-emerald-200'
              : 'bg-slate-50 ring-slate-200'
        }`
      : modo === 'compacto'
        ? 'text-[9px] uppercase'
        : ''

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-bold ${
        esArticulo ? 'text-orange-700' : esEfectivo ? 'text-emerald-700' : 'text-slate-500'
      } ${clasesModo} ${className}`}
      title={label}
    >
      <Icon className={modo === 'compacto' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} aria-hidden="true" />
      {mostrarTexto ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  )
}
