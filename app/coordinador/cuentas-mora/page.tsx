'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Search,
  User,
  ChevronRight,
  FileWarning,
  CheckCircle,
  Ban,
  AlertTriangle,
  LayoutGrid,
  List
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'
import ClientePortalModal from '@/components/cliente/ClientePortalModal'

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

const CuentasMoraCoordinador = () => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS')
  const [filtroRuta, setFiltroRuta] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaMora | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)

  const handleVerDetalle = (cuenta: CuentaMora) => {
    setSelectedCuenta(cuenta)
    setIsModalOpen(true)
  }

  const handleVerCliente = (id: string) => {
    setSelectedClientId(id)
    setIsClientModalOpen(true)
  }

  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
  }

  // Datos de ejemplo optimizados para el Coordinador
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
        id: '13',
        numeroPrestamo: 'P-2023-999',
        cliente: {
          nombre: 'Juan Pérez',
          documento: '1.333.444.555',
          telefono: '300 444 5555',
          direccion: 'Carrera 10 # 5-67'
        },
        diasMora: 40,
        montoMora: 200000,
        montoTotalDeuda: 500000,
        cuotasVencidas: 5,
        ruta: 'Ruta Sur',
        cobrador: 'Pedro Sánchez',
        nivelRiesgo: 'ROJO',
        estado: 'EN_MORA',
        ultimoPago: '2023-05-10'
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
    
    const coincideRuta = !filtroRuta || cuenta.ruta.toLowerCase().includes(filtroRuta.toLowerCase())

    return coincideBusqueda && coincideRiesgo && coincideRuta
  })

  // Calcular totales
  const totalMora = cuentasFiltradas.reduce((acc, curr) => acc + curr.montoMora, 0)
  const totalDeuda = cuentasFiltradas.reduce((acc, curr) => acc + curr.montoTotalDeuda, 0)

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-rose-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8 text-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 mb-2 border border-rose-100">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Control de Mora - Coordinación</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Cuentas en </span><span className="text-orange-500">Mora</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1 font-medium">
              Reporte consolidado de clientes con pagos retrasados y alertas de riesgo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportButton 
              label="Exportar " 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mora Acumulada</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalMora)}</h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertCircle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capital en Riesgo</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalDeuda)}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <FileWarning className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Casos Críticos</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{cuentasFiltradas.filter(c => c.nivelRiesgo === 'ROJO').length}</h3>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl">
                <User className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <FiltroRuta 
                onRutaChange={(r: string | null) => setFiltroRuta(r)} 
                selectedRutaId={filtroRuta}
                showAllOption={true}
            />

            <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                type="text"
                placeholder="Buscar por cliente, documento o ruta..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 outline-none text-sm bg-white"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
                className="pl-4 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/10"
                value={filtroRiesgo}
                onChange={(e) => setFiltroRiesgo(e.target.value as NivelRiesgo | 'TODOS')}
            >
                <option value="TODOS">Todos los riesgos</option>
                <option value="AMARILLO">Riesgo Moderado</option>
                <option value="ROJO">Alto Riesgo</option>
                <option value="LISTA_NEGRA">Lista Negra</option>
            </select>
            
            <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg", viewMode === 'list' ? "bg-slate-100 text-blue-600" : "text-slate-400")}>
                    <List className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg", viewMode === 'grid' ? "bg-slate-100 text-blue-600" : "text-slate-400")}>
                    <LayoutGrid className="h-4 w-4" />
                </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold">Cliente</th>
                    <th className="px-6 py-4 font-bold text-center">Riesgo</th>
                    <th className="px-6 py-4 font-bold text-right">Mora / Días</th>
                    <th className="px-6 py-4 font-bold text-right">Deuda Total</th>
                    <th className="px-6 py-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuentasFiltradas.map((cuenta) => (
                    <tr key={cuenta.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{cuenta.cliente.nombre}</div>
                        <div className="text-xs text-slate-500">{cuenta.cliente.documento}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5", getRiesgoColor(cuenta.nivelRiesgo))}>
                          {getRiesgoIcon(cuenta.nivelRiesgo)}
                          {cuenta.nivelRiesgo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-base font-black text-rose-600">{formatCurrency(cuenta.montoMora)}</div>
                        <div className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Mora ({cuenta.diasMora}d)</div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-base font-black text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Deuda Total</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleVerDetalle(cuenta)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg inline-block transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cuentasFiltradas.map((cuenta) => (
              <div key={cuenta.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-slate-900">{cuenta.cliente.nombre}</h3>
                        <p className="text-xs text-slate-500">{cuenta.cliente.documento}</p>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border", getRiesgoColor(cuenta.nivelRiesgo))}>
                        {cuenta.nivelRiesgo}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase">Mora</p>
                        <p className="text-rose-600 font-bold">{formatCurrency(cuenta.montoMora)}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase">Deuda</p>
                        <p className="text-slate-900 font-bold">{formatCurrency(cuenta.montoTotalDeuda)}</p>
                    </div>
                </div>
                <button 
                  onClick={() => handleVerDetalle(cuenta)} 
                  className="w-full py-2 bg-slate-900 text-white rounded-xl text-center text-sm font-bold block transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                >
                    Ver Detalles en Mora
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Modal de Detalle */}
      {isModalOpen && selectedCuenta && (
        <DetalleMoraModal 
          cuenta={selectedCuenta} 
          onClose={() => setIsModalOpen(false)} 
          onVerCliente={handleVerCliente}
        />
      )}

      {/* Modal de Perfil de Cliente */}
      {isClientModalOpen && selectedClientId && (
        <ClientePortalModal 
          clientId={selectedClientId} 
          onClose={() => setIsClientModalOpen(false)} 
          rolUsuario="coordinador"
        />
      )}
    </div>
  )
}

export default CuentasMoraCoordinador
