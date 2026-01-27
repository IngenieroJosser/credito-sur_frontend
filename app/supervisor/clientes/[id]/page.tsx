'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  BarChart3,
  Smartphone,
  DollarSign,
  Loader2,
  Plus,
  X,
  CreditCard,
  ShoppingBag,
  UserPlus,
} from 'lucide-react'
import ClienteDetalleElegante, { Cliente, Prestamo, Pago, Comentario } from '@/components/cliente/DetalleCliente'
import Link from 'next/link'
import { MOCK_CLIENTES } from '@/services/clientes-service'

export default function ClienteDetalleSupervisorPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id
  const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

  const [isFabOpen, setIsFabOpen] = useState(false)
  const [isCreditoTipoOpen, setIsCreditoTipoOpen] = useState(false)

  const clienteEncontrado = MOCK_CLIENTES.find((c) => c.id === id) || MOCK_CLIENTES[0]

  const clienteData = {
    ...clienteEncontrado,
    prestamos: [],
    pagos: [],
  }

  const isLoading = false
  const error = null

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Cargando información del cliente...</p>
        </div>
      </div>
    )
  }

  if (error || !clienteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error al cargar</h2>
          <p className="text-slate-500 mb-6">No se pudo obtener la información del cliente. Verifique su conexión o intente nuevamente.</p>
          <Link
            href="/supervisor/clientes"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al listado</span>
          </Link>
        </div>
      </div>
    )
  }

  const cliente: Cliente = {
    ...clienteData,
    fechaRegistro: clienteData.fechaRegistro || 'No disponible',
    avatarColor: 'bg-blue-600',
  }

  const prestamos: Prestamo[] = (clienteData.prestamos || []).map((p: unknown) => {
    return {
      ...(p as Partial<Prestamo>),
      icono: <Smartphone className="w-5 h-5" />,
      categoria: 'General',
    } as Prestamo
  })

  const pagos: Pago[] = (clienteData.pagos || []).map((p: unknown) => {
    return {
      ...(p as Partial<Pago>),
      icono: <DollarSign className="w-5 h-5" />,
      estado: 'confirmado',
    } as Pago
  })

  const comentarios: Comentario[] = []

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/supervisor/clientes"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    <span className="text-blue-600">Gestión de </span>
                    <span className="text-orange-500">Clientes</span>
                  </h1>
                  <p className="text-sm font-medium">
                    <span className="text-blue-600">Detalle y análisis </span>
                    <span className="text-orange-500">de cartera</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <ClienteDetalleElegante
          cliente={cliente}
          prestamos={prestamos}
          pagos={pagos}
          comentarios={comentarios}
          rolUsuario="supervisor"
        />
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsFabOpen(true)}
          className="h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center hover:bg-blue-700 active:scale-95 transition"
          aria-label="Acciones rápidas"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {isFabOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setIsFabOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase">Modo campo</div>
                <div className="text-lg font-bold text-slate-900">Acciones rápidas</div>
              </div>
              <button
                type="button"
                onClick={() => setIsFabOpen(false)}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsFabOpen(false)
                  router.push(`/supervisor/pagos/registrar/${id}`)
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900">Registrar pago</div>
                    <div className="text-xs font-medium text-slate-500">Para este cliente</div>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 text-slate-300 rotate-180" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCreditoTipoOpen(true)
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900">Crear crédito</div>
                    <div className="text-xs font-medium text-slate-500">Efectivo o artículos</div>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 text-slate-300 rotate-180" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFabOpen(false)
                  router.push('/supervisor/clientes/nuevo')
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-700 border border-orange-100 flex items-center justify-center">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900">Nuevo cliente</div>
                    <div className="text-xs font-medium text-slate-500">Registro rápido</div>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 text-slate-300 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isFabOpen && isCreditoTipoOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsCreditoTipoOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase">Crear crédito</div>
                <div className="text-lg font-bold text-slate-900">Elige el tipo</div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreditoTipoOpen(false)}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreditoTipoOpen(false)
                  setIsFabOpen(false)
                  router.push('/supervisor/creditos/nuevo?tipo=efectivo')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-900">Crédito en efectivo</div>
                  <div className="text-xs font-medium text-slate-500">Préstamo de dinero</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCreditoTipoOpen(false)
                  setIsFabOpen(false)
                  router.push('/supervisor/creditos/nuevo?tipo=articulos')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <div className="h-10 w-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-900">Crédito de artículos</div>
                  <div className="text-xs font-medium text-slate-500">Electro/mercancía</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
