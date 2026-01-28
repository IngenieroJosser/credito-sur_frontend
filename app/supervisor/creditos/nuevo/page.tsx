'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CreditCard, ShoppingBag } from 'lucide-react'

import CreacionPrestamoElegante from '@/components/prestamos/CreacionPrestamo'
import NuevoCreditoArticuloPage from '@/app/admin/creditos-articulos/nuevo/page'

export default function NuevoCreditoSupervisorUnificadoPage() {
  const searchParams = useSearchParams()

  const tipo = (searchParams?.get('tipo') ?? 'efectivo').toLowerCase()

  const isEfectivo = useMemo(() => tipo !== 'articulos', [tipo])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 md:px-8 pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Nuevo</span> <span className="text-orange-500">Crédito</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Elige el tipo de crédito y completa la solicitud.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <Link
              href="/supervisor/creditos/nuevo?tipo=efectivo"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isEfectivo
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Efectivo
            </Link>
            <Link
              href="/supervisor/creditos/nuevo?tipo=articulos"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                !isEfectivo
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Artículos
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {isEfectivo ? <CreacionPrestamoElegante /> : <NuevoCreditoArticuloPage />}
      </div>
    </div>
  )
}
