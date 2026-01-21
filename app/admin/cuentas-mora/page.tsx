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
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'

// Enums alineados con Prisma
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
type EstadoPrestamo = 'EN_MORA' | 'INCUMPLIDO' | 'PERDIDA';

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
      case 'VERDE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'AMARILLO': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ROJO': return 'bg-red-100 text-red-800 border-red-200';
      case 'LISTA_NEGRA': return 'bg-gray-900 text-white border-gray-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="min-h-screen bg-white">
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header minimalista */}
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 mb-4 border border-red-100">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Gestión de Cartera</span>
            </div>
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">
              Cuentas en Mora
            </h1>
            <p className="text-sm text-gray-500 max-w-2xl mt-2 font-light">
              Monitoreo y recuperación de cartera vencida de CrediSur.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-all duration-300">
              <span>Exportar Reporte</span>
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#08557f] px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-[#064364] transition-all duration-300">
              <span>Gestionar Cobranza</span>
            </button>
          </div>
        </header>

        {/* Resumen de métricas minimalista */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total en Mora</p>
                <h3 className="text-2xl font-light text-gray-900 mt-2">{formatCurrency(totalMora)}</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                +5.2%
              </span>
              <span className="text-xs text-gray-400">vs mes anterior</span>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deuda Total Riesgo</p>
                <h3 className="text-2xl font-light text-gray-900 mt-2">{formatCurrency(totalDeuda)}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FileWarning className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Capital + Intereses + Mora</span>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clientes Afectados</p>
                <h3 className="text-2xl font-light text-gray-900 mt-2">{cuentasFiltradas.length}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {cuentasFiltradas.filter(c => c.nivelRiesgo === 'ROJO').length} en estado crítico
              </span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, documento o ruta..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] transition-all text-sm font-light"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="w-full md:w-auto pl-10 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] bg-white appearance-none cursor-pointer font-light"
                value={filtroRiesgo}
                onChange={(e) => setFiltroRiesgo(e.target.value as NivelRiesgo | 'TODOS')}
              >
                <option value="TODOS">Todos los riesgos</option>
                <option value="AMARILLO">Riesgo Moderado (Amarillo)</option>
                <option value="ROJO">Alto Riesgo (Rojo)</option>
                <option value="LISTA_NEGRA">Lista Negra</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de cuentas */}
        <div className="space-y-4">
          {cuentasFiltradas.map((cuenta) => (
            <div key={cuenta.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
              <div className="p-6 flex flex-col md:flex-row gap-6">
                {/* Info Cliente */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 text-lg group-hover:text-[#08557f] transition-colors">{cuenta.cliente.nombre}</h3>
                      <p className="text-sm text-gray-500 font-mono">{cuenta.cliente.documento}</p>
                    </div>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5", getRiesgoColor(cuenta.nivelRiesgo))}>
                      {getRiesgoIcon(cuenta.nivelRiesgo)}
                      {cuenta.nivelRiesgo.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 text-sm text-gray-600 font-light">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{cuenta.cliente.telefono}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate max-w-xs">{cuenta.cliente.direccion}</span>
                    </div>
                  </div>
                </div>

                {/* Info Deuda */}
                <div className="flex-1 grid grid-cols-2 gap-4 border-l border-gray-100 pl-0 md:pl-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Mora Acumulada</p>
                    <p className="text-lg font-medium text-red-600">{formatCurrency(cuenta.montoMora)}</p>
                    <p className="text-xs text-red-500 font-medium">{cuenta.diasMora} días de retraso</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Deuda Total</p>
                    <p className="text-lg font-medium text-gray-900">{formatCurrency(cuenta.montoTotalDeuda)}</p>
                    <p className="text-xs text-gray-500">{cuenta.cuotasVencidas} cuotas vencidas</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Ruta</p>
                    <p className="text-sm font-medium text-gray-800">{cuenta.ruta}</p>
                    <p className="text-xs text-gray-500">{cuenta.cobrador}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Último Pago</p>
                    <p className="text-sm font-medium text-gray-800">{cuenta.ultimoPago || 'Sin registros'}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                  <Link
                    href={`/admin/clientes/${cuenta.id}`}
                    className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 text-sm font-medium transition-colors"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Perfil
                  </Link>
                  <Link
                    href={`/admin/prestamos/${cuenta.numeroPrestamo}`}
                    className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 bg-[#08557f] text-white rounded-xl hover:bg-[#064364] text-sm font-medium transition-colors shadow-sm"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Detalle
                  </Link>
                </div>
              </div>
              
              {/* Barra de estado visual */}
              <div className={cn("h-1 w-full", 
                cuenta.nivelRiesgo === 'ROJO' ? 'bg-red-500' : 
                cuenta.nivelRiesgo === 'AMARILLO' ? 'bg-amber-500' : 
                cuenta.nivelRiesgo === 'LISTA_NEGRA' ? 'bg-gray-900' : 'bg-emerald-500'
              )} />
            </div>
          ))}

          {cuentasFiltradas.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
              <div className="inline-flex p-4 rounded-full bg-emerald-50 mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Todo en orden</h3>
              <p className="text-gray-500">No se encontraron cuentas en mora con los filtros actuales.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CuentasMoraPage
