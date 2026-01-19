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
  FileWarning
} from 'lucide-react'
import Link from 'next/link'

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
        telefono: '0414-1234567',
        direccion: 'Av. Bolívar, Casa 5'
      },
      diasMora: 45,
      montoMora: 1500.00,
      montoTotalDeuda: 4500.00,
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
        telefono: '0424-7654321',
        direccion: 'Barrio La Paz, Calle 3'
      },
      diasMora: 15,
      montoMora: 500.00,
      montoTotalDeuda: 2500.00,
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
        telefono: '0412-1122334',
        direccion: 'Urb. Los Pinos, Apto 4B'
      },
      diasMora: 95,
      montoMora: 3200.00,
      montoTotalDeuda: 3200.00,
      cuotasVencidas: 8,
      ruta: 'Ruta Sur',
      cobrador: 'Pedro Sánchez',
      nivelRiesgo: 'LISTA_NEGRA',
      estado: 'PERDIDA',
      ultimoPago: '2023-10-20'
    }
  ]

  // Formateador de moneda (VES)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return 'bg-green-100 text-green-800 border-green-200';
      case 'AMARILLO': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ROJO': return 'bg-red-100 text-red-800 border-red-200';
      case 'LISTA_NEGRA': return 'bg-gray-900 text-white border-gray-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-gray-800">Cuentas en Mora</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión y seguimiento de cartera vencida</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm">
              Exportar Reporte
            </button>
            <button className="px-4 py-2 bg-[#08557f] text-white rounded-lg hover:bg-[#063a58] text-sm font-medium transition-colors shadow-sm">
              Gestionar Cobranza
            </button>
          </div>
        </div>

        {/* Resumen de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <AlertCircle className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total en Mora</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{formatCurrency(totalMora)}</div>
            <p className="text-xs text-red-500 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" /> +5.2% vs mes anterior
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <FileWarning className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Deuda Total Riesgo</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{formatCurrency(totalDeuda)}</div>
            <p className="text-xs text-gray-400 mt-1">Capital + Intereses + Mora</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <User className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Clientes Afectados</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{cuentasFiltradas.length}</div>
            <p className="text-xs text-gray-400 mt-1">
              {cuentasFiltradas.filter(c => c.nivelRiesgo === 'ROJO').length} en estado crítico
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, documento o ruta..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] transition-all"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] bg-white"
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

        {/* Lista de cuentas */}
        <div className="space-y-4">
          {cuentasFiltradas.map((cuenta) => (
            <div key={cuenta.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="p-5 flex flex-col md:flex-row gap-6">
                {/* Info Cliente */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 text-lg">{cuenta.cliente.nombre}</h3>
                      <p className="text-sm text-gray-500">{cuenta.cliente.documento}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiesgoColor(cuenta.nivelRiesgo)}`}>
                      {cuenta.nivelRiesgo.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span>{cuenta.cliente.telefono}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="truncate max-w-xs">{cuenta.cliente.direccion}</span>
                    </div>
                  </div>
                </div>

                {/* Info Deuda */}
                <div className="flex-1 grid grid-cols-2 gap-4 border-l border-gray-100 pl-0 md:pl-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Mora Acumulada</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(cuenta.montoMora)}</p>
                    <p className="text-xs text-red-500">{cuenta.diasMora} días de retraso</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Deuda Total</p>
                    <p className="text-lg font-medium text-gray-900">{formatCurrency(cuenta.montoTotalDeuda)}</p>
                    <p className="text-xs text-gray-500">{cuenta.cuotasVencidas} cuotas vencidas</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Ruta</p>
                    <p className="text-sm font-medium text-gray-800">{cuenta.ruta}</p>
                    <p className="text-xs text-gray-500">{cuenta.cobrador}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Último Pago</p>
                    <p className="text-sm font-medium text-gray-800">{cuenta.ultimoPago || 'Sin registros'}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                  <Link
                    href={`/admin/clientes/${cuenta.id}`}
                    className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium transition-colors"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Perfil
                  </Link>
                  <Link
                    href={`/admin/prestamos/${cuenta.numeroPrestamo}`}
                    className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 bg-[#08557f]/10 text-[#08557f] rounded-lg hover:bg-[#08557f]/20 text-sm font-medium transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Detalle
                  </Link>
                </div>
              </div>
              
              {/* Barra de estado visual */}
              <div className={`h-1 w-full ${
                cuenta.nivelRiesgo === 'ROJO' ? 'bg-red-500' : 
                cuenta.nivelRiesgo === 'AMARILLO' ? 'bg-yellow-500' : 
                cuenta.nivelRiesgo === 'LISTA_NEGRA' ? 'bg-gray-800' : 'bg-green-500'
              }`} />
            </div>
          ))}

          {cuentasFiltradas.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 border-dashed">
              <div className="inline-flex p-4 rounded-full bg-gray-50 mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Todo en orden</h3>
              <p className="text-gray-500">No se encontraron cuentas en mora con los filtros actuales.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  )
}

export default CuentasMoraPage
