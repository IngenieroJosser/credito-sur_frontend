'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clientesService, Cliente, MOCK_CLIENTES } from '@/services/clientes-service'
import {
  Search,
  Filter,
  User,
  UserPlus,
  Users,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Eye,
  AlertTriangle,
  Ban,
  DollarSign,
  CreditCard,
  X,
  Plus,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'

type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA'

type FiltroEstadoCuenta = 'GENERAL' | 'MORA' | 'VENCIDAS'
type FiltroRuta = 'TODAS' | string

const ClientesSupervisorPage = () => {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>(MOCK_CLIENTES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await clientesService.obtenerClientes()
        if (mounted) setClientes(Array.isArray(data) ? data : MOCK_CLIENTES)
      } catch (error) {
        console.warn('Usando datos mock de clientes', error)
        if (mounted) setClientes(MOCK_CLIENTES)
      } finally {
        if (mounted) setIsLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const clientesArray = clientes

  const [searchTerm, setSearchTerm] = useState('')
  const [filterRiesgo, setFilterRiesgo] = useState<string>('all')
  const [filterEstadoCuenta, setFilterEstadoCuenta] = useState<FiltroEstadoCuenta>('GENERAL')
  const [filterRuta, setFilterRuta] = useState<FiltroRuta>('TODAS')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const [isFabOpen, setIsFabOpen] = useState(false)
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [showCreditoModal, setShowCreditoModal] = useState(false)
  const [clienteAccionId, setClienteAccionId] = useState<string>('')


  const stats = {
    total: clientesArray.length,
    verde: clientesArray.filter((c) => c.nivelRiesgo === 'VERDE').length,
    amarillo: clientesArray.filter((c) => c.nivelRiesgo === 'AMARILLO').length,
    rojo: clientesArray.filter((c) => c.nivelRiesgo === 'ROJO').length,
    listaNegra: clientesArray.filter((c) => c.enListaNegra).length,
    totalDeuda: clientesArray.reduce((sum, c) => sum + (c.montoTotal ?? 0), 0),
    totalMora: clientesArray.reduce((sum, c) => sum + (c.montoMora ?? 0), 0),
  }

  const rutasDisponibles = useMemo(() => {
    const rutas = new Set(
      clientesArray
        .map((c) => c.rutaId)
        .filter((r): r is string => Boolean(r))
    )
    return Array.from(rutas)
  }, [clientesArray])

  const esMora = (cliente: Cliente) => {
    const mora = cliente.montoMora ?? 0
    const dias = cliente.diasMora ?? 0
    return mora > 0 || dias > 0
  }

  const esVencida = (cliente: Cliente) => {
    const dias = cliente.diasMora ?? 0
    return dias >= 30
  }

  const filteredClientes = clientesArray.filter((cliente) => {
    const matchesSearch =
      `${cliente.nombres} ${cliente.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.correo && cliente.correo.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRiesgo = filterRiesgo === 'all' || cliente.nivelRiesgo === filterRiesgo

    const matchesEstadoCuenta =
      filterEstadoCuenta === 'GENERAL'
        ? true
        : filterEstadoCuenta === 'MORA'
          ? esMora(cliente)
          : esVencida(cliente)

    const matchesRuta = filterRuta === 'TODAS' || cliente.rutaId === filterRuta

    return matchesSearch && matchesRiesgo && matchesEstadoCuenta && matchesRuta
  })

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredClientes.slice(indexOfFirstItem, indexOfLastItem)

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE':
        return 'text-emerald-600 bg-emerald-50 ring-emerald-600/20'
      case 'AMARILLO':
        return 'text-amber-600 bg-amber-50 ring-amber-600/20'
      case 'ROJO':
        return 'text-rose-600 bg-rose-50 ring-rose-600/20'
      case 'LISTA_NEGRA':
        return 'text-slate-800 bg-slate-200 ring-slate-600/20'
      default:
        return 'text-slate-600 bg-slate-50 ring-slate-600/20'
    }
  }

  const getRiesgoIcon = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE':
        return <CheckCircle className="h-4 w-4" />
      case 'AMARILLO':
        return <AlertTriangle className="h-4 w-4" />
      case 'ROJO':
        return <AlertCircle className="h-4 w-4" />
      case 'LISTA_NEGRA':
        return <Ban className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      </div>
      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-xs text-primary tracking-wide font-bold border border-primary/20 mb-2">
              <User className="h-3.5 w-3.5" />
              <span>Gestión de Cartera</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Listado de </span>
              <span className="text-orange-500">Clientes</span>
            </h1>
          </div>

          <Link
            href="/supervisor/clientes/nuevo"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            Nuevo Cliente
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clientes</span>
              <User className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">registrados</div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Buen Estado</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.verde}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">clientes al día</div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Riesgo Medio</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.amarillo}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">seguimiento</div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Alto Riesgo</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.rojo}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">acción requerida</div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mora Total</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalMora)}</p>
            <div className="mt-2 text-xs font-medium text-slate-400">acumulada</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <Filter className="h-4 w-4 text-slate-400 shrink-0 mr-2" />

            {[
              { id: 'GENERAL' as const, label: 'General' },
              { id: 'MORA' as const, label: 'En mora' },
              { id: 'VENCIDAS' as const, label: 'Vencidas' },
            ].map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => {
                  setFilterEstadoCuenta(filtro.id)
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  filterEstadoCuenta === filtro.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {filtro.label}
              </button>
            ))}

            <div className="h-6 w-px bg-slate-200 mx-2" />

            {[
              { id: 'all', label: 'Todos' },
              { id: 'VERDE', label: 'Al Día' },
              { id: 'AMARILLO', label: 'Riesgo' },
              { id: 'ROJO', label: 'Rojo' },
              { id: 'LISTA_NEGRA', label: 'Lista Negra' },
            ].map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => {
                  setFilterRiesgo(filtro.id)
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  filterRiesgo === filtro.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {filtro.label}
              </button>
            ))}

            <div className="h-6 w-px bg-slate-200 mx-2" />

            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs font-bold text-slate-500">Ruta</span>
              <select
                value={filterRuta}
                onChange={(e) => {
                  setFilterRuta(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600"
              >
                <option value="TODAS">Todas</option>
                {rutasDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, cédula o teléfono..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-primary transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Finanzas</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/supervisor/clientes/${cliente.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                            cliente.nivelRiesgo === 'VERDE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : cliente.nivelRiesgo === 'AMARILLO'
                                ? 'bg-amber-100 text-amber-700'
                                : cliente.nivelRiesgo === 'ROJO'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cliente.nombres.charAt(0)}
                          {cliente.apellidos.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="font-bold text-slate-900">
                            {cliente.nombres} {cliente.apellidos}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center mt-0.5 font-mono font-medium">
                            {cliente.dni}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-inset ${getRiesgoColor(
                            cliente.nivelRiesgo,
                          )}`}
                        >
                          <span className="mr-1.5">{getRiesgoIcon(cliente.nivelRiesgo)}</span>
                          {cliente.nivelRiesgo.replace('_', ' ')}
                        </div>
                        {cliente.enListaNegra && (
                          <div className="flex items-center text-xs text-rose-600 font-bold px-1">
                            <Ban className="h-3 w-3 mr-1" />
                            Lista Negra
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900">{formatCurrency(cliente.montoTotal ?? 0)}</div>
                        {(cliente.montoMora ?? 0) > 0 && (
                          <div className="text-xs text-rose-600 font-bold flex items-center">
                            Mora: {formatCurrency(cliente.montoMora ?? 0)}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm font-medium text-slate-600">
                          <Phone className="h-3 w-3 mr-2 text-slate-400" />
                          {cliente.telefono}
                        </div>
                        {cliente.correo && (
                          <div className="flex items-center text-xs font-medium text-slate-500">
                            <Mail className="h-3 w-3 mr-2 text-slate-400" />
                            {cliente.correo}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div
                        className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/supervisor/clientes/${cliente.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver Expediente"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredClientes.length)} de {filteredClientes.length}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg hover:bg-white hover:text-primary text-slate-600 disabled:opacity-50 disabled:hover:shadow-none transition-all"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg hover:bg-white hover:text-primary text-slate-600 disabled:opacity-50 disabled:hover:shadow-none transition-all"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-slate-700 font-bold">Cargando clientes...</span>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showPagoModal}
        onClose={() => setShowPagoModal(false)}
        title="Registrar pago"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowPagoModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!clienteAccionId) return
                setShowPagoModal(false)
                router.push(`/supervisor/pagos/registrar/${clienteAccionId}`)
              }}
              disabled={!clienteAccionId}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50"
            >
              Ir a pago
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase">Cliente</div>
          <select
            value={clienteAccionId}
            onChange={(e) => setClienteAccionId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
          >
            <option value="">Selecciona un cliente</option>
            {filteredClientes.slice(0, 50).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombres} {c.apellidos} • {c.dni}
              </option>
            ))}
          </select>
          <div className="text-xs text-slate-500 font-medium">
            Tip: usa los filtros/buscador para acotar la lista.
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCreditoModal}
        onClose={() => setShowCreditoModal(false)}
        title="Crear crédito"
        size="sm"
      >
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => {
              setShowCreditoModal(false)
              router.push('/supervisor/creditos/nuevo?tipo=efectivo')
            }}
            className="w-full flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
          >
            <span className="text-sm font-bold text-slate-800">Efectivo</span>
            <CreditCard className="h-5 w-5 text-slate-500" />
          </button>
          <button
            onClick={() => {
              setShowCreditoModal(false)
              router.push('/supervisor/creditos/nuevo?tipo=articulos')
            }}
            className="w-full flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
          >
            <span className="text-sm font-bold text-slate-800">Artículos</span>
            <Users className="h-5 w-5 text-slate-500" />
          </button>
        </div>
      </Modal>

      <div className="fixed right-6 z-50 flex flex-col items-end gap-3 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div
          className={`flex flex-col gap-3 transition-all duration-200 origin-bottom-right ${
            isFabOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={() => {
              setShowCreditoModal(true)
              setIsFabOpen(false)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear Crédito</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <CreditCard className="h-5 w-5" />
            </div>
          </button>

          <button
            onClick={() => {
              setClienteAccionId('')
              setShowPagoModal(true)
              setIsFabOpen(false)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Registrar pago</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <DollarSign className="h-5 w-5" />
            </div>
          </button>

          <Link
            href="/supervisor/clientes/nuevo"
            onClick={() => setIsFabOpen(false)}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear cliente</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <UserPlus className="h-5 w-5" />
            </div>
          </Link>
        </div>

        <button
          onClick={() => setIsFabOpen((v) => !v)}
          className="pointer-events-auto h-14 w-14 rounded-full bg-[#08557f] text-white shadow-xl shadow-[#08557f]/25 flex items-center justify-center border border-white/30"
          aria-label={isFabOpen ? 'Cerrar acciones' : 'Abrir acciones'}
        >
          {isFabOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  )
}

export default ClientesSupervisorPage
