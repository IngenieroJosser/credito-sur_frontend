'use client'

import React from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

type MoneyMeaning = 'signed' | 'expense'

type Props = {
  value: number | null | undefined
  className?: string
  badgeClassName?: string
  amountClassName?: string
  meaning?: MoneyMeaning
  showBadge?: boolean
}

export default function MoneyAmount({
  value,
  className,
  badgeClassName,
  amountClassName,
  meaning = 'signed',
  showBadge = true,
}: Props) {
  const n = Number(value || 0)
  const abs = Math.abs(n)

  // Determinar si representa un egreso/pérdida basado en el meaning original
  const isPerdida = meaning === 'expense' ? n > 0 : n < 0
  const isNeutro = n === 0

  // Estilos de color unificados (sin textos duros)
  const textColor = isNeutro ? 'text-slate-600' : isPerdida ? 'text-rose-600' : 'text-emerald-600'
  const bgBadge = isNeutro ? 'bg-slate-50 border-slate-200' : isPerdida ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 font-black transition-colors',
        textColor,
        showBadge ? `px-2.5 py-1 rounded-xl border ${bgBadge}` : '',
        className,
        badgeClassName
      )}
    >
      {!isNeutro ? (
        isPerdida ? <TrendingDown className="h-3.5 w-3.5 shrink-0 stroke-[3]" /> : <TrendingUp className="h-3.5 w-3.5 shrink-0 stroke-[3]" />
      ) : (
        <Minus className="h-3.5 w-3.5 shrink-0 stroke-[3]" />
      )}
      
      <span className={cn('tabular-nums tracking-tight', amountClassName)}>
        {!isNeutro && (isPerdida ? '- ' : '+ ')}{formatCurrency(abs)}
      </span>
    </span>
  )
}
