'use client'

import Link from 'next/link'
import { useState, type ReactNode, useMemo } from 'react'

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
import { TimeFilter } from '@/components/ui/TimeFilter'
import { formatCurrency } from '@/lib/utils'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import { Sparkline, PremiumBarChart } from '@/components/ui/PremiumCharts'

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
  id: number
  client: string
  route: string
  collector: string
  daysLate: number
  amountDue: number
  status: 'critical' | 'moderate' | 'mild'
}

interface CollectorPerformance {
  id: number
  name: string
  route: string
  collected: number
  effectiveness: number
  trend: 'up' | 'down'
}

const VistaSupervisor = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'quarter'>('month')
  const currentDate = new Date()

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
    const factor = timeFilter === 'today' ? 0.1 : timeFilter === 'week' ? 0.25 : timeFilter === 'month' ? 1 : 3
    return [
      {
        title: 'Mora Crítica',
        value: '12',
        subValue: 'Clientes con alto riesgo',
        change: -3.4,
        icon: <AlertCircle className="h-4 w-4" />,
        color: '#ef4444',
        trendData: [15, 14, 16, 14, 13, 12, 12]
      },
      {
        title: 'Gestiones',
        value: String(Math.round(18 * factor)),
        subValue: timeFilter === 'today' ? 'Visitas / llamadas (día)' : timeFilter === 'week' ? 'Visitas / llamadas (semana)' : timeFilter === 'month' ? 'Visitas / llamadas (mes)' : 'Visitas / llamadas (trimestre)',
        change: 5.2,
        icon: <Calendar className="h-4 w-4" />,
        color: '#08557f',
        trendData: [10, 12, 11, 15, 14, 16, 18]
      },
      {
        title: 'Cobertura de Ruta',
        value: '89.7%',
        subValue: 'Cumplimiento de visitas',
        change: 2.1,
        icon: <Map className="h-4 w-4" />,
        color: '#10b981',
        trendData: [85, 86, 84, 88, 87, 89, 89.7]
      },
    ]
  }, [timeFilter])

  const delinquentClients: DelinquentClient[] = [
    {
      id: 1,
      client: 'González M.',
      route: 'Norte',
      collector: 'Juan Pérez',
      daysLate: 15,
      amountDue: 750000,
      status: 'critical',
    },
    {
      id: 2,
      client: 'Rodríguez C.',
      route: 'Centro',
      collector: 'María González',
      daysLate: 8,
      amountDue: 450000,
      status: 'moderate',
    },
    {
      id: 3,
      client: 'Sánchez L.',
      route: 'Sur',
      collector: 'Pedro Sánchez',
      daysLate: 5,
      amountDue: 250000,
      status: 'mild',
    },
  ]

  const collectors: CollectorPerformance[] = [
    {
      id: 1,
      name: 'Juan Pérez',
      route: 'Norte',
      collected: 1540000,
      effectiveness: 98,
      trend: 'up',
    },
    {
      id: 2,
      name: 'María González',
      route: 'Centro',
      collected: 1280000,
      effectiveness: 95,
      trend: 'up',
    },
    {
      id: 3,
      name: 'Pedro Sánchez',
      route: 'Sur',
      collected: 980000,
      effectiveness: 89,
      trend: 'down',
    },
  ]

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
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <RefreshCw className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Actualizar</span>
              </button>
              <ExportButton label="Exportar" onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
            </div>
          </div>

          <div className="mt-4">
            <TimeFilter activePeriod={timeFilter} onPeriodChange={setTimeFilter} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {mainMetrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${metric.color}10` }}>
                  <div style={{ color: metric.color }}>{metric.icon}</div>
                </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`flex items-center gap-1 text-sm ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>
                    {metric.change >= 0 ? '+' : ''}
                    {metric.change}%
                  </span>
                </div>
                <Sparkline data={metric.trendData} color={metric.color} height={30} />
              </div>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-light text-gray-800">{metric.value}</div>
                <div className="text-sm text-gray-500">{metric.title}</div>
                {metric.subValue && <div className="text-xs text-gray-400">{metric.subValue}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8">
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tendencia de Cobros</h2>
                    <p className="text-sm text-slate-500 font-medium">Rendimiento semanal vs objetivos de campo</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 group">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real</span>
                    </div>
                    <div className="flex items-center gap-2 group">
                      <div className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500 bg-amber-50"></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meta</span>
                    </div>
                  </div>
                </div>
                
                <PremiumBarChart 
                  showTarget
                  data={[
                    { label: 'Lun', value: 1800000, target: 2000000 },
                    { label: 'Mar', value: 1950000, target: 2000000 },
                    { label: 'Mie', value: 1400000, target: 2000000 },
                    { label: 'Jue', value: 2200000, target: 2000000 },
                    { label: 'Vie', value: 2050000, target: 2000000 },
                    { label: 'Sab', value: 2500000, target: 2000000 },
                    { label: 'Dom', value: 800000, target: 1000000 },
                  ]}
                />
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
                <p className="text-sm text-gray-500">Cobradores por ruta (mock)</p>
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
