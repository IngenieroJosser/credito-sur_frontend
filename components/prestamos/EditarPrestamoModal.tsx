'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Banknote, CalendarDays, Calculator, Loader2, Package, Save, SlidersHorizontal, UserRound } from 'lucide-react'
import { useNotification } from '@/components/providers/NotificationProvider'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider'
import FieldLabel from '@/components/ui/FieldLabel'
import TipoCreditoIndicador from '@/components/creditos/TipoCreditoIndicador'
import { Selector } from '@/components/ui/Selector'
import { Skeleton, SkeletonTexto } from '@/components/ui/Skeleton'
import CabeceraModal from '@/components/ui/CabeceraModal'
import { useModalDialog } from '@/hooks/use-modal-dialog'
import { etiquetaTipoInteres, OPCIONES_TIPO_INTERES, tipoInteresRegistrado } from '@/lib/creditos/tipos-interes'
import { resolverTipoCreditoDeEntidad } from '@/lib/creditos/tipo-credito'
import { mensajeDeError } from '@/lib/mensaje-de-error'
import { normalizeDateKey } from '@/lib/rutas-core'
import { BARRA_DE_ARRASTRE, CUERPO_HOJA_MODAL, FONDO_HOJA_MODAL, PANEL_HOJA_MODAL, PIE_HOJA_MODAL } from '@/lib/ui/hoja-modal'
import { cn, formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'
import { articulosService, type OpcionCuotas } from '@/services/articulos-service'
import { prestamosService, type CambiosPrestamo, type SimulacionEdicionPrestamo } from '@/services/prestamos-service'
import type { Cuota, Prestamo } from '@/types/domain'
import { TipoAmortizacion } from '@/types/enums'

type Props = { id: string; onClose: () => void; onSuccess?: () => void }

const frecuencias = [
  { value: 'DIARIO', label: 'Diaria', porMes: 30 },
  { value: 'SEMANAL', label: 'Semanal', porMes: 4 },
  { value: 'QUINCENAL', label: 'Quincenal', porMes: 2 },
  { value: 'MENSUAL', label: 'Mensual', porMes: 1 },
]
const formatoPlazo = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2, useGrouping: false })
const estados = {
  ACTIVO: 'Activo',
  EN_MORA: 'En mora',
  PAGADO: 'Pagado',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  BORRADOR: 'Borrador',
  INCUMPLIDO: 'Incumplido',
  PERDIDA: 'Pérdida',
}
const campo = 'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-600'
const boton = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'
const campoCambiado = 'border-blue-400 bg-blue-50/60'
const tonosEstado = {
  ACTIVO: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  EN_MORA: 'border-rose-200 bg-rose-50 text-rose-800',
  PAGADO: 'border-blue-200 bg-blue-50 text-blue-800',
  PENDIENTE_APROBACION: 'border-amber-200 bg-amber-50 text-amber-900',
  BORRADOR: 'border-slate-200 bg-slate-100 text-slate-700',
  INCUMPLIDO: 'border-rose-200 bg-rose-50 text-rose-800',
  PERDIDA: 'border-rose-200 bg-rose-50 text-rose-800',
}

function estiloCampo(cambio: boolean | undefined, invalido?: boolean) {
  return cn(campo, cambio && campoCambiado, invalido && 'border-rose-400 bg-rose-50')
}

function formatoNumero(valor: number | string | null | undefined) {
  return valor == null || valor === '' || !Number.isFinite(Number(valor)) ? '—' : formatCurrency(valor)
}

function fechaCorta(valor?: string | null) {
  return normalizeDateKey(valor).split('-').reverse().join('/') || '—'
}

type Borrador = {
  capital: string
  inicial: string
  tasa: string
  cuotas: string
  plazo: string
  frecuencia: string
  tipo: TipoAmortizacion | ''
  notas: string
}

function numeroDePlazo(texto?: string): number {
  return Number(texto?.replace(',', '.'))
}

