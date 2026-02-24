'use client'

import Link from 'next/link'
import { useState, type ReactNode, useMemo, useEffect, useCallback } from 'react'

import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  Eye,
  Filter,
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

import PagoModal from '@/components/dashboards/shared/PagoModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'


interface MetricCard {
  title: string
  value: string
  subValue?: string
  change: number
  icon: ReactNode
  color: string
  trendData: number[]
}

interface DelinquentClient {
  id: string
  client: string
  route: string
  collector: string
  daysLate: number
  amountDue: number
  status: 'critical' | 'moderate' | 'mild'
}

interface CollectorPerformance {
  id: string
  name: string
  route: string
  collected: number
  effectiveness: number
  trend: 'up' | 'down'
}

const VistaSupervisor = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilterPeriod>('month')
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
  
  const [showMoraModal, setShowMoraModal] = useState(false)
  const [selectedMoraClient, setSelectedMoraClient] = useState<DelinquentClient | null>(null)
  
  const router = useRouter()

  const loadDashboardData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true)
      setError(null)
      const data = await dashboardService.getDashboardData(timeFilter)
      setDashboardData(data)
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

  const handleCreditoConfirm = (data: {
    creditType: 'prestamo' | 'articulo';
    clienteCreditoId: string;
  }) => {
    console.log('Crédito confirmado en Supervisor:', data)
    setShowCreditoTipoModal(false)
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


  const getStatusColor = (status: DelinquentClient['status']) => {
    if (status === 'critical') return '#ef4444'
    if (status === 'moderate') return '#fb851b'
    return '#10b981'
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
        change: 0,
        icon: <CreditCard className="h-4 w-4" />,
        color: '#08557f',
        trendData: trendValues.length > 0 ? trendValues : [0],
      },
      {
        title: 'Recaudo del período',
        value: formatCurrency(metrics.recaudo || 0),
        subValue: `Pagos recibidos · ${periodLabel}`,
        change: 0,
        icon: <DollarSign className="h-4 w-4" />,
        color: '#10b981',
        trendData: trendValues.length > 0 ? trendValues : [0],
      },
      {
        title: 'Cuentas en Mora',
        value: String(metrics.delinquentAccounts || 0),
        subValue: 'Préstamos en estado EN_MORA',
        change: 0,
        icon: <AlertCircle className="h-4 w-4" />,
        color: '#ef4444',
        trendData: trendValues.length > 0 ? trendValues : [0],
      },
      {
        title: 'Eficiencia de cartera',
        value: `${(metrics.efficiency || 0).toFixed(1)}%`,
        subValue: 'Préstamos pagados vs activos',
        change: 0,
        icon: <Calendar className="h-4 w-4" />,
        color: '#fb851b',
        trendData: trendValues.length > 0 ? trendValues : [0],
      },
    ]
  }, [dashboardData, timeFilter])

  const delinquentClients: DelinquentClient[] = useMemo(() => {
    if (!dashboardData) return []
    return (dashboardData.delinquentAccounts || []).map((account) => ({
      id: account.id,
      client: account.client,
      route: account.route,
      collector: account.collector,
      daysLate: account.daysLate,
      amountDue: account.amountDue,
      status: account.status,
    }))
  }, [dashboardData])

  const collectors: CollectorPerformance[] = useMemo(() => {
    if (!dashboardData?.topCollectors) return []
    return dashboardData.topCollectors.map((collector, index) => ({
      id: String(index),
      name: collector.name,
      route: 'Por asignar',
      collected: collector.collected,
      effectiveness: collector.efficiency,
      trend: collector.trend,
    }))
  }, [dashboardData])

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
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-50"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm text-gray-600">Actualizar</span>
              </button>
              <ExportButton label="Exportar" onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
            </div>
          </div>

          <div className="mt-4">
            <TimeFilter activePeriod={timeFilter} onPeriodChange={setTimeFilter} />
          </div>
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
                <p className="text-sm text-slate-500 font-medium">Período seleccionado vs objetivo</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 group">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real</span>
                </div>
                <div className="flex items-center gap-2 group">
                  <div className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500 bg-amber-50"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objetivo</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-light text-gray-800">Clientes Atrasados</h2>
                <p className="text-sm text-gray-500">Prioriza la mora crítica y gestiona en campo</p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <Link href="/supervisor/clientes" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Ver módulo <ArrowRight className="inline h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {delinquentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getStatusColor(client.status) }} />
                    <div>
                      <div className="text-sm font-bold text-slate-900">{client.client}</div>
                      <div className="text-xs font-medium text-slate-500">Ruta: {client.route} · Cobrador: {client.collector}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(client.amountDue)}</div>
                      <div className="text-xs font-bold text-slate-500">{client.daysLate} días</div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setPagoInitialIsAbono(true)
                          setSelectedVisitaForPago({
                            id: String(client.id),
                            cliente: client.client,
                            direccion: 'Dirección no disponible',
                            montoCuota: client.amountDue / 10,
                            saldoTotal: client.amountDue * 2
                          })
                          setShowPagoModal(true)
                        }}
                        className="p-1 px-2 text-[10px] font-bold bg-orange-100 text-orange-700 rounded transition-colors hover:bg-orange-200 flex items-center gap-1"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        Abonar
                      </button>
                      <button 
                        onClick={() => {
                          setPagoInitialIsAbono(false)
                          setSelectedVisitaForPago({
                            id: String(client.id),
                            cliente: client.client,
                            direccion: 'Dirección no disponible',
                            montoCuota: client.amountDue,
                            saldoTotal: client.amountDue * 2
                          })
                          setShowPagoModal(true)
                        }}
                        className="p-1 px-2 text-[10px] font-bold bg-blue-100 text-blue-700 rounded transition-colors hover:bg-blue-200 flex items-center gap-1"
                      >
                        <DollarSign className="h-2.5 w-2.5" />
                        Pagar
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedMoraClient(client)
                          setShowMoraModal(true)
                        }}
                        className="p-1 px-2 text-[10px] font-bold bg-slate-100 text-slate-700 rounded transition-colors hover:bg-slate-200 flex items-center gap-1"
                      >
                         <AlertCircle className="h-2.5 w-2.5" />
                         Gestionar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-light text-gray-800">Rendimiento</h2>
                <p className="text-sm text-gray-500">Cobradores por ruta</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                Últimos 30 días
              </div>
            </div>

            <div className="space-y-3">
              {collectors.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{c.name}</div>
                    <div className="text-xs font-medium text-slate-500">Ruta: {c.route}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">{formatCurrency(c.collected)}</div>
                    <div className="text-xs font-bold text-slate-500">
                      Efectividad: {c.effectiveness}% {c.trend === 'up' ? '↑' : '↓'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>




      {showMoraModal && selectedMoraClient && (
        <DetalleMoraModal
          cuenta={{
            id: String(selectedMoraClient.id),
            numeroPrestamo: `P-${selectedMoraClient.id}`,
            cliente: {
              nombre: selectedMoraClient.client,
              documento: 'N/A',
              telefono: 'N/A',
              direccion: 'N/A'
            },
            diasMora: selectedMoraClient.daysLate,
            montoMora: selectedMoraClient.amountDue,
            montoTotalDeuda: selectedMoraClient.amountDue * 1.5,
            cuotasVencidas: Math.ceil(selectedMoraClient.daysLate / 30),
            ruta: selectedMoraClient.route,
            cobrador: selectedMoraClient.collector,
            nivelRiesgo: selectedMoraClient.status === 'critical' ? 'ROJO' :
                         selectedMoraClient.status === 'moderate' ? 'AMARILLO' : 'VERDE'
          }}
          onClose={() => {
            setShowMoraModal(false)
            setSelectedMoraClient(null)
          }}
        />
      )}

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
        { label: 'Solicitudes', icon: <ClipboardList className="h-5 w-5" />, onClick: () => router.push('/cobranzas/solicitudes') },
      ] as FabAction[]} />
    </div>
  )
}

export default VistaSupervisor
