
'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
import { formatCOPInputValue, formatCurrency, formatMilesCOP, parseCOPInputToNumber } from '@/lib/utils'
import { MOCK_ARTICULOS, type OpcionCuotas } from '@/services/articulos-service'
import FiltroRuta from '@/components/filtros/FiltroRuta'

type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA'

type FiltroEstadoCuenta = 'GENERAL' | 'MORA' | 'VENCIDAS'
type RutaFilterType = 'TODAS' | string

const MODAL_Z_INDEX = 2147483647

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const ClientesSupervisorPage = () => {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>(MOCK_CLIENTES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await clientesService.obtenerClientes()
        if (!mounted) return
        if (Array.isArray(data) && data.length > 0) {
          setClientes(data)
          return
        }
        setClientes(MOCK_CLIENTES)
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
  const [filterRuta, setFilterRuta] = useState<RutaFilterType>('TODAS')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const [isFabOpen, setIsFabOpen] = useState(false)
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [showCreditoModal, setShowCreditoModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)

  const [clientePagoId, setClientePagoId] = useState<string>('')
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [montoPagoInput, setMontoPagoInput] = useState('')
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState<File | null>(null)
  const [comprobanteTransferenciaPreviewUrl, setComprobanteTransferenciaPreviewUrl] = useState<string | null>(null)

  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>('prestamo')
  const [clienteCreditoId, setClienteCreditoId] = useState<string>('')
  const [montoPrestamoInput, setMontoPrestamoInput] = useState('')
  const [tasaInteresInput, setTasaInteresInput] = useState('')
  const [cuotasPrestamoInput, setCuotasPrestamoInput] = useState('')
  const [cuotaInicialArticuloInput, setCuotaInicialArticuloInput] = useState('')
  
  // Estados para artículos (preparados para implementación futura del modal de artículos)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<string>('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [opcionCuotasSeleccionada, setOpcionCuotasSeleccionada] = useState<OpcionCuotas | null>(null)
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const articuloSeleccionado = MOCK_ARTICULOS.find(a => a.id === articuloSeleccionadoId)

  const [formularioNuevoCliente, setFormularioNuevoCliente] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    correo: '',
    direccion: '',
    referencia: '',
  })
  const [fotosCliente, setFotosCliente] = useState({
    fotoPerfil: null as File | null,
    documentoFrente: null as File | null,
    documentoReverso: null as File | null,
    comprobanteDomicilio: null as File | null,
  })

  useEffect(() => {
    if (metodoPago !== 'TRANSFERENCIA') {
      setComprobanteTransferencia(null)
      setComprobanteTransferenciaPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    if (!comprobanteTransferencia) {
      setComprobanteTransferenciaPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    const isImage = comprobanteTransferencia.type.startsWith('image/')
    if (!isImage) {
      setComprobanteTransferenciaPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    const url = URL.createObjectURL(comprobanteTransferencia)
    setComprobanteTransferenciaPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [comprobanteTransferencia, metodoPago])


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

  const totalClientesMora = useMemo(() => {
    return clientesArray.filter((c) => esMora(c)).length
  }, [clientesArray])

  const totalClientesVencidas = useMemo(() => {
    return clientesArray.filter((c) => esVencida(c)).length
  }, [clientesArray])

  const rutasStats = useMemo(() => {
    return rutasDisponibles
      .map((rutaId) => {
        const clientesRuta = clientesArray.filter((c) => c.rutaId === rutaId)
        const mora = clientesRuta.filter((c) => esMora(c)).length
        const vencidas = clientesRuta.filter((c) => esVencida(c)).length
        return {
          rutaId,
          total: clientesRuta.length,
          mora,
          vencidas,
        }
      })
      .sort((a, b) => a.rutaId.localeCompare(b.rutaId))
  }, [clientesArray, rutasDisponibles])

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

  const clientePagoSeleccionado = useMemo(() => {
    if (!clientePagoId) return null
    return clientesArray.find((c) => c.id === clientePagoId) ?? null
  }, [clientePagoId, clientesArray])

  const resetPagoModal = () => {
    setShowPagoModal(false)
    setClientePagoId('')
    setMetodoPago('EFECTIVO')
    setMontoPagoInput('')
    setComprobanteTransferencia(null)
    if (comprobanteTransferenciaPreviewUrl) URL.revokeObjectURL(comprobanteTransferenciaPreviewUrl)
    setComprobanteTransferenciaPreviewUrl(null)
  }

  const resetCreditoModal = () => {
    setShowCreditoModal(false)
    setCreditType('prestamo')
    setClienteCreditoId('')
    setMontoPrestamoInput('')
    setTasaInteresInput('')
    setCuotasPrestamoInput('')
    setCuotaInicialArticuloInput('')
  }

  const resetNuevoClienteForm = () => {
    setShowNewClientModal(false)
    setFormularioNuevoCliente({
      dni: '',
      nombres: '',
      apellidos: '',
      telefono: '',
      correo: '',
      direccion: '',
      referencia: '',
    })
    setFotosCliente({
      fotoPerfil: null,
      documentoFrente: null,
      documentoReverso: null,
      comprobanteDomicilio: null,
    })
  }

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

        <div className="mt-6 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Rutas</h2>
              <p className="text-xs font-medium text-slate-500">Acceso rápido a clientes en mora y vencidas por ruta</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterRuta('TODAS')
                setFilterEstadoCuenta('GENERAL')
                setCurrentPage(1)
              }}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              Ver todo
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <div className="text-sm font-bold text-slate-900">Todas</div>
                </div>
                <div className="text-xs font-bold text-slate-500">{stats.total}</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterRuta('TODAS')
                    setFilterEstadoCuenta('GENERAL')
                    setCurrentPage(1)
                  }}
                  className="py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterRuta('TODAS')
                    setFilterEstadoCuenta('MORA')
                    setCurrentPage(1)
                  }}
                  className="py-2 rounded-xl bg-rose-50 border border-rose-100 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                >
                  Mora {totalClientesMora}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterRuta('TODAS')
                    setFilterEstadoCuenta('VENCIDAS')
                    setCurrentPage(1)
                  }}
                  className="py-2 rounded-xl bg-amber-50 border border-amber-100 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                >
                  Venc. {totalClientesVencidas}
                </button>
              </div>
            </div>

            {rutasStats.map((r) => (
              <div key={r.rutaId} className="p-4 rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-slate-900">Ruta {r.rutaId}</div>
                  <div className="text-xs font-bold text-slate-500">{r.total}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterRuta(r.rutaId)
                      setFilterEstadoCuenta('GENERAL')
                      setCurrentPage(1)
                    }}
                    className="py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterRuta(r.rutaId)
                      setFilterEstadoCuenta('MORA')
                      setCurrentPage(1)
                    }}
                    disabled={r.mora === 0}
                    className="py-2 rounded-xl bg-rose-50 border border-rose-100 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Mora {r.mora}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterRuta(r.rutaId)
                      setFilterEstadoCuenta('VENCIDAS')
                      setCurrentPage(1)
                    }}
                    disabled={r.vencidas === 0}
                    className="py-2 rounded-xl bg-amber-50 border border-amber-100 text-[11px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Venc. {r.vencidas}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <Filter className="h-4 w-4 text-slate-400 shrink-0 mr-2" />

            {[
              { id: 'GENERAL' as const, label: `General (${stats.total})` },
              { id: 'MORA' as const, label: `En mora (${totalClientesMora})` },
              { id: 'VENCIDAS' as const, label: `Vencidas (${totalClientesVencidas})` },
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

            <FiltroRuta 
              onRutaChange={(r: string | null) => {
                setFilterRuta(r || 'TODAS')
                setCurrentPage(1)
              }}
              selectedRutaId={filterRuta === 'TODAS' ? null : filterRuta}
              showAllOption={true}
              hideLabel={true}
            />
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
                        {(cliente.diasMora ?? 0) > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold text-slate-500">Días mora: {cliente.diasMora}</div>
                            {esVencida(cliente) && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-100">
                                VENCIDA
                              </span>
                            )}
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

      {showPagoModal && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: MODAL_Z_INDEX }}
            onClick={resetPagoModal}
          >
            <div
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Registrar Pago</h3>
                  <button
                    type="button"
                    onClick={resetPagoModal}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
                    <select
                      value={clientePagoId}
                      onChange={(e) => setClientePagoId(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    >
                      <option value="">Seleccionar cliente...</option>
                      {filteredClientes.slice(0, 50).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombres} {c.apellidos} • {c.dni}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-sm text-slate-500">Cliente</p>
                    <p className="font-bold text-slate-900 text-lg">
                      {clientePagoSeleccionado ? `${clientePagoSeleccionado.nombres} ${clientePagoSeleccionado.apellidos}` : 'Sin seleccionar'}
                    </p>
                    {clientePagoSeleccionado && (
                      <>
                        <p className="text-xs text-slate-500">Tel: {clientePagoSeleccionado.telefono}</p>
                        <p className="text-xs text-slate-400">CC: {clientePagoSeleccionado.dni}</p>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMetodoPago('EFECTIVO')}
                        className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                          metodoPago === 'EFECTIVO'
                            ? 'bg-[#08557f] text-white border-[#08557f]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        EFECTIVO
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetodoPago('TRANSFERENCIA')}
                        className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                          metodoPago === 'TRANSFERENCIA'
                            ? 'bg-[#08557f] text-white border-[#08557f]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        TRANSFERENCIA
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Monto Recibido</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={montoPagoInput}
                        onChange={(e) => setMontoPagoInput(formatCOPInputValue(e.target.value))}
                        className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-2xl text-slate-900 placeholder:text-slate-300"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[10000, 20000, 50000, 100000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          const nuevo = parseCOPInputToNumber(montoPagoInput) + amount
                          setMontoPagoInput(nuevo === 0 ? '' : formatMilesCOP(nuevo))
                        }}
                        className="py-2 px-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                      >
                        +${(amount / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>

                  {metodoPago === 'TRANSFERENCIA' && (
                    <div className="pt-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante (Obligatorio)</label>
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">Sube el comprobante</p>
                              {comprobanteTransferencia && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#08557f] border border-blue-100">
                                  ADJUNTO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">Imagen o PDF.</p>
                          </div>
                          {comprobanteTransferencia && (
                            <button
                              type="button"
                              onClick={() => setComprobanteTransferencia(null)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Quitar
                            </button>
                          )}
                        </div>

                        {comprobanteTransferenciaPreviewUrl && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <img src={comprobanteTransferenciaPreviewUrl} alt="Comprobante" className="w-full h-40 object-cover" />
                          </div>
                        )}

                        {comprobanteTransferencia && !comprobanteTransferenciaPreviewUrl && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-bold text-slate-700 truncate">Archivo: {comprobanteTransferencia.name}</p>
                          </div>
                        )}

                        <div className="mt-3">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setComprobanteTransferencia(e.target.files?.[0] || null)}
                            className="w-full text-sm"
                            required
                          />
                        </div>
                      </div>
                      {!comprobanteTransferencia && (
                        <p className="mt-2 text-xs font-bold text-rose-600">Adjunta el comprobante para confirmar una transferencia.</p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      console.log('Registrar pago:', {
                        clienteId: clientePagoId,
                        monto: parseCOPInputToNumber(montoPagoInput),
                        metodoPago,
                        comprobanteTransferencia,
                      })
                      resetPagoModal()
                    }}
                    disabled={
                      !clientePagoId ||
                      parseCOPInputToNumber(montoPagoInput) <= 0 ||
                      (metodoPago === 'TRANSFERENCIA' && !comprobanteTransferencia)
                    }
                    className="w-full bg-[#08557f] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Confirmar Pago
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showCreditoModal && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: MODAL_Z_INDEX }}
            onClick={resetCreditoModal}
          >
            <div
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Crear Nuevo Crédito</h3>
                  <button
                    type="button"
                    onClick={resetCreditoModal}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Tipo de Crédito</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreditType('prestamo')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        creditType === 'prestamo'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <DollarSign className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Préstamo en Efectivo</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreditType('articulo')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        creditType === 'articulo'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Users className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Crédito por Artículo</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
                    <select
                      value={clienteCreditoId}
                      onChange={(e) => setClienteCreditoId(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    >
                      <option value="">Seleccionar cliente...</option>
                      {filteredClientes.slice(0, 50).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombres} {c.apellidos} • {c.dni}
                        </option>
                      ))}
                    </select>
                  </div>

                  {creditType === 'prestamo' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Monto del Préstamo</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                              type="text"
                              inputMode="numeric"
                              value={montoPrestamoInput}
                              onChange={(e) => setMontoPrestamoInput(formatCOPInputValue(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Tasa de Interés (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={tasaInteresInput}
                            onChange={(e) => setTasaInteresInput(e.target.value.replace(/[^0-9.]/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            placeholder="5.0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                            <option>Diario</option>
                            <option>Semanal</option>
                            <option>Quincenal</option>
                            <option>Mensual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cuotasPrestamoInput}
                            onChange={(e) => setCuotasPrestamoInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            placeholder="12"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuota Inicial</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                              type="text"
                              inputMode="numeric"
                              value={cuotaInicialArticuloInput}
                              onChange={(e) => setCuotaInicialArticuloInput(formatCOPInputValue(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                            <option>3 cuotas</option>
                            <option>6 cuotas</option>
                            <option>12 cuotas</option>
                            <option>18 cuotas</option>
                            <option>24 cuotas</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tipo:</span>
                        <span className="font-bold text-slate-900">
                          {creditType === 'prestamo' ? 'Préstamo en Efectivo' : 'Crédito por Artículo'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Estado:</span>
                        <span className="font-bold text-orange-600">Pendiente de Aprobación</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetCreditoModal}
                      className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!clienteCreditoId}
                      onClick={() => {
                        console.log('Crear crédito:', {
                          clienteId: clienteCreditoId,
                          tipo: creditType,
                          montoPrestamo: parseCOPInputToNumber(montoPrestamoInput),
                          tasaInteres: tasaInteresInput,
                          cuotas: cuotasPrestamoInput,
                          cuotaInicial: parseCOPInputToNumber(cuotaInicialArticuloInput),
                        })
                        resetCreditoModal()
                      }}
                      className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      Crear Crédito
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showNewClientModal && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: MODAL_Z_INDEX }}
            onClick={resetNuevoClienteForm}
          >
            <div
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Crear Cliente</h3>
                  <button
                    type="button"
                    onClick={resetNuevoClienteForm}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    console.log('Crear cliente:', { ...formularioNuevoCliente, fotos: fotosCliente })
                    resetNuevoClienteForm()
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula / CC</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formularioNuevoCliente.dni}
                        onChange={(e) =>
                          setFormularioNuevoCliente((prev) => ({
                            ...prev,
                            dni: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="Número de cédula (CC)"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={formularioNuevoCliente.telefono}
                        onChange={(e) =>
                          setFormularioNuevoCliente((prev) => ({
                            ...prev,
                            telefono: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="Ej: 3001234567"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nombres</label>
                      <input
                        value={formularioNuevoCliente.nombres}
                        onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, nombres: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Apellidos</label>
                      <input
                        value={formularioNuevoCliente.apellidos}
                        onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, apellidos: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Correo (Opcional)</label>
                    <input
                      type="email"
                      value={formularioNuevoCliente.correo}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, correo: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="correo@dominio.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Dirección (Opcional)</label>
                    <input
                      value={formularioNuevoCliente.direccion}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, direccion: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="Dirección del cliente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Referencia (Opcional)</label>
                    <textarea
                      value={formularioNuevoCliente.referencia}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, referencia: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                      rows={3}
                      placeholder="Punto de referencia / observaciones"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Foto de perfil</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            fotoPerfil: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula/CC (Frente)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            documentoFrente: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula/CC (Reverso)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            documentoReverso: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante de domicilio</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            comprobanteDomicilio: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetNuevoClienteForm}
                      className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all"
                    >
                      Guardar Cliente
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}

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
              setClientePagoId('')
              setMetodoPago('EFECTIVO')
              setMontoPagoInput('')
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

          <button
            type="button"
            onClick={() => {
              setShowNewClientModal(true)
              setIsFabOpen(false)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear cliente</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <UserPlus className="h-5 w-5" />
            </div>
          </button>
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
