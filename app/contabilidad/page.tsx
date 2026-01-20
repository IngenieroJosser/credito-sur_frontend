'use client'

import Link from 'next/link';
import { useState } from 'react';
import {
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  CreditCard,
  Banknote,
  PieChart,
  BarChart3,
  FileText,
  Filter,
  Download,
  Calendar,
  ArrowUpRight,
  Activity,
  Wallet,
  Shield,
  List,
  Calculator,
  Archive,
  RefreshCw
} from 'lucide-react';

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

const DashboardContable = () => {
  const [timeFilter, setTimeFilter] = useState<'hoy' | 'semana' | 'mes' | 'trimestre'>('mes');
  const [cajaFilter, setCajaFilter] = useState<'principal' | 'ruta' | 'todas'>('todas');
  
  const currentDate = new Date();
  
  // Formatear fecha
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-ES', options);
  };

  // Métricas principales para contable
  const mainMetrics: MetricCard[] = [
    {
      title: 'Valor Inventario',
      value: '$1.2M',
      change: 5.4,
      icon: <Package className="h-4 w-4" />,
      color: '#08557f',
      trendData: [85, 87, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108]
    },
    {
      title: 'Caja Principal',
      value: '$450K',
      change: 3.2,
      icon: <Wallet className="h-4 w-4" />,
      color: '#10b981',
      trendData: [85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96]
    },
    {
      title: 'Caja de Ruta',
      value: '$85K',
      change: -1.8,
      icon: <Banknote className="h-4 w-4" />,
      color: '#fb851b',
      trendData: [100, 98, 96, 94, 92, 90, 88, 86, 85, 84, 83, 82]
    },
    {
      title: 'Pérdidas Acumuladas',
      value: '$15.3K',
      change: 0.5,
      icon: <AlertCircle className="h-4 w-4" />,
      color: '#ef4444',
      trendData: [10, 11, 12, 13, 14, 15, 15.1, 15.2, 15.3, 15.3, 15.3, 15.3]
    }
  ];

  // Accesos rápidos específicos de contable
  const quickAccess: QuickAccessItem[] = [
    {
      title: 'Gestión Inventario',
      subtitle: 'Productos y precios',
      icon: <Package className="h-5 w-5" />,
      color: '#08557f',
      href: '/admin/contable/inventario'
    },
    {
      title: 'Control de Cajas',
      subtitle: 'Principal y rutas',
      icon: <Wallet className="h-5 w-5" />,
      color: '#10b981',
      badge: 3,
      href: '/admin/contable/cajas'
    },
    {
      title: 'Lista Negra',
      subtitle: 'Clientes vetados',
      icon: <Shield className="h-5 w-5" />,
      color: '#ef4444',
      badge: 7,
      href: '/admin/contable/lista-negra'
    },
    {
      title: 'Reporte Financiero',
      subtitle: 'Capital vs Interés',
      icon: <BarChart3 className="h-5 w-5" />,
      color: '#8b5cf6',
      href: '/admin/contable/reportes/financiero'
    }
  ];

  // Datos de desglose capital vs interés
  const capitalInteresData = [
    { month: 'Ene', capital: 250000, interes: 45000 },
    { month: 'Feb', capital: 280000, interes: 48000 },
    { month: 'Mar', capital: 320000, interes: 52000 },
    { month: 'Abr', capital: 295000, interes: 51000 },
    { month: 'May', capital: 310000, interes: 53000 },
    { month: 'Jun', capital: 350000, interes: 58000 },
  ];

  // Movimientos recientes de caja
  const movimientosCaja = [
    { id: 1, tipo: 'Ingreso', descripcion: 'Cobro ruta Norte', monto: '$25,400', caja: 'Ruta', fecha: '10:30 AM', estado: 'completado' },
    { id: 2, tipo: 'Egreso', descripcion: 'Gastos operativos', monto: '$1,250', caja: 'Principal', fecha: '11:15 AM', estado: 'completado' },
    { id: 3, tipo: 'Ingreso', descripcion: 'Transferencia cliente', monto: '$8,500', caja: 'Principal', fecha: '02:45 PM', estado: 'pendiente' },
    { id: 4, tipo: 'Egreso', descripcion: 'Compra materiales', monto: '$3,800', caja: 'Principal', fecha: '09:20 AM', estado: 'completado' },
    { id: 5, tipo: 'Ingreso', descripcion: 'Cobro ruta Sur', monto: '$18,750', caja: 'Ruta', fecha: '04:10 PM', estado: 'en proceso' },
  ];

  // Productos con menor stock
  const lowStockProducts = [
    { id: 1, name: 'Refrigerador LG 320L', stock: 3, costo: '$850', venta: '$1,200' },
    { id: 2, name: 'Lavadora Mabe 18kg', stock: 2, costo: '$720', venta: '$1,050' },
    { id: 3, name: 'Microondas Samsung', stock: 4, costo: '$180', venta: '$280' },
    { id: 4, name: 'Televisor 55" Sony', stock: 1, costo: '$1,200', venta: '$1,800' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Encabezado del dashboard */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-gray-800">Panel Contable</h1>
                <p className="text-sm text-gray-500">Gestión financiera y control de cajas</p>
              </div>
            </div>
            <p className="text-sm text-gray-400" suppressHydrationWarning>
              {formatDate(currentDate)} • Última actualización: {new Date().toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Filtro de caja */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              {['Todas', 'Principal', 'Ruta'].map((item, index) => {
                const values = ['todas', 'principal', 'ruta'] as const;
                return (
                  <button
                    key={item}
                    onClick={() => setCajaFilter(values[index])}
                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                      cajaFilter === values[index] 
                        ? 'bg-white text-gray-800 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            
            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <Download className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Exportar</span>
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
                metric.color === '#10b981' ? 'from-[#10b981]/10 to-[#10b981]/5' : 
                metric.color === '#ef4444' ? 'from-[#ef4444]/10 to-[#ef4444]/5' : 
                'from-[#fb851b]/10 to-[#fb851b]/5'
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
            
            {/* Mini gráfico */}
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

      {/* Sección principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Accesos rápidos y gráfico */}
        <div className="lg:col-span-2 space-y-6">
          {/* Accesos rápidos */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Acciones Contables</h2>
              <Link href="/admin/contable" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Ver todos <ArrowUpRight className="inline h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Gráfico Capital vs Interés */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-light text-gray-800">Desglose Capital vs Interés</h2>
                <p className="text-sm text-gray-500">Últimos 6 meses</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-xs text-gray-600">Capital</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-xs text-gray-600">Interés</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-end h-48 space-x-2">
                {capitalInteresData.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="flex items-end w-full justify-center space-x-1 mb-2">
                      {/* Barra capital */}
                      <div 
                        className="w-4 bg-blue-500 rounded-t"
                        style={{ 
                          height: `${(item.capital / 400000) * 100}%`,
                          minHeight: '20px'
                        }}
                      ></div>
                      {/* Barra interés */}
                      <div 
                        className="w-4 bg-green-500 rounded-t"
                        style={{ 
                          height: `${(item.interes / 60000) * 100}%`,
                          minHeight: '20px'
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{item.month}</span>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-light text-blue-600 mb-1">
                    ${capitalInteresData.reduce((sum, item) => sum + item.capital, 0).toLocaleString('es-CO')}
                  </div>
                  <div className="text-sm text-blue-500">Capital Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-light text-green-600 mb-1">
                    ${capitalInteresData.reduce((sum, item) => sum + item.interes, 0).toLocaleString('es-CO')}
                  </div>
                  <div className="text-sm text-green-500">Interés Total</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha - Movimientos y alertas */}
        <div className="space-y-6">
          {/* Movimientos recientes */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Movimientos de Caja</h2>
              <RefreshCw className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>
            
            <div className="space-y-4">
              {movimientosCaja.map((item) => (
                <div key={item.id} className="group p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          item.tipo === 'Ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.tipo}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {item.caja}
                        </span>
                      </div>
                      <div className="font-medium text-gray-800 text-sm">{item.descripcion}</div>
                    </div>
                    <div className={`text-sm font-medium ${
                      item.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.monto}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{item.fecha}</span>
                    <span className={`px-2 py-0.5 rounded ${
                      item.estado === 'completado' ? 'bg-green-100 text-green-800' :
                      item.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {item.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Productos con bajo stock */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-light text-amber-800">Inventario Bajo</h2>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-200 text-amber-800">
                {lowStockProducts.length} productos
              </span>
            </div>
            
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="p-3 bg-white/50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-amber-900 text-sm">{product.name}</div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.stock <= 2 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      Stock: {product.stock}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-amber-700">
                    <span>Costo: {product.costo}</span>
                    <span>Venta: {product.venta}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <Link 
              href="/admin/contable/inventario"
              className="mt-4 block text-center text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              Ver inventario completo →
            </Link>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Artículos en Inventario', value: '147', icon: <Package className="h-5 w-5" />, color: '#08557f' },
            { label: 'Clientes en Lista Negra', value: '23', icon: <Shield className="h-5 w-5" />, color: '#ef4444' },
            { label: 'Cuentas Archivadas', value: '15', icon: <Archive className="h-5 w-5" />, color: '#8b5cf6' },
            { label: 'Margen Promedio', value: '42.5%', icon: <TrendingUp className="h-5 w-5" />, color: '#10b981' }
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

      {/* Reportes rápidos */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          href="/admin/contable/reportes/financiero"
          className="p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl hover:border-blue-200 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <div className="font-medium text-gray-800">Reporte Financiero</div>
              <div className="text-sm text-gray-500">Capital, interés, mora</div>
            </div>
          </div>
        </Link>
        
        <Link 
          href="/admin/contable/reportes/cajas"
          className="p-4 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl hover:border-green-200 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Wallet className="h-8 w-8 text-green-600" />
            <div>
              <div className="font-medium text-gray-800">Estado de Cajas</div>
              <div className="text-sm text-gray-500">Principal y rutas</div>
            </div>
          </div>
        </Link>
        
        <Link 
          href="/admin/contable/reportes/inventario"
          className="p-4 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl hover:border-purple-200 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <List className="h-8 w-8 text-purple-600" />
            <div>
              <div className="font-medium text-gray-800">Valoración Inventario</div>
              <div className="text-sm text-gray-500">Productos y precios</div>
            </div>
          </div>
        </Link>
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

export default DashboardContable;