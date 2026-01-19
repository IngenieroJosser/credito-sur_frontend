'use client'

import { useState } from 'react'
import {
  MapPin,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight
} from 'lucide-react'

type EstadoVisita = 'pendiente' | 'pagado' | 'en_mora'

interface VisitaRuta {
  id: string
  cliente: string
  direccion: string
  horaSugerida: string
  montoCuota: number
  estado: EstadoVisita
}

const VistaCobradorPage = () => {
  const [visitaSeleccionada, setVisitaSeleccionada] =
    useState<string | null>(null)

  const visitas: VisitaRuta[] = [
    {
      id: 'V-001',
      cliente: 'Carlos Rodríguez',
      direccion: 'Av. Principal #123, Caracas',
      horaSugerida: '09:30',
      montoCuota: 125.5,
      estado: 'pendiente'
    },
    {
      id: 'V-002',
      cliente: 'Ana Martínez',
      direccion: 'Calle 45, Urbanización Norte',
      horaSugerida: '10:15',
      montoCuota: 80,
      estado: 'en_mora'
    },
    {
      id: 'V-003',
      cliente: 'Luis Fernández',
      direccion: 'Conjunto Residencial Vista Azul',
      horaSugerida: '11:00',
      montoCuota: 95.75,
      estado: 'pagado'
    }
  ]

  const getEstadoClasses = (estado: EstadoVisita) => {
    if (estado === 'pendiente') return 'bg-amber-50 text-amber-700 border-amber-100'
    if (estado === 'pagado') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    return 'bg-red-50 text-red-600 border-red-100'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50 px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
            <Wallet className="h-3 w-3" />
            <span>Ruta del día</span>
          </div>
          <div>
            <h1 className="text-2xl font-light text-gray-900 tracking-tight">
              Agenda del cobrador
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Optimizada para uso en campo, con foco en rapidez y legibilidad.
            </p>
          </div>
        </header>

        <section className="space-y-3">
          {visitas.map((visita) => {
            const seleccionada = visitaSeleccionada === visita.id

            return (
              <button
                key={visita.id}
                type="button"
                onClick={() =>
                  setVisitaSeleccionada(seleccionada ? null : visita.id)
                }
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                  seleccionada
                    ? 'border-[#08557f] bg-[#08557f]/5'
                    : 'border-gray-100 bg-white/90 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#08557f]/10">
                    <MapPin className="h-4 w-4 text-[#08557f]" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-gray-900">
                          {visita.cliente}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {visita.direccion}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-semibold text-gray-900">
                          ${visita.montoCuota.toFixed(2)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>{visita.horaSugerida}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium ${getEstadoClasses(
                          visita.estado
                        )}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        <span className="capitalize">
                          {visita.estado === 'pendiente' && 'Pendiente'}
                          {visita.estado === 'pagado' && 'Pagado'}
                          {visita.estado === 'en_mora' && 'En mora'}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>

                    {seleccionada && (
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Desliza para registrar pago o nota rápida.</span>
                        </div>
                        <AlertCircle className="h-3.5 w-3.5 text-[#fb851b]" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </section>

        <footer className="mt-4 flex items-center justify-between rounded-full bg-gray-900 px-4 py-2 text-[11px] text-gray-200">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Modo ruta activo • 3 visitas restantes</span>
          </div>
          <span className="text-gray-400">Offline listo</span>
        </footer>
      </div>
    </div>
  )
}

export default VistaCobradorPage

