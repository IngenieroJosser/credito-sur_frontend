'use client'
import { logger } from '@/lib/logger'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { aprobacionesService, type Aprobacion } from '@/services/aprobaciones-service'

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
            monto: Number(s.montoSolicitud || (datos as any).monto || 0),
            descripcion:
              String((datos as any).descripcion || (datos as any).notas || s.comentarios || s.tipoAprobacion || 'Solicitud'),
            estado: s.estado as SolicitudDinero['estado'],
            comentarioAdmin: s.datosAprobados
              ? String((s.datosAprobados as any)?.comentarios || (s.datosAprobados as any)?.notas || '')
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
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estado</div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'TODAS' as const, label: 'Todas' },
                    { key: 'PENDIENTE' as const, label: 'Pendientes' },
                    { key: 'APROBADO' as const, label: 'Aprobadas' },
                    { key: 'RECHAZADO' as const, label: 'Rechazadas' },
                  ]
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setEstadoFiltro(item.key)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border',
                      estadoFiltro === item.key
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Monto</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Comentarios</th>
                  <th className="px-6 py-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingSolicitudes ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Cargando solicitudes...
                    </td>
                  </tr>
                ) : solicitudesFiltradas.map((sol) => (
                  <tr key={sol.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(sol.fecha).toLocaleDateString('es-CO', {
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
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalle"
                        onClick={() => {
                          // Placeholder: detalle modal más adelante
                          logger.log('Ver detalle solicitud:', sol.id)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
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