function datosIniciales(prestamo: Prestamo): Borrador {
  const tipo = tipoInteresRegistrado(prestamo.tipoAmortizacion)
  const plazo = resolverTipoCreditoDeEntidad(prestamo) === 'EFECTIVO' && tipo === TipoAmortizacion.INTERES_SIMPLE
    ? prestamo.plazoInteresMeses ?? prestamo.plazoMeses
    : prestamo.plazoMeses
  return {
    capital: prestamo.monto == null ? '' : formatCOPInputValue(String(Math.round(Number(prestamo.monto)))),
    inicial: prestamo.cuotaInicial == null ? '' : formatCOPInputValue(String(Math.round(Number(prestamo.cuotaInicial)))),
    tasa: prestamo.tasaInteres == null ? '' : String(prestamo.tasaInteres),
    cuotas: prestamo.cantidadCuotas == null ? '' : String(prestamo.cantidadCuotas),
    plazo: plazo == null ? '' : formatoPlazo.format(plazo),
    frecuencia: prestamo.frecuenciaPago || '',
    tipo,
    notas: prestamo.notas ?? '',
  }
}

type Carga = { credito: Prestamo; opciones: OpcionCuotas[] }
type Resultado = { clave: string; plan: SimulacionEdicionPrestamo } | { clave: string; error: string }

function condicionesEditadas(actual: Borrador, original: Borrador, esArticulo: boolean): CambiosPrestamo {
  const cambios: CambiosPrestamo = {}
  if (actual.capital !== original.capital) cambios.monto = parseCOPInputToNumber(actual.capital)
  if (actual.cuotas !== original.cuotas) cambios.cantidadCuotas = Number(actual.cuotas)
  if (numeroDePlazo(actual.plazo) !== numeroDePlazo(original.plazo)) cambios.plazoMeses = numeroDePlazo(actual.plazo)
  if (actual.frecuencia !== original.frecuencia) cambios.frecuenciaPago = actual.frecuencia
  if (esArticulo && actual.inicial !== original.inicial) cambios.cuotaInicial = parseCOPInputToNumber(actual.inicial)
  if (!esArticulo && Number(actual.tasa) !== Number(original.tasa)) cambios.tasaInteres = Number(actual.tasa)
  if (!esArticulo && actual.tipo !== original.tipo && actual.tipo) cambios.tipoAmortizacion = actual.tipo
  return cambios
}

function valorAnterior(actual: number | null | undefined, registrado: number | null | undefined) {
  if (registrado == null || !Number.isFinite(Number(registrado))) return undefined
  return actual == null || Number(actual) !== Number(registrado) ? formatoNumero(registrado) : undefined
}

function ResumenImporte({ etiqueta, valor, anterior, ayuda, proyectado }: {
  etiqueta: string; valor: string; anterior?: string; ayuda?: string; proyectado?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-slate-600">{etiqueta}</dt>
      <dd className={cn('mt-1 break-words text-lg font-bold tabular-nums', proyectado ? 'text-emerald-800' : 'text-slate-900')}>{valor}</dd>
      {anterior && <dd className="mt-0.5 break-words text-xs text-slate-600">Registrado: {anterior}</dd>}
      {ayuda && <dd className="mt-0.5 break-words text-xs text-slate-600">{ayuda}</dd>}
    </div>
  )
}

