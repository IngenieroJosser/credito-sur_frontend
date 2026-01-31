'use client'

import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export const MODAL_Z_INDEX = 2147483647

export default function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
