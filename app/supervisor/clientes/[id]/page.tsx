'use client'

import { mensajeDeError } from '@/lib/mensaje-de-error'
import type { CuotaOperativa } from '@/lib/types/cobranza'
import type {
  PagoDeCliente,
} from '@/services/clientes-service'
import { SkeletonDetalle } from '@/components/ui/Skeleton'

import { logger } from '@/lib/logger'

import React, { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { createPortal } from 'react-dom'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  BarChart3,
  Smartphone,
  DollarSign,
  CheckCircle,
  Loader2,
  Plus,
  X,
  CreditCard,
  ShoppingBag,
  UserPlus,
} from 'lucide-react'
import ClienteDetalleElegante, { Cliente, Prestamo, Pago, Comentario } from '@/components/cliente/DetalleCliente'
import Link from 'next/link'
import {
  computeDiasMoraFromCuotas,
  getBogotaDateKey,
  isCuotaNoPagada,
  normalizeDateKey,
  resolveFechaEfectivaCuota,
} from '@/lib/rutas-core'
import { clientesService } from '@/services/clientes-service'
import { prestamosService } from '@/services/prestamos-service'
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'
import { resolveCurrentUserId } from '@/lib/creditos/crear-prestamo-payload'
import { useNotification } from '@/components/providers/NotificationProvider'
import { formatCOPInputValue, formatMilesCOP, parseCOPInputToNumber, formatCurrency } from '@/lib/utils'
import { TipoAmortizacion } from '@/types/enums'
import BotonAccion from '@/components/ui/BotonAccion'
import Tooltip from '@/components/ui/Tooltip'
import { FrecuenciaPago } from '@/types/enums'
// El `Cliente` del SERVICIO, con alias: la vista (`DetalleCliente`) exporta otro
// `Cliente` distinto, que es el de presentacion y exige `fechaRegistro` (un nombre
// de pantalla; en el esquema la columna es `creadoEn`). El estado guarda la
// respuesta del endpoint, no el objeto de presentacion.
import type { Cliente as ClienteDelServicio } from '@/services/clientes-service'
import { Selector } from '@/components/ui/Selector'
import { MODAL_Z_INDEX } from '@/components/ui/Portal'
import AyudaContextual from '@/components/ui/AyudaContextual'
import FieldLabel from '@/components/ui/FieldLabel'


