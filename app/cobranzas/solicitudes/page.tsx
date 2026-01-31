'use client'

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
import { obtenerPerfil } from '@/services/autenticacion-service'

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
  const [perfilId, setPerfilId] = useState<string>('')
  const [loadingPerfil, setLoadingPerfil] = useState(true)

  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const perfil = await obtenerPerfil()
        if (!mounted) return
        if (perfil?.rol === 'COBRADOR' && perfil?.id) {
          setPerfilId(String(perfil.id))
        } else if (perfil?.id) {
          setPerfilId(String(perfil.id))
        }
      } catch {
        // fallback: dejar vacío, igual se muestran mocks filtrados por un id default
      } finally {
        if (mounted) setLoadingPerfil(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  // Mock (mismo look & feel de admin/solicitudes, pero filtrable por solicitanteId)
  const solicitudesBase: SolicitudDinero[] = useMemo(
    () => [
      {
        id: 'SOL-001',
        fecha: '2026-01-21T08:00:00',
        monto: 2000000,
        descripcion: 'Base para ruta centro, se espera alta demanda de préstamos hoy.',
        estado: 'PENDIENTE',
        solicitanteId: 'CB-001',
        solicitanteNombre: 'Carlos Pérez',
      },
      {
        id: 'SOL-002',
        fecha: '2026-01-20T08:15:00',
        monto: 1500000,
        descripcion: 'Dinero para nuevos clientes referidos en sector norte.',
        estado: 'APROBADO',
        comentarioAdmin: 'Aprobado, pasar por tesorería.',
        solicitanteId: 'CB-001',
        solicitanteNombre: 'Carlos Pérez',
      },
      {
        id: 'SOL-003',
        fecha: '2026-01-19T09:30:00',
        monto: 5000000,
        descripcion: 'Solicitud extraordinaria para cliente VIP.',
        estado: 'RECHAZADO',
        comentarioAdmin: 'Monto excede el límite diario permitido sin autorización previa.',
        solicitanteId: 'CB-002',
        solicitanteNombre: 'María Rodríguez',
      },
    ],
    []
  )

  const solicitanteIdFiltrado = perfilId || 'CB-001'

  const solicitudesFiltradas = useMemo(() => {
    const normalized = busqueda.trim().toLowerCase()

    return solicitudesBase
      .filter((s) => s.solicitanteId === solicitanteIdFiltrado)
      .filter((s) => (estadoFiltro === 'TODAS' ? true : s.estado === estadoFiltro))
      .filter((s) => {
        if (!normalized) return true
        return (
          s.descripcion.toLowerCase().includes(normalized) ||
          s.id.toLowerCase().includes(normalized)
        )
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [busqueda, estadoFiltro, solicitudesBase, solicitanteIdFiltrado])

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
              {loadingPerfil ? 'Cargando perfil...' : 'Consulta el estado de tus solicitudes de base.'}
            </p>
          </div>
        </header>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por ID o descripción..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900/20 text-sm font-medium text-slate-900"
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
                {solicitudesFiltradas.map((sol) => (
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
                          console.log('Ver detalle solicitud:', sol.id)
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

          {solicitudesFiltradas.length === 0 && (
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
