'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Banknote, Loader2, Package, Save, X } from 'lucide-react'
import { useNotification } from '@/components/providers/NotificationProvider'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider'
import FieldLabel from '@/components/ui/FieldLabel'
import { Selector } from '@/components/ui/Selector'
import { Skeleton, SkeletonTexto } from '@/components/ui/Skeleton'
import Tooltip from '@/components/ui/Tooltip'
import { useModalDialog } from '@/hooks/use-modal-dialog'
import { mensajeDeError } from '@/lib/mensaje-de-error'
import { normalizeDateKey } from '@/lib/rutas-core'
import { BARRA_DE_ARRASTRE, CUERPO_HOJA_MODAL, FONDO_HOJA_MODAL, PANEL_HOJA_MODAL, PIE_HOJA_MODAL } from '@/lib/ui/hoja-modal'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'
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
const formatoPlazo = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
const amortizaciones = [
  { value: TipoAmortizacion.INTERES_SIMPLE, label: 'Interés simple' },
  { value: TipoAmortizacion.INTERES_PLANO, label: 'Amortización (cuota fija)' },
  { value: TipoAmortizacion.FRANCESA, label: 'Francesa (histórica)' },
]
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
const boton = 'min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'

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

function datosIniciales(prestamo: Prestamo): Borrador {
  return {
    capital: prestamo.monto == null ? '' : formatCOPInputValue(String(Math.round(Number(prestamo.monto)))),
    inicial: prestamo.cuotaInicial == null ? '' : formatCOPInputValue(String(Math.round(Number(prestamo.cuotaInicial)))),
    tasa: prestamo.tasaInteres == null ? '' : String(prestamo.tasaInteres),
    cuotas: prestamo.cantidadCuotas == null ? '' : String(prestamo.cantidadCuotas),
    plazo: prestamo.plazoMeses == null ? '' : String(prestamo.plazoMeses),
    frecuencia: prestamo.frecuenciaPago || '',
    tipo: amortizaciones.find((opcion) => opcion.value === prestamo.tipoAmortizacion)?.value ?? '',
    notas: prestamo.notas ?? '',
  }
}

type Carga = { credito: Prestamo; opciones: OpcionCuotas[] }
type Resultado = { clave: string; plan: SimulacionEdicionPrestamo } | { clave: string; error: string }

function condicionesEditadas(actual: Borrador, original: Borrador, esArticulo: boolean): CambiosPrestamo {
  const cambios: CambiosPrestamo = {}
  if (actual.capital !== original.capital) cambios.monto = parseCOPInputToNumber(actual.capital)
  if (actual.cuotas !== original.cuotas) cambios.cantidadCuotas = Number(actual.cuotas)
  if (actual.plazo !== original.plazo) cambios.plazoMeses = Number(actual.plazo)
  if (actual.frecuencia !== original.frecuencia) cambios.frecuenciaPago = actual.frecuencia
  if (esArticulo && actual.inicial !== original.inicial) cambios.cuotaInicial = parseCOPInputToNumber(actual.inicial)
  if (!esArticulo && Number(actual.tasa) !== Number(original.tasa)) cambios.tasaInteres = Number(actual.tasa)
  if (!esArticulo && actual.tipo !== original.tipo && actual.tipo) cambios.tipoAmortizacion = actual.tipo
  return cambios
}

