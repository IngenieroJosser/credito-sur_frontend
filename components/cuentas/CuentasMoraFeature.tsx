'use client'
import { logger } from '@/lib/logger'

/**
 * ============================================================================
 * CUENTAS EN MORA — Componente compartido (Admin, Coordinador, Supervisor, Contador)
 * ============================================================================
 *
 * Fuente única de verdad para la vista de cuentas en mora.
 * Todos los roles ven exactamente el mismo UI. El acceso (exportar, ver perfil)
 * se controla internamente según el rol del usuario autenticado.
 *
 * Uso:
 *   import CuentasMoraFeature from '@/components/cuentas/CuentasMoraFeature'
 *   <CuentasMoraFeature />
 */

import { useState, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { usePageFocusRefresh } from '@/hooks/usePageFocusRefresh'
import {
  AlertCircle, Search, User,
  CheckCircle, AlertTriangle, LayoutGrid, List, RefreshCw,
  Clock, Timer, DollarSign, CircleDot, Flame, Zap, ShieldAlert
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import ClientePortalModal from '@/components/cliente/ClientePortalModal'
import { usePermission } from '@/hooks/usePermission'
import { apiRequest } from '@/lib/api/api'
import { formatErrorForComponent } from '@/lib/api/api'
import { exportService } from '@/services/export-service'
import { toast } from 'sonner'
import { resolveRiesgoObligacion } from '@/lib/rutas/riesgo-obligacion'

type NivelRiesgo = 'VERDE' | 'LEVE' | 'PRECAUCION' | 'ROJO' | 'LISTA_NEGRA'
type EstadoPrestamo = 'EN_MORA' | 'INCUMPLIDO' | 'PERDIDA'
type ViewMode = 'list' | 'grid'

interface CuentaMora {
  id: string
  numeroPrestamo: string
  clienteId?: string
  cliente: {
    id?: string
    nombre: string
    documento: string
    telefono: string
    direccion: string
  }
  diasMora: number
  montoMora: number
  montoTotalDeuda: number
  montoOriginal: number
  cuotasVencidas: number
  ruta: string
  cobrador: string
  nivelRiesgo: NivelRiesgo
  estado: EstadoPrestamo
  ultimoPago?: string
  fechaVencimiento?: string
  etiquetaMora?: string
  fechaProrroga?: string
  diasProrroga?: number
  tieneProrroga?: boolean
}

interface EstadisticasMora {
  totalMora: number
  totalDeudaRiesgo: number
  totalClientesAfectados: number
  clientesCriticos: number
  variacionMensual: number
}

export type NivelMoraKey = 'VERDE' | 'LEVE' | 'PRECAUCION' | 'ROJO' | 'LISTA_NEGRA'

const NIVEL_LABEL: Record<NivelMoraKey, string> = {
  VERDE:      'Mínimo',
  LEVE:       'Leve',
  PRECAUCION: 'Precaución',
  ROJO:       'Moderado',
  LISTA_NEGRA: 'Crítico',
}

const NIVELES_MORA: NivelMoraKey[] = ['VERDE', 'LEVE', 'PRECAUCION', 'ROJO', 'LISTA_NEGRA']

function calcularNivelMora(cuenta: CuentaMora): NivelMoraKey {
  // Calcular riesgo basado en días y cuotas vencidas (sin monto vencido acumulado)
  const dias = cuenta.diasMora || 0
  const cuotas = cuenta.cuotasVencidas || 0

  // Criterios más estrictos para cuentas en mora
  if (dias >= 15 || cuotas >= 5) return 'LISTA_NEGRA'
  if (dias >= 8 || cuotas >= 3) return 'ROJO'
  if (dias >= 4 || cuotas >= 2) return 'PRECAUCION'
  if (dias >= 1 || cuotas >= 1) return 'ROJO' // Cualquier mora es al menos moderado
  return 'VERDE'
}

const NIVEL_COLORS: Record<string, { badge: string; bar: string; icon: string }> = {
  VERDE:      { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-400', icon: 'text-emerald-500' },
  LEVE:       { badge: 'bg-yellow-50  text-yellow-700  border-yellow-200',  bar: 'bg-yellow-400',  icon: 'text-yellow-600' },
  PRECAUCION: { badge: 'bg-amber-50   text-amber-700   border-amber-200',   bar: 'bg-amber-500',   icon: 'text-amber-600'  },
  ROJO:       { badge: 'bg-orange-50  text-orange-700  border-orange-200',  bar: 'bg-orange-500',  icon: 'text-orange-600' },
  LISTA_NEGRA: { badge: 'bg-rose-50    text-rose-700    border-rose-200',    bar: 'bg-rose-600',    icon: 'text-rose-600'   },
}

function NivelIcon({ nivel, className }: { nivel: string; className?: string }) {
  const cls = cn(NIVEL_COLORS[nivel]?.icon, className)
  if (nivel === 'LISTA_NEGRA') return <Flame className={cls} />
  if (nivel === 'ROJO')       return <ShieldAlert className={cls} />
  if (nivel === 'PRECAUCION') return <AlertTriangle className={cls} />
  if (nivel === 'LEVE')       return <Zap className={cls} />
  return <CheckCircle className={cls} />
}

function diasRestantesGracia(fechaVencimiento?: string): number | null {
  if (!fechaVencimiento) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const limite = new Date(fechaVencimiento); limite.setHours(0, 0, 0, 0)
  return Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function diasRestantesHasta(fecha?: string): number | null {
  if (!fecha) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const limite = new Date(fecha); limite.setHours(0, 0, 0, 0)
  return Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function GracePeriodBadge({ fechaVencimiento, montoMora, fechaProrroga, diasProrroga, tieneProrroga }: {
  fechaVencimiento?: string
  montoMora: number
  fechaProrroga?: string
  diasProrroga?: number
  tieneProrroga?: boolean
}) {
  if (tieneProrroga && fechaProrroga) {
    const dias = diasProrroga ?? diasRestantesHasta(fechaProrroga) ?? 0
    if (dias < 0) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-black">
          <Timer className="h-3 w-3" />
          Prorroga vencida
        </div>
      )
    }
    if (dias === 0) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black animate-pulse">
          <Timer className="h-3 w-3" />
          Prorroga vence HOY
        </div>
      )
    }
    const color = dias <= 2
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : 'bg-blue-50 border-blue-200 text-blue-700'
    return (
      <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black', color)}>
        <Timer className="h-3 w-3" />
        Prorroga: {dias}d restante{dias !== 1 ? 's' : ''}
      </div>
    )
  }

  if (!fechaVencimiento || montoMora <= 0) return null
  const dias = diasRestantesGracia(fechaVencimiento)
  if (dias === null) return null

  if (dias < 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-black">
        <Timer className="h-3 w-3" />
        Plazo vencido
      </div>
    )
  }
  if (dias === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black animate-pulse">
        <Timer className="h-3 w-3" />
        Vence HOY
      </div>
    )
  }
  const color = dias <= 2 ? 'bg-rose-50 border-rose-200 text-rose-700'
              : dias <= 5 ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black', color)}>
      <Timer className="h-3 w-3" />
      {dias} dia{dias !== 1 ? 's' : ''} para pagar
    </div>
  )
}

