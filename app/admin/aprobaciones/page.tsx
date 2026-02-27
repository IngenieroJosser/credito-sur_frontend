'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ChevronRight, Loader2 } from 'lucide-react'

/**
 * Página legacy de aprobaciones.
 * Redirige automáticamente al nuevo módulo de Revisiones (/admin/revisiones).
 */
export default function AprobacionesRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/admin/revisiones')
    }, 2000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative z-10 max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20" />
          <div className="relative flex items-center justify-center w-24 h-24 bg-blue-50 rounded-full border border-blue-100">
            <ShieldCheck className="w-12 h-12 text-[#08557f]" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Nuevo Centro de Revisiones
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed text-sm">
            Las aprobaciones ahora se gestionan desde el módulo de{' '}
            <span className="font-bold text-[#08557f]">Revisiones</span>, un centro dedicado donde
            puedes aprobar clientes, créditos, gastos y más en un solo lugar.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/admin/revisiones')}
            className="w-full py-4 bg-[#08557f] text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group"
          >
            Ir a Revisiones
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Loader2 className="w-3 h-3 animate-spin" />
            Redirigiendo automáticamente...
          </div>
        </div>
      </div>
    </div>
  )
}
