'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calendar,
  Clock,
  Eye,
  Filter,
  Map,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { ExportButton } from '@/components/ui/ExportButton'

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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })
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
                <div
                  className={`flex items-center gap-1 text-sm ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-light text-gray-800">Clientes Atrasados</h2>
                  <p className="text-sm text-gray-500">Prioriza la mora crítica y gestiona en campo</p>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <Link
                    href="/supervisor/clientes"
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Ver módulo <ArrowRight className="inline h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                {delinquentClients.map(client => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: getStatusColor(client.status) }}
                      />
                      <div>
                        <div className="text-sm font-bold text-slate-900">{client.client}</div>
                        <div className="text-xs font-medium text-slate-500">
                          Ruta: {client.route} · Cobrador: {client.collector}
                        </div>
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
                {collectors.map(c => (
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

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Accesos</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Nuevo Cliente', href: '/supervisor/clientes/nuevo', icon: <Users className="h-4 w-4" /> },
                { label: 'Nuevo Crédito', href: '/supervisor/creditos/nuevo', icon: <BarChart3 className="h-4 w-4" /> },
                { label: 'Clientes', href: '/supervisor/clientes', icon: <Users className="h-4 w-4" /> },
                { label: 'Reportes operativos', href: '/supervisor/reportes/operativos', icon: <BarChart3 className="h-4 w-4" /> },
                { label: 'Perfil', href: '/supervisor/perfil', icon: <Eye className="h-4 w-4" /> },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div className="text-sm font-bold text-slate-800">{item.label}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VistaSupervisor