export default function EditarPrestamoModal({ id, onClose, onSuccess }: Props) {
  const titulo = useId()
  const { showNotification } = useNotification()
  const { refreshNotificaciones } = useNotificaciones()
  const [carga, setCarga] = useState<Carga | null>(null)
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [intentoCarga, setIntentoCarga] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [intentoSimular, setIntentoSimular] = useState(0)
  const [verPlanCompleto, setVerPlanCompleto] = useState(false)
  const [verRegistrado, setVerRegistrado] = useState(false)
  const guardandoRef = useRef(false)
  const cerrar = () => { if (!guardandoRef.current) onClose() }
  const { contenedorRef, propsDialogo, capa } = useModalDialog({ onClose: cerrar })

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = anterior }
  }, [])

  useEffect(() => {
    let vigente = true
    async function cargar() {
      try {
        const credito = await prestamosService.obtenerPrestamoPorId(id)
        if (!vigente) return
        setCarga({ credito, opciones: [] })
        setBorrador(datosIniciales(credito))
        if (resolverTipoCreditoDeEntidad(credito) !== 'ARTICULO' || !credito.producto?.id || credito.motivoBloqueoPlan) return
        try {
          const articulo = await articulosService.obtenerArticuloPorId(credito.producto.id)
          if (vigente) setCarga({ credito, opciones: articulo?.opcionesCuotas ?? [] })
        } catch {
          // El plazo numérico se puede editar sin depender del catálogo.
        }
      } catch (error) {
        if (vigente) setErrorCarga(mensajeDeError(error, 'No se pudo cargar el crédito.'))
      }
    }
    void cargar()
    return () => { vigente = false }
  }, [id, intentoCarga])

  const credito = carga?.credito.id === id ? carga.credito : null
  const original = useMemo(() => credito ? datosIniciales(credito) : null, [credito])
  const tipoCredito = resolverTipoCreditoDeEntidad(credito)
  const esArticulo = tipoCredito === 'ARTICULO'
  const bloqueo = credito?.motivoBloqueoPlan
  const cambios = useMemo(() => borrador && original && !bloqueo
    ? condicionesEditadas(borrador, original, esArticulo) : {}, [borrador, original, bloqueo, esArticulo])
  const { cuotaInicial: nuevaInicial, ...cambiosCalendario } = cambios
  const cambiaCalendario = Object.keys(cambiosCalendario).length > 0
  const cambiaNotas = Boolean(borrador && original && borrador.notas !== original.notas)
  const hayCambios = cambiaCalendario || nuevaInicial !== undefined || cambiaNotas
  const validarCondiciones = Boolean(borrador && cambiaCalendario)
  const capital = parseCOPInputToNumber(borrador?.capital ?? '')
  const capitalValido = !validarCondiciones || (Number.isSafeInteger(capital) && capital > 0)
  const cantidadCuotas = Number(borrador?.cuotas)
  const cuotasValidas = !validarCondiciones || (Number.isInteger(cantidadCuotas) && cantidadCuotas >= 1 && cantidadCuotas <= 1000)
  const plazo = numeroDePlazo(borrador?.plazo)
  const plazoValido = !validarCondiciones || (Number.isFinite(plazo) && plazo >= 1 &&
    (esArticulo ? Number.isSafeInteger(plazo) : /^\d+([,.]\d{1,2})?$/.test(borrador?.plazo ?? '')))
  const tasaValida = !validarCondiciones || esArticulo || (Boolean(borrador?.tasa) && Number.isFinite(Number(borrador?.tasa)))
  const errorParametros = !capitalValido || !cuotasValidas || !plazoValido || !tasaValida
  const solicitud = cambiaCalendario && !errorParametros
    ? JSON.stringify({ ...cambiosCalendario, version: credito?.version }) : ''
  const clave = solicitud && `${id}:${intentoSimular}:${solicitud}`

  useEffect(() => {
    if (!solicitud) return
    let vigente = true
    const timeout = setTimeout(() => {
      void prestamosService.simularEdicion(id, JSON.parse(solicitud) as CambiosPrestamo)
        .then((plan) => { if (vigente) setResultado({ clave, plan }) })
        .catch((error) => {
          if (vigente) setResultado({ clave, error: mensajeDeError(error, 'No se pudo calcular el nuevo plan.') })
        })
    }, 350)
    return () => { vigente = false; clearTimeout(timeout) }
  }, [id, clave, solicitud])

  const respuesta = clave && resultado?.clave === clave ? resultado : null
  const plan = respuesta && 'plan' in respuesta ? respuesta.plan : null
  const errorPlan = respuesta && 'error' in respuesta ? respuesta.error : null
  const calculando = Boolean(clave && !respuesta)
  const cuotasRegistradas = credito?.cuotas ?? []
  const mostrarProyectado = cambiaCalendario && !verRegistrado
  const filas: Array<Partial<Cuota>> = mostrarProyectado ? (plan?.cuotas ?? []) : cuotasRegistradas
  const interesRegistrado = credito?.interesTotal
  const totalRegistrado = credito?.montoTotal ??
    (credito?.monto != null && interesRegistrado != null ? Number(credito.monto) + Number(interesRegistrado) : null)
  const primeraCuotaRegistrada = cuotasRegistradas[0]?.monto
  const interes = cambiaCalendario ? plan?.interesTotal : interesRegistrado
  const total = cambiaCalendario ? plan?.totalFinal : totalRegistrado
  const primeraCuota = cambiaCalendario ? plan?.cuotaProyectada : primeraCuotaRegistrada
  const plazoDeCalculo = cambiaCalendario ? plan?.plazoInteresMeses : credito?.plazoInteresMeses
  const estadoProyeccion = errorParametros ? 'Datos por corregir'
    : calculando ? 'Calculando proyección…'
    : cambiaCalendario ? (plan ? 'Proyección sin guardar' : 'Proyección no disponible')
    : nuevaInicial !== undefined ? 'Cuota inicial sin guardar' : 'Plan registrado'
  const cantidadCambios = Object.keys(cambios).length + Number(cambiaNotas)
  const estado = credito?.estadoEfectivo ?? credito?.estado
  const estadoAprobacion = credito?.estadoAprobacion === 'APROBADO' ? 'Aprobado'
    : credito?.estadoAprobacion === 'PENDIENTE' ? 'Pendiente de aprobación'
    : credito?.estadoAprobacion === 'RECHAZADO' ? 'Rechazado' : null
  const puedeGuardar = Boolean(credito && hayCambios && !guardando && (!cambiaCalendario || plan))

  function cambiar<K extends keyof Borrador>(campo: K, valor: Borrador[K]) {
    setErrorGuardar(null)
    setBorrador((prev) => prev && { ...prev, [campo]: valor })
  }

  function cambiarPlanArticulo(meses: number, frecuencia: string, precio?: number) {
    setErrorGuardar(null)
    setBorrador((prev) => {
      if (!prev) return prev
      const factor = frecuencias.find((opcion) => opcion.value === frecuencia)?.porMes
      return {
        ...prev, plazo: String(meses), frecuencia,
        cuotas: factor ? String(meses * factor) : prev.cuotas,
        capital: precio === undefined ? prev.capital
          : formatCOPInputValue(String(Math.max(0, Math.round(precio - parseCOPInputToNumber(prev.inicial))))),
      }
    })
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!puedeGuardar || guardandoRef.current || !credito || !borrador) return
    guardandoRef.current = true
    setGuardando(true)
    setErrorGuardar(null)
    try {
      const actualizado = await prestamosService.actualizarPrestamo(id, {
        ...cambios,
        ...(cambiaNotas ? { notas: borrador.notas } : {}),
        version: credito.version,
      })
      if (!actualizado) {
        showNotification('info', 'Los cambios quedaron pendientes de sincronización.', 'Sin conexión')
        onClose()
        return
      }
      showNotification('success', 'El crédito fue actualizado.', 'Cambios guardados')
      if (esArticulo && (cambiaCalendario || nuevaInicial !== undefined)) {
        try {
          const { exportService } = await import('@/services/export-service')
          await exportService.exportContrato(id)
        } catch (error) {
          showNotification('warning', mensajeDeError(error, 'No se pudo descargar el contrato actualizado.'), 'Contrato')
        }
      }
      void Promise.resolve().then(refreshNotificaciones).catch(() => {})
      onSuccess?.()
      onClose()
    } catch (error) {
      setErrorGuardar(mensajeDeError(error, 'No se pudieron guardar los cambios.'))
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  // El modal se abre mediante una acción del usuario, pero puede pre-renderizarse.
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={FONDO_HOJA_MODAL} style={{ zIndex: capa }}>
      <div ref={contenedorRef} {...propsDialogo} aria-labelledby={titulo} className={`${PANEL_HOJA_MODAL} max-w-5xl`}>
        <div className={BARRA_DE_ARRASTRE} aria-hidden="true" />
        <CabeceraModal
          idTitulo={titulo}
          titulo={esArticulo ? 'Editar crédito de artículo' : 'Editar préstamo'}
          icono={esArticulo ? Package : Banknote}
          tono={esArticulo ? 'ambar' : 'cielo'}
          onClose={cerrar}
          cerrarDeshabilitado={guardando}
          subtitulo={credito && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p>{credito.numeroPrestamo}</p>
              <TipoCreditoIndicador tipo={tipoCredito} className="rounded-md bg-white px-2 py-0.5" />
            </div>
          )}
        />
        <form onSubmit={guardar} className="flex min-h-0 flex-1 flex-col">
          <div className={`${CUERPO_HOJA_MODAL} space-y-5 overscroll-contain bg-slate-50/70 px-4 py-5 sm:px-6`}>
            {errorCarga ? (
              <div className="space-y-3">
                <p role="alert" className="text-sm text-rose-700">{errorCarga}</p>
                <button type="button" className={boton} onClick={() => {
                  setErrorCarga(null)
                  setIntentoCarga((actual) => actual + 1)
                }}>Reintentar</button>
              </div>
            ) : !credito || !borrador ? (
              <div aria-busy="true" className="space-y-4">
                <span className="sr-only">Cargando el crédito…</span>
                <Skeleton className="h-6 w-48" />
                <SkeletonTexto lineas={5} />
              </div>
            ) : (
              <>
                <section aria-label="Titular y estado del crédito" className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-800">
                      <UserRound size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-base font-bold text-slate-900">
                        {[credito.cliente?.nombres, credito.cliente?.apellidos].filter(Boolean).join(' ') || 'Titular no informado'}
                      </p>
                      <p className="mt-0.5 break-words text-sm text-slate-600">
                        {[credito.cliente?.dni ? `CC ${credito.cliente.dni}` : '', credito.cliente?.telefono, esArticulo && credito.producto?.nombre].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  {estado && (
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className={cn('rounded-md border px-2 py-1 font-semibold', tonosEstado[estado])}>
                        {estados[estado] ?? estado}
                      </span>
                      {estado === 'EN_MORA' && credito.cuotasVencidas != null && credito.cuotasVencidas > 0 &&
                        <span className="font-semibold text-rose-700">{credito.cuotasVencidas} {credito.cuotasVencidas === 1 ? 'cuota vencida' : 'cuotas vencidas'}</span>}
                      {estadoAprobacion && estado !== 'PENDIENTE_APROBACION' &&
                        <span className="text-slate-600">Revisión: {estadoAprobacion}</span>}
                    </div>
                  )}
                </section>

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <section aria-label="Resumen financiero" className={cn('min-w-0 overflow-hidden rounded-lg border lg:order-2',
                    hayCambios ? 'border-emerald-200 bg-emerald-50/70' : 'border-blue-200 bg-blue-50/70')}>
                    <div className={cn('flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3',
                      hayCambios ? 'border-emerald-200 bg-emerald-100/85 text-emerald-950' : 'border-blue-200 bg-blue-100 text-blue-950')}>
                      <h3 className="inline-flex items-center gap-2 text-sm font-bold">
                        <Calculator size={17} aria-hidden="true" /> {cambiaCalendario || nuevaInicial !== undefined ? 'Vista previa' : 'Resumen financiero'}
                      </h3>
                      <span role="status" className={cn('inline-flex min-h-6 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold',
                        errorPlan || errorParametros ? 'bg-rose-100 text-rose-800' : 'bg-white/90 text-slate-800')}>
                        {calculando && <Loader2 size={13} className="motion-safe:animate-spin" aria-hidden="true" />}
                        {estadoProyeccion}
                      </span>
                    </div>
                    <div className="space-y-4 p-4">
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-2">
                        <ResumenImporte etiqueta={esArticulo ? 'Capital financiado' : 'Capital prestado'}
                          valor={formatoNumero(capitalValido ? cambios.monto ?? credito.monto : null)}
                          anterior={cambios.monto !== undefined ? valorAnterior(cambios.monto, credito.monto) : undefined}
                          proyectado={capitalValido && cambios.monto !== undefined} />
                        <ResumenImporte etiqueta={esArticulo ? 'Cuota inicial' : 'Interés total'}
                          valor={formatoNumero(esArticulo ? nuevaInicial ?? credito.cuotaInicial : interes)}
                          anterior={esArticulo
                            ? nuevaInicial !== undefined ? valorAnterior(nuevaInicial, credito.cuotaInicial) : undefined
                            : cambiaCalendario ? valorAnterior(interes, interesRegistrado) : undefined}
                          proyectado={esArticulo ? nuevaInicial !== undefined : Boolean(plan)} />
                        <ResumenImporte etiqueta={esArticulo ? 'Total en cuotas' : 'Total del plan'} valor={formatoNumero(total)}
                          anterior={cambiaCalendario ? valorAnterior(total, totalRegistrado) : undefined} proyectado={Boolean(plan)} />
                        <ResumenImporte etiqueta={cambiaCalendario ? 'Primera cuota proyectada' : 'Primera cuota registrada'} valor={formatoNumero(primeraCuota)}
                          anterior={cambiaCalendario ? valorAnterior(primeraCuota, primeraCuotaRegistrada) : undefined}
                          ayuda={frecuencias.find((opcion) => opcion.value === borrador.frecuencia)?.label} proyectado={Boolean(plan)} />
                      </dl>
                      <dl className={cn('grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4 lg:grid-cols-2',
                        hayCambios ? 'border-emerald-200' : 'border-blue-200')}>
                        <ResumenImporte etiqueta="Pagado registrado" valor={formatoNumero(credito.totalPagado)} />
                        <ResumenImporte etiqueta="Saldo pendiente registrado" valor={formatoNumero(credito.montoPendiente ?? credito.saldoPendiente)} />
                        <div><dt className="text-xs text-slate-600">Fecha de inicio</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{fechaCorta(credito.fechaInicio)}</dd></div>
                        <div><dt className="text-xs text-slate-600">Primer cobro</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{fechaCorta(credito.fechaPrimerCobro ?? credito.cuotas?.[0]?.fechaVencimiento)}</dd></div>
                      </dl>
                    </div>
                  </section>

                  <section aria-label="Condiciones del crédito" className="min-w-0 overflow-hidden rounded-lg border border-blue-200 bg-white lg:order-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3">
                      <h3 className="inline-flex items-center gap-2 text-sm font-bold text-blue-950">
                        <SlidersHorizontal size={17} aria-hidden="true" /> Condiciones del crédito
                      </h3>
                      {cantidadCambios > 0 && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        {cantidadCambios} {cantidadCambios === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
                      </span>}
                    </div>
                    <div className="space-y-4 p-4">
                      {bloqueo && <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                        <AlertCircle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />{bloqueo}
                      </p>}
                      <fieldset disabled={Boolean(bloqueo) || guardando} className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-4">
                        <div className="min-w-0">
                          <FieldLabel htmlFor={`${titulo}-capital`}>Capital (COP)</FieldLabel>
                          <input id={`${titulo}-capital`} className={estiloCampo(cambios.monto !== undefined, !capitalValido)} inputMode="numeric" value={borrador.capital}
                            aria-invalid={!capitalValido || undefined} aria-describedby={!capitalValido ? `${titulo}-validacion` : undefined}
                            onChange={(evento) => cambiar('capital', formatCOPInputValue(evento.target.value))} />
                        </div>
                        {esArticulo ? (
                          <div className="min-w-0">
                            <FieldLabel htmlFor={`${titulo}-inicial`} ayuda="cuotaInicialDeArticulo">Cuota inicial (COP)</FieldLabel>
                            <input id={`${titulo}-inicial`} className={estiloCampo(nuevaInicial !== undefined)} inputMode="numeric" value={borrador.inicial}
                              onChange={(evento) => cambiar('inicial', formatCOPInputValue(evento.target.value))} />
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <FieldLabel htmlFor={`${titulo}-tasa`}>
                              {borrador.tipo === TipoAmortizacion.INTERES_SIMPLE ? 'Tasa mensual (%)' : 'Tasa del plan (%)'}
                            </FieldLabel>
                            <input id={`${titulo}-tasa`} className={estiloCampo(cambios.tasaInteres !== undefined, !tasaValida)} inputMode="decimal" value={borrador.tasa}
                              aria-invalid={!tasaValida || undefined} aria-describedby={!tasaValida ? `${titulo}-validacion` : undefined}
                              onChange={(evento) => cambiar('tasa', evento.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <FieldLabel htmlFor={`${titulo}-cuotas`}>Número de cuotas</FieldLabel>
                          <input id={`${titulo}-cuotas`} className={estiloCampo(cambios.cantidadCuotas !== undefined, !cuotasValidas)} inputMode="numeric" value={borrador.cuotas}
                            aria-invalid={!cuotasValidas || undefined} aria-describedby={!cuotasValidas ? `${titulo}-validacion` : undefined}
                            onChange={(evento) => cambiar('cuotas', evento.target.value.replace(/\D/g, ''))} />
                        </div>
                        <div className="min-w-0">
                          <FieldLabel htmlFor={`${titulo}-plazo`}>Plazo (meses)</FieldLabel>
                          {esArticulo && carga && carga.opciones.length > 0 && !bloqueo ? (
                            <Selector id={`${titulo}-plazo`} etiqueta="Plazo (meses)" value={borrador.plazo}
                              className={estiloCampo(cambios.plazoMeses !== undefined, !plazoValido)}
                              placeholder={borrador.plazo ? `${borrador.plazo} meses` : 'Seleccionar plazo'}
                              opciones={carga.opciones.map((opcion) => ({ value: String(opcion.numeroCuotas),
                                label: `${opcion.numeroCuotas} · ${formatoNumero(opcion.precioTotal)}` }))}
                              onChange={(valor) => {
                                const opcion = carga.opciones.find((actual) => String(actual.numeroCuotas) === valor)
                                if (opcion) cambiarPlanArticulo(Number(valor), borrador.frecuencia, Number(opcion.precioTotal))
                              }} />
                          ) : (
                            <input id={`${titulo}-plazo`} className={estiloCampo(cambios.plazoMeses !== undefined, !plazoValido)} inputMode={esArticulo ? 'numeric' : 'decimal'} value={borrador.plazo}
                              aria-invalid={!plazoValido || undefined} aria-describedby={!plazoValido ? `${titulo}-validacion` : undefined}
                              onChange={(evento) => cambiar('plazo', evento.target.value.replace(esArticulo ? /\D/g : /[^0-9.,]/g, ''))} />
                          )}
                          {!esArticulo && plazoDeCalculo != null && formatoPlazo.format(plazoDeCalculo) !== formatoPlazo.format(plazo) &&
                            <p className="mt-1 text-xs text-slate-600">Plazo de cálculo: {formatoPlazo.format(plazoDeCalculo)} meses</p>}
                          {!esArticulo && original?.plazo && credito.plazoMeses != null &&
                            numeroDePlazo(original.plazo) !== Number(credito.plazoMeses) &&
                            <p className="mt-1 text-xs text-slate-600">Guardado redondeado: {formatoPlazo.format(credito.plazoMeses)} meses</p>}
                        </div>
                        <div className="col-span-2 min-w-0 sm:col-span-1">
                          <FieldLabel htmlFor={`${titulo}-frecuencia`} ayuda="frecuenciaDePago">Frecuencia de pago</FieldLabel>
                          <Selector id={`${titulo}-frecuencia`} etiqueta="Frecuencia de pago" opciones={frecuencias}
                            disabled={Boolean(bloqueo) || guardando} value={borrador.frecuencia}
                            className={estiloCampo(cambios.frecuenciaPago !== undefined)}
                            onChange={(valor) => {
                              if (esArticulo && Number(borrador.plazo) > 0) cambiarPlanArticulo(Number(borrador.plazo), valor)
                              else cambiar('frecuencia', valor)
                            }} />
                        </div>
                        {!esArticulo && <div className="col-span-2 min-w-0 sm:col-span-1">
                          <FieldLabel htmlFor={`${titulo}-tipo`} ayuda="tipoDeInteres">Tipo de interés</FieldLabel>
                          <Selector id={`${titulo}-tipo`} etiqueta="Tipo de interés" opciones={OPCIONES_TIPO_INTERES}
                            disabled={Boolean(bloqueo) || guardando} value={borrador.tipo}
                            className={estiloCampo(cambios.tipoAmortizacion !== undefined)}
                            placeholder={etiquetaTipoInteres(borrador.tipo)}
                            onChange={(valor) => cambiar('tipo', valor)} />
                        </div>}
                      </fieldset>
                      {errorParametros && <p id={`${titulo}-validacion`} role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        {[
                          !capitalValido && 'El capital debe ser mayor a cero.',
                          !tasaValida && 'Ingresa una tasa válida.',
                          !cuotasValidas && 'Ingresa entre 1 y 1.000 cuotas.',
                          !plazoValido && 'Ingresa un plazo de al menos un mes, con hasta dos decimales.',
                        ].filter(Boolean).join(' ')}
                      </p>}
                      <div>
                        <FieldLabel htmlFor={`${titulo}-notas`}>Notas / observaciones</FieldLabel>
                        <textarea id={`${titulo}-notas`} className={estiloCampo(cambiaNotas)} rows={2} disabled={guardando} value={borrador.notas}
                          onChange={(evento) => cambiar('notas', evento.target.value)} />
                      </div>
                    </div>
                  </section>
                </div>

                <section aria-label="Plan de cuotas" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3">
                    <h3 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                      <CalendarDays size={17} className={mostrarProyectado ? 'text-emerald-700' : 'text-blue-700'} aria-hidden="true" />
                      {mostrarProyectado ? 'Plan de cuotas proyectado' : 'Plan de cuotas registrado'}
                    </h3>
                    {cambiaCalendario && <div role="group" aria-label="Comparar planes" className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                      <button type="button" aria-pressed={!verRegistrado} onClick={() => setVerRegistrado(false)}
                        className={cn('min-h-9 rounded-md px-2.5 text-xs font-semibold', !verRegistrado ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600 hover:bg-slate-50')}>Proyectado</button>
                      <button type="button" aria-pressed={verRegistrado} onClick={() => setVerRegistrado(true)}
                        className={cn('min-h-9 rounded-md px-2.5 text-xs font-semibold', verRegistrado ? 'bg-blue-100 text-blue-900' : 'text-slate-600 hover:bg-slate-50')}>Registrado</button>
                    </div>}
                  </div>
                  <div className="p-4">
                    {mostrarProyectado && errorPlan ? (
                      <div className="space-y-2">
                        <p role="alert" className="text-sm text-rose-700">{errorPlan}</p>
                        <button type="button" className={boton} onClick={() => setIntentoSimular((actual) => actual + 1)}>Reintentar cálculo</button>
                      </div>
                    ) : mostrarProyectado && calculando ? (
                      <p className="flex items-center gap-2 py-3 text-sm font-medium text-emerald-800"><Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> Calculando cuotas…</p>
                    ) : filas.length > 0 ? (
                      <>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full min-w-[420px] text-left text-sm tabular-nums">
                            <thead className={cn('text-xs', mostrarProyectado ? 'bg-emerald-50 text-emerald-900' : 'bg-blue-50 text-blue-950')}><tr>
                              <th scope="col" className="px-3 py-2">N°</th>
                              <th scope="col" className="px-3 py-2">Vencimiento</th>
                              <th scope="col" className="px-3 py-2 text-right">Capital</th>
                              {!esArticulo && <th scope="col" className="px-3 py-2 text-right">Interés</th>}
                              <th scope="col" className="px-3 py-2 text-right">Cuota</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {(verPlanCompleto ? filas : filas.slice(0, 5)).map((cuota) => (
                                <tr key={cuota.numeroCuota}>
                                  <td className="px-3 py-2">{cuota.numeroCuota}</td>
                                  <td className="px-3 py-2">{fechaCorta(cuota.fechaVencimientoProrroga ?? cuota.fechaVencimiento)}</td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right">{formatoNumero(cuota.montoCapital)}</td>
                                  {!esArticulo && <td className="whitespace-nowrap px-3 py-2 text-right">{formatoNumero(cuota.montoInteres)}</td>}
                                  <td className={cn('whitespace-nowrap px-3 py-2 text-right font-semibold',
                                    mostrarProyectado ? 'bg-emerald-50/60 text-emerald-900' : 'text-slate-900')}>{formatoNumero(cuota.monto)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {filas.length > 5 && <button type="button" className="min-h-11 text-sm font-semibold text-blue-700 hover:underline"
                          aria-expanded={verPlanCompleto} onClick={() => setVerPlanCompleto((ver) => !ver)}>
                          {verPlanCompleto ? 'Mostrar solo 5 cuotas' : `Ver las ${filas.length} cuotas`}
                        </button>}
                      </>
                    ) : <p className="text-sm text-slate-600">
                      {mostrarProyectado ? 'Corrige las condiciones para calcular el plan.' : 'No hay cuotas registradas.'}
                    </p>}
                  </div>
                </section>
              </>
            )}
          </div>
          <footer className={`${PIE_HOJA_MODAL} !border-slate-200`}>
            {cambiaCalendario && (
              <div className={cn('mb-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs lg:hidden',
                errorParametros || errorPlan ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-950')}
                aria-label="Vista previa rápida">
                <span className="inline-flex items-center gap-1.5 font-bold"><Calculator size={14} aria-hidden="true" />
                  {plan ? 'Proyección' : estadoProyeccion}
                </span>
                {plan && <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 tabular-nums">
                  <span>Cuota: <strong>{formatoNumero(primeraCuota)}</strong></span>
                  {!esArticulo && <span>Interés: <strong>{formatoNumero(interes)}</strong></span>}
                </div>}
              </div>
            )}
            {errorGuardar && <p role="alert" className="mb-2 text-sm text-rose-700">{errorGuardar}</p>}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={cerrar} disabled={guardando} className={boton}>Cancelar</button>
              <button type="submit" disabled={!puedeGuardar} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45">
                {guardando ? <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