function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function ClienteDetalleSupervisorPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id
  const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

  const [isFabOpen, setIsFabOpen] = useState(false)
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [showCreditoModal, setShowCreditoModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { showNotification } = useNotification()

  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [montoPagoInput, setMontoPagoInput] = useState('')
  /**
   * A que credito va el pago.
   *
   * Antes no existia: el envio hacia
   * `prestamos.find(p => p.estado === 'ACTIVO' || p.estado === 'EN_MORA')` y
   * se quedaba con el PRIMERO, sin decirlo. Un cliente con dos creditos
   * activos —que es lo normal aqui: uno de efectivo y uno de articulo— recibia
   * el pago en el que saliera primero del arreglo, y el supervisor no tenia
   * forma de saber en cual.
   */
  const [prestamoPagoId, setPrestamoPagoId] = useState('')
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState<File | null>(null)
  const [comprobanteTransferenciaPreviewUrl, setComprobanteTransferenciaPreviewUrl] = useState<string | null>(null)

  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>('prestamo')
  const [montoPrestamoInput, setMontoPrestamoInput] = useState('')
  const [tasaInteresInput, setTasaInteresInput] = useState('')
  const [cuotasPrestamoInput, setCuotasPrestamoInput] = useState('')
  /**
   * La frecuencia que elige el supervisor.
   *
   * No existia. El desplegable de «Frecuencia de Pago» NO tenia `value` ni
   * `onChange` —era decorativo— y el envio mandaba
   * `frecuenciaPago: FrecuenciaPago.SEMANAL` fijo. O sea que se podia elegir
   * «Mensual» y el credito se creaba SEMANAL, sin un solo aviso.
   */
  const [frecuenciaPrestamo, setFrecuenciaPrestamo] = useState<FrecuenciaPago>(
    FrecuenciaPago.SEMANAL,
  )
  const [cuotaInicialArticuloInput, setCuotaInicialArticuloInput] = useState('')

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

  const [clienteData, setClienteData] = useState<ClienteDelServicio | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Recargar los datos del cliente, sin tocar lo que haya en el formulario.
   *
   * Se saca a su propia función porque el refresco en tiempo real hacía
   * `window.location.reload()`: la página ENTERA. Esta pantalla tiene 19
   * campos y es donde el supervisor registra pagos, así que cualquier cobrador
   * de la empresa que registrara un pago disparaba `pagos_actualizados` y le
   * borraba el monto a medio escribir. Era el único de los nueve
   * `window.location.reload()` del proyecto que convivía con un formulario.
   *
   * Refrescar solo `clienteData` es seguro: el formulario vive en estados
   * aparte (`metodoPago`, `comprobanteTransferencia`, `creditType`…) y no se
   * inicializa desde aquí, así que no se pisa nada de lo escrito.
   */
  const cargarCliente = useCallback(async () => {
    try {
      const data = await clientesService.obtenerPorId(id)
      if (data) {
         // Asegurar campos para UI
         setClienteData({
              ...data,
              prestamos: (data).prestamos || [],
              pagos: (data).pagos || []
         })
      } else {
         setError('Cliente no encontrado')
      }
    } catch (error) {
      setError(mensajeDeError(error, 'Error al cargar cliente'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) void cargarCliente()
  }, [id, cargarCliente])

  // Estos dos hooks van antes de los returns tempranos.
  //
  // Puestos después, mientras el cliente cargaba se ejecutaban dos hooks menos
  // que ya cargado, y en cuanto el número cambia entre dos renders React tumba
  // la pantalla con el error 310.
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

  // Tiempo real: refrescar los datos, no la página.
  useRealtimeData(['pagos_actualizados', 'clientes_actualizados'], cargarCliente)

  if (isLoading) {
    return (
      <SkeletonDetalle />
    )
  }

  if (error || !clienteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error al cargar</h2>
          <p className="text-slate-500 mb-6">No se pudo obtener la información del cliente. Verifique su conexión o intente nuevamente.</p>
          <Link
            href="/supervisor/clientes"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al listado</span>
          </Link>
        </div>
      </div>
    )
  }

  // El `filter(Boolean)` no le quita el `undefined` al tipo: hace falta el guarda para
  // que `fotos` sea de verdad `string[]`. Con `(a: any)` eso no se veia.
  const fotos: string[] = (clienteData.archivos || [])
    .map((a) => a?.url || a?.path || a?.ruta)
    .filter((url): url is string => Boolean(url))

  const cliente: Cliente = {
    ...clienteData,
    fechaRegistro: clienteData.creadoEn || 'No disponible',
    ruta: clienteData.asignacionesRuta?.[0]?.ruta?.nombre || 'Sin Ruta',
    avatarColor: 'bg-blue-600',
    fotos,
  }

  const prestamos: Prestamo[] = (clienteData.prestamos || []).map((p) => {
    const cuotas = p.cuotas || []
    const cuotasPagadas = cuotas.filter(
      (c: CuotaOperativa) => c.estado === 'PAGADA' || c.estadoActual === 'PAGADA',
    ).length
    const totalCuotas = p.cantidadCuotas || cuotas.length || 0

    const hoyKey = getBogotaDateKey(new Date())
    const frecuencia = String(p.frecuenciaPago || 'DIARIO').toUpperCase()
    const cuotasVencidas = (Array.isArray(cuotas) ? cuotas : []).filter((c) => {
      if (!c || !isCuotaNoPagada(c)) return false
      const raw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
      const k = normalizeDateKey(raw)
      return !!k && !!hoyKey && k < hoyKey
    }).length
    const diasMora = computeDiasMoraFromCuotas(cuotas, hoyKey, frecuencia)
    const estadoUI = cuotasVencidas > 0 || diasMora > 0 ? 'EN_MORA' : p.estado

    const principal = Number(p.monto || 0)
    const tasa = Number(p.tasaInteres || 0)
    const meses = Number(p.plazoMeses || 1)
    let interesTotal = Number(p.interesTotal || 0)

    if (interesTotal === 0 && tasa > 0 && meses > 0) {
      interesTotal = (principal * tasa * meses) / 100
    }

    const montoTotal = principal + interesTotal
    const saldoPendiente = Number(p.saldoPendiente || 0)

    return {
      id: p.id,
      producto: p.tipoPrestamo === 'ARTICULO' ? (p.producto?.nombre || 'Artículo') : 'Préstamo Efectivo',
      montoTotal: montoTotal,
      montoPagado: Number(p.totalPagado || 0),
      montoPendiente: (saldoPendiente === principal && interesTotal > 0) ? montoTotal : saldoPendiente,
      cuotasTotales: totalCuotas,
      cuotasPagadas: cuotasPagadas,
      cuotasPendientes: Math.max(0, totalCuotas - cuotasPagadas),
      fechaInicio: p.fechaInicio,
      fechaVencimiento: p.fechaFin,
      // `isCuotaNoPagada` en vez de la lista a mano: es el predicado compartido, y la
      // lista de aqui incluia 'VENCIDO', que no es un estado de cuota (el enum es
      // VENCIDA), asi que ese eslabon nunca se cumplia.
      proximoPago:
        cuotas.find((c: CuotaOperativa) => isCuotaNoPagada(c))?.fechaVencimiento ||
        p.fechaFin,
      estado: estadoUI,
      tasaInteres: tasa,
      moraAcumulada: Number(p.interesMoraPagado || 0),
      cuotasVencidas,
      diasMora,
      icono: <Smartphone className="w-5 h-5" />,
      categoria: p.tipoPrestamo || 'General',
    } as Prestamo
  })

  const pagos: Pago[] = (clienteData.pagos || []).map((p: PagoDeCliente) => {
    return {
      // Los `?? ''` y el `String(...)`: el pago del backend trae estos campos nulables y

      // la `Pago` de la UI los declara obligatorios. Antes esto se resolvia con un

      // `as Pago` al final, que tapaba justo esa diferencia.

      id: p.id ?? '',

      fecha: p.fechaPago ?? '',

      monto: Number(p.montoTotal || 0),

      cuota: String(p.detalles?.[0]?.cuota?.numeroCuota || 1),

      metodo: p.metodoPago ?? '',

      estado: 'confirmado' as const,

      referencia: p.numeroPago == null ? undefined : String(p.numeroPago),
      icono: <DollarSign className="w-5 h-5" />,
      archivos: p.archivos || [],
    } as Pago
  })

  const comentarios: Comentario[] = []


  /**
   * Los creditos a los que se le puede aplicar un pago.
   *
   * `montoPendiente` ya viene calculado arriba, y trae su propio cuidado: si
   * el saldo del backend coincide con el capital y hay interes, usa el total
   * con interes. Eso es lo que de verdad falta por cobrar.
   */
  const prestamosElegibles = prestamos.filter(
    (pr) => pr.estado === 'ACTIVO' || pr.estado === 'EN_MORA',
  )

  /*
   * Con un solo credito elegible se elige solo, y con varios NO.
   *
   * Es la diferencia que importa: elegir por el usuario cuando no hay
   * alternativa es comodidad; elegir por el cuando hay dos es lo que hacia el
   * codigo de antes, y eso es decidir a que cuenta va su dinero sin
   * preguntarle.
   */
  const prestamoDelPago =
    prestamosElegibles.length === 1
      ? prestamosElegibles[0]
      : prestamosElegibles.find((pr) => pr.id === prestamoPagoId)
  const saldoDelPago = Number(prestamoDelPago?.montoPendiente ?? 0)
  const montoDelPago = parseCOPInputToNumber(montoPagoInput)
  const montoExcedeSaldo = saldoDelPago > 0 && montoDelPago > saldoDelPago

  const resetPagoModal = () => {
    setShowPagoModal(false)
    setMetodoPago('EFECTIVO')
    setMontoPagoInput('')
    setPrestamoPagoId('')
    setComprobanteTransferencia(null)
    setComprobanteTransferenciaPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const resetCreditoModal = () => {
    setShowCreditoModal(false)
    setCreditType('prestamo')
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

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60">
        
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/supervisor/clientes"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="shrink-0 p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    <span className="text-blue-600">Gestión de </span>
                    <span className="text-orange-500">Clientes</span>
                  </h1>
                  <p className="text-sm font-medium">
                    <span className="text-blue-600">Detalle y análisis </span>
                    <span className="text-orange-500">de cartera</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <ClienteDetalleElegante
          cliente={cliente}
          prestamos={prestamos}
          pagos={pagos}
          comentarios={comentarios}
        />
      </main>

      {showPagoModal && (
        <Portal>
          <div
            className="fixed inset-0 capa-modal flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
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
                  <Tooltip texto="Cerrar">
                    <button
                      type="button"
                      onClick={resetPagoModal}
                      className="shrink-0 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                      aria-label="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Tooltip>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-sm text-slate-500">Cliente</p>
                    <p className="font-bold text-slate-900 text-lg">{cliente.nombres} {cliente.apellidos}</p>
                    <p className="text-xs text-slate-400">CC: {cliente.dni}</p>
                  </div>

                  {/*
                    * A que credito va el pago.
                    *
                    * Antes esto no estaba y el envio se quedaba con el PRIMER
                    * credito activo del arreglo, sin decirlo. Un cliente con
                    * dos activos —lo normal aqui: uno de efectivo y uno de
                    * articulo— recibia el pago en el que saliera primero.
                    *
                    * Con uno solo se ensena cual es, que tambien hacia falta:
                    * el supervisor registraba un pago sin ver a que cuenta iba.
                    */}
                  {prestamosElegibles.length === 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-bold text-amber-900">
                        Este cliente no tiene créditos activos
                      </p>
                      <p className="mt-1 text-xs font-medium text-amber-800">
                        No hay a dónde aplicar un pago. Antes este aviso salía
                        después de escribir el monto y pulsar Confirmar.
                      </p>
                    </div>
                  ) : prestamosElegibles.length === 1 ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Se aplica a</p>
                      <p className="font-bold text-slate-900">
                        {prestamosElegibles[0].producto}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        Saldo pendiente{' '}
                        {formatCurrency(Number(prestamosElegibles[0].montoPendiente || 0))}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <FieldLabel required>A qué crédito se aplica</FieldLabel>
                      <Selector
                        value={prestamoPagoId}
                        onChange={setPrestamoPagoId}
                        etiqueta="A qué crédito se aplica el pago"
                        placeholder="Elige el crédito..."
                        opciones={prestamosElegibles.map((pr) => ({
                          value: pr.id,
                          label: `${pr.producto} · saldo ${formatCurrency(Number(pr.montoPendiente || 0))}`,
                        }))}
                      />
                      {!prestamoPagoId && (
                        <p className="mt-2 text-xs font-bold text-amber-700">
                          Este cliente tiene {prestamosElegibles.length} créditos
                          activos: elige a cuál va el pago.
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMetodoPago('EFECTIVO')}
                        className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                          metodoPago === 'EFECTIVO'
                            ? 'bg-primary text-white border-primary'
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
                            ? 'bg-primary text-white border-primary'
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
                        className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-bold text-2xl text-slate-900 placeholder:text-slate-300"
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
                      <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante<span className="ml-1 text-red-500" aria-label="obligatorio">*</span></label>
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">Sube el comprobante</p>
                              {comprobanteTransferencia && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-primary border border-blue-100">
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

                  {/*
                    * El monto contra el saldo. Esta pantalla no lo comprobaba:
                    * se podia registrar un pago mayor que lo que el cliente
                    * debe y el aviso llegaba del backend, o no llegaba. Es la
                    * misma comprobacion que ya hace `PagoModal` del cobrador.
                    */}
                  {montoExcedeSaldo && (
                    <p className="text-xs font-bold text-rose-600">
                      El monto no puede exceder el saldo pendiente de este
                      crédito ({formatCurrency(saldoDelPago)}).
                    </p>
                  )}

                  <BotonAccion
                    type="button"
                    onClick={async () => {
                      if (isSaving) return;
                      setIsSaving(true);
                      try {
                        // El que eligio el supervisor, no «el primero que
                        // aparezca». El boton esta deshabilitado si no hay uno
                        // elegido, asi que esto es una guarda y no un camino.
                        const prestamoActivo = prestamoDelPago;
                        if (!prestamoActivo) {
                          showNotification('error', 'Elige a qué crédito se aplica el pago.');
                          return;
                        }

                        await prestamosService.registrarPago({
                          prestamoId: prestamoActivo.id,
                          clienteId: id,
                          monto: parseCOPInputToNumber(montoPagoInput),
                          metodoPago,
                          comprobante: comprobanteTransferencia
                        });

                        showNotification('success', 'Pago registrado exitosamente');
                        // Recargar datos
                        const data = await clientesService.obtenerPorId(id);
                        setClienteData(data);
                        resetPagoModal();
                      } catch (err) {
                        console.error('Error al registrar pago:', err);
                        showNotification('error', mensajeDeError(err, 'No se pudo registrar el pago'));
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={
                      isSaving ||
                      montoDelPago <= 0 ||
                      // Sin credito elegido no se puede registrar: antes el
                      // envio cogia el primero activo por su cuenta.
                      !prestamoDelPago ||
                      montoExcedeSaldo ||
                      (metodoPago === 'TRANSFERENCIA' && !comprobanteTransferencia)
                    }
                    className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    {isSaving ? 'Registrando...' : 'Confirmar Pago'}
                  </BotonAccion>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showCreditoModal && (
        <Portal>
          <div
            className="fixed inset-0 capa-modal flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
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
                  <Tooltip texto="Cerrar">
                    <button
                      type="button"
                      onClick={resetCreditoModal}
                      className="shrink-0 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                      aria-label="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Tooltip>
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
                    <Tooltip texto="Los créditos de artículo requieren seleccionar producto y plan desde el modal completo.">
                      <button
                        type="button"
                        disabled
                        className="shrink-0 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed transition-all"
                      >
                        <ShoppingBag className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-bold text-sm">Crédito por Artículo</div>
                        <div className="mt-1 text-[10px] font-semibold">Usa Créditos Artículos</div>
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900">
                      {cliente.nombres} {cliente.apellidos} • {cliente.dni}
                    </div>
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
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-bold text-slate-900"
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
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900"
                            placeholder="5.0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago<AyudaContextual ayuda="frecuenciaDePago" de="la frecuencia de pago" tamano="pequeno" /></label>
                          <Selector
                            value={frecuenciaPrestamo}
                            onChange={(v) => setFrecuenciaPrestamo(v as FrecuenciaPago)}
                            etiqueta="Frecuencia de Pago"
                            className="bg-slate-50 font-medium text-slate-900"
                            opciones={[
                              { value: FrecuenciaPago.DIARIO, label: 'Diario' },
                              { value: FrecuenciaPago.SEMANAL, label: 'Semanal' },
                              { value: FrecuenciaPago.QUINCENAL, label: 'Quincenal' },
                              { value: FrecuenciaPago.MENSUAL, label: 'Mensual' },
                            ]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cuotasPrestamoInput}
                            onChange={(e) => setCuotasPrestamoInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900"
                            placeholder="12"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuota Inicial<AyudaContextual ayuda="cuotaInicialDeArticulo" de="la cuota inicial" tamano="pequeno" /></label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                              type="text"
                              inputMode="numeric"
                              value={cuotaInicialArticuloInput}
                              onChange={(e) => setCuotaInicialArticuloInput(formatCOPInputValue(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                          <Selector
                            value={cuotasPrestamoInput}
                            onChange={setCuotasPrestamoInput}
                            etiqueta="Cuotas"
                            placeholder="Elige cuántas cuotas"
                            className="bg-slate-50 font-medium text-slate-900"
                            opciones={[3, 6, 12, 18, 24].map((n) => ({
                              value: String(n),
                              label: `${n} cuotas`,
                            }))}
                          />
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
                      disabled={isSaving}
                      onClick={async () => {
                        if (isSaving) return;
                        setIsSaving(true);
                        try {
                          if (creditType === 'articulo') {
                            showNotification('warning', 'Crea créditos de artículo desde el modal completo de Créditos Artículos.');
                            return;
                          }

                          const userStr = localStorage.getItem('user');
                          const userData = userStr ? JSON.parse(userStr) : null;
                          const cuotas = Math.max(1, Number(cuotasPrestamoInput || 12));
                          const creadoPorId = userData?.id || resolveCurrentUserId();
                          
                          await prestamosService.crearPrestamo({
                            clienteId: id,
                            tipoPrestamo: 'EFECTIVO',
                            monto: parseCOPInputToNumber(montoPrestamoInput),
                            tasaInteres: Number(tasaInteresInput),
                            tasaInteresMora: 5, // Default
                            plazoMeses: Math.max(1, Math.ceil(cuotas / 4)), // Estimado si es semanal
                            cantidadCuotas: cuotas,
                            frecuenciaPago: frecuenciaPrestamo,
                            fechaInicio: toBogotaDateTimeOffsetIso(new Date()),
                            creadoPorId,
                            tipoAmortizacion: TipoAmortizacion.INTERES_SIMPLE,
                          });

                          showNotification('success', 'Crédito creado exitosamente');
                          // Recargar datos
                          const data = await clientesService.obtenerPorId(id);
                          setClienteData(data);
                          resetCreditoModal();
                        } catch (err) {
                          console.error('Error al crear crédito:', err);
                          showNotification('error', mensajeDeError(err, 'No se pudo crear el crédito'));
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isSaving ? 'Creando...' : 'Crear Crédito'}
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
            className="fixed inset-0 capa-modal flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
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
                  <Tooltip texto="Cerrar">
                    <button
                      type="button"
                      onClick={resetNuevoClienteForm}
                      className="shrink-0 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                      aria-label="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Tooltip>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    logger.log('Crear cliente:', { ...formularioNuevoCliente, fotos: fotosCliente })
                    resetNuevoClienteForm()
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula / CC<span className="ml-1 text-red-500" aria-label="obligatorio">*</span></label>
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="Número de cédula (CC)"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono<span className="ml-1 text-red-500" aria-label="obligatorio">*</span></label>
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="Ej: 3001234567"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nombres<span className="ml-1 text-red-500" aria-label="obligatorio">*</span></label>
                      <input
                        value={formularioNuevoCliente.nombres}
                        onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, nombres: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Apellidos<span className="ml-1 text-red-500" aria-label="obligatorio">*</span></label>
                      <input
                        value={formularioNuevoCliente.apellidos}
                        onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, apellidos: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="correo@dominio.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Dirección (Opcional)</label>
                    <input
                      value={formularioNuevoCliente.direccion}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, direccion: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="Dirección del cliente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Referencia (Opcional)</label>
                    <textarea
                      value={formularioNuevoCliente.referencia}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, referencia: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400 resize-none"
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-xs file:font-bold hover:file:bg-primary-dark"
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-xs file:font-bold hover:file:bg-primary-dark"
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-xs file:font-bold hover:file:bg-primary-dark"
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-xs file:font-bold hover:file:bg-primary-dark"
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
                      className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-[0.98] transition-all"
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
            type="button"
            onClick={() => {
              setShowCreditoModal(true)
              setIsFabOpen(false)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-primary/20">Crear Crédito</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-primary border border-primary/20 shadow-lg shadow-primary/10 hover:bg-[#f1f6fb] transition-all">
              <CreditCard className="h-5 w-5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFabOpen(false)
              setMetodoPago('EFECTIVO')
              setMontoPagoInput('')
              setShowPagoModal(true)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-primary/20">Registrar pago</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-primary border border-primary/20 shadow-lg shadow-primary/10 hover:bg-[#f1f6fb] transition-all">
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
            <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-primary/20">Crear cliente</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-primary border border-primary/20 shadow-lg shadow-primary/10 hover:bg-[#f1f6fb] transition-all">
              <UserPlus className="h-5 w-5" />
            </div>
          </button>
        </div>

        <button
          onClick={() => setIsFabOpen((v) => !v)}
          className="pointer-events-auto h-14 w-14 rounded-full bg-primary text-white shadow-xl shadow-primary/25 flex items-center justify-center border border-white/30"
          aria-label={isFabOpen ? 'Cerrar acciones' : 'Abrir acciones'}
        >
          {isFabOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  )
}