// ── Componente principal exportable ──────────────────────────────────────────

export default function CuentasMoraFeature() {
  const { can, rol } = usePermission()

  const rolesConAcceso = ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'CONTADOR', 'SUPERVISOR']
  const puedeExportar = can('CUENTAS_MORA_EXPORTAR') || rolesConAcceso.includes(rol || '')
  const puedeVerPerfil = can('CUENTAS_MORA_VER_PERFIL') || rolesConAcceso.includes(rol || '')

  const [cuentas, setCuentas] = useState<CuentaMora[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasMora | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [isDataLoading, setIsDataLoading] = useState(true)

  const [busqueda, setBusqueda] = useState('')
  const [filtroRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS')
  const [filtroRuta, setFiltroRuta] = useState<string | null>(null)
  const [filtroNivel, setFiltroNivel] = useState<string>('TODOS')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setIsDataLoading(true)
    try {
      const params: any = { pagina: 1, limite: 50 }
      if (busqueda) params.busqueda = busqueda
      if (filtroRiesgo !== 'TODOS') params.nivelRiesgo = filtroRiesgo
      if (filtroRuta) params.rutaId = filtroRuta

      const response = await apiRequest<any>('GET', '/reports/prestamos-mora', undefined, { params })

      const raw: any[] = Array.isArray(response)
        ? response
        : Array.isArray((response as any).prestamos)
          ? (response as any).prestamos
          : Array.isArray((response as any).data)
            ? (response as any).data
            : []

      const enriched: CuentaMora[] = raw.map(p => ({
        ...p,
        // Calcular nivel en frontend (ignorar nivel del backend que es incorrecto)
        etiquetaMora: calcularNivelMora(p),
      }))

      const soloEnMora = enriched.filter((c) => {
        const dias = Number(c?.diasMora || 0)
        const vencidas = Number(c?.cuotasVencidas || 0)
        return dias > 0 || vencidas > 0
      })

      const filtradas = filtroNivel === 'TODOS'
        ? soloEnMora
        : soloEnMora.filter(c => c.etiquetaMora === filtroNivel)

      setCuentas(filtradas)
    } catch (error: any) {
      const msg = formatErrorForComponent(error)
      console.error('Error al cargar cuentas en mora:', {
        error,
        statusCode: error?.statusCode,
        message: error?.message,
        serialized: (() => {
          try { return JSON.stringify(error) } catch { return String(error) }
        })(),
      })
      toast.error(msg)
    } finally {
      setIsDataLoading(false)
    }
  }, [busqueda, filtroRiesgo, filtroRuta, filtroNivel])

  const fetchEstadisticas = async () => {
    setIsStatsLoading(true)
    try {
      const items = await apiRequest<EstadisticasMora>('GET', '/reports/estadisticas-mora')
      setEstadisticas(items)
    } catch (err) {
      logger.warn('[CuentasMora] No se pudieron cargar las estadísticas de mora:', err)
    } finally {
      setIsStatsLoading(false)
    }
  }

  useEffect(() => { fetchEstadisticas() }, [])
  useEffect(() => {
    const t = setTimeout(() => fetchData(), 400)
    return () => clearTimeout(t)
  }, [fetchData])

  useRealtimeData(
    ['pagos_actualizados', 'prestamos_actualizados', 'dashboards_actualizados'],
    () => { fetchData(); fetchEstadisticas() },
  )

  usePageFocusRefresh(() => { fetchData(); fetchEstadisticas() })

  const handleVerCliente = (id?: string) => {
    const clientId = id || ''
    if (!clientId) { toast.warning('El perfil de este cliente no esta disponible'); return }
    setSelectedClientId(clientId)
    setIsClientModalOpen(true)
  }

  const handleExportExcel = async () => {
    try {
      await exportService.exportMora('excel', { busqueda, nivelRiesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined, rutaId: filtroRuta || undefined })
      toast.success('Reporte descargado')
    } catch { toast.error('Error al exportar') }
  }

  const handleExportPDF = async () => {
    try {
      await exportService.exportMora('pdf', { busqueda, nivelRiesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined, rutaId: filtroRuta || undefined })
      toast.success('Reporte descargado')
    } catch { toast.error('Error al exportar') }
  }

  const totalMora = estadisticas?.totalMora ?? cuentas.reduce((a, c) => a + c.montoMora, 0)
  const totalDeuda = estadisticas?.totalDeudaRiesgo ?? cuentas.reduce((a, c) => a + c.montoTotalDeuda, 0)
  const clientesAfectados = estadisticas?.totalClientesAfectados ?? cuentas.length
  const clientesCriticos = estadisticas?.clientesCriticos
    ?? cuentas.filter(c => calcularNivelMora(c) === 'LISTA_NEGRA').length

  const porNivel: Partial<Record<NivelMoraKey, number>> = {}
  cuentas.forEach(c => {
    const n = (c.etiquetaMora || calcularNivelMora(c)) as NivelMoraKey
    porNivel[n] = (porNivel[n] || 0) + 1
  })

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-rose-500 opacity-20 blur-[100px]" />
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 mb-2 border border-rose-100">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Seguimiento de Cartera en Mora</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Cuentas en </span>
              <span className="text-orange-500">Mora</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1 font-medium">
              Listado de cuentas con retrasos en sus pagos.
              <span className="text-slate-400 ml-2">({cuentas.length} registros)</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchData(); fetchEstadisticas() }}
              className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all"
              title="Actualizar"
            >
              <RefreshCw className={cn('h-5 w-5', isDataLoading && 'animate-spin')} />
            </button>
            {puedeExportar && (
              <ExportButton label="Exportar" onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
            )}
          </div>
        </div>

        {/* Metricas */}
        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Interes de Mora', value: formatCurrency(totalMora), icon: <DollarSign className="h-5 w-5 text-rose-600" />, bg: 'bg-rose-50' },
            { label: 'Deuda Total Cartera', value: formatCurrency(totalDeuda), icon: <AlertCircle className="h-5 w-5 text-amber-600" />, bg: 'bg-amber-50' },
            { label: 'Clientes Afectados', value: String(clientesAfectados), icon: <User className="h-5 w-5 text-sky-600" />, bg: 'bg-sky-50' },
            { label: 'Clientes Criticos', value: String(clientesCriticos), icon: <Flame className="h-5 w-5 text-rose-700" />, bg: 'bg-rose-100' },
          ].map(m => (
            <div key={m.label} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={cn('p-2.5 rounded-xl', m.bg)}>{m.icon}</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{isStatsLoading ? '—' : m.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros nivel de mora */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            key="TODOS"
            onClick={() => setFiltroNivel('TODOS')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all',
              filtroNivel === 'TODOS'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            )}
          >
            <CircleDot className="h-3 w-3" />
            Todos
            <span className={cn(
              'ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black',
              filtroNivel === 'TODOS' ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
            )}>
              {cuentas.length}
            </span>
          </button>

          {NIVELES_MORA.map(key => {
            const cfg = NIVEL_COLORS[key]
            const count = porNivel[key] || 0
            const isActive = filtroNivel === key
            return (
              <button
                key={key}
                onClick={() => setFiltroNivel(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all',
                  isActive
                    ? cn(cfg?.badge, 'border-current shadow-sm')
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                )}
              >
                <NivelIcon nivel={key} className="h-3 w-3" />
                {NIVEL_LABEL[key]}
                <span className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black',
                  isActive ? 'bg-white/30' : 'bg-slate-100 text-slate-500'
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filtros busqueda */}
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 w-full md:w-auto">
            <FiltroRuta onRutaChange={(r) => setFiltroRuta(r)} selectedRutaId={filtroRuta} layout="wrap" showAllOption hideLabel />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, documento o prestamo..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 outline-none"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-slate-400')}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-400')}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        {isDataLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-slate-500 font-medium">Cargando cuentas en mora...</p>
          </div>
        ) : cuentas.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="inline-flex p-4 rounded-full bg-emerald-50 mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Todo en orden</h3>
            <p className="text-slate-500 font-medium">No se encontraron cuentas en mora con los filtros actuales.</p>
          </div>
        ) : viewMode === 'list' ? (

          /* LISTA */
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Cliente</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Nivel Mora</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Ruta / Cobrador</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Deuda Total</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Interes Mora</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Plazo</th>
                    {puedeVerPerfil && <th className="px-6 py-4 font-bold tracking-wider text-right">Perfil</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuentas.map(cuenta => {
                    const nivel = (cuenta.etiquetaMora || calcularNivelMora(cuenta)) as NivelMoraKey
                    const cfg = NIVEL_COLORS[nivel]
                    const cuotasVencidasUI = Number(cuenta.cuotasVencidas || 0)
                    return (
                      <tr key={cuenta.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 font-bold text-sm">
                              {cuenta.cliente.nombre.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">{cuenta.cliente.nombre}</div>
                              <div className="text-xs text-slate-500 font-mono">{cuenta.cliente.documento}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black border inline-flex items-center gap-1.5 w-fit', cfg?.badge)}>
                              <NivelIcon nivel={nivel} className="h-3 w-3" />
                              {NIVEL_LABEL[nivel] ?? nivel} · {cuenta.diasMora}d
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{cuotasVencidasUI} cuota{cuotasVencidasUI !== 1 ? 's' : ''} vencida{cuotasVencidasUI !== 1 ? 's' : ''}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-slate-700">{cuenta.ruta || 'Sin ruta'}</div>
                          <div className="text-[10px] text-slate-500">{cuenta.cobrador || 'Sin cobrador'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-tight">Saldo pendiente</div>
                        </td>
                        <td className="px-6 py-4">
                          {cuenta.montoMora > 0 ? (
                            <div>
                              <div className="font-black text-rose-600">{formatCurrency(cuenta.montoMora)}</div>
                              <div className="text-[10px] text-slate-400">Asignado</div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <GracePeriodBadge
                            fechaVencimiento={cuenta.fechaVencimiento}
                            montoMora={cuenta.montoMora}
                            fechaProrroga={cuenta.fechaProrroga}
                            diasProrroga={cuenta.diasProrroga}
                            tieneProrroga={cuenta.tieneProrroga}
                          />
                        </td>
                        {puedeVerPerfil && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleVerCliente(cuenta.cliente.id || cuenta.clienteId)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver Perfil"
                            >
                              <User className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        ) : (

          /* GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {cuentas.map(cuenta => {
              const nivel = (cuenta.etiquetaMora || calcularNivelMora(cuenta)) as NivelMoraKey
              const cfg = NIVEL_COLORS[nivel]
              const cuotasVencidasUI = Number(cuenta.cuotasVencidas || 0)
              return (
                <div key={cuenta.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group">
                  <div className={cn('h-1 w-full', cfg?.bar)} />

                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 group-hover:text-primary transition-colors">{cuenta.cliente.nombre}</div>
                        <div className="text-xs text-slate-500 font-mono">{cuenta.cliente.documento}</div>
                      </div>
                      <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1', cfg?.badge)}>
                        <NivelIcon nivel={nivel} className="h-3 w-3" />
                        {NIVEL_LABEL[nivel] ?? nivel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="font-bold text-slate-700">{cuenta.diasMora} dias en mora</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 text-xs">{cuotasVencidasUI} cuota{cuotasVencidasUI !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Deuda Total</p>
                        <p className="font-black text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</p>
                      </div>
                      <div className={cn('p-3 rounded-xl', cuenta.montoMora > 0 ? 'bg-rose-50' : 'bg-slate-50')}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Interes Mora</p>
                        <p className={cn('font-black', cuenta.montoMora > 0 ? 'text-rose-600' : 'text-slate-400 text-xs')}>
                          {cuenta.montoMora > 0 ? formatCurrency(cuenta.montoMora) : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Ruta y Cobrador ocultos para simplificar */}
                    <div className="hidden text-xs text-slate-500">
                      <span className="font-bold text-slate-700">{cuenta.ruta || 'Sin ruta'}</span>
                      {cuenta.cobrador && <span> · {cuenta.cobrador}</span>}
                    </div>

                    <GracePeriodBadge
                      fechaVencimiento={cuenta.fechaVencimiento}
                      montoMora={cuenta.montoMora}
                      fechaProrroga={cuenta.fechaProrroga}
                      diasProrroga={cuenta.diasProrroga}
                      tieneProrroga={cuenta.tieneProrroga}
                    />
                  </div>

                  {puedeVerPerfil && (
                    <div className="px-5 pb-4">
                      <button
                        onClick={() => handleVerCliente(cuenta.cliente.id || cuenta.clienteId)}
                        className="w-full py-2 text-xs font-bold text-slate-600 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-200 flex items-center justify-center gap-1.5"
                      >
                        <User className="h-3.5 w-3.5" /> Ver Perfil
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isClientModalOpen && selectedClientId && (
        <ClientePortalModal
          clientId={selectedClientId}
          onClose={() => setIsClientModalOpen(false)}
          rolUsuario={rol === 'COORDINADOR' ? 'coordinador' : rol === 'CONTADOR' ? 'contador' : rol === 'SUPERVISOR' ? 'supervisor' : 'admin'}
        />
      )}
    </div>
  )
}
