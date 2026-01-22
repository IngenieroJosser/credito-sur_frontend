'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Search,
  Filter,
  TrendingUp,
  User,
  ChevronRight,
  Phone,
  MapPin,
  FileWarning,
  CheckCircle,
  Ban,
  AlertTriangle,
  LayoutGrid,
  List
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'

// Enums alineados con Prisma
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
type EstadoPrestamo = 'EN_MORA' | 'INCUMPLIDO' | 'PERDIDA';
type ViewMode = 'list' | 'grid';

interface CuentaMora {
  id: string
  numeroPrestamo: string
  cliente: {
    nombre: string
    documento: string
    telefono: string
    direccion: string
  }
  diasMora: number
  montoMora: number
  montoTotalDeuda: number
  cuotasVencidas: number
  ruta: string
  cobrador: string
  nivelRiesgo: NivelRiesgo
  estado: EstadoPrestamo
  ultimoPago?: string
}

const CuentasMoraPage = () => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
  }

  // Datos de ejemplo
  const cuentas: CuentaMora[] = [
    {
      id: '1',
      numeroPrestamo: 'P-2024-001',
      cliente: {
        nombre: 'Juan Pérez',
        documento: 'V-12345678',
        telefono: '310 123 4567',
        direccion: 'Av. Bolívar, Casa 5'
      },
      diasMora: 45,
      montoMora: 150000,
      montoTotalDeuda: 450000,
      cuotasVencidas: 3,
      ruta: 'Ruta Centro',
      cobrador: 'Carlos Ruiz',
      nivelRiesgo: 'ROJO',
      estado: 'EN_MORA',
      ultimoPago: '2023-12-15'
    },
    {
      id: '2',
      numeroPrestamo: 'P-2024-045',
      cliente: {
        nombre: 'María Rodríguez',
        documento: 'V-87654321',
        telefono: '320 765 4321',
        direccion: 'Barrio La Paz, Calle 3'
      },
      diasMora: 15,
      montoMora: 50000,
      montoTotalDeuda: 250000,
      cuotasVencidas: 1,
      ruta: 'Ruta Norte',
      cobrador: 'Ana López',
      nivelRiesgo: 'AMARILLO',
      estado: 'EN_MORA',
      ultimoPago: '2024-01-05'
    },
    {
      id: '3',
      numeroPrestamo: 'P-2023-189',
      cliente: {
        nombre: 'Roberto Gómez',
        documento: 'V-11223344',
        telefono: '315 112 2334',
        direccion: 'Urb. Los Pinos, Apto 4B'
      },
      diasMora: 95,
      montoMora: 320000,
      montoTotalDeuda: 320000,
      cuotasVencidas: 8,
      ruta: 'Ruta Sur',
      cobrador: 'Pedro Sánchez',
      nivelRiesgo: 'LISTA_NEGRA',
      estado: 'PERDIDA',
      ultimoPago: '2023-10-20'
    }
  ]

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'AMARILLO': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'ROJO': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'LISTA_NEGRA': return 'bg-slate-900 text-white border-slate-700';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  }

  const getRiesgoIcon = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return <CheckCircle className="h-4 w-4" />;
      case 'AMARILLO': return <AlertTriangle className="h-4 w-4" />;
      case 'ROJO': return <AlertCircle className="h-4 w-4" />;
      case 'LISTA_NEGRA': return <Ban className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  }

  const cuentasFiltradas = cuentas.filter((cuenta) => {
    const coincideBusqueda = 
      cuenta.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      cuenta.cliente.documento.toLowerCase().includes(busqueda.toLowerCase()) ||
      cuenta.ruta.toLowerCase().includes(busqueda.toLowerCase())
    
    const coincideRiesgo = filtroRiesgo === 'TODOS' || cuenta.nivelRiesgo === filtroRiesgo

    return coincideBusqueda && coincideRiesgo
  })

  // Calcular totales
  const totalMora = cuentasFiltradas.reduce((acc, curr) => acc + curr.montoMora, 0)
  const totalDeuda = cuentasFiltradas.reduce((acc, curr) => acc + curr.montoTotalDeuda, 0)

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-rose-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        {/* Header minimalista */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 mb-2 border border-rose-100">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Gestión de Cartera</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Cuentas en </span><span className="text-orange-500">Mora</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1 font-medium">
              Monitoreo y recuperación de cartera vencida de CrediSur.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportButton 
              label="Exportar Reporte" 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
            <Link href="/admin/pagos/registro" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              <ChevronRight className="h-4 w-4" />
              <span>Gestionar Cobranza</span>
            </Link>
          </div>
        </div>

        <div className="px-6 md:px-8 py-8 space-y-8">
        {/* Resumen de métricas minimalista */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total en Mora</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalMora)}</h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                +5.2%
              </span>
              <span className="text-xs font-medium text-slate-400">vs mes anterior</span>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deuda Total Riesgo</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalDeuda)}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FileWarning className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Capital + Intereses + Mora</span>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes Afectados</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{cuentasFiltradas.length}</h3>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <User className="h-5 w-5 text-sky-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                {cuentasFiltradas.filter(c => c.nivelRiesgo === 'ROJO').length} en estado crítico
              </span>
            </div>
          </div>
        </div>

        {/* Filtros y Controles */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, documento o ruta..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium placeholder:text-slate-400 bg-white shadow-sm"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                className="w-full md:w-auto pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white shadow-sm appearance-none cursor-pointer font-medium text-slate-600"
                value={filtroRiesgo}
                onChange={(e) => setFiltroRiesgo(e.target.value as NivelRiesgo | 'TODOS')}
              >
                <option value="TODOS">Todos los riesgos</option>
                <option value="AMARILLO">Riesgo Moderado (Amarillo)</option>
                <option value="ROJO">Alto Riesgo (Rojo)</option>
                <option value="LISTA_NEGRA">Lista Negra</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  viewMode === 'list' 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  viewMode === 'grid' 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Lista de cuentas */}
        {cuentasFiltradas.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="inline-flex p-4 rounded-full bg-emerald-50 mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Todo en orden</h3>
            <p className="text-slate-500 font-medium">No se encontraron cuentas en mora con los filtros actuales.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cuentasFiltradas.map((cuenta) => (
              <div key={cuenta.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col">
                <div className="p-6 flex-1 space-y-6">
                  {/* Info Cliente */}
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors">{cuenta.cliente.nombre}</h3>
                        <p className="text-sm text-slate-500 font-mono font-medium">{cuenta.cliente.documento}</p>
                      </div>
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5", getRiesgoColor(cuenta.nivelRiesgo))}>
                        {getRiesgoIcon(cuenta.nivelRiesgo)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 text-sm text-slate-600 font-medium mt-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{cuenta.cliente.telefono}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate max-w-xs">{cuenta.cliente.direccion}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info Deuda */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Mora</p>
                      <p className="text-lg font-bold text-rose-600">{formatCurrency(cuenta.montoMora)}</p>
                      <p className="text-xs text-rose-500 font-medium">{cuenta.diasMora} días</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Total</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</p>
                      <p className="text-xs text-slate-500 font-medium">{cuenta.cuotasVencidas} cuotas</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Ruta</p>
                      <p className="text-sm font-bold text-slate-700">{cuenta.ruta}</p>
                      <p className="text-xs text-slate-500 font-medium">{cuenta.cobrador}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Último Pago</p>
                      <p className="text-sm font-bold text-slate-700">{cuenta.ultimoPago || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="pt-4 border-t border-slate-100 flex gap-2">
                    <Link
                      href={`/admin/clientes/${cuenta.id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 text-sm font-bold transition-colors"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Perfil
                    </Link>
                    <Link
                      href={`/admin/prestamos/${cuenta.numeroPrestamo}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark text-sm font-bold transition-colors shadow-lg shadow-primary/20"
                    >
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Detalle
                    </Link>
                  </div>
                </div>
                
                {/* Barra de estado visual */}
                <div className={cn("h-1 w-full", 
                  cuenta.nivelRiesgo === 'ROJO' ? 'bg-rose-500' : 
                  cuenta.nivelRiesgo === 'AMARILLO' ? 'bg-amber-500' : 
                  cuenta.nivelRiesgo === 'LISTA_NEGRA' ? 'bg-slate-900' : 'bg-emerald-500'
                )} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Cliente / Documento</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Riesgo</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Ubicación</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Deuda Total</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Mora</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuentasFiltradas.map((cuenta) => (
                    <tr key={cuenta.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 font-bold">
                            {cuenta.cliente.nombre.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">{cuenta.cliente.nombre}</div>
                            <div className="text-xs text-slate-500 font-medium font-mono">{cuenta.cliente.documento}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5", getRiesgoColor(cuenta.nivelRiesgo))}>
                          {getRiesgoIcon(cuenta.nivelRiesgo)}
                          {cuenta.nivelRiesgo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-700 font-bold text-xs">{cuenta.ruta}</span>
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {cuenta.cliente.direccion}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</div>
                        <div className="text-xs text-slate-500">{cuenta.cuotasVencidas} cuotas</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-rose-600">{formatCurrency(cuenta.montoMora)}</div>
                        <div className="text-xs text-rose-500 font-medium">{cuenta.diasMora} días</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/clientes/${cuenta.id}`} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors" title="Ver Perfil">
                            <User className="w-4 h-4" />
                          </Link>
                          <Link href={`/admin/prestamos/${cuenta.numeroPrestamo}`} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors" title="Ver Detalle">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {cuentasFiltradas.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4">
                  <CheckCircle className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Sin resultados</h3>
                <p className="text-slate-500 font-medium">No se encontraron cuentas con los filtros seleccionados.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
  )
}

export default CuentasMoraPage