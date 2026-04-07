'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'

import SundayNoticeBanner from '@/components/rutas/SundayNoticeBanner'

type Props = {
  backHref?: string
  backContent?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  badge?: ReactNode
  showSundayNotice?: boolean
}

export default function RutaHeader({
  backHref,
  backContent,
  title,
  subtitle,
  badge,
  showSundayNotice = true,
}: Props) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {backHref && backContent ? (
            <Link href={backHref} className="shrink-0">
              {backContent}
            </Link>
          ) : null}

          <div>
            <div className="flex items-center gap-3">
              {title}
              {badge}
            </div>
            {subtitle ? <div className="text-slate-500 font-medium text-sm">{subtitle}</div> : null}
          </div>
        </div>
      </div>

      <SundayNoticeBanner enabled={showSundayNotice} />
    </header>
  )
}
