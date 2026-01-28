'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  Package,
  Eye
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
      case 'INCUMPLIDO': return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'PAGADO': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      default: return 'bg-slate-50 text-slate-700 border-slate-100'
    }
  }

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch(riesgo) {
      case 'VERDE': return 'text-emerald-600 bg-emerald-50 border-emerald-100 border'
      case 'AMARILLO': return 'text-amber-600 bg-amber-50 border-amber-100 border'
      case 'ROJO': return 'text-rose-600 bg-rose-50 border-rose-100 border'
      case 'LISTA_NEGRA': return 'text-slate-600 bg-slate-100 border-slate-200 border'
      default: return 'text-slate-600 bg-slate-50 border-slate-200 border'
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
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        {/* Header Standard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-blue-600">Créditos</span> <span className="text-orange-500">Artículos</span>
              </h1>
            </div>
            <p className="text-slate-500 mt-1 font-medium text-sm">
              Administra créditos para electrodomésticos, muebles y tecnología.
            </p>
          </div>
          <Link 
            href="/admin/creditos-articulos/nuevo"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 group shadow-sm font-bold text-sm"
          >
            <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
            <span>Nuevo Crédito</span>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 border border-blue-100">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">Total</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.total}</div>
            <p className="text-xs font-medium text-slate-500">Créditos registrados</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 border border-emerald-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Activos</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.activos}</div>
            <p className="text-xs font-medium text-slate-500">En curso actualmente</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 border border-rose-100">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">Atención</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.mora}</div>
            <p className="text-xs font-medium text-slate-500">Créditos en mora</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 border border-violet-100">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">Cartera</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{formatCurrency(stats.valorTotal)}</div>
            <p className="text-xs font-medium text-slate-500">Valor total financiado</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cliente, artículo o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/20 transition-all text-sm font-medium text-primary placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative min-w-[180px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/10 focus:border-primary/20 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <option value="todos">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="EN_MORA">En Mora</option>
                <option value="PAGADO">Pagados</option>
              </select>
            </div>
            
            <div className="relative min-w-[180px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <AlertCircle className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={riesgoFiltro}
                onChange={(e) => setRiesgoFiltro(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/10 focus:border-primary/20 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Artículo / Cliente</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Próximo Pago</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Progreso</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Deuda</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-4 w-48 bg-slate-200 rounded mb-4"></div>
                        <div className="h-3 w-32 bg-slate-100 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ) : creditosPaginados.map((credito) => (
                  <tr 
                    key={credito.id} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link href={`/admin/creditos-articulos/${credito.id}`} className="block">
                        <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border ${
                            credito.riesgo === 'ROJO' ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                            credito.riesgo === 'AMARILLO' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                          {getProductIcon(credito.producto, credito.tipoProducto || '')}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                              {credito.producto}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className="text-xs font-medium text-slate-500">{credito.cliente}</span>
                               <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getRiesgoColor(credito.riesgo)}`}>
                                 {credito.riesgo}
                               </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/creditos-articulos/${credito.id}`} className="block">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getEstadoColor(credito.estado)}`}>
                        {credito.estado.replace('_', ' ')}
                      </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/creditos-articulos/${credito.id}`} className="block">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold">{credito.proximoPago}</span>
                      </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/creditos-articulos/${credito.id}`} className="block">
                      <div className="w-full max-w-[140px]">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">{credito.cuotasPagadas}/{credito.cuotasTotales} cuotas</span>
                          <span className="font-bold text-slate-900">
                            {Math.round((credito.cuotasPagadas / credito.cuotasTotales) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              credito.riesgo === 'ROJO' ? 'bg-rose-500' :
                              credito.riesgo === 'AMARILLO' ? 'bg-amber-500' :
                              'bg-primary'
                            }`}
                            style={{ width: `${(credito.cuotasPagadas / credito.cuotasTotales) * 100}%` }}
                          />
                        </div>
                      </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/creditos-articulos/${credito.id}`} className="block">
                      <div>
                        <div className="font-bold text-slate-900">{formatCurrency(credito.montoPendiente)}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">Total: {formatCurrency(credito.montoTotal)}</div>
                      </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/creditos-articulos/${credito.id}`} className="inline-block p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalle">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!isLoading && filteredCreditos.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Package className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No se encontraron artículos</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                No hay créditos que coincidan con los filtros seleccionados. Intenta ajustar la búsqueda.
              </p>
            </div>
          )}

          {/* Paginación Footer */}
          {!isLoading && filteredCreditos.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Mostrando <span className="font-bold text-slate-700">{indicePrimero + 1}</span> a <span className="font-bold text-slate-700">{Math.min(indiceUltimo, filteredCreditos.length)}</span> de <span className="font-bold text-slate-700">{filteredCreditos.length}</span> resultados
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-transparent hover:border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => cambiarPagina(num)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        paginaActual === num 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:bg-slate-50'
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
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
