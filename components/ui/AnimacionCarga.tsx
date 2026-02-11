'use client'

import React from 'react'

interface Props {
  texto?: string
}

export default function AnimacionCarga({ texto = 'Cargando...' }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-bold">{texto}</p>
      </div>
    </div>
  )
}
