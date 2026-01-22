'use client'

import Link from 'next/link';
import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Users, 
  CreditCard, 
  DollarSign, 
  PieChart, 
  Target, 
  Filter, 
  ChevronRight, 
  Calendar, 
  ArrowUpRight, 
  Activity, 
  Wallet, 
  Receipt, 
  MapPin, 
  BarChart3, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Shield
} from 'lucide-react';
import { ExportButton } from '@/components/ui/ExportButton';

interface MetricCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  trendData: number[];
}

interface QuickAccessItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  badge?: number;
  href: string;
}

interface DelinquentClient {
  id: number;
  name: string;
  daysLate: number;
  amountDue: number;
  collector: string;
  route: string;
  lastPayment: string;
  status: 'critical' | 'moderate' | 'mild';
}

interface RouteExpense {
  id: number;
  collector: string;
  amount: number;
  description: string;
  date: string;
  receipt?: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface RoutePerformance {
  id: number;
  route: string;
  efficiency: number;
  collectionRate: number;
  clientsVisited: number;
  target: number;
}

const DashboardSupervisor = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'moderate' | 'mild'>('all');
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  
  const currentDate = new Date();
  
  // Formatear fecha elegante
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-ES', options);
  };

  // Métricas principales
  const mainMetrics: MetricCard[] = [
    {
      title: 'Cartera en Mora',
      value: '$2.1M',
      change: -2.4,
      icon: <AlertCircle className="h-4 w-4" />,
      color: '#ef4444',
      trendData: [85, 80, 78, 75, 73, 70, 68, 65, 63, 60, 58, 55]
    },
    {
      title: 'Eficiencia Total',
      value: '88.5%',
      change: 3.2,
      icon: <Target className="h-4 w-4" />,
      color: '#10b981',
      trendData: [80, 81, 82, 83, 84, 85, 86, 87, 88, 88.2, 88.4, 88.5]
    },
    {
      title: 'Gastos Pendientes',
      value: '8',
      change: -1.2,
      icon: <Receipt className="h-4 w-4" />,
      color: '#fb851b',
      trendData: [15, 14, 13, 12, 11, 10, 9, 8.5, 8, 8, 8, 8]
    },
    {
      title: 'Clientes Críticos',
      value: '24',
      change: 5.6,
      icon: <Users className="h-4 w-4" />,
      color: '#08557f',
      trendData: [18, 19, 20, 21, 22, 23, 23.5, 24, 24, 24, 24, 24]
    }
  ];

  // Accesos rápidos elegantes
  const quickAccess: QuickAccessItem[] = [
    {
      title: 'Monitoreo de Cartera',
      subtitle: 'Clientes atrasados',
      icon: <CreditCard className="h-5 w-5" />,
      color: '#08557f',
      href: '/supervisor/cartera'
    },
    {
      title: 'Aprobar Gastos',
      subtitle: 'Gastos de ruta',
      icon: <Receipt className="h-5 w-5" />,
      color: '#fb851b',
      badge: 8,
      href: '/supervisor/gastos'
    },
    {
      title: 'Reportes de Ruta',
      subtitle: 'Desempeño por cobrador',
      icon: <BarChart3 className="h-5 w-5" />,
      color: '#10b981',
      href: '/supervisor/reportes'
    },
    {
      title: 'Mapa de Morosidad',
      subtitle: 'Visualización geográfica',
      icon: <MapPin className="h-5 w-5" />,
      color: '#8b5cf6',
      href: '/supervisor/mapa'
    }
  ];

  // Clientes en mora
  const delinquentClients: DelinquentClient[] = [
    { id: 1, name: 'González M.', daysLate: 15, amountDue: 750000, collector: 'Juan Pérez', route: 'Ruta Norte', lastPayment: '15/12/2023', status: 'critical' },
    { id: 2, name: 'Rodríguez C.', daysLate: 8, amountDue: 450000, collector: 'María González', route: 'Ruta Centro', lastPayment: '22/12/2023', status: 'moderate' },
    { id: 3, name: 'Sánchez L.', daysLate: 5, amountDue: 250000, collector: 'Pedro Sánchez', route: 'Ruta Sur', lastPayment: '25/12/2023', status: 'mild' },
    { id: 4, name: 'Martínez A.', daysLate: 12, amountDue: 600000, collector: 'Ana López', route: 'Ruta Este', lastPayment: '18/12/2023', status: 'critical' },
    { id: 5, name: 'Ramírez P.', daysLate: 3, amountDue: 150000, collector: 'Luis Martínez', route: 'Ruta Oeste', lastPayment: '27/12/2023', status: 'mild' },
  ];

  // Gastos de ruta pendientes
  const routeExpenses: RouteExpense[] = [
    { id: 1, collector: 'Juan Pérez', amount: 35000, description: 'Combustible y mantenimiento', date: 'Hoy, 08:30', status: 'pending' },
    { id: 2, collector: 'María González', amount: 25000, description: 'Almuerzo y refrigerios', date: 'Hoy, 10:15', status: 'pending' },
    { id: 3, collector: 'Pedro Sánchez', amount: 15000, description: 'Transporte público', date: 'Ayer, 14:45', status: 'pending' },
    { id: 4, collector: 'Ana López', amount: 20000, description: 'Parqueadero y peajes', date: 'Ayer, 16:20', status: 'pending' },
    { id: 5, collector: 'Luis Martínez', amount: 30000, description: 'Materiales de cobranza', date: '02/01, 11:30', status: 'pending' },
  ];

  // Desempeño por ruta
  const routePerformance: RoutePerformance[] = [
    { id: 1, route: 'Ruta Norte', efficiency: 92, collectionRate: 95, clientsVisited: 45, target: 50 },
    { id: 2, route: 'Ruta Sur', efficiency: 88, collectionRate: 90, clientsVisited: 38, target: 40 },
    { id: 3, route: 'Ruta Centro', efficiency: 85, collectionRate: 87, clientsVisited: 42, target: 45 },
    { id: 4, route: 'Ruta Este', efficiency: 90, collectionRate: 92, clientsVisited: 35, target: 38 },
    { id: 5, route: 'Ruta Oeste', efficiency: 87, collectionRate: 89, clientsVisited: 40, target: 42 },
  ];

  // Actividad reciente
  const recentActivity = [
    { id: 1, action: 'Gasto aprobado', details: 'Combustible - Juan Pérez', amount: '$35,000', time: '09:42', status: 'approved' },
    { id: 2, action: 'Cliente en mora detectado', details: 'González M. - 15 días', amount: '$750,000', time: '10:15', status: 'alert' },
    { id: 3, action: 'Reporte generado', details: 'Desempeño Ruta Norte', amount: '-', time: '11:30', status: 'info' },
    { id: 4, action: 'Visita programada', details: 'Rodríguez C. - Ruta Centro', amount: '-', time: '13:20', status: 'info' },
    { id: 5, action: 'Gasto rechazado', details: 'Materiales innecesarios', amount: '$15,000', time: '14:45', status: 'rejected' }
  ];

  // Filtrar clientes por estado
  const filteredClients = statusFilter === 'all' 
    ? delinquentClients 
    : delinquentClients.filter(client => client.status === statusFilter);

  // Filtrar gastos por estado
  const filteredExpenses = expenseFilter === 'all'
    ? routeExpenses
    : routeExpenses.filter(expense => expense.status === expenseFilter);

  // Función para aprobar gasto
  const approveExpense = (id: number) => {
    console.log(`Gasto ${id} aprobado`);
    // En una implementación real, esto actualizaría el estado
  };

  // Función para rechazar gasto
  const rejectExpense = (id: number) => {
    console.log(`Gasto ${id} rechazado`);
    // En una implementación real, esto actualizaría el estado
  };

  // Función para obtener el color según el estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'moderate': return '#f59e0b';
      case 'mild': return '#10b981';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'alert': return '#ef4444';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10 w-full space-y-8 p-8">
      {/* Encabezado del dashboard */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-[#08557f] to-[#063a58] rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-gray-800">Supervisión Operativa</h1>
                <p className="text-sm text-gray-500">Monitoreo y control en campo</p>
              </div>
            </div>
            <p className="text-sm text-gray-500" suppressHydrationWarning>{formatDate(currentDate)}</p>
          </div>
          <ExportButton 
            label="Exportar Reportes" 
            onExportExcel={handleExportExcel} 
            onExportPDF={handleExportPDF} 
          />
        </div>
        
        {/* Filtros */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
            {['Hoy', 'Sem', 'Mes', 'Trim'].map((item, index) => {
              const values = ['today', 'week', 'month', 'quarter'] as const;
              const isSelected = timeFilter === values[index];
              return (
                <button
                  key={item}
                  onClick={() => setTimeFilter(values[index])}
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isSelected
                      ? 'bg-white text-[#08557f] shadow-sm ring-1 ring-black/5' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          
          <div className="h-6 w-px bg-gray-200 mx-1"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-full px-4 py-1.5 border text-xs font-medium transition-all ${
                statusFilter === 'all'
                  ? "border-[#08557f] bg-[#08557f] text-white shadow-md shadow-[#08557f]/20"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('critical')}
              className={`rounded-full px-4 py-1.5 border text-xs font-medium transition-all ${
                statusFilter === 'critical'
                  ? "border-red-500 bg-red-500 text-white shadow-md shadow-red-500/20"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Críticos
            </button>
            <button
              onClick={() => setStatusFilter('moderate')}
              className={`rounded-full px-4 py-1.5 border text-xs font-medium transition-all ${
                statusFilter === 'moderate'
                  ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Moderados
            </button>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mainMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-lg transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${
                metric.color === '#08557f' ? 'from-[#08557f]/10 to-[#08557f]/5' : 
                metric.color === '#ef4444' ? 'from-[#ef4444]/10 to-[#ef4444]/5' : 
                metric.color === '#fb851b' ? 'from-[#fb851b]/10 to-[#fb851b]/5' : 
                'from-[#10b981]/10 to-[#10b981]/5'
              }`}>
                <div style={{ color: metric.color }}>
                  {metric.icon}
                </div>
              </div>
              <div className={`flex items-center space-x-1 text-sm ${
                metric.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{metric.change >= 0 ? '+' : ''}{metric.change}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-light text-gray-800">{metric.value}</div>
              <div className="text-sm text-gray-500">{metric.title}</div>
            </div>
            
            {/* Mini gráfico elegante */}
            <div className="mt-4 h-1 flex items-end space-x-px">
              {metric.trendData.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-full"
                  style={{
                    height: `${value * 0.6}%`,
                    backgroundColor: metric.color,
                    opacity: 0.3 + (i / metric.trendData.length) * 0.7
                  }}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Columna izquierda: Clientes en mora y Acciones rápidas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clientes en mora */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-light text-gray-800">Clientes en Estado Crítico</h2>
                <p className="text-sm text-gray-500">Monitoreo de cartera atrasada</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {filteredClients.length} clientes
                </span>
                <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Ver todos <ChevronRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredClients.slice(0, 4).map((client) => (
                <div key={client.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ 
                        backgroundColor: `${getStatusColor(client.status)}15`
                      }}>
                        <User className="h-5 w-5" style={{ color: getStatusColor(client.status) }} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-800">{client.name}</h3>
                          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ 
                            backgroundColor: `${getStatusColor(client.status)}15`,
                            color: getStatusColor(client.status)
                          }}>
                            {client.status === 'critical' ? 'Crítico' : 
                             client.status === 'moderate' ? 'Moderado' : 'Leve'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{client.daysLate} días de mora</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {client.route}
                          </span>
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {client.collector}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Último pago: {client.lastPayment}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-medium text-gray-800">
                        ${client.amountDue.toLocaleString('es-CO')}
                      </div>
                      <div className="text-sm text-gray-500">Monto adeudado</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 py-2 text-sm bg-[#08557f] text-white rounded-lg hover:bg-[#063a58] transition-colors">
                      Programar visita
                    </button>
                    <button className="flex-1 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Ver detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Acciones de Supervisión</h2>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickAccess.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="group p-4 border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all duration-300 text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${item.color}10` }}>
                      <div style={{ color: item.color }}>
                        {item.icon}
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: Gastos pendientes y Desempeño */}
        <div className="space-y-6">
          {/* Gastos de ruta pendientes */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-light text-gray-800">Gastos Pendientes</h2>
                <p className="text-sm text-gray-500">Aprobación de gastos operativos</p>
              </div>
              <select 
                value={expenseFilter}
                onChange={(e) => setExpenseFilter(e.target.value as any)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1 bg-white"
              >
                <option value="pending">Pendientes</option>
                <option value="all">Todos</option>
                <option value="approved">Aprobados</option>
                <option value="rejected">Rechazados</option>
              </select>
            </div>
            
            <div className="space-y-4">
              {filteredExpenses.slice(0, 3).map((expense) => (
                <div key={expense.id} className="p-4 border border-gray-200 rounded-xl hover:border-[#08557f]/30 hover:shadow-md transition-all duration-300 bg-white group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800 group-hover:text-[#08557f] transition-colors">{expense.collector}</h3>
                      <p className="text-sm text-gray-500">{expense.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-[#08557f]">
                        ${expense.amount.toLocaleString('es-CO')}
                      </div>
                      <div className="text-sm text-gray-500">{expense.date}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {expense.receipt && (
                      <button className="text-sm text-[#08557f] hover:text-[#063a58] flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver comprobante
                      </button>
                    )}
                    {expense.status === 'pending' && (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => approveExpense(expense.id)}
                          className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium transition-colors flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprobar
                        </button>
                        <button 
                          onClick={() => rejectExpense(expense.id)}
                          className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition-colors flex items-center"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desempeño por ruta */}
          <div className="bg-gradient-to-br from-[#08557f]/5 to-[#08557f]/10 border border-[#08557f]/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-light text-gray-800">Desempeño por Ruta</h2>
                <p className="text-sm text-gray-600">Eficiencia y cumplimiento</p>
              </div>
              <BarChart3 className="h-5 w-5 text-[#08557f]" />
            </div>
            
            <div className="space-y-4">
              {routePerformance.map((route) => (
                <div key={route.id} className="p-3 bg-white/80 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-800">{route.route}</h3>
                    <span className={`text-sm font-medium ${
                      route.efficiency >= 90 ? 'text-green-600' :
                      route.efficiency >= 85 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {route.efficiency}%
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Tasa de cobro</span>
                        <span>{route.collectionRate}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#08557f] to-[#063a58] rounded-full"
                          style={{ width: `${route.collectionRate}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Clientes visitados</span>
                        <span>{route.clientsVisited}/{route.target}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#fb851b] to-amber-500 rounded-full"
                          style={{ width: `${(route.clientsVisited / route.target) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actividad reciente y stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Actividad reciente */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-light text-gray-800">Actividad Reciente</h2>
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="group p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-800">{item.action}</div>
                    <div className="text-sm text-gray-500">{item.details}</div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    item.status === 'approved' ? 'bg-green-100 text-green-800' :
                    item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    item.status === 'alert' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {item.amount}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{item.time}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats adicionales */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'Rutas Activas', value: '5', icon: <MapPin className="h-5 w-5" />, color: '#08557f' },
              { label: 'Cobradores Activos', value: '8', icon: <Users className="h-5 w-5" />, color: '#10b981' },
              { label: 'Gastos Aprobados', value: '$125K', icon: <Receipt className="h-5 w-5" />, color: '#fb851b' },
              { label: 'Visitas Programadas', value: '18', icon: <Calendar className="h-5 w-5" />, color: '#8b5cf6' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`inline-flex p-3 rounded-xl mb-3`} style={{ backgroundColor: `${stat.color}10` }}>
                  <div style={{ color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
                <div className="text-2xl font-light text-gray-800 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer sutil */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Sistema de Supervisión • Última actualización: {new Date().toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>

      <style jsx>{`
        .hover\:shadow-lg {
          transition: all 0.3s ease;
        }
        
        .hover\:shadow-lg:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
        }
      `}</style>
    </div>
  );
};

export default DashboardSupervisor;