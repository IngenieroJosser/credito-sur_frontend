'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  CheckCircle,
  CreditCard,
  ShoppingBag,
  UserPlus,
  X,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { ExportButton } from '@/components/ui/ExportButton'
import { MOCK_CLIENTES } from '@/services/clientes-service'
import { MOCK_ARTICULOS, type OpcionCuotas } from '@/services/articulos-service'
import { formatCOPInputValue, formatMilesCOP, parseCOPInputToNumber, formatCurrency } from '@/lib/utils'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'

const MODAL_Z_INDEX = 2147483647

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

interface MetricCard {
  title: string
  value: string
  subValue?: string
  change: number
  icon: ReactNode
  color: string
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
  const [showCreditoTipoModal, setShowCreditoTipoModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)

  const [clientePagoId, setClientePagoId] = useState('')
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [montoPagoInput, setMontoPagoInput] = useState('')
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState<File | null>(null)
  const [comprobanteTransferenciaPreviewUrl, setComprobanteTransferenciaPreviewUrl] = useState<string | null>(null)

  const [clienteCreditoId, setClienteCreditoId] = useState('')
  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>('prestamo')
  const [montoPrestamoInput, setMontoPrestamoInput] = useState('')
  const [tipoInteres, setTipoInteres] = useState<'SIMPLE' | 'AMORTIZABLE'>('AMORTIZABLE')
  const [tasaInteresInput, setTasaInteresInput] = useState('')
  const [cuotasPrestamoInput, setCuotasPrestamoInput] = useState('')
  const [cuotaInicialArticuloInput, setCuotaInicialArticuloInput] = useState('')
  
  // Estados para artículos
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<string>('')
  const [opcionCuotasSeleccionada, setOpcionCuotasSeleccionada] = useState<OpcionCuotas | null>(null)
  
  const articuloSeleccionado = MOCK_ARTICULOS.find(a => a.id === articuloSeleccionadoId)

