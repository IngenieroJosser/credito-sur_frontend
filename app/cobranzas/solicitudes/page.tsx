'use client'
import { formatFechaBogota } from '@/lib/format-date'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { aprobacionesService, type Aprobacion } from '@/services/aprobaciones-service'

import { SkeletonTabla } from '@/components/ui/Skeleton'
import GrupoDeFiltros from '@/components/filtros/GrupoDeFiltros'
import Cifra from '@/components/ui/Cifra'
interface SolicitudDinero {
  id: string
  fecha: string
  monto: number
  descripcion: string
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  comentarioAdmin?: string
  solicitanteId: string
  solicitanteNombre: string
}

type EstadoFiltro = 'TODAS' | SolicitudDinero['estado']

export default function SolicitudesCobradorPage() {
  const router = useRouter()
  
  const [solicitudesBase, setSolicitudesBase] = useState<SolicitudDinero[]>([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true)

  // --- FILTROS DE VISTA ---
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [showFilters, setShowFilters] = useState(false) // Colapsar/Expandir barra de filtros

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const solicitudes = await aprobacionesService.obtenerMisSolicitudes()
        if (!mounted) return
        setSolicitudesBase(solicitudes.map((s: Aprobacion) => {
          const datos = typeof s.datosSolicitud === 'object' && s.datosSolicitud ? s.datosSolicitud : {}
          const solicitanteNombre = s.solicitadoPor
            ? `${s.solicitadoPor.nombres} ${s.solicitadoPor.apellidos}`.trim()
            : s.solicitante || 'Usuario'

          return {
            id: s.id,
            fecha: s.creadoEn,
            monto: Number(s.montoSolicitud || (datos).monto || 0),
            descripcion:
              String((datos).descripcion || (datos).notas || s.comentarios || s.tipoAprobacion || 'Solicitud'),
            estado: s.estado as SolicitudDinero['estado'],
            comentarioAdmin: s.datosAprobados
              ? String((s.datosAprobados)?.comentarios || (s.datosAprobados)?.notas || '')
              : s.comentarios || undefined,
            solicitanteId: s.solicitadoPorId,
            solicitanteNombre,
          }
        }))
      } catch {
        setSolicitudesBase([])
      } finally {
        if (mounted) setLoadingSolicitudes(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  // --- LÓGICA DE FILTRADO ---
  const solicitudesFiltradas = useMemo(() => {
    const normalized = busqueda.trim().toLowerCase()

    return solicitudesBase
      .filter((s) => (estadoFiltro === 'TODAS' ? true : s.estado === estadoFiltro))
      .filter((s) => {
        if (!normalized) return true
        // Búsqueda inteligente por ID o contenido
        return (
          s.descripcion.toLowerCase().includes(normalized) ||
          s.id.toLowerCase().includes(normalized)
        )
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) // Más recientes primero
  }, [busqueda, estadoFiltro, solicitudesBase])

  const getEstadoColor = (estado: SolicitudDinero['estado']) => {
    switch (estado) {
      case 'APROBADO':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100'
      case 'RECHAZADO':
        return 'bg-rose-50 text-rose-600 border-rose-100'
      default:
        return 'bg-amber-50 text-amber-600 border-amber-100'
    }
  }

  const getEstadoIcon = (estado: SolicitudDinero['estado']) => {
    switch (estado) {
      case 'APROBADO':
        return <CheckCircle2 className="h-4 w-4" />
      case 'RECHAZADO':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Mientras llegan los datos, la pantalla ya tiene la forma que va a tener:
  // sin esto se quedaba en blanco y al cargar pegaba un salto.
  if (loadingSolicitudes) {
    return (
      <div className="p-4 sm:p-6">
        <SkeletonTabla />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => router.push('/cobranzas')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Solicitudes</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="text-blue-600">Mis </span>
              <span className="text-orange-500">Solicitudes</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {loadingSolicitudes ? 'Cargando solicitudes...' : 'Consulta el estado de tus solicitudes de base.'}
            </p>
          </div>
        </header>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="w-full md:max-w-md buscador-3d">
              <Search className="icon h-4 w-4" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por ID o descripción..."
                className="buscador-3d-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors',
                  showFilters
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <GrupoDeFiltros
                sinMarco
                nombre="Estado"
                valor={estadoFiltro}
                onChange={(v) => setEstadoFiltro(v as typeof estadoFiltro)}
                opciones={[
                  { id: 'TODAS', label: 'Todas' },
                  { id: 'PENDIENTE', label: 'Pendientes' },
                  { id: 'APROBADO', label: 'Aprobadas' },
                  { id: 'RECHAZADO', label: 'Rechazadas' },
                ]}
              />
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/*
            * El cobrador mira esto en el telefono, y la tabla tiene seis
            * columnas: en 390 px hay que arrastrarla en horizontal para
            * ver el monto y el estado, que es lo unico que se viene a
            * consultar. Con el dedo va en tarjetas; de tableta hacia
            * arriba sigue la tabla.
            */}
          <div className="divide-y divide-slate-100 md:hidden">
            {loadingSolicitudes ? (
              <p className="px-5 py-12 text-center font-medium text-slate-400">
                Cargando solicitudes...
              </p>
            ) : (
              solicitudesFiltradas.map((sol) => (
                <div key={sol.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {formatFechaBogota(sol.fecha, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">
                        {sol.descripcion}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
                        getEstadoColor(sol.estado),
                      )}
                    >
                      {getEstadoIcon(sol.estado)}
                      {sol.estado}
                    </span>
                  </div>

                  <Cifra
                    valor={sol.monto}
                    tamano="normal"
                    classNameCaja="mt-2"
                    className="font-bold text-slate-900"
                  />

                  {sol.comentarioAdmin ? (
                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs italic text-slate-500">
                      {sol.comentarioAdmin}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Monto</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Comentarios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingSolicitudes ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Cargando solicitudes...
                    </td>
                  </tr>
                ) : solicitudesFiltradas.map((sol) => (
                  <tr key={sol.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatFechaBogota(sol.fecha, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{sol.descripcion}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(sol.monto)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
                          getEstadoColor(sol.estado)
                        )}
                      >
                        {getEstadoIcon(sol.estado)}
                        {sol.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 italic text-xs">{sol.comentarioAdmin || '-'}</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loadingSolicitudes && solicitudesFiltradas.length === 0 && (
            <div className="text-center py-12 border-t border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-bold mb-1">Sin resultados</h3>
              <p className="text-slate-500 text-sm">No hay solicitudes para los filtros actuales.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

