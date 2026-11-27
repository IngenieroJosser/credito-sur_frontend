'use client'
import { formatFechaBogota } from '@/lib/format-date'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { useModalDialog } from '@/hooks/use-modal-dialog'
import {
  ShoppingBag,
  TrendingUp,
  Package,
  Users,
  CreditCard,
  Search,
  Eye,
  X,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Phone,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ArrowUpRight,
  Banknote,
  Filter,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { mensajeDeError } from '@/lib/mensaje-de-error'
import { getBogotaDateKey, getBogotaRangeByPeriod, normalizeDateKey } from '@/lib/rutas-core'
import { prestamosService } from '@/services/prestamos-service'
import { etiquetaMetodoVenta, nombreArticuloDeVenta, salesService, type VentaDeContado } from '@/services/sales-service'
import { pagosService } from '@/services/pagos-service'
import { usuariosService, type Usuario } from '@/services/usuarios-service'
import { Skeleton } from '@/components/ui/Skeleton'
import { Selector } from '@/components/ui/Selector'
import { CampoFecha } from '@/components/ui/CampoFecha'
import Tooltip from '@/components/ui/Tooltip'
import AyudaContextual from '@/components/ui/AyudaContextual'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface VentaPdv {
  id: string
  cliente: string
  clienteId?: string
  tipoOperacion: 'CREDITO' | 'CONTADO'
  metodoPago?: VentaDeContado['metodoPago']
  clienteDni?: string
  clienteTelefono?: string
  articulo: string
  montoTotal: number
  cuotaInicial: number
  saldoPendiente: number
  valorCuota: number
  cuotas: number
  cuotasPagadas: number
  frecuencia: string
  tasaInteres: number
  estado:
    | 'ACTIVO'
    | 'PENDIENTE'
    | 'PENDIENTE_APROBACION'
    | 'EN_MORA'
    | 'PAGADO'
    | 'RECHAZADO'
  fechaVenta: string
  fechaPrimerCobro: string
  fechaUltimoPago?: string
  vendedor: string
  vendedorId: string
  vendedorRol: string
  esVentaPdv: boolean
  observaciones?: string
  pagadoHoy: number
}

interface KpiHoy {
  ventas: number
  montoVentas: number
  cuotaInicial: number
  carteraTotal: number
  clientesActivos: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (s: string | undefined) => {
  if (!s) return '—'
  try {
    const d = new Date(s)
    if (isNaN(d.getTime())) return '—'
    return formatFechaBogota(d, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

const estadoCfg = (estado: string) => {
  switch (estado) {
    case 'ACTIVO':
      return {
        label: 'Activo',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      }
    case 'PENDIENTE':
      return {
        label: 'Pendiente',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-400',
      }
    case 'PENDIENTE_APROBACION':
      return {
        label: 'En Aprobación',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-400',
      }
    case 'PAGADO':
      return {
        label: 'Pagado',
        bg: 'bg-slate-50',
        text: 'text-slate-500',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
      }
    case 'EN_MORA':
      return {
        label: 'En Mora',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      }
    default:
      return {
        label: (estado || 'Desconocido').replace(/_/g, ' '),
        bg: 'bg-slate-50',
        text: 'text-slate-500',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
      }
  }
}

const PER_PAGE = 10

function mapearVentaContado(venta: VentaDeContado): VentaPdv {
  return {
    id: venta.id,
    cliente: venta.cliente || 'Cliente no informado',
    clienteId: venta.clienteId ?? undefined,
    clienteDni: venta.clienteDni ?? undefined,
    clienteTelefono: venta.clienteTelefono ?? undefined,
    articulo: nombreArticuloDeVenta(venta),
    tipoOperacion: 'CONTADO',
    metodoPago: venta.metodoPago,
    montoTotal: venta.monto,
    cuotaInicial: 0,
    saldoPendiente: 0,
    valorCuota: 0,
    cuotas: 0,
    cuotasPagadas: 0,
    frecuencia: '',
    tasaInteres: 0,
    estado: 'PAGADO',
    fechaVenta: venta.fecha,
    fechaPrimerCobro: '',
    vendedor: venta.vendedor || 'Vendedor no informado',
    vendedorId: venta.vendedorId,
    vendedorRol: 'PUNTO_DE_VENTA',
    esVentaPdv: true,
    observaciones: venta.notas ?? undefined,
    pagadoHoy: 0,
  }
}

const CREDITOS_POR_PETICION = 100

type Periodo = 'HOY' | 'SEM' | 'MES' | 'AÑO'

const getUsuarioNombre = (usuario: Pick<Usuario, 'nombres' | 'apellidos' | 'correo'>) =>
  [usuario.nombres, usuario.apellidos]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ') ||
  usuario.correo ||
  'Punto de Venta'

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const isSameOrPartialName = (a: string, b: string) => {
  const left = normalizeText(a)
  const right = normalizeText(b)
  return !!left && !!right && (left === right || left.startsWith(right) || right.startsWith(left))
}

// ─── Componente Principal ─────────────────────────────────────────────────────

/**
 * El credito de punto de venta tal como lo devuelve `/loans`, con lo que esta pantalla lee.
 *
 * Los campos salen de un `grep` de los accesos del archivo, no de adivinar. Iban en `any`,
 * asi que la cascada `credito.vendedor || credito.creadoPorNombre` y el filtro por
 * `tipoPrestamo`/`tipo` no se comprobaban en ningun sitio.
 */
type CreditoDePuntoDeVenta = {
  // `id` obligatorio: es la clave del credito y el endpoint siempre lo manda.
  id: string
  // `clienteId` obligatorio por el mismo motivo que `id`: es la relacion del credito.
  clienteId: string
  /**
   * El nombre del cliente, como TEXTO.
   *
   * Medido en el backend: `/loans` lo arma con
   * `cliente: \`${cliente.nombres} ${cliente.apellidos}\`` (loans.service.ts:410 y :3906).
   * Se declaro `string | objeto` por si acaso y el compilador lo rechazo al asignarlo a
   * `VentaPdv.cliente`, que es texto: la union de mas tambien es un tipo que miente, y en
   * esta pantalla habria significado pintar "[object Object]" como nombre del cliente.
   */
  cliente?: string | null
  /**
   * Cuando se le pago por ultima vez, o `null` si nunca.
   *
   * Lo manda `/loans` con una sola consulta agrupada. Es opcional porque el
   * mismo tipo describe filas que pueden venir de una copia local sin ese
   * campo, y `null` significa «nunca pago», que no es lo mismo que «no se
   * sabe»: por eso no se rellena con una fecha de adorno.
   */
  ultimoPago?: string | null
  clienteDni?: string | null
  clienteTelefono?: string | null
  tipo?: string | null
  tipoPrestamo?: string | null
  tipoProducto?: string | null
  /**
   * El nombre del articulo, como TEXTO, igual que `cliente`.
   *
   * Aunque la consulta de Prisma incluya el producto entero, el listado lo APLANA antes
   * de mandarlo: `producto: prestamo.producto?.nombre || 'Prestamo en efectivo'`
   * (loans.service.ts:1923). Es la segunda vez en este archivo que la union "por si
   * acaso" era el tipo equivocado y no el codigo.
   */
  producto?: string | null
  estado?: string | null
  montoTotal?: number | string | null
  montoPendiente?: number | string | null
  cuotaInicial?: number | string | null
  valorCuota?: number | string | null
  tasaInteres?: number | string | null
  cuotasPagadas?: number | null
  cuotasTotales?: number | null
  frecuenciaPago?: string | null
  fechaInicio?: string | null
  creadoEn?: string | null
  observaciones?: string | null
  // El vendedor llega con cuatro nombres distintos segun el endpoint: de ahi la cascada.
  creadoPorId?: string | null
  creadoPorNombre?: string | null
  creadoPorRol?: string | null
  vendedor?: string | null
  vendedorRol?: string | null
}

/** El pago de un credito de punto de venta, con lo que esta pantalla lee de el. */
type PagoDePuntoDeVenta = {
  id?: string
  numeroPago?: string | number | null
  prestamoId?: string | null
  creditoId?: string | null
  montoTotal?: number | string | null
  metodoPago?: string | null
  fechaPago?: string | null
  creadoEn?: string | null
}

export default function SeguimientoPuntoVenta() {
  const [creditos, setCreditos] = useState<VentaPdv[]>([])
  const [ventasContado, setVentasContado] = useState<VentaPdv[]>([])
  const [paginaContado, setPaginaContado] = useState(0)
  const [totalContado, setTotalContado] = useState(0)
  const [cargandoContado, setCargandoContado] = useState(false)
  const [errorContado, setErrorContado] = useState<string | null>(null)
  const ventas = useMemo(
    () => [...creditos, ...ventasContado].sort((a, b) => Date.parse(b.fechaVenta) - Date.parse(a.fechaVenta)),
    [creditos, ventasContado],
  )
  const [totalCreditosServidor, setTotalCreditosServidor] = useState<number | null>(null)
  const [usuariosPdv, setUsuariosPdv] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState<string>('TODOS')
  const [periodoVentas, setPeriodoVentas] = useState<Periodo | 'TODOS'>('TODOS')
  const [page, setPage] = useState(1)

  // Detalle
  const [ventaDetalle, setVentaDetalle] = useState<VentaPdv | null>(null)
  const { contenedorRef, capa, propsDialogo } = useModalDialog({
    abierto: ventaDetalle !== null,
    onClose: () => setVentaDetalle(null),
  })
  const [historialPagos, setHistorialPagos] = useState<PagoDePuntoDeVenta[]>([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const cargarVentasContado = useCallback(async (pagina = 1) => {
    setCargandoContado(true)
    setErrorContado(null)
    try {
      const resultado = await salesService.obtenerVentasContado({ pagina, limite: 50, soloPuntoVenta: true })
      const nuevas = resultado.ventas.map(mapearVentaContado)
      setVentasContado((actuales) => {
        const unicas = new Map((pagina === 1 ? [] : actuales).map((venta) => [venta.id, venta]))
        for (const venta of nuevas) unicas.set(venta.id, venta)
        return [...unicas.values()]
      })
      setPaginaContado(pagina)
      setTotalContado(resultado.paginacion.total)
    } catch (error) {
      setErrorContado(mensajeDeError(error, 'No se pudieron cargar las ventas de contado.'))
    } finally {
      setCargandoContado(false)
    }
  }, [])

  const cargarDatos = useCallback(async () => {
    try {
      const hoyStr = getBogotaDateKey(new Date())

      const [resp, usuariosResp] = await Promise.all([
        prestamosService.obtenerPrestamos({ tipo: 'ARTICULO', limit: CREDITOS_POR_PETICION }),
        usuariosService.obtenerTodos().catch(() => []),
        cargarVentasContado(),
      ])

      const usuariosPuntoVenta = (usuariosResp || []).filter(
        (usuario: Usuario) =>
          String(usuario.rol || '').toUpperCase() === 'PUNTO_DE_VENTA' &&
          String(usuario.estado || '').toUpperCase() === 'ACTIVO',
      )
      setUsuariosPdv(usuariosPuntoVenta)

      const resolveVendedorPdv = (credito: CreditoDePuntoDeVenta) => {
        const vendedorId = String(credito.creadoPorId || '')
        const vendedorNombre = String(credito.vendedor || credito.creadoPorNombre || '').trim()
        const vendedorRol = String(credito.creadoPorRol || credito.vendedorRol || '').toUpperCase()

        const usuarioPorId = vendedorId
          ? usuariosPuntoVenta.find((usuario) => usuario.id === vendedorId)
          : undefined

        const usuarioPorNombre = vendedorNombre
          ? usuariosPuntoVenta.find((usuario) =>
              isSameOrPartialName(getUsuarioNombre(usuario), vendedorNombre),
            )
          : undefined

        const usuario = usuarioPorId || usuarioPorNombre

        return {
          vendedor: usuario ? getUsuarioNombre(usuario) : vendedorNombre || 'Punto de Venta',
          vendedorId: usuario?.id || vendedorId,
          vendedorRol: usuario ? 'PUNTO_DE_VENTA' : vendedorRol,
          esVentaPdv: Boolean(usuario) || vendedorRol === 'PUNTO_DE_VENTA',
        }
      }

      // 1. Cargar todos los créditos de artículos (tipo ARTICULO)
      setTotalCreditosServidor(resp?.paginacion?.total ?? null)

      const todosArticulos = (resp?.prestamos || []).filter((c: CreditoDePuntoDeVenta) => {
        const tipo = String(c.tipoPrestamo || c.tipo || '').toUpperCase()
        const tipoProducto = String(c.tipoProducto || '').toLowerCase()
        return tipo === 'ARTICULO' || (tipoProducto && tipoProducto !== 'efectivo')
      })

      // 2. Enriquecer con pagos del día.
      //
      // Los pagos se traen UNA vez y se indexan por crédito. Antes se pedían dentro del
      // bucle, uno por cada artículo: medido en esta pantalla, 50 llamadas a /payments de
      // las 69 que hacía, y 8,6 s en pintar.
      /*
       * Solo los pagos de HOY.
       *
       * Antes se pedia `limit: 5000` sin filtro de fecha, para quedarse con dos
       * datos: lo pagado hoy y la fecha del ultimo pago.
       *
       * `obtenerPagos` pagina de 200 en 200 y pide tantas paginas como hagan
       * falta para cubrir el limite, asi que el coste crece con el historico:
       * medido hoy, con 85 pagos en la base, es UNA peticion; en cuanto pasen
       * de 200 son varias, y con 5.000 o mas son VEINTICINCO. Y ahi cortaba, sin
       * decirlo.
       *
       * Lo pagado hoy sale de aqui, acotado por `fechaOperativa` —que el
       * servidor cuenta igual que la jornada de la ruta—, y la fecha del ultimo
       * pago la manda ahora el propio credito (`ultimoPago`, una sola consulta
       * agrupada en el backend).
       */
      const pagosResp = await pagosService
        .obtenerPagos({ fechaOperativa: hoyStr, limit: 1000 })
        .catch(() => ({ pagos: [] as PagoDePuntoDeVenta[] }))
      const pagosPorPrestamo = new Map<string, PagoDePuntoDeVenta[]>()
      for (const p of (pagosResp?.pagos || []) as PagoDePuntoDeVenta[]) {
        const clave = String(p.prestamoId || p.creditoId || '').trim()
        if (!clave) continue
        const lista = pagosPorPrestamo.get(clave)
        if (lista) lista.push(p)
        else pagosPorPrestamo.set(clave, [p])
      }

      const enriched: VentaPdv[] = todosArticulos.map((c: CreditoDePuntoDeVenta) => {
        let pagadoHoy = 0
        let fechaUltimoPago: string | undefined

        try {
          const pagos = pagosPorPrestamo.get(String(c.id)) || []

          pagadoHoy = pagos.reduce((sum: number, p: PagoDePuntoDeVenta) => {
            // El `|| ''` lo pidio el tipo: las dos fechas son opcionales.
            const raw = p.fechaPago || p.creadoEn || ''
            const fechaPagoKey = getBogotaDateKey(raw)
            return fechaPagoKey === hoyStr ? sum + Number(p.montoTotal || 0) : sum
          }, 0)

          /*
           * La fecha del ultimo pago la manda el credito.
           *
           * Antes se buscaba el maximo entre los pagos cargados, y por eso esta
           * pantalla tenia que traerse 5.000 pagos sin filtro de fecha: con los
           * de hoy, un credito que no pago hoy se habria quedado sin fecha, o
           * peor, habria mostrado la de hoy. Ahora la calcula el backend con una
           * sola consulta agrupada.
           */
          fechaUltimoPago = c.ultimoPago || undefined
        } catch {
          /* skip */
        }

        const vendedorPdv = resolveVendedorPdv(c)

        return {
          id: c.id,
          tipoOperacion: 'CREDITO' as const,
          cliente: c.cliente || 'Sin nombre',
          clienteId: c.clienteId,
          // Los `?? undefined`: las dos columnas son nulables en la base y `VentaPdv` las
          // declara `string | undefined`. Con `any` las dos cosas eran iguales.
          clienteDni: c.clienteDni ?? undefined,
          clienteTelefono: c.clienteTelefono ?? undefined,
          articulo: c.producto || c.tipoProducto || 'Artículo',
          montoTotal: Number(c.montoTotal || 0),
          cuotaInicial: Number(c.cuotaInicial || 0),
          saldoPendiente: Number(c.montoPendiente || 0),
          valorCuota: Number(c.valorCuota || 0),
          cuotas: Number(c.cuotasTotales || 0),
          cuotasPagadas: Number(c.cuotasPagadas || 0),
          frecuencia: c.frecuenciaPago || 'QUINCENAL',
          tasaInteres: Number(c.tasaInteres || 0),
          estado: c.estado as VentaPdv['estado'],
          fechaVenta: c.creadoEn || '',
          fechaPrimerCobro: c.fechaInicio || '',
          fechaUltimoPago,
          vendedor: vendedorPdv.vendedor,
          vendedorId: vendedorPdv.vendedorId,
          vendedorRol: vendedorPdv.vendedorRol,
          esVentaPdv: vendedorPdv.esVentaPdv,
          observaciones: c.observaciones ?? undefined,
          pagadoHoy,
        }
      })

      // Solo mantener los que fueron creados por PUNTO_DE_VENTA
      const soloVentasPdv = enriched.filter(
        (v) => v.vendedorRol === 'PUNTO_DE_VENTA' || v.esVentaPdv,
      )

      setCreditos(soloVentasPdv)
    } catch (err) {
      console.error('[SeguimientoPdv] Error cargando datos:', err)
    }
  }, [cargarVentasContado])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await cargarDatos()
      setLoading(false)
    }
    init()
  }, [cargarDatos])

  // ── Tiempo real via hook estándar del proyecto ───────────────────────────
  const handleRealtimeRefresh = useCallback(async () => {
    setRefreshing(true)
    await cargarDatos()
    setLastUpdate(new Date())
    setRefreshing(false)
  }, [cargarDatos])

  useRealtimeData(
    [
      'prestamos_actualizados',
      'pagos_actualizados',
      'clientes_actualizados',
      'dashboards_actualizados',
    ],
    handleRealtimeRefresh,
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await cargarDatos()
    setLastUpdate(new Date())
    setRefreshing(false)
  }

  // ─── Abrir detalle ────────────────────────────────────────────────────────

  const abrirDetalle = useCallback(async (venta: VentaPdv) => {
    setVentaDetalle(venta)
    setHistorialPagos([])
    if (venta.tipoOperacion === 'CONTADO') return
    setLoadingDetalle(true)
    try {
      const resp = await pagosService.obtenerPagos({
        clienteId: venta.clienteId,
        prestamoId: venta.id,
        limit: 100,
      })

      // Filtrar pagos para asegurarnos que solo corresponden al préstamo actual (estricto)
      const pagosVenta = (resp?.pagos || []).filter((p: PagoDePuntoDeVenta) => {
        const pagoPrestamoId = String(p.prestamoId || p.creditoId || '').trim()
        return pagoPrestamoId === String(venta.id)
      })

      pagosVenta.sort(
        (a: PagoDePuntoDeVenta, b: PagoDePuntoDeVenta) =>
          new Date(b.fechaPago || b.creadoEn || '').getTime() -
          new Date(a.fechaPago || a.creadoEn || '').getTime(),
      )
      setHistorialPagos(pagosVenta.slice(0, 20))
    } catch {
      setHistorialPagos([])
    } finally {
      setLoadingDetalle(false)
    }
  }, [])

  // ─── Filtros y paginación ─────────────────────────────────────────────────

  // Usuarios PDV reales para el selector. Si el backend aún no trae el usuario
  // completo en alguna venta, solo dejamos respaldos que no coincidan con ningún usuario real.
  const vendedoresFiltro = useMemo(() => {
    const seen = new Set<string>()
    const usuarios = usuariosPdv.map((usuario) => ({
      id: usuario.id,
      nombre: getUsuarioNombre(usuario),
      normalizedName: normalizeText(getUsuarioNombre(usuario)),
    }))

    usuarios.forEach((usuario) => {
      seen.add(usuario.id)
      seen.add(usuario.normalizedName)
    })

    const respaldos = ventas
      .filter((v) => v.vendedor && v.vendedor !== 'Punto de Venta')
      .map((v) => ({
        id: v.vendedorId || v.vendedor,
        nombre: v.vendedor,
        normalizedName: normalizeText(v.vendedor),
      }))
      .filter((v) => {
        const key = v.id || v.normalizedName
        const matchesUsuarioReal = usuarios.some((usuario) =>
          isSameOrPartialName(usuario.nombre, v.nombre),
        )
        if (!key || seen.has(key) || seen.has(v.normalizedName) || matchesUsuarioReal) return false
        seen.add(key)
        seen.add(v.normalizedName)
        return true
      })

    return [...usuarios, ...respaldos]
  }, [usuariosPdv, ventas])

  const ventasFiltradas = useMemo(() => {
    let result = ventas
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (v) =>
          v.cliente.toLowerCase().includes(q) ||
          v.articulo.toLowerCase().includes(q) ||
          (v.clienteDni || '').includes(q) ||
          (v.clienteTelefono || '').includes(q),
      )
    }
    if (filtroEstado !== 'TODOS') {
      result = result.filter((v) => v.estado === filtroEstado)
    }
    if (filtroVendedor !== 'TODOS') {
      const usuario = vendedoresFiltro.find((v) => v.id === filtroVendedor)
      result = result.filter(
        (v) =>
          (v.vendedorId && v.vendedorId === filtroVendedor) ||
          (!!usuario && isSameOrPartialName(v.vendedor, usuario.nombre)) ||
          (!usuario && (v.vendedorId || v.vendedor) === filtroVendedor),
      )
    }
    if (filtroFechaDesde) {
      result = result.filter((v) => {
        const f = normalizeDateKey(v.fechaVenta)
        return f >= filtroFechaDesde
      })
    }
    if (filtroFechaHasta) {
      result = result.filter((v) => {
        const f = normalizeDateKey(v.fechaVenta)
        return f <= filtroFechaHasta
      })
    }
    // Filtro por periodo (Hoy/Sem/Mes/Año) — ignora si hay fechas manuales
    if (periodoVentas !== 'TODOS' && !filtroFechaDesde && !filtroFechaHasta) {
      const { inicio, fin } = getBogotaRangeByPeriod(periodoVentas)
      // Convertir los rangos a keys YYYY-MM-DD
      const inicioKey = inicio ? normalizeDateKey(inicio) : ''
      const finKey = fin ? normalizeDateKey(fin) : ''

      result = result.filter((v) => {
        const f = normalizeDateKey(v.fechaVenta)
        return inicioKey && finKey && f >= inicioKey && f <= finKey
      })
    }
    return result
  }, [
    ventas,
    search,
    filtroEstado,
    filtroVendedor,
    filtroFechaDesde,
    filtroFechaHasta,
    periodoVentas,
    vendedoresFiltro,
  ])

  const totalPages = Math.max(1, Math.ceil(ventasFiltradas.length / PER_PAGE))
  const ventasPaginadas = ventasFiltradas.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const resetFiltros = () => {
    setSearch('')
    setFiltroEstado('TODOS')
    setFiltroVendedor('TODOS')
    setFiltroFechaDesde('')
    setFiltroFechaHasta('')
    setPeriodoVentas('TODOS')
    setPage(1)
  }

  // ─── KPIs reactivos — derivados del conjunto filtrado ───────────────────────
  const kpis = useMemo(() => {
    // Filtrar solo los créditos que ya han sido desembolsados o aprobados (que afectan capital real)
    const ventasEfectivas = ventasFiltradas.filter(
      (v) => v.estado !== 'PENDIENTE_APROBACION' && v.estado !== 'RECHAZADO',
    )

    const activos = ventasFiltradas.filter(
      (v) => v.estado === 'ACTIVO' || v.estado === 'PENDIENTE' || v.estado === 'EN_MORA',
    )

    return {
      ventas: ventasEfectivas.length,
      montoVentas: ventasEfectivas.reduce((s, v) => s + v.montoTotal, 0),
      cuotaInicial: ventasFiltradas.reduce((s, v) => s + v.cuotaInicial, 0),
      carteraTotal: activos.reduce((s, v) => s + v.saldoPendiente, 0),
      clientesActivos: activos.length,
    }
  }, [ventasFiltradas])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 sticky top-16 z-10 w-full">
        <div className="mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                Seguimiento · Punto de Venta
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Ventas de contado y créditos de artículos por vendedor.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Removido badge En vivo y botón Actualizar a petición del usuario */}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 w-full">
        {/* ── KPIs del día ───────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {
                label: `Ventas ${periodoVentas === 'TODOS' ? 'totales' : periodoVentas.toLowerCase()}`,
                value: kpis.ventas.toString(),
                icon: ShoppingBag,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                border: 'border-orange-100',
              },
              {
                label: `Monto ${periodoVentas === 'TODOS' ? 'total' : periodoVentas.toLowerCase()}`,
                value: formatCurrency(kpis.montoVentas),
                icon: TrendingUp,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                border: 'border-blue-100',
              },
              {
                label: 'Cuota inicial',
                value: formatCurrency(kpis.cuotaInicial),
                icon: CreditCard,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                border: 'border-emerald-100',
              },
              {
                label: 'Cartera activa',
                value: formatCurrency(kpis.carteraTotal),
                icon: BarChart3,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                border: 'border-purple-100',
              },
              {
                label: 'Créditos vigentes',
                value: kpis.clientesActivos.toString(),
                icon: Users,
                color: 'text-slate-600',
                bg: 'bg-slate-100',
                border: 'border-slate-200',
              },
            ].map((kpi, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg ${kpi.bg} ${kpi.border} border flex items-center justify-center`}
                  >
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    {kpi.label}
                  </span>
                </div>
                <p className={`text-lg font-black ${kpi.color} leading-tight`}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filtros ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          {/* Botones Periodo */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Periodo de venta
            </span>
            <div className="flex gap-1 ml-auto">
              {(['TODOS', 'HOY', 'SEM', 'MES', 'AÑO'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriodoVentas(p)
                    setFiltroFechaDesde('')
                    setFiltroFechaHasta('')
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    periodoVentas === p
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {p === 'TODOS' ? 'Todo' : p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Buscador */}
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente, artículo, cédula, teléfono…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Estado */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <Selector
                value={filtroEstado}
                onChange={(v) => {
                  setFiltroEstado(v)
                  setPage(1)
                }}
                etiqueta="Filtrar por estado"
                className="border-0 bg-transparent px-0 py-0 text-sm font-bold text-slate-700"
                opciones={[
                  { value: 'TODOS', label: 'Todos los estados' },
                  { value: 'ACTIVO', label: 'Activo' },
                  { value: 'PENDIENTE', label: 'Pendiente' },
                  { value: 'PENDIENTE_APROBACION', label: 'En Aprobación' },
                  { value: 'EN_MORA', label: 'En mora' },
                  { value: 'PAGADO', label: 'Pagado' },
                ]}
              />
            </div>

            {/* Usuario Punto de Venta */}
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
              <Users className="h-3.5 w-3.5 text-orange-500" />
              <Selector
                value={filtroVendedor}
                onChange={(valor) => {
                  setFiltroVendedor(valor)
                  setPage(1)
                }}
                etiqueta="Filtrar por punto de venta"
                className="max-w-[220px] border-0 bg-transparent px-0 py-0 text-sm font-bold text-orange-700"
                opciones={[
                  { value: 'TODOS', label: 'Todos los puntos de venta' },
                  ...vendedoresFiltro.map((v) => ({ value: v.id, label: v.nombre })),
                ]}
              />
            </div>

            {/* Fechas */}
                        <CampoFecha
              value={filtroFechaDesde}
              onChange={(valorFecha) => {
                setFiltroFechaDesde(valorFecha)
                setPage(1)
              }}
              className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 font-medium"
            />
                        <CampoFecha
              value={filtroFechaHasta}
              onChange={(valorFecha) => {
                setFiltroFechaHasta(valorFecha)
                setPage(1)
              }}
              className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 font-medium"
            />

            {/* Reset */}
            {(search ||
              filtroEstado !== 'TODOS' ||
              filtroVendedor !== 'TODOS' ||
              filtroFechaDesde ||
              filtroFechaHasta ||
              periodoVentas !== 'TODOS') && (
              <button
                onClick={resetFiltros}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* ── Tabla de ventas ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Subtítulo */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900">Créditos Artículo</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {ventasFiltradas.length} registros encontrados
              </p>
            </div>
            <div className="flex items-center gap-2">
              {refreshing && (
                <span className="text-xs text-slate-400 animate-pulse font-medium">
                  Actualizando…
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2" aria-busy="true">
              <span className="sr-only">Cargando…</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <ShoppingBag className="h-14 w-14 text-slate-200 mb-4" />
              <p className="text-base font-bold text-slate-700">Sin resultados</p>
              <p className="text-sm font-medium mt-1">
                No hay créditos artículo registrados por usuarios Punto de Venta.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="px-6 py-3">Cliente</th>
                      <th className="px-4 py-3">Artículo</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Saldo</th>
                      <th className="px-4 py-3">Cuotas</th>
                      <th className="px-4 py-3">Pago Hoy</th>
                      <th className="px-4 py-3">Último Pago</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ventasPaginadas.map((venta) => {
                      const cfg = estadoCfg(venta.estado)
                      const progreso =
                        venta.cuotas > 0
                          ? Math.round((venta.cuotasPagadas / venta.cuotas) * 100)
                          : 0
                      return (
                        <tr key={venta.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-rose-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-black text-orange-700">
                                  {venta.cliente
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate max-w-[140px]">
                                  {venta.cliente}
                                </p>
                                {venta.clienteDni && (
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    CC: {venta.clienteDni}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                                {venta.articulo}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-black text-slate-900">
                              {formatCurrency(venta.montoTotal)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-sm font-black ${venta.saldoPendiente > 0 ? 'text-amber-700' : 'text-emerald-600'}`}
                            >
                              {venta.tipoOperacion === 'CONTADO' ? '—' : formatCurrency(venta.saldoPendiente)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {venta.tipoOperacion === 'CONTADO' ? <span className="text-xs text-slate-500">—</span> : <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${progreso >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                  style={{ width: `${Math.min(100, progreso)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                                {venta.cuotasPagadas}/{venta.cuotas}
                              </span>
                            </div>}
                          </td>
                          <td className="px-4 py-3">
                            {venta.pagadoHoy > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />
                                {formatCurrency(venta.pagadoHoy)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-medium text-slate-500">
                              {fmtDate(venta.fechaUltimoPago)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {venta.tipoOperacion === 'CONTADO' ? 'Contado' : cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Tooltip texto="Ver detalle">
                              <button aria-label="Ver detalle"
                                onClick={() => abrirDetalle(venta)}
                                className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-600 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-50">
                {ventasPaginadas.map((venta) => {
                  const cfg = estadoCfg(venta.estado)
                  const progreso =
                    venta.cuotas > 0 ? Math.round((venta.cuotasPagadas / venta.cuotas) * 100) : 0
                  return (
                    <div key={venta.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-orange-700">
                              {venta.cliente
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {venta.cliente}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{venta.articulo}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {venta.tipoOperacion === 'CONTADO' ? 'Contado' : cfg.label}
                          </span>
                          <button aria-label="Ver detalle"
                            onClick={() => abrirDetalle(venta)}
                            className="shrink-0 p-1.5 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-orange-600 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs font-black text-slate-900">
                          {formatCurrency(venta.montoTotal)}
                        </span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[11px] font-bold text-amber-700">
                          {venta.tipoOperacion === 'CONTADO' ? etiquetaMetodoVenta(venta.metodoPago) : `Saldo: ${formatCurrency(venta.saldoPendiente)}`}
                        </span>
                        {venta.pagadoHoy > 0 && (
                          <>
                            <span className="text-[10px] text-slate-400">·</span>
                            <span className="text-[11px] font-black text-emerald-600">
                              +{formatCurrency(venta.pagadoHoy)} hoy
                            </span>
                          </>
                        )}
                      </div>
                      {venta.tipoOperacion === 'CREDITO' && <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full ${progreso >= 100 ? 'bg-emerald-500' : 'bg-orange-400'}`}
                            style={{ width: `${Math.min(100, progreso)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          {venta.cuotasPagadas}/{venta.cuotas}
                        </span>
                      </div>}
                    </div>
                  )
                })}
              </div>

              {/* Paginador */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-[11px] text-slate-400 font-medium">
                  {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, ventasFiltradas.length)} de{' '}
                  {ventasFiltradas.length}
                  {/*
                    * Si el servidor tenia mas creditos de los que se pidieron,
                    * se dice: el tope no puede ser invisible.
                    */}
                  {(totalCreditosServidor ?? 0) > CREDITOS_POR_PETICION && (
                    <span className="ml-2 font-bold text-amber-600">
                      · se cargaron {CREDITOS_POR_PETICION} de{' '}
                      {totalCreditosServidor} créditos
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button aria-label="Página anterior"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-3">
                    {page} / {totalPages}
                  </span>
                  <button aria-label="Página siguiente"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {(errorContado || ventasContado.length < totalContado) && (
        <div className="mx-6 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900" role={errorContado ? 'alert' : undefined}>
            {errorContado ?? `Resumen parcial: ${ventasContado.length} de ${totalContado} ventas de contado cargadas.`}
          </p>
          <button type="button" disabled={cargandoContado} onClick={() => cargarVentasContado(paginaContado + 1)} className="text-sm font-semibold text-blue-700 disabled:opacity-50">
            {cargandoContado ? 'Cargando…' : errorContado ? 'Reintentar' : 'Cargar más ventas de contado'}
          </button>
        </div>
      )}

      {/* ── Modal de Detalle ──────────────────────────────────────── */}
      {ventaDetalle && (
        <div
          className="fixed inset-0 capa-modal flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ zIndex: capa }}
          onClick={() => setVentaDetalle(null)}
        >
          <div
            ref={contenedorRef}
            {...propsDialogo}
            aria-labelledby="seguimiento-venta-titulo"
            className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-rose-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-md">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 id="seguimiento-venta-titulo" className="font-black text-slate-900 text-base">{ventaDetalle.cliente}</h3>
                    <p className="text-xs text-slate-500 font-medium">{ventaDetalle.articulo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${estadoCfg(ventaDetalle.estado).bg} ${estadoCfg(ventaDetalle.estado).text} ${estadoCfg(ventaDetalle.estado).border}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${estadoCfg(ventaDetalle.estado).dot}`}
                    />
                    {ventaDetalle.tipoOperacion === 'CONTADO' ? 'Contado' : estadoCfg(ventaDetalle.estado).label}
                  </span>
                  <button aria-label="Cerrar"
                    onClick={() => setVentaDetalle(null)}
                    className="p-2 rounded-xl hover:bg-white/50 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Body modal */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Información del cliente */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Información del Cliente
                </p>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 border border-orange-200 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-orange-700">
                      {ventaDetalle.cliente
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900">{ventaDetalle.cliente}</p>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {ventaDetalle.clienteDni && (
                        <span className="text-xs text-slate-500 font-mono">
                          CC: {ventaDetalle.clienteDni}
                        </span>
                      )}
                      {ventaDetalle.clienteTelefono && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="h-3 w-3" />
                          {ventaDetalle.clienteTelefono}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {ventaDetalle.tipoOperacion === 'CONTADO' ? (
                <dl className="grid grid-cols-1 gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 sm:grid-cols-2">
                  <div><dt className="text-sm text-emerald-800">Valor de la venta</dt><dd className="text-lg font-bold text-emerald-950">{formatCurrency(ventaDetalle.montoTotal)}</dd></div>
                  <div><dt className="text-sm text-emerald-800">Método de pago</dt><dd className="font-semibold text-emerald-950">{etiquetaMetodoVenta(ventaDetalle.metodoPago)}</dd></div>
                  <div><dt className="text-sm text-emerald-800">Fecha</dt><dd className="font-semibold text-emerald-950">{fmtDate(ventaDetalle.fechaVenta)}</dd></div>
                  <div><dt className="text-sm text-emerald-800">Vendedor</dt><dd className="font-semibold text-emerald-950">{ventaDetalle.vendedor}</dd></div>
                </dl>
              ) : (<>
              {/* Desglose financiero */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Desglose Financiero
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                      Monto Total
                    </p>
                    <p className="text-xl font-black text-blue-900">
                      {formatCurrency(ventaDetalle.montoTotal)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
                      Cuota Inicial<AyudaContextual ayuda="cuotaInicialDeArticulo" de="la cuota inicial" tamano="pequeno" />
                    </p>
                    <p className="text-xl font-black text-emerald-800">
                      {formatCurrency(ventaDetalle.cuotaInicial)}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">
                      Saldo Pendiente<AyudaContextual ayuda="saldoPendiente" de="el saldo pendiente" tamano="pequeno" />
                    </p>
                    <p className="text-xl font-black text-amber-900">
                      {formatCurrency(ventaDetalle.saldoPendiente)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Valor Cuota
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      {formatCurrency(ventaDetalle.valorCuota)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { label: 'Tasa', value: `${ventaDetalle.tasaInteres}%` },
                    { label: 'Frecuencia', value: ventaDetalle.frecuencia },
                    { label: 'Vendedor', value: ventaDetalle.vendedor },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center"
                    >
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        {item.label}
                      </p>
                      <p className="text-sm font-black text-slate-800 mt-0.5 truncate">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Progreso cuotas */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Progreso de Cuotas
                </p>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  {(() => {
                    const progreso =
                      ventaDetalle.cuotas > 0
                        ? Math.round((ventaDetalle.cuotasPagadas / ventaDetalle.cuotas) * 100)
                        : 0
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-700">
                            {ventaDetalle.cuotasPagadas} de {ventaDetalle.cuotas} cuotas
                          </span>
                          <span
                            className={`text-sm font-black ${progreso >= 100 ? 'text-emerald-600' : 'text-orange-600'}`}
                          >
                            {progreso}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${progreso >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-rose-500'}`}
                            style={{ width: `${Math.min(100, progreso)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[11px] text-slate-400">
                            Pagadas: {ventaDetalle.cuotasPagadas}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Restantes: {ventaDetalle.cuotas - ventaDetalle.cuotasPagadas}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </section>

              {/* Fechas */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Fechas
                </p>
                <div className="space-y-2">
                  {[
                    {
                      icon: Calendar,
                      label: 'Fecha de venta',
                      value: fmtDate(ventaDetalle.fechaVenta),
                    },
                    {
                      icon: ArrowUpRight,
                      label: 'Primer cobro',
                      value: fmtDate(ventaDetalle.fechaPrimerCobro),
                    },
                    {
                      icon: CheckCircle2,
                      label: 'Último pago',
                      value: fmtDate(ventaDetalle.fechaUltimoPago),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <span className="text-sm text-slate-500 flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5" />
                        {item.label}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                  {ventaDetalle.pagadoHoy > 0 && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-sm text-emerald-600 flex items-center gap-2 font-bold">
                        <DollarSign className="h-3.5 w-3.5" />
                        Pagado HOY
                      </span>
                      <span className="text-sm font-black text-emerald-700">
                        {formatCurrency(ventaDetalle.pagadoHoy)}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Historial de pagos */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Historial de Pagos
                </p>
                {loadingDetalle ? (
                  <div className="space-y-2" aria-busy="true">
                    <span className="sr-only">Cargando…</span>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-xl" />
                    ))}
                  </div>
                ) : historialPagos.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                    <p className="text-sm font-medium">Sin pagos registrados</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
                    {historialPagos.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.metodoPago === 'TRANSFERENCIA' ? 'bg-blue-50 border border-blue-100' : 'bg-emerald-50 border border-emerald-100'}`}
                          >
                            <Banknote
                              className={`h-3.5 w-3.5 ${p.metodoPago === 'TRANSFERENCIA' ? 'text-blue-500' : 'text-emerald-500'}`}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {formatCurrency(Number(p.montoTotal || 0))}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {fmtDate(p.fechaPago || p.creadoEn || undefined)} ·{' '}
                              {p.metodoPago === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          Pago #{p.numeroPago || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              </>)}

              {ventaDetalle.observaciones && (
                <section>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Observaciones
                  </p>
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-sm text-amber-900">{ventaDetalle.observaciones}</p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
