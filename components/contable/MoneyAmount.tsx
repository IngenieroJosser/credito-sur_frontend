'use client'

import React from 'react'
import { cn, formatCurrency } from '@/lib/utils'

type MoneyMeaning = 'signed' | 'expense'

type Props = {
  value: number | null | undefined
  className?: string
  badgeClassName?: string
  amountClassName?: string
  meaning?: MoneyMeaning
  showBadge?: boolean
  badgeLabels?: {
    ganancia?: string
    perdida?: string
  }
}

export default function MoneyAmount({
  value,
  className,
  badgeClassName,
  amountClassName,
  meaning = 'signed',
  showBadge = true,
  badgeLabels,
}: Props) {
  const n = Number(value || 0)
  const abs = Math.abs(n)

  const isPerdida = meaning === 'expense' ? n > 0 : n < 0

  const perdidaLabel = badgeLabels?.perdida ?? 'PÉRDIDA'
  const gananciaLabel = badgeLabels?.ganancia ?? 'GANANCIA'

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('tabular-nums', amountClassName)}>{formatCurrency(abs)}</span>
      {showBadge && (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-[9px] font-black uppercase border',
            isPerdida
              ? 'bg-red-50 text-red-700 border-red-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100',
            badgeClassName,
          )}
        >
          {isPerdida ? perdidaLabel : gananciaLabel}
        </span>
      )}
    </span>
  )
}
