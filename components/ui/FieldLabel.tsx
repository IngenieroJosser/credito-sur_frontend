import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldLabelProps {
  children: ReactNode
  required?: boolean
  className?: string
  requiredClassName?: string
}

export default function FieldLabel({
  children,
  required = false,
  className,
  requiredClassName,
}: FieldLabelProps) {
  return (
    <label className={cn('block text-sm font-bold text-slate-700 mb-2', className)}>
      {children}
      {required && (
        <span className={cn('ml-1 text-red-500', requiredClassName)} aria-label="obligatorio">
          *
        </span>
      )}
    </label>
  )
}
