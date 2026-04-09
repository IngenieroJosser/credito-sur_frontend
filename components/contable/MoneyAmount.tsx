'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
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

  const amountBoxRef = useRef<HTMLSpanElement | null>(null)
  const amountTextRef = useRef<HTMLSpanElement | null>(null)
  const [textScale, setTextScale] = useState(1)

  // Determinar si representa un egreso/pérdida basado en el meaning original
  const isPerdida = meaning === 'expense' ? n > 0 : n < 0
  const isNeutro = n === 0

  // Estilos de color unificados (sin textos duros)
  const textColor = isNeutro ? 'text-slate-600' : isPerdida ? 'text-rose-600' : 'text-emerald-600'
  const bgBadge = isNeutro ? 'bg-slate-50 border-slate-200' : isPerdida ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'

  useLayoutEffect(() => {
    const box = amountBoxRef.current
    const txt = amountTextRef.current
    if (!box || !txt) return

    const measure = () => {
      const available = box.clientWidth
      const needed = txt.scrollWidth
      if (!available || !needed) return
      if (needed <= available) {
        if (textScale !== 1) setTextScale(1)
        return
      }
      const next = Math.max(0.82, Math.min(1, available / needed))
      if (Math.abs(next - textScale) > 0.01) setTextScale(next)
    }

    measure()

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure)
    })
    ro.observe(box)

    return () => {
      ro.disconnect()
    }
  }, [abs, textScale])

  return (
    <span
      className={cn(
        'flex items-center gap-1.5 font-black transition-colors min-w-0 max-w-full',
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
      
      <span ref={amountBoxRef} className={cn('min-w-0 max-w-full flex-1', amountClassName)}>
        <span
          ref={amountTextRef}
          className="tabular-nums tracking-tight whitespace-nowrap inline-block will-change-transform"
          style={{ transform: `scale(${textScale})`, transformOrigin: 'left center' }}
        >
          {!isNeutro && (isPerdida ? '- ' : '+ ')}{formatCurrency(abs)}
        </span>
      </span>
    </span>
  )
}
