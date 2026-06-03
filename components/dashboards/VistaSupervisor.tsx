'use client'

import { useState, type ReactNode, useMemo, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'

import {
  AlertCircle,
  Calendar,
  Eye,
  Map,
  Plus,
  RefreshCw,
  DollarSign,
  CreditCard,
  UserPlus,
  X,
  TrendingDown,
  TrendingUp,
  ClipboardList,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ExportButton } from '@/components/ui/ExportButton'
import { TimeFilter, type TimeFilterPeriod } from '@/components/ui/TimeFilter'
import { formatCurrency } from '@/lib/utils'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import { Sparkline } from '@/components/ui/PremiumCharts'
import { TransactionalHighDetailChart } from '@/components/ui/TransactionalHighDetailChart'
import { dashboardService, type DashboardData } from '@/services/dashboard-coordinador-service'
import { formatErrorForComponent } from '@/lib/api/api'
import { computeOperationalMetaTotalForTimeFilter } from '@/lib/dashboard-operational-meta'

import PagoModal from '@/components/dashboards/shared/PagoModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import { prestamosService } from '@/services/prestamos-service'
import { exportService } from '@/services/export-service'
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'


interface MetricCard {
  title: string
  value: string
  subValue?: string
  change: number | null
  icon: ReactNode
  color: string
  trendData: number[]
}

const VistaSupervisor = () => {
  const { user } = useAuth()
  const [timeFilter, setTimeFilter] = useState<TimeFilterPeriod>('today')
  const currentDate = new Date()

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [isFabOpen, setIsFabOpen] = useState(false)
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [pagoInitialIsAbono, setPagoInitialIsAbono] = useState(false)
  const [showCreditoTipoModal, setShowCreditoTipoModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [selectedVisitaForPago, setSelectedVisitaForPago] = useState<{
    id: string;
    cliente: string;
    direccion: string;
    montoCuota: number;
    saldoTotal: number;
  } | undefined>(undefined)
  
  const router = useRouter()

  const loadDashboardData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true)
      setError(null)
      const [data, metaOperativa] = await Promise.all([
        dashboardService.getDashboardData(timeFilter),
        computeOperationalMetaTotalForTimeFilter(timeFilter as any).catch(() => 0),
      ])
      const meta = Number(metaOperativa || 0)
      const next = meta > 0
        ? ({
            ...(data as any),
            trend: (Array.isArray((data as any)?.trend) ? (data as any).trend : []).map((t: any) => ({
              ...t,
              target: meta,
            })),
          } as any)
        : data
      setDashboardData(next)
    } catch (err) {
      setError(formatErrorForComponent(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeFilter, refreshing])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Tiempo real: refrescar cuando pagos, préstamos o rutas cambien
  useRealtimeData(['pagos_actualizados', 'prestamos_actualizados', 'rutas_actualizadas', 'dashboards_actualizados'], loadDashboardData)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const action = params.get('action')
      if (action === 'crear-credito') {
        setShowCreditoTipoModal(true)
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      } else if (action === 'nuevo-cliente') {
        setShowNewClientModal(true)
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  const handlePagoConfirm = (data: {
    clienteId: string;
    monto: number;
    metodoPago: string;
    comprobante: File | null;
    isAbono: boolean;
  }) => {
    console.log('Pago confirmado en Supervisor:', data)
    setShowPagoModal(false)
    setSelectedVisitaForPago(undefined)
  }

  const handleCreditoConfirm = async (data: any) => {
    try {
      const d: any = data as any
      const esContado = Boolean((data as any).ventaContado)
      const isArticulo = data.creditType === 'articulo'
      const freq = esContado ? 'MENSUAL' : (data.frecuenciaPago || 'DIARIO')
      const payload: any = {
        clienteId: data.clienteCreditoId,
        tipoPrestamo: isArticulo ? 'ARTICULO' : 'EFECTIVO',
        monto: data.monto || 0,
        tasaInteres: esContado ? 0 : (data.tasaInteres || 0),
        tasaInteresMora: 2,
        plazoMeses: data.plazoMeses || 1,
        cantidadCuotas: data.cantidadCuotas || data.cuotas || data.cuotasTotales || (isArticulo ? data.numCuotas : 0),
        cuotas: data.cuotas || data.cantidadCuotas || data.cuotasTotales || (isArticulo ? data.numCuotas : 0),
        frecuenciaPago: freq,
        fechaInicio: data.fechaInicio || toBogotaDateTimeOffsetIso(new Date()),
        fechaPrimerCobro: data.fechaPrimerCobro,
        creadoPorId: user?.id || '',
        cuotaInicial: data.cuotaInicialArticulo || 0,
        notas: isArticulo
          ? `${esContado ? 'Venta de contado' : 'Crédito de artículo'}: ${d.articuloNombre || ''}`
          : (data.notas || ''),
        tipoAmortizacion: isArticulo ? 'INTERES_SIMPLE' : (data.tipoInteres || 'INTERES_SIMPLE'),
        esContado: esContado,
      };
      if (isArticulo) {
        payload.productoId = data.articuloId;
        payload.precioProductoId = esContado ? undefined : data.precioProductoId;
      }
      const prestamo = await prestamosService.crearPrestamo(payload);
      toast.success('Crédito Creado', { description: 'El crédito ha sido registrado exitosamente.' });
      setShowCreditoTipoModal(false);
      if (isArticulo && prestamo?.id) {
        try { await exportService.exportContrato(prestamo.id); } catch (err) {}
      }
      loadDashboardData();
    } catch (error: any) {
      toast.error('Error al crear crédito', { description: error?.message || 'Ocurrió un error inesperado.' });
    }
  }


  // TODO: Exportar resumen de supervisión
  // Qué exportar: Rutas supervisadas, Eficiencia por cobrador, Alertas, Resumen de recaudo
  // Backend: Reutilizar GET /reports/operational/export filtrado por supervisor
  // Frontend: Usar exportService.exportOperationalReport(format, { period })
  const handleExportExcel = () => {
    console.log('TODO: Exportar resumen supervisor en Excel')
  }

  const handleExportPDF = () => {
    console.log('TODO: Exportar resumen supervisor en PDF')
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
    return date.toLocaleDateString('es-CO', options)
  }

  const mainMetrics: MetricCard[] = useMemo(() => {
    if (!dashboardData) return []
    const metrics = dashboardData.metrics
    const periodLabel =
      timeFilter === 'today'
        ? 'Hoy'
        : timeFilter === 'week'
        ? 'Semana actual'
        : timeFilter === 'month'
        ? 'Mes actual'
        : 'Trimestre actual'

    const trendValues = (dashboardData.trend || []).map((t) => t.value || 0)

    return [
      {
        title: 'Capital Prestado',
        value: formatCurrency(metrics.capitalPrestado || 0),
        subValue: `Créditos desembolsados · ${periodLabel}`,
        change: null,
        icon: <CreditCard className="h-4 w-4" />,
        color: '#08557f',
        trendData: trendValues.length > 0 ? trendValues : [0],
      },
      {
        title: 'Recaudo del período',
        value: formatCurrency(metrics.recaudo || 0),
        subValue: `Pagos recibidos · ${periodLabel}`,
        change: null,
        icon: <DollarSign className="h-4 w-4" />,
        color: '#10b981',
        trendData: trendValues.length > 0 ? trendValues : [0],
      },
      {
        title: 'Cuentas en Mora',
        value: String(metrics.delinquentAccounts || 0),
        subValue: 'Préstamos en estado EN_MORA',
        change: null,
        icon: <AlertCircle className="h-4 w-4" />,
        color: '#ef4444',
        trendData: trendValues.length > 0 ? trendValues : [0],
      },
      {
        title: 'Eficiencia de cartera',
        value: `${(metrics.efficiency || 0).toFixed(1)}%`,
        subValue: 'Préstamos pagados vs activos',
        change: null,
        icon: <Calendar className="h-4 w-4" />,
        color: '#fb851b',
        trendData: trendValues.length > 0 ? trendValues : [0],
      },
    ]
  }, [dashboardData, timeFilter])

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-slate-200 border-t-[#08557f] rounded-full animate-spin"></div>
            <Eye className="absolute inset-0 m-auto h-10 w-10 text-[#08557f]" />
          </div>
          <p className="mt-6 text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">
            Cargando panel de supervisión...
          </p>
        </div>
      </div>
    )
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="p-4 rounded-3xl bg-white border border-rose-100 shadow-lg inline-block mb-6">
            <AlertCircle className="h-12 w-12 text-rose-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Error al cargar datos</h3>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-2 bg-[#08557f] text-white font-bold rounded-xl hover:bg-[#063a58] transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#08557f_0,transparent_100%)] opacity-20"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    <span className="text-blue-600">Supervisor</span>
                  </h1>
                  <p className="text-sm text-slate-500 font-medium">Seguimiento de mora y gestión operativa</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium" suppressHydrationWarning>
                {formatDate(currentDate)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <ExportButton label="Exportar" onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
            </div>
          </div>

          <TimeFilter
            activePeriod={timeFilter}
            onPeriodChange={setTimeFilter}
            className="mt-6"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {mainMetrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-[0_10px_40px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] transition-all duration-500 group hover:-translate-y-2 relative overflow-hidden"
            >
              <div
                className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] transition-transform duration-700 group-hover:scale-150"
                style={{ backgroundColor: metric.color }}
              ></div>

              <div className="flex items-start justify-between mb-6 relative z-10">
                <div
                  className="p-4 rounded-2xl transition-all duration-500 shadow-sm group-hover:shadow-md group-hover:scale-110"
                  style={{ backgroundColor: `${metric.color}15`, color: metric.color }}
                >
                  {metric.icon}
                </div>
                {metric.change !== null && (
                  <div
                    className={`flex items-center space-x-1.5 text-[11px] font-black px-3 py-1 rounded-full shadow-sm ${
                      metric.change >= 0 ? 'text-emerald-700 bg-emerald-100/50' : 'text-rose-700 bg-rose-100/50'
                    }`}
                  >
                    {metric.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>
                      {metric.change >= 0 ? '+' : ''}
                      {metric.change}%
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 relative z-10">
                <div className="text-3xl font-black text-slate-900 tracking-tight truncate leading-tight" title={metric.value}>
                  {metric.value}
                </div>
                {metric.subValue && (
                  <div className="text-[11px] font-bold text-slate-500/80 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    {metric.subValue}
                  </div>
                )}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">{metric.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tendencia de Cobros</h2>
                <p className="text-sm text-slate-500 font-medium">Período seleccionado</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 group">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-full h-48 bg-slate-100 rounded-2xl animate-pulse"></div>
              </div>
            ) : (
              <TransactionalHighDetailChart data={dashboardData?.trend || []} />
            )}
          </div>
        </div>

      </div>




      <PagoModal 
        isOpen={showPagoModal}
        onClose={() => {
          setShowPagoModal(false)
          setSelectedVisitaForPago(undefined)
        }}
        onConfirm={handlePagoConfirm}
        initialIsAbono={pagoInitialIsAbono}
        initialVisita={selectedVisitaForPago}
      />

      <CrearCreditoModal 
        isOpen={showCreditoTipoModal}
        onClose={() => setShowCreditoTipoModal(false)}
        onConfirm={handleCreditoConfirm}
      />

      {showNewClientModal && (
        <NuevoClienteModal 
            onClose={() => setShowNewClientModal(false)}
            onClienteCreado={(nuevo) => {
                setShowNewClientModal(false);
                // Todo: recargar datos
            }}
        />
      )}

      <FloatingActionMenu actions={[
        { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => setShowCreditoTipoModal(true) },
        { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, onClick: () => setShowNewClientModal(true) },
        { label: 'Registrar abono', icon: <RefreshCw className="h-5 w-5" />, color: 'orange', onClick: () => { setPagoInitialIsAbono(true); setShowPagoModal(true); } },
        { label: 'Registrar pago', icon: <DollarSign className="h-5 w-5" />, onClick: () => { setPagoInitialIsAbono(false); setShowPagoModal(true); } },
      ] as FabAction[]} />
    </div>
  )
}

export default VistaSupervisor