  // Efecto para crear y limpiar object URLs de previews de imágenes
  useEffect(() => {
    // Solo procesar si es transferencia y hay archivo de imagen
    if (metodoPago !== 'TRANSFERENCIA' || !comprobanteTransferencia) {
      if (comprobanteTransferenciaPreviewUrl) {
        URL.revokeObjectURL(comprobanteTransferenciaPreviewUrl)
        setComprobanteTransferenciaPreviewUrl(null)
      }
      return
    }

    const isImage = comprobanteTransferencia.type.startsWith('image/')
    if (!isImage) {
      if (comprobanteTransferenciaPreviewUrl) {
        URL.revokeObjectURL(comprobanteTransferenciaPreviewUrl)
        setComprobanteTransferenciaPreviewUrl(null)
      }
      return
    }

    // Limpiar URL anterior si existe
    if (comprobanteTransferenciaPreviewUrl) {
      URL.revokeObjectURL(comprobanteTransferenciaPreviewUrl)
    }

    // Crear nuevo URL
    const url = URL.createObjectURL(comprobanteTransferencia)
    setComprobanteTransferenciaPreviewUrl(url)

    // Cleanup al desmontar o cambiar
    return () => {
      URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comprobanteTransferencia, metodoPago])

  const resetPagoModal = () => {
    setShowPagoModal(false)
    setClientePagoId('')
    setMetodoPago('EFECTIVO')
    setMontoPagoInput('')
    setComprobanteTransferencia(null)
    setComprobanteTransferenciaPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const resetCreditoModal = () => {
    setShowCreditoTipoModal(false)
    setClienteCreditoId('')
    setCreditType('prestamo')
    setMontoPrestamoInput('')
    setTipoInteres('AMORTIZABLE')
    setTasaInteresInput('')
    setCuotasPrestamoInput('')
    setCuotaInicialArticuloInput('')
    setArticuloSeleccionadoId('')
    setOpcionCuotasSeleccionada(null)
  }


  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
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

  const mainMetrics: MetricCard[] = [
    {
      title: 'Mora Crítica',
      value: '12',
      subValue: 'Clientes con alto riesgo',
      change: -3.4,
      icon: <AlertCircle className="h-4 w-4" />,
      color: '#ef4444',
    },
    {
      title: 'Gestiones Hoy',
      value: '18',
      subValue: 'Visitas / llamadas',
      change: 5.2,
      icon: <Calendar className="h-4 w-4" />,
      color: '#08557f',
    },
    {
      title: 'Cobertura de Ruta',
      value: '89.7%',
      subValue: 'Cumplimiento de visitas',
      change: 2.1,
      icon: <Map className="h-4 w-4" />,
      color: '#10b981',
    },
  ]

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

          <div className="mt-4 flex items-center space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
            {['Hoy', 'Sem', 'Mes', 'Trim'].map((item, index) => {
              const values = ['today', 'week', 'month', 'quarter'] as const
              return (
                <button
                  key={item}
                  onClick={() => setTimeFilter(values[index])}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    timeFilter === values[index]
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {item}
                </button>
              )
            })}
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
                <div className={`flex items-center gap-1 text-sm ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>
                    {metric.change >= 0 ? '+' : ''}
                    {metric.change}%
                  </span>
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
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getStatusColor(client.status) }} />
                    <div>
                      <div className="text-sm font-bold text-slate-900">{client.client}</div>
                      <div className="text-xs font-medium text-slate-500">Ruta: {client.route} · Cobrador: {client.collector}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">{formatCurrency(client.amountDue)}</div>
                    <div className="text-xs font-bold text-slate-500">{client.daysLate} días</div>
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

      {showPagoModal && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: MODAL_Z_INDEX }}
            onClick={resetPagoModal}
          >
            <div
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Registrar Pago</h3>
                  <button
                    type="button"
                    onClick={resetPagoModal}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
                    <select
                      value={clientePagoId}
                      onChange={(e) => setClientePagoId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
                    >
                      <option value="">Selecciona un cliente</option>
                      {MOCK_CLIENTES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombres} {c.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMetodoPago('EFECTIVO')}
                        className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                          metodoPago === 'EFECTIVO'
                            ? 'bg-[#08557f] text-white border-[#08557f]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        EFECTIVO
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetodoPago('TRANSFERENCIA')}
                        className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                          metodoPago === 'TRANSFERENCIA'
                            ? 'bg-[#08557f] text-white border-[#08557f]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        TRANSFERENCIA
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Monto Recibido</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={montoPagoInput}
                        onChange={(e) => setMontoPagoInput(formatCOPInputValue(e.target.value))}
                        className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-2xl text-slate-900 placeholder:text-slate-300"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[10000, 20000, 50000, 100000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          const nuevo = parseCOPInputToNumber(montoPagoInput) + amount
                          setMontoPagoInput(nuevo === 0 ? '' : formatMilesCOP(nuevo))
                        }}
                        className="py-2 px-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                      >
                        +${(amount / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>

                  {metodoPago === 'TRANSFERENCIA' && (
                    <div className="pt-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante (Obligatorio)</label>
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">Sube el comprobante</p>
                              {comprobanteTransferencia && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#08557f] border border-blue-100">
                                  ADJUNTO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">Imagen o PDF.</p>
                          </div>
                          {comprobanteTransferencia && (
                            <button
                              type="button"
                              onClick={() => setComprobanteTransferencia(null)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Quitar
                            </button>
                          )}
                        </div>

                        {comprobanteTransferenciaPreviewUrl && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <img src={comprobanteTransferenciaPreviewUrl} alt="Comprobante" className="w-full h-40 object-cover" />
                          </div>
                        )}

                        {comprobanteTransferencia && !comprobanteTransferenciaPreviewUrl && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-bold text-slate-700 truncate">Archivo: {comprobanteTransferencia.name}</p>
                          </div>
                        )}

                        <div className="mt-3">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setComprobanteTransferencia(e.target.files?.[0] || null)}
                            className="w-full text-sm"
                            required
                          />
                        </div>
                      </div>
                      {!comprobanteTransferencia && (
                        <p className="mt-2 text-xs font-bold text-rose-600">Adjunta el comprobante para confirmar una transferencia.</p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      console.log('Registrar pago:', {
                        clienteId: clientePagoId,
                        monto: parseCOPInputToNumber(montoPagoInput),
                        metodoPago,
                        comprobanteTransferencia,
                      })
                      resetPagoModal()
                    }}
                    disabled={
                      !clientePagoId ||
                      parseCOPInputToNumber(montoPagoInput) <= 0 ||
                      (metodoPago === 'TRANSFERENCIA' && !comprobanteTransferencia)
                    }
                    className="w-full bg-[#08557f] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Confirmar Pago
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showCreditoTipoModal && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: MODAL_Z_INDEX }}
            onClick={resetCreditoModal}
          >
            <div
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Crear Nuevo Crédito</h3>
                  <button
                    type="button"
                    onClick={resetCreditoModal}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Tipo de Crédito</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreditType('prestamo')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        creditType === 'prestamo'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <DollarSign className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Préstamo en Efectivo</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreditType('articulo')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        creditType === 'articulo'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <ShoppingBag className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Crédito por Artículo</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
                    <select
                      value={clienteCreditoId}
                      onChange={(e) => setClienteCreditoId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
                    >
                      <option value="">Selecciona un cliente</option>
                      {MOCK_CLIENTES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombres} {c.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>

                  {creditType === 'prestamo' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Monto del Préstamo</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                              type="text"
                              inputMode="numeric"
                              value={montoPrestamoInput}
                              onChange={(e) => setMontoPrestamoInput(formatCOPInputValue(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Interés</label>
                          <select
                            value={tipoInteres}
                            onChange={(e) => setTipoInteres(e.target.value as 'SIMPLE' | 'AMORTIZABLE')}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                          >
                            <option value="AMORTIZABLE">Amortizable</option>
                            <option value="SIMPLE">Interés Simple</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Tasa de Interés (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={tasaInteresInput}
                            onChange={(e) => setTasaInteresInput(e.target.value.replace(/[^0-9.]/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            placeholder="5.0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cuotasPrestamoInput}
                            onChange={(e) => setCuotasPrestamoInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            placeholder="12"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                          <option>Diario</option>
                          <option>Semanal</option>
                          <option>Quincenal</option>
                          <option>Mensual</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <p className="text-sm font-medium text-blue-900">
                          <strong>Nota:</strong> Los precios y cuotas de los artículos son asignados por el contable.
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Artículo</label>
                        <select 
                          value={articuloSeleccionadoId}
                          onChange={(e) => {
                            setArticuloSeleccionadoId(e.target.value)
                            setOpcionCuotasSeleccionada(null)
                          }}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        >
                          <option value="">Seleccionar artículo...</option>
                          {MOCK_ARTICULOS.map((articulo) => (
                            <option key={articulo.id} value={articulo.id}>
                              {articulo.nombre} - {formatCurrency(articulo.precioBase)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {articuloSeleccionado && (
                        <>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Precio Base (Sin Financiamiento)</div>
                            <div className="text-lg font-bold text-slate-900">{formatCurrency(articuloSeleccionado.precioBase)}</div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Plan de Cuotas</label>
                            <select 
                              value={opcionCuotasSeleccionada ? articuloSeleccionado.opcionesCuotas.indexOf(opcionCuotasSeleccionada) : ''}
                              onChange={(e) => {
                                const index = parseInt(e.target.value)
                                if (!isNaN(index) && articuloSeleccionado) {
                                  setOpcionCuotasSeleccionada(articuloSeleccionado.opcionesCuotas[index])
                                }
                              }}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            >
                              <option value="">Seleccionar plan...</option>
                              {articuloSeleccionado.opcionesCuotas.map((opcion, index) => (
                                <option key={index} value={index}>
                                  {opcion.numeroCuotas} cuotas - {formatCurrency(opcion.valorCuota)}/cuota - Total: {formatCurrency(opcion.precioTotal)}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {opcionCuotasSeleccionada && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="text-xs font-medium text-green-700">Número de Cuotas</div>
                                  <div className="font-bold text-green-900">{opcionCuotasSeleccionada.numeroCuotas} cuotas</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-green-700">Valor por Cuota</div>
                                  <div className="font-bold text-green-900">{formatCurrency(opcionCuotasSeleccionada.valorCuota)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-green-700">Precio Total</div>
                                  <div className="font-bold text-green-900">{formatCurrency(opcionCuotasSeleccionada.precioTotal)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-green-700">Frecuencia</div>
                                  <div className="font-bold text-green-900">{opcionCuotasSeleccionada.frecuenciaPago}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Cuota Inicial (Opcional)</label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                              <input
                                type="text"
                                inputMode="numeric"
                                value={cuotaInicialArticuloInput}
                                onChange={(e) => setCuotaInicialArticuloInput(formatCOPInputValue(e.target.value))}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tipo:</span>
                        <span className="font-bold text-slate-900">
                          {creditType === 'prestamo' ? 'Préstamo en Efectivo' : 'Crédito por Artículo'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Estado:</span>
                        <span className="font-bold text-orange-600">Pendiente de Aprobación</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetCreditoModal}
                      className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Crear crédito:', {
                          clienteId: clienteCreditoId,
                          tipo: creditType,
                          montoPrestamo: parseCOPInputToNumber(montoPrestamoInput),
                          tipoInteres: tipoInteres,
                          tasaInteres: tasaInteresInput,
                          cuotas: cuotasPrestamoInput,
                          articuloId: articuloSeleccionadoId,
                          opcionCuotas: opcionCuotasSeleccionada,
                          cuotaInicial: parseCOPInputToNumber(cuotaInicialArticuloInput),
                        })
                        resetCreditoModal()
                      }}
                      disabled={
                        !clienteCreditoId || 
                        (creditType === 'articulo' && (!articuloSeleccionadoId || !opcionCuotasSeleccionada))
                      }
                      className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      Crear Crédito
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showNewClientModal && (
        <NuevoClienteModal 
            onClose={() => setShowNewClientModal(false)}
            onClienteCreado={(nuevo) => {
                MOCK_CLIENTES.unshift(nuevo);
                setClienteCreditoId(nuevo.id); 
                setShowNewClientModal(false);
            }}
        />
      )}

      <div className="fixed right-6 z-50 flex flex-col items-end gap-3 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div
          className={`flex flex-col gap-3 transition-all duration-200 origin-bottom-right ${
            isFabOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={() => {
              setIsFabOpen(false)
              setShowCreditoTipoModal(true)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear Crédito</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <CreditCard className="h-5 w-5" />
            </div>
          </button>

          <button
            onClick={() => {
              setIsFabOpen(false)
              setShowPagoModal(true)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Registrar pago</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <DollarSign className="h-5 w-5" />
            </div>
          </button>

          <button
            onClick={() => {
              setIsFabOpen(false)
              setShowNewClientModal(true)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear cliente</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <UserPlus className="h-5 w-5" />
            </div>
          </button>
        </div>

        <button
          onClick={() => setIsFabOpen((v) => !v)}
          className="pointer-events-auto h-14 w-14 rounded-full bg-[#08557f] text-white shadow-xl shadow-[#08557f]/25 flex items-center justify-center border border-white/30"
          aria-label={isFabOpen ? 'Cerrar acciones' : 'Abrir acciones'}
        >
          {isFabOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  )
}

export default VistaSupervisor