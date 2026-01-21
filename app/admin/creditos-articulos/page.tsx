'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Tv,
  Smartphone,
  Armchair,
  Calendar,
  CreditCard,
  Package
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PRESTAMOS_MOCK, EstadoPrestamo, NivelRiesgo } from '@/components/prestamos/data'

export default function CreditosArticulosPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [riesgoFiltro, setRiesgoFiltro] = useState('todos')
  const [creditos, setCreditos] = useState<typeof PRESTAMOS_MOCK>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [itemsPorPagina] = useState(8)

  useEffect(() => {
    // Simular carga y filtrar solo créditos de artículos
    const loadData = () => {
      // Filtramos solo los que son artículos (electrodomésticos, muebles, etc)
      // Asumimos que "efectivo" es el único que NO es artículo
      const creditosArticulos = PRESTAMOS_MOCK.filter(p => 
        p.tipoProducto === 'electrodomestico' || 
        p.tipoProducto === 'mueble' || 
        p.tipoProducto === 'otro'
      )
      setCreditos(creditosArticulos)
      setIsLoading(false)
    }
    
    setTimeout(loadData, 500)
  }, [])

  const getEstadoColor = (estado: EstadoPrestamo) => {
    switch(estado) {
      case 'ACTIVO': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'PENDIENTE_APROBACION': return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'EN_MORA': return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'INCUMPLIDO': return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'PAGADO': return 'bg-blue-50 text-blue-700 border-blue-100'
      default: return 'bg-gray-50 text-gray-700 border-gray-100'
    }
  }

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch(riesgo) {
      case 'VERDE': return 'text-emerald-600 bg-emerald-50'
      case 'AMARILLO': return 'text-amber-600 bg-amber-50'
      case 'ROJO': return 'text-rose-600 bg-rose-50'
      case 'LISTA_NEGRA': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-50'
    }
  }
  
  const getProductIcon = (producto: string, tipo: string) => {
    const p = producto.toLowerCase()
    if (p.includes('tv') || p.includes('televisor') || p.includes('pantalla')) return <Tv className="w-5 h-5" />
    if (p.includes('celular') || p.includes('iphone') || p.includes('samsung') || p.includes('xiaomi')) return <Smartphone className="w-5 h-5" />
    if (tipo === 'mueble' || p.includes('silla') || p.includes('mesa') || p.includes('sofa')) return <Armchair className="w-5 h-5" />
    return <ShoppingBag className="w-5 h-5" />
  }

  const filteredCreditos = creditos.filter(credito => {
    const matchesSearch = credito.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credito.producto.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = estadoFiltro === 'todos' || credito.estado === estadoFiltro
    const matchesRiesgo = riesgoFiltro === 'todos' || credito.riesgo === riesgoFiltro
    return matchesSearch && matchesEstado && matchesRiesgo
  })

  // Lógica de paginación
  const indiceUltimo = paginaActual * itemsPorPagina
  const indicePrimero = indiceUltimo - itemsPorPagina
  const creditosPaginados = filteredCreditos.slice(indicePrimero, indiceUltimo)
  const totalPaginas = Math.ceil(filteredCreditos.length / itemsPorPagina)

  const cambiarPagina = (numeroPagina: number) => setPaginaActual(numeroPagina)

  // Estadísticas rápidas
  const stats = {
    total: creditos.length,
    activos: creditos.filter(c => c.estado === 'ACTIVO').length,
    mora: creditos.filter(c => c.estado === 'EN_MORA').length,
    valorTotal: creditos.reduce((acc, curr) => acc + curr.montoTotal, 0)
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
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

      <div className="relative z-10 p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide font-medium border border-[#08557f]/10 mb-2">
              <Package className="h-3.5 w-3.5" />
              <span>Gestión de Inventario Financiado</span>
            </div>
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">
              Créditos de <span className="font-semibold text-[#08557f]">Artículos</span>
            </h1>
            <p className="text-gray-500 mt-1 font-light">
              Administra créditos para electrodomésticos, muebles y tecnología.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#08557f] text-white rounded-xl hover:bg-[#063a58] transition-all duration-300 text-sm font-medium shadow-lg shadow-[#08557f]/20 hover:shadow-[#08557f]/30 hover:-translate-y-0.5">
            <Plus className="w-4 h-4" />
            Nuevo Crédito
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Total</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">{stats.total}</div>
            <p className="text-xs text-gray-500">Créditos registrados</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Activos</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">{stats.activos}</div>
            <p className="text-xs text-gray-500">En curso actualmente</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Atención</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">{stats.mora}</div>
            <p className="text-xs text-gray-500">Créditos en mora</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Cartera</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">{formatCurrency(stats.valorTotal)}</div>
            <p className="text-xs text-gray-500">Valor total financiado</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cliente, artículo o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#08557f]/10 focus:border-[#08557f]/20 transition-all text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative min-w-[180px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border-gray-200 bg-white text-sm text-gray-700 focus:ring-2 focus:ring-[#08557f]/10 focus:border-[#08557f]/20 appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <option value="todos">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="EN_MORA">En Mora</option>
                <option value="PAGADO">Pagados</option>
              </select>
            </div>
            
            <div className="relative min-w-[180px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <AlertCircle className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={riesgoFiltro}
                onChange={(e) => setRiesgoFiltro(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border-gray-200 bg-white text-sm text-gray-700 focus:ring-2 focus:ring-[#08557f]/10 focus:border-[#08557f]/20 appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <option value="todos">Cualquier riesgo</option>
                <option value="VERDE">Riesgo Bajo</option>
                <option value="AMARILLO">Riesgo Medio</option>
                <option value="ROJO">Riesgo Alto</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Artículo / Cliente</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Próximo Pago</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Progreso</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Deuda</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-4 w-48 bg-gray-200 rounded mb-4"></div>
                        <div className="h-3 w-32 bg-gray-100 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ) : creditosPaginados.map((credito) => (
                  <tr 
                    key={credito.id} 
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/admin/prestamos/${credito.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                            credito.riesgo === 'ROJO' ? 'bg-rose-50 text-rose-500' : 
                            credito.riesgo === 'AMARILLO' ? 'bg-amber-50 text-amber-500' : 'bg-gray-50 text-gray-500'
                          }`}>
                          {getProductIcon(credito.producto, credito.tipoProducto || '')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 group-hover:text-[#08557f] transition-colors">
                            {credito.producto}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-xs text-gray-500">{credito.cliente}</span>
                             <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getRiesgoColor(credito.riesgo)}`}>
                               {credito.riesgo}
                             </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoColor(credito.estado)}`}>
                        {credito.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium">{credito.proximoPago}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full max-w-[140px]">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-500">{credito.cuotasPagadas}/{credito.cuotasTotales} cuotas</span>
                          <span className="font-medium text-gray-900">
                            {Math.round((credito.cuotasPagadas / credito.cuotasTotales) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              credito.riesgo === 'ROJO' ? 'bg-rose-500' :
                              credito.riesgo === 'AMARILLO' ? 'bg-amber-500' :
                              'bg-[#08557f]'
                            }`}
                            style={{ width: `${(credito.cuotasPagadas / credito.cuotasTotales) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{formatCurrency(credito.montoPendiente)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Total: {formatCurrency(credito.montoTotal)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-[#08557f] hover:bg-[#08557f]/5 rounded-lg transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!isLoading && filteredCreditos.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No se encontraron artículos</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                No hay créditos que coincidan con los filtros seleccionados. Intenta ajustar la búsqueda.
              </p>
            </div>
          )}

          {/* Paginación Footer */}
          {!isLoading && filteredCreditos.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Mostrando <span className="font-medium">{indicePrimero + 1}</span> a <span className="font-medium">{Math.min(indiceUltimo, filteredCreditos.length)}</span> de <span className="font-medium">{filteredCreditos.length}</span> resultados
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => cambiarPagina(num)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                        paginaActual === num 
                          ? 'bg-white text-[#08557f] shadow-sm border border-gray-200' 
                          : 'text-gray-500 hover:bg-white/50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