function ResumenImporte({ etiqueta, valor, ayuda }: { etiqueta: string; valor: string; ayuda?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-600">{etiqueta}</dt>
      <dd className="mt-1 break-words text-base font-bold tabular-nums text-slate-900">{valor}</dd>
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
        if (credito.tipoPrestamo?.toUpperCase() !== 'ARTICULO' || !credito.producto?.id || credito.motivoBloqueoPlan) return
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
  const esArticulo = credito?.tipoPrestamo?.toUpperCase() === 'ARTICULO'
  const bloqueo = credito?.motivoBloqueoPlan
  const cambios = useMemo(() => borrador && original && !bloqueo
    ? condicionesEditadas(borrador, original, esArticulo) : {}, [borrador, original, bloqueo, esArticulo])
  const { cuotaInicial: nuevaInicial, ...cambiosCalendario } = cambios
  const cambiaCalendario = Object.keys(cambiosCalendario).length > 0
  const cambiaNotas = borrador?.notas !== original?.notas
  const hayCambios = cambiaCalendario || nuevaInicial !== undefined || cambiaNotas
  const errorParametros = borrador && cambiaCalendario && (
    parseCOPInputToNumber(borrador.capital) <= 0 || !borrador.cuotas || Number(borrador.cuotas) < 1 ||
    Number(borrador.cuotas) > 1000 || !borrador.plazo || Number(borrador.plazo) < 1 ||
    (!esArticulo && (!borrador.tasa || !Number.isFinite(Number(borrador.tasa))))
  )
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
  const filas: Array<Partial<Cuota>> = cambiaCalendario ? (plan?.cuotas ?? []) : (credito?.cuotas ?? [])
  const interesRegistrado = credito?.interesTotal
  const interes = cambiaCalendario ? plan?.interesTotal : interesRegistrado
  const total = cambiaCalendario ? plan?.totalFinal : credito?.montoTotal ??
    (credito?.monto != null && interesRegistrado != null ? Number(credito.monto) + Number(interesRegistrado) : null)
  const primeraCuota = cambiaCalendario ? plan?.cuotaProyectada : filas[0]?.monto
  const plazoDeCalculo = cambiaCalendario ? plan?.plazoInteresMeses : credito?.plazoInteresMeses
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
      <div ref={contenedorRef} {...propsDialogo} aria-labelledby={titulo} className={`${PANEL_HOJA_MODAL} max-w-4xl`}>
        <div className={BARRA_DE_ARRASTRE} aria-hidden="true" />
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${esArticulo ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
            {esArticulo ? <Package size={20} aria-hidden="true" /> : <Banknote size={20} aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titulo} className="text-lg font-bold text-slate-900">{esArticulo ? 'Editar crédito de artículo' : 'Editar préstamo'}</h2>
            {credito && <p className="break-words text-xs font-medium text-slate-600">{credito.numeroPrestamo}</p>}
          </div>
          <Tooltip texto="Cerrar">
            <button type="button" onClick={cerrar} disabled={guardando} aria-label="Cerrar"
              className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">
              <X size={20} aria-hidden="true" />
            </button>
          </Tooltip>
        </header>
        <form onSubmit={guardar} className="flex min-h-0 flex-1 flex-col">
          <div className={`${CUERPO_HOJA_MODAL} space-y-5 overscroll-contain px-4 py-5 sm:px-6`}>
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
                <section aria-label="Titular y estado del crédito" className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-bold text-slate-900">
                      {[credito.cliente?.nombres, credito.cliente?.apellidos].filter(Boolean).join(' ') || 'Titular no informado'}
                    </p>
                    <p className="mt-0.5 break-words text-sm text-slate-600">
                      {[credito.cliente?.dni ? `CC ${credito.cliente.dni}` : '', credito.cliente?.telefono, esArticulo && credito.producto?.nombre].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {estado && (
                    <div className="text-left sm:text-right">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${estado === 'EN_MORA' ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                        {estados[estado] ?? estado}
                      </span>
                      {estado === 'EN_MORA' && credito.cuotasVencidas != null && credito.cuotasVencidas > 0 &&
                        <p className="mt-1 text-xs text-rose-700">{credito.cuotasVencidas} {credito.cuotasVencidas === 1 ? 'cuota vencida' : 'cuotas vencidas'}</p>}
                      {estadoAprobacion && estado !== 'PENDIENTE_APROBACION' &&
                        <p className="mt-1 text-xs text-slate-600">Revisión: {estadoAprobacion}</p>}
                    </div>
                  )}
                </section>

                <section aria-label="Resumen financiero" className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Resumen financiero</h3>
                    <span role="status" className="text-xs font-medium text-slate-600">
                      {calculando ? 'Calculando proyección…' : cambiaCalendario ? (plan ? 'Proyección sin guardar' : 'Proyección no disponible') : 'Plan registrado'}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <ResumenImporte etiqueta={esArticulo ? 'Capital financiado' : 'Capital prestado'} valor={formatoNumero(cambios.monto ?? credito.monto)} />
                    <ResumenImporte etiqueta={esArticulo ? 'Cuota inicial' : 'Interés total'} valor={formatoNumero(esArticulo ? nuevaInicial ?? credito.cuotaInicial : interes)}
                      ayuda={!esArticulo && plan && interesRegistrado != null && Number(interesRegistrado) !== plan.interesTotal
                        ? `Registrado: ${formatoNumero(interesRegistrado)}` : undefined} />
                    <ResumenImporte etiqueta={esArticulo ? 'Total en cuotas' : 'Total del plan'} valor={formatoNumero(total)} />
                    <ResumenImporte etiqueta={cambiaCalendario ? 'Primera cuota proyectada' : 'Primera cuota registrada'} valor={formatoNumero(primeraCuota)}
                      ayuda={frecuencias.find((opcion) => opcion.value === borrador.frecuencia)?.label} />
                  </dl>
                  <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-3 sm:grid-cols-4">
                    <ResumenImporte etiqueta="Pagado registrado" valor={formatoNumero(credito.totalPagado)} />
                    <ResumenImporte etiqueta="Saldo pendiente registrado" valor={formatoNumero(credito.montoPendiente ?? credito.saldoPendiente)} />
                    <div><dt className="text-xs text-slate-600">Fecha de inicio</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{fechaCorta(credito.fechaInicio)}</dd></div>
                    <div><dt className="text-xs text-slate-600">Primer cobro</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{fechaCorta(credito.fechaPrimerCobro ?? credito.cuotas?.[0]?.fechaVencimiento)}</dd></div>
                  </dl>
                </section>

                <section aria-label="Condiciones del crédito" className="space-y-3 border-b border-slate-200 pb-5">
                  <h3 className="text-sm font-bold text-slate-900">Condiciones del crédito</h3>
                  {bloqueo && <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertCircle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />{bloqueo}
                  </p>}
                  <fieldset disabled={Boolean(bloqueo) || guardando} className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="min-w-0">
                      <FieldLabel htmlFor={`${titulo}-capital`}>Capital (COP)</FieldLabel>
                      <input id={`${titulo}-capital`} className={campo} inputMode="numeric" value={borrador.capital}
                        onChange={(evento) => cambiar('capital', formatCOPInputValue(evento.target.value))} />
                    </div>
                    {esArticulo ? (
                      <div className="min-w-0">
                        <FieldLabel htmlFor={`${titulo}-inicial`} ayuda="cuotaInicialDeArticulo">Cuota inicial (COP)</FieldLabel>
                        <input id={`${titulo}-inicial`} className={campo} inputMode="numeric" value={borrador.inicial}
                          onChange={(evento) => cambiar('inicial', formatCOPInputValue(evento.target.value))} />
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <FieldLabel htmlFor={`${titulo}-tasa`}>
                          {borrador.tipo === TipoAmortizacion.INTERES_SIMPLE ? 'Tasa mensual (%)' : 'Tasa del plan (%)'}
                        </FieldLabel>
                        <input id={`${titulo}-tasa`} className={campo} inputMode="decimal" value={borrador.tasa}
                          onChange={(evento) => cambiar('tasa', evento.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <FieldLabel htmlFor={`${titulo}-cuotas`}>Número de cuotas</FieldLabel>
                      <input id={`${titulo}-cuotas`} className={campo} inputMode="numeric" value={borrador.cuotas}
                        onChange={(evento) => cambiar('cuotas', evento.target.value.replace(/\D/g, ''))} />
                    </div>
                    <div className="min-w-0">
                      <FieldLabel htmlFor={`${titulo}-plazo`}>Plazo (meses)</FieldLabel>
                      {esArticulo && carga && carga.opciones.length > 0 && !bloqueo ? (
                        <Selector id={`${titulo}-plazo`} etiqueta="Plazo (meses)" value={borrador.plazo}
                          placeholder={borrador.plazo ? `${borrador.plazo} meses` : 'Seleccionar plazo'}
                          opciones={carga.opciones.map((opcion) => ({ value: String(opcion.numeroCuotas),
                            label: `${opcion.numeroCuotas} · ${formatoNumero(opcion.precioTotal)}` }))}
                          onChange={(valor) => {
                            const opcion = carga.opciones.find((actual) => String(actual.numeroCuotas) === valor)
                            if (opcion) cambiarPlanArticulo(Number(valor), borrador.frecuencia, Number(opcion.precioTotal))
                          }} />
                      ) : (
                        <input id={`${titulo}-plazo`} className={campo} inputMode="numeric" value={borrador.plazo}
                          onChange={(evento) => cambiar('plazo', evento.target.value.replace(/\D/g, ''))} />
                      )}
                      {!esArticulo && plazoDeCalculo != null && plazoDeCalculo !== Number(borrador.plazo) &&
                        <p className="mt-1 text-xs text-slate-600">Plazo de cálculo: {formatoPlazo.format(plazoDeCalculo)} meses</p>}
                    </div>
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <FieldLabel htmlFor={`${titulo}-frecuencia`} ayuda="frecuenciaDePago">Frecuencia de pago</FieldLabel>
                      <Selector id={`${titulo}-frecuencia`} etiqueta="Frecuencia de pago" opciones={frecuencias}
                        disabled={Boolean(bloqueo) || guardando} value={borrador.frecuencia}
                        onChange={(valor) => {
                          if (esArticulo && Number(borrador.plazo) > 0) cambiarPlanArticulo(Number(borrador.plazo), valor)
                          else cambiar('frecuencia', valor)
                        }} />
                    </div>
                    {!esArticulo && <div className="col-span-2 min-w-0 sm:col-span-1">
                      <FieldLabel htmlFor={`${titulo}-tipo`} ayuda="tipoDeInteres">Tipo de interés</FieldLabel>
                      <Selector id={`${titulo}-tipo`} etiqueta="Tipo de interés" opciones={amortizaciones}
                        disabled={Boolean(bloqueo) || guardando} value={borrador.tipo}
                        onChange={(valor) => cambiar('tipo', valor)} />
                    </div>}
                  </fieldset>
                  {errorParametros && <p role="alert" className="text-sm text-rose-700">Revisa el capital, la tasa, el plazo y la cantidad de cuotas (1 a 1.000).</p>}
                </section>

                <section aria-label="Plan de cuotas">
                  <h3 className="mb-2 text-sm font-bold text-slate-900">{cambiaCalendario ? 'Plan de cuotas proyectado' : 'Plan de cuotas registrado'}</h3>
                  {errorPlan ? (
                    <div className="space-y-2">
                      <p role="alert" className="text-sm text-rose-700">{errorPlan}</p>
                      <button type="button" className={boton} onClick={() => setIntentoSimular((actual) => actual + 1)}>Reintentar cálculo</button>
                    </div>
                  ) : calculando ? (
                    <p role="status" className="flex items-center gap-2 py-3 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Calculando cuotas…</p>
                  ) : filas.length > 0 ? (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[420px] text-left text-sm tabular-nums">
                          <thead className="bg-slate-50 text-xs text-slate-700"><tr>
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
                                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-900">{formatoNumero(cuota.monto)}</td>
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
                  ) : !cambiaCalendario && <p className="text-sm text-slate-600">No hay cuotas registradas.</p>}
                </section>

                <div>
                  <FieldLabel htmlFor={`${titulo}-notas`}>Notas / observaciones</FieldLabel>
                  <textarea id={`${titulo}-notas`} className={campo} rows={2} disabled={guardando} value={borrador.notas}
                    onChange={(evento) => cambiar('notas', evento.target.value)} />
                </div>
              </>
            )}
          </div>
          <footer className={`${PIE_HOJA_MODAL} flex flex-wrap justify-end gap-2`}>
            {errorGuardar && <p role="alert" className="w-full text-sm text-rose-700">{errorGuardar}</p>}
            <button type="button" onClick={cerrar} disabled={guardando} className={boton}>Cancelar</button>
            <button type="submit" disabled={!puedeGuardar} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45">
              {guardando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
