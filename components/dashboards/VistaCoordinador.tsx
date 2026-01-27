'use client'

import Link from 'next/link';
import { useState } from 'react';
import { 
  Bell, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Users, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  ChevronRight, 
  RefreshCw, 
  Shield, 
  Wallet, 
  Route, 
  BarChart3, 
  FileText, 
  UserPlus, 
  CalendarClock, 
  Zap,
  Target,
  ArrowRight,
  PieChart,
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

interface ApprovalItem {
  id: number;
  type: 'cliente' | 'credito' | 'gasto' | 'base-dinero' | 'prorroga';
  description: string;
  requestedBy: string;
  time: string;
  amount?: number;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
}

interface DelinquentAccount {
  id: number;
  client: string;
  daysLate: number;
  amountDue: number;
  collector: string;
  route: string;
  status: 'critical' | 'moderate' | 'mild';
}

interface BaseRequest {
  id: number;
  collector: string;
  amount: number;
  reason: string;
  time: string;
  status: 'pending' | 'approved' | 'rejected';
}

const VistaCoordinador = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const currentDate = new Date();

  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
  }

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
      title: 'Aprobaciones Pendientes',
      value: '12',
      change: 8.2,
      icon: <Bell className="h-4 w-4" />,
      color: '#08557f',
      trendData: [65, 70, 75, 78, 82, 85, 88, 90, 92, 95, 96, 98]
    },
    {
      title: 'Cuentas en Mora',
      value: '24',
      change: -3.4,
      icon: <AlertCircle className="h-4 w-4" />,
      color: '#ef4444',
      trendData: [12, 11, 10, 9, 8, 7, 6, 5.5, 5, 4.8, 4.5, 4.5]
    },
    {
      title: 'Base Solicitada',
      value: '$150K',
      change: 12.5,
      icon: <Wallet className="h-4 w-4" />,
      color: '#fb851b',
      trendData: [85, 87, 88, 89, 90, 91, 92, 93, 93.5, 94, 94.2, 94.2]
    },
    {
      title: 'Eficiencia',
      value: '92.3%',
      change: 1.8,
      icon: <Target className="h-4 w-4" />,
      color: '#10b981',
      trendData: [80, 81, 82, 83, 84, 85, 86, 86.5, 87, 87.2, 87.3, 87.3]
    }
  ];

  // Accesos rápidos
  const quickAccess: QuickAccessItem[] = [
    {
      title: 'Crear Crédito',
      subtitle: 'Definir tasas y cuotas',
      icon: <CreditCard className="h-5 w-5" />,
      color: '#08557f',
      href: '/coordinador/creditos/nuevo'
    },
    {
      title: 'Asignar Rutas',
      subtitle: 'Supervisión de cobro',
      icon: <Route className="h-5 w-5" />,
      color: '#10b981',
      href: '/coordinador/rutas'
    },
    {
      title: 'Gestionar Prórrogas',
      subtitle: 'Autorización de reprogramación',
      icon: <CalendarClock className="h-5 w-5" />,
      color: '#fb851b',
      href: '/coordinador/prorrogas'
    },
    {
      title: 'Reportes',
      subtitle: 'Flujo de caja y rendimiento',
      icon: <BarChart3 className="h-5 w-5" />,
      color: '#8b5cf6',
      href: '/coordinador/reportes'
    }
  ];

  // Datos de aprobaciones
  const approvalItems: ApprovalItem[] = [
    { id: 1, type: 'cliente', description: 'Nuevo cliente', requestedBy: 'Carlos R.', time: '09:30', details: 'Juan Pérez - Documento 12345678', status: 'pending', priority: 'high' },
    { id: 2, type: 'credito', description: 'Solicitud de crédito', requestedBy: 'María G.', time: '10:15', amount: 2500000, details: 'Refrigerador LG 320L - 12 meses', status: 'pending', priority: 'high' },
    { id: 3, type: 'gasto', description: 'Gasto operativo', requestedBy: 'Pedro S.', time: '11:45', amount: 35000, details: 'Combustible y mantenimiento', status: 'pending', priority: 'medium' },
    { id: 4, type: 'base-dinero', description: 'Base de efectivo', requestedBy: 'Ana L.', time: '12:20', amount: 150000, details: 'Para cambio a clientes', status: 'pending', priority: 'high' },
    { id: 5, type: 'prorroga', description: 'Prórroga de cuota', requestedBy: 'Luis M.', time: '13:10', details: 'Reprogramación hasta 14/01', status: 'pending', priority: 'medium' },
  ];

  // Cuentas en mora
  const delinquentAccounts: DelinquentAccount[] = [
    { id: 1, client: 'González M.', daysLate: 15, amountDue: 750000, collector: 'Juan Pérez', route: 'Norte', status: 'critical' },
    { id: 2, client: 'Rodríguez C.', daysLate: 8, amountDue: 450000, collector: 'María González', route: 'Centro', status: 'moderate' },
    { id: 3, client: 'Sánchez L.', daysLate: 5, amountDue: 250000, collector: 'Pedro Sánchez', route: 'Sur', status: 'mild' },
  ];

  // Solicitudes de base
  const baseRequests: BaseRequest[] = [
    { id: 1, collector: 'Juan Pérez', amount: 50000, reason: 'Cambio para clientes', time: '09:30', status: 'pending' },
    { id: 2, collector: 'Ana López', amount: 100000, reason: 'Nuevo préstamo inmediato', time: '11:00', status: 'pending' },
  ];

  // Actividad reciente
  const recentActivity = [
    { id: 1, client: 'González M.', action: 'Aprobación de crédito', amount: '$2.5M', time: '09:42', status: 'approved' },
    { id: 2, client: 'López C.', action: 'Prórroga autorizada', amount: '-', time: '10:15', status: 'approved' },
    { id: 3, client: 'Martínez A.', action: 'Cuenta en mora revisada', amount: '$750K', time: '11:30', status: 'alert' },
    { id: 4, client: 'Ramírez P.', action: 'Base de efectivo aprobada', amount: '$150K', time: '13:20', status: 'approved' },
    { id: 5, client: 'Sánchez L.', action: 'Nuevo cliente aprobado', amount: '-', time: '14:45', status: 'approved' }
  ];

  // Funciones de aprobación/rechazo
  const handleApprove = (id: number, type: 'approval' | 'base') => {
    console.log(`Aprobado ${type} con id: ${id}`);
    // Aquí iría la lógica de aprobación
  };

  const handleReject = (id: number, type: 'approval' | 'base') => {
    console.log(`Rechazado ${type} con id: ${id}`);
    // Aquí iría la lógica de rechazo
  };

  // Función para obtener el color según el estado/prioridad
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'moderate': return '#f59e0b';
      case 'mild': return '#10b981';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Función para obtener el icono según el tipo
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cliente': return <UserPlus className="h-4 w-4" />;
      case 'credito': return <CreditCard className="h-4 w-4" />;
      case 'gasto': return <FileText className="h-4 w-4" />;
      case 'base-dinero': return <Wallet className="h-4 w-4" />;
      case 'prorroga': return <CalendarClock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Encabezado del dashboard */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-[#08557f] to-[#063a58] rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-gray-800">Coordinación Central</h1>
                <p className="text-sm text-gray-500">Gestión operativa y aprobaciones</p>
              </div>
            </div>
            <p className="text-sm text-gray-500" suppressHydrationWarning>{formatDate(currentDate)}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <RefreshCw className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Actualizar</span>
            </button>
            <ExportButton 
              label="Exportar" 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </div>
        
        {/* Filtro de tiempo */}
        <div className="mt-4 flex items-center space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
          {['Hoy', 'Sem', 'Mes', 'Trim'].map((item, index) => {
            const values = ['today', 'week', 'month', 'quarter'] as const;
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
            );
          })}
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
              <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color === '#08557f' ? 'from-[#08557f]/10 to-[#08557f]/5' : metric.color === '#ef4444' ? 'from-[#ef4444]/10 to-[#ef4444]/5' : metric.color === '#fb851b' ? 'from-[#fb851b]/10 to-[#fb851b]/5' : 'from-[#10b981]/10 to-[#10b981]/5'}`}>
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
        {/* Columna izquierda: Aprobaciones y Acciones rápidas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bandeja de aprobaciones */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Bandeja de Aprobaciones</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{approvalItems.filter(item => item.status === 'pending').length} pendientes</span>
                <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Ver todos <ChevronRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {approvalItems.map((item) => (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${getStatusColor(item.priority)}10` }}>
                        <div style={{ color: getStatusColor(item.priority) }}>
                          {getTypeIcon(item.type)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-800">{item.description}</h3>
                          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ 
                            backgroundColor: `${getStatusColor(item.priority)}15`,
                            color: getStatusColor(item.priority)
                          }}>
                            {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{item.details}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {item.requestedBy}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.time}
                          </span>
                          {item.amount && (
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${item.amount.toLocaleString('es-CO')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleApprove(item.id, 'approval')}
                        className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                        title="Aprobar"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleReject(item.id, 'approval')}
                        className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                        title="Rechazar"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Acciones Rápidas</h2>
              <Zap className="h-5 w-5 text-[#fb851b]" />
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
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: Cuentas en mora, Base de efectivo y Actividad */}
        <div className="space-y-6">
          {/* Cuentas en mora */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Cuentas en Mora</h2>
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {delinquentAccounts.map((account) => (
                <div key={account.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(account.status) }}></div>
                      <h3 className="font-medium text-gray-800">{account.client}</h3>
                    </div>
                    <span className="text-sm font-medium px-2 py-1 rounded-full" style={{ 
                      backgroundColor: `${getStatusColor(account.status)}15`,
                      color: getStatusColor(account.status)
                    }}>
                      {account.daysLate} días
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Monto:</span>
                      <span className="font-medium text-gray-800">${account.amountDue.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Cobrador:</span>
                      <span className="font-medium text-gray-800">{account.collector}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Ruta:</span>
                      <span className="font-medium text-gray-800">{account.route}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 py-2 text-sm bg-[#08557f] text-white rounded-lg hover:bg-[#063a58] transition-colors">
                      Revisar
                    </button>
                    <button className="flex-1 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solicitudes de base de efectivo */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-light text-amber-900">Base de Efectivo</h2>
                <p className="text-sm text-amber-700">Solicitudes pendientes</p>
              </div>
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
            
            <div className="space-y-4">
              {baseRequests.map((request) => (
                <div key={request.id} className="p-4 bg-white/80 border border-amber-300 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">{request.collector}</h3>
                      <p className="text-sm text-gray-600">{request.reason}</p>
                    </div>
                    <span className="text-lg font-medium text-[#fb851b]">
                      ${request.amount.toLocaleString('es-CO')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{request.time}</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                      Pendiente
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleApprove(request.id, 'base')}
                      className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar
                    </button>
                    <button 
                      onClick={() => handleReject(request.id, 'base')}
                      className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lógica de prórrogas */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CalendarClock className="h-5 w-5 text-[#fb851b]" />
              <h3 className="text-lg font-light text-gray-800">Lógica de Prórrogas</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Fecha actual</span>
                  <span className="text-sm font-medium text-gray-800">13 Enero</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Próximo corte</span>
                  <span className="text-sm font-medium text-[#08557f]">15 Enero</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reprogramación máxima</span>
                  <span className="text-sm font-medium text-[#fb851b]">14 Enero</span>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <AlertCircle className="h-4 w-4 inline mr-2 text-amber-500" />
                Las prórrogas no pueden exceder el día anterior al corte de caja.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-light text-gray-800">Actividad Reciente</h2>
          <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Ver todo <ChevronRight className="inline h-4 w-4 ml-1" />
          </button>
        </div>
        
        <div className="space-y-4">
          {recentActivity.map((item) => (
            <div key={item.id} className="group p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-800">{item.client}</div>
                  <div className="text-sm text-gray-500">{item.action}</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${
                  item.status === 'approved' ? 'bg-green-100 text-green-800' :
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Cobradores Activos', value: '8', icon: <Users className="h-5 w-5" />, color: '#08557f' },
            { label: 'Créditos Aprobados', value: '42', icon: <CreditCard className="h-5 w-5" />, color: '#10b981' },
            { label: 'Rutas Activas', value: '5', icon: <Route className="h-5 w-5" />, color: '#fb851b' },
            { label: 'Tasa de Aprobación', value: '94%', icon: <PieChart className="h-5 w-5" />, color: '#8b5cf6' }
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

      {/* Footer sutil */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Actualizado en tiempo real • Última sincronización: {new Date().toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { width: 0%; }
          to { width: var(--target-width); }
        }
        
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

export default VistaCoordinador;