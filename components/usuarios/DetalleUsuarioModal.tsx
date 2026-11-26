'use client'

import { useEffect, useState } from 'react'
import { useModalDialog } from '@/hooks/use-modal-dialog'
import {
  usuariosService,
  type ClaveDeCifra,
  type UsuarioDetalleOperativo,
} from '@/services/usuarios-service'
import { EstadoUsuario } from '@/types/enums'
import {
  Activity,
  AtSign,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileSignature,
  Loader2,
  Mail,
  Phone,
  Power,
  Route,
  TrendingDown,
  TrendingUp,
  Users as UsersIcon,
  X,
} from 'lucide-react'
import { formatFechaHumanaBogota } from '@/lib/format-date'
import { formatCurrency } from '@/lib/utils'
import { mensajeDeError } from '@/lib/mensaje-de-error'
import Tooltip from '@/components/ui/Tooltip'

export type UsuarioDelDetalle = {
  id: string
  nombres: string
  apellidos: string
  correo: string
  nombreUsuario?: string
  telefono: string
  rol: string
  estado: string
  ultimoAcceso: string
}


/**
 * El importe, con el formateador del sistema.
 *
 * Aquí había un `Intl.NumberFormat` propio: la séptima copia del formateo de
 * pesos en el frontend. Lo único que no puede hacer `formatCurrency` es
 * distinguir «no se sabe» de «cero», porque convierte lo no finito en 0 —y un
 * «$ 0» se lee «no movió dinero»—, así que eso se resuelve aquí y el formato
 * sale de donde sale el del resto del sistema.
 */
const pesos = (valor: number) =>
  Number.isFinite(valor) ? formatCurrency(valor) : 'No disponible'

/**
 * El estado, con su color. Sale del dato, nunca escrito a mano.
 *
 * El punto verde de antes era literal: un `div` con `bg-emerald-500` y un
 * tooltip que decía «Usuario Activo» pasara lo que pasara.
 */
const ESTADOS: Record<
  string,
  { texto: string; punto: string; chip: string; chipHover: string }
> = {
  ACTIVO: {
    texto: 'Activo',
    punto: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    chipHover: 'hover:bg-emerald-100 hover:border-emerald-300',
  },
  INACTIVO: {
    texto: 'Inactivo',
    punto: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-300',
    chipHover: 'hover:bg-slate-200 hover:border-slate-400',
  },
  SUSPENDIDO: {
    texto: 'Suspendido',
    punto: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    chipHover: 'hover:bg-amber-100 hover:border-amber-300',
  },
  ARCHIVADO: {
    texto: 'Archivado',
    punto: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-300',
    chipHover: '',
  },
}

/**
 * Qué cifras tienen sentido para cada rol.
 *
 * Lo que no está aquí **no se pinta**, en vez de salir en cero. Un «$ 0» se
 * lee «no cobró nada»; la verdad era «esta cifra no es de este rol».
 *
 * El `tono` y el icono no son adorno: separan de un vistazo el dinero que
 * entra del que sale y de lo que es un recuento. Sin eso, seis recuadros
 * grises obligan a leer las seis etiquetas para encontrar la que importa.
 */
/**
 * Cómo se llama y cómo se pinta cada cifra de la persona.
 *
 * ── Lo que había ───────────────────────────────────────────────────────────
 *
 * Un `tarjetasPorRol` con siete ramas donde a un administrador, a un contador
 * y a un super administrador se les enseñaba el dinero en caja de la empresa,
 * las rutas activas del sistema y el balance del día. Lo dijo el dueño: «¿de
 * qué nos sirve ver el detalle de un usuario si al final nos muestra el
 * detalle de todo el sistema? Para eso veo todo el sistema».
 *
 * Ahora no hay ramas por rol: la ficha enseña lo que esa persona hizo, y el
 * servidor dice cuáles de esas cifras merecen salir —las que hizo, más las
 * propias de su trabajo aunque estén en cero, que ahí el cero sí informa—.
 */
type Cifra = {
  etiqueta: string
  /** Qué se cuenta, para que «4» no quede suelto. */
  unidad: (n: number) => string
  /** Si el importe acompaña al recuento, y con qué sentido. */
  tono: 'entra' | 'sale' | 'neutro'
  icono: React.ReactNode
}

const CIFRAS: Record<ClaveDeCifra, Cifra> = {
  pagosRegistrados: {
    etiqueta: 'Pagos registrados',
    unidad: (n) => (n === 1 ? '1 cobro' : `${n.toLocaleString('es-CO')} cobros`),
    tono: 'entra',
    icono: <Banknote className="h-4 w-4" />,
  },
  creditosCreados: {
    etiqueta: 'Créditos creados',
    unidad: (n) =>
      n === 1 ? '1 crédito' : `${n.toLocaleString('es-CO')} créditos`,
    tono: 'sale',
    icono: <FileSignature className="h-4 w-4" />,
  },
  creditosAprobados: {
    etiqueta: 'Créditos aprobados',
    unidad: (n) =>
      n === 1 ? '1 crédito' : `${n.toLocaleString('es-CO')} créditos`,
    tono: 'sale',
    icono: <CheckCircle2 className="h-4 w-4" />,
  },
  clientesCreados: {
    etiqueta: 'Clientes dados de alta',
    unidad: (n) =>
      n === 1 ? '1 cliente' : `${n.toLocaleString('es-CO')} clientes`,
    tono: 'neutro',
    icono: <UsersIcon className="h-4 w-4" />,
  },
  gastosRegistrados: {
    etiqueta: 'Gastos registrados',
    unidad: (n) => (n === 1 ? '1 gasto' : `${n.toLocaleString('es-CO')} gastos`),
    tono: 'sale',
    icono: <TrendingDown className="h-4 w-4" />,
  },
  movimientosDeCaja: {
    etiqueta: 'Movimientos de caja',
    unidad: (n) =>
      n === 1 ? '1 movimiento' : `${n.toLocaleString('es-CO')} movimientos`,
    tono: 'neutro',
    icono: <TrendingUp className="h-4 w-4" />,
  },
  arqueosDeCaja: {
    etiqueta: 'Arqueos de caja',
    unidad: (n) =>
      n === 1 ? '1 arqueo' : `${n.toLocaleString('es-CO')} arqueos`,
    tono: 'neutro',
    icono: <ClipboardCheck className="h-4 w-4" />,
  },
  visitasRegistradas: {
    etiqueta: 'Visitas registradas',
    unidad: (n) =>
      n === 1 ? '1 visita' : `${n.toLocaleString('es-CO')} visitas`,
    tono: 'neutro',
    icono: <Route className="h-4 w-4" />,
  },
  accionesEnElSistema: {
    etiqueta: 'Acciones en el sistema',
    unidad: (n) =>
      n === 1 ? '1 acción' : `${n.toLocaleString('es-CO')} acciones`,
    tono: 'neutro',
    icono: <Activity className="h-4 w-4" />,
  },
}

const COLOR_POR_TONO: Record<Cifra['tono'], string> = {
  entra: 'text-emerald-600 bg-emerald-50',
  sale: 'text-rose-600 bg-rose-50',
  neutro: 'text-slate-500 bg-slate-100',
}

/** «hace 5 min», «hace 3 h», «ayer»… con la fecha exacta en el tooltip. */
function hace(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const seg = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (seg < 60) return 'hace un momento'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  const meses = Math.floor(d / 30)
  return meses === 1 ? 'hace un mes' : `hace ${meses} meses`
}

const POR_PAGINA = 6

export function DetalleUsuarioModal({
  usuario,
  rolNombre,
  rolDescripcion,
  rolIcono,
  rolColor = 'text-slate-600',
  rolFondo = 'bg-slate-100',
  puedeCambiarEstado = false,
  onEstadoCambiado,
  onCerrar,
}: {
  usuario: UsuarioDelDetalle
  rolNombre: string
  rolDescripcion?: string
  rolIcono?: React.ReactNode
  /** El color del rol, el MISMO que usa el listado. No se inventa aquí. */
  rolColor?: string
  rolFondo?: string
  /**
   * Si quien mira puede activar o desactivar a esta persona.
   *
   * Lo decide la pantalla, que es la que conoce los permisos; el modal solo
   * obedece. Un super administrador nunca se puede desactivar, y a un
   * archivado hay que restaurarlo antes.
   */
  puedeCambiarEstado?: boolean
  /** Para que el listado de detrás se entere del cambio sin recargar. */
  onEstadoCambiado?: (nuevoEstado: string) => void
  onCerrar: () => void
}) {
  const [pagina, setPagina] = useState(1)
  const [respuesta, setRespuesta] = useState<UsuarioDetalleOperativo | null>(
    null,
  )
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const { contenedorRef, capa, propsDialogo } = useModalDialog({
    onClose: onCerrar,
  })

  /*
   * El estado se lleva aquí dentro para que el cambio se vea EN EL SITIO.
   *
   * Antes el botón de activar cerraba el detalle y abría otro modal de
   * confirmación encima del listado: tres pantallas para un interruptor. El
   * dueño lo dijo claro: «ese Activo debe funcionar de verdad».
   */
  const [estadoActual, setEstadoActual] = useState(usuario.estado)
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorEstado, setErrorEstado] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    usuariosService
      .obtenerDetalleOperativo(usuario.id)
      .then((datos) => {
        if (datos.usuarioId !== usuario.id || !datos.hizo)
          throw new Error('Detalle no válido')
        if (vigente) setRespuesta(datos)
      })
      .catch(() => {
        if (vigente) setError(true)
      })
    return () => {
      vigente = false
    }
  }, [usuario.id, intento])

  const cargando = !respuesta && !error

  /*
   * Bloquear el scroll del fondo mientras el modal está abierto.
   *
   * El efecto que lo hacía en la página listaba los otros cuatro modales y a
   * este se le olvidó: el detalle se abría y la lista seguía moviéndose
   * detrás. Al vivir aquí, no se puede olvidar.
   */
  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [])

  const claveEstado = String(estadoActual || '').toUpperCase()
  const estado = ESTADOS[claveEstado] ?? {
    texto: estadoActual || 'Sin estado',
    punto: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-300',
    chipHover: '',
  }

  const esActivo = claveEstado === 'ACTIVO'
  const esArchivado = claveEstado === 'ARCHIVADO'
  const estadoEsEditable = puedeCambiarEstado && !esArchivado

  const cambiarEstado = async () => {
    const siguiente = esActivo ? EstadoUsuario.INACTIVO : EstadoUsuario.ACTIVO
    setGuardando(true)
    setErrorEstado(null)
    try {
      await usuariosService.toggleEstado(usuario.id, siguiente)
      setEstadoActual(siguiente)
      setConfirmando(false)
      onEstadoCambiado?.(siguiente)
    } catch (e) {
      // El motivo del backend, no un «ocurrió un error» que no dice nada.
      setErrorEstado(mensajeDeError(e, 'No se pudo cambiar el estado.'))
    } finally {
      setGuardando(false)
    }
  }

  /*
   * Las cifras a pintar las decide el SERVIDOR, que es quien sabe si el cero
   * de alguien informa o es ruido. La pantalla solo las dibuja.
   */
  const cifras = respuesta?.cifras ?? []

  const actividad = respuesta?.actividadReciente ?? []
  const paginas = Math.max(1, Math.ceil(actividad.length / POR_PAGINA))
  const visibles = actividad.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  )

  const iniciales =
    `${usuario.nombres.charAt(0)}${usuario.apellidos.charAt(0)}`.toUpperCase()

  /*
   * Cuántos días abarca. Lo dice el servidor, que es quien elige la ventana.
   * Deducirlo aquí restando `desde` del reloj llamaría a `Date.now()`
   * mientras se dibuja, que es impuro y el linter lo rechaza con razón.
   */
  const diasDeLaVentana = respuesta?.hizo.dias ?? 30

  return (
    <div
      className="fixed inset-0 capa-modal bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: capa }}
      onClick={onCerrar}
      role="presentation"
    >
      <div
        ref={contenedorRef}
        {...propsDialogo}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const botones =
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              'button:not(:disabled)',
            )
          const primero = botones[0]
          const ultimo = botones[botones.length - 1]
          if (event.shiftKey && document.activeElement === primero) {
            event.preventDefault()
            ultimo?.focus()
          } else if (!event.shiftKey && document.activeElement === ultimo) {
            event.preventDefault()
            primero?.focus()
          }
        }}
        aria-label={`Detalle de ${usuario.nombres} ${usuario.apellidos}`}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/*
          ── Cabecera ──────────────────────────────────────────────────────

          El color del ROL va en el avatar y en el rótulo, que es donde lo
          pone el listado, y NO como banda de fondo.

          Se probó con la banda y se veía bien, pero es un error: en este
          sistema el esmeralda significa «al día» y el ámbar «precaución».
          Como el cobrador es esmeralda y el contador ámbar, el detalle de un
          contador se leía como una advertencia y el de un cobrador como que
          todo va bien, sin que ninguno de los dos colores quisiera decir eso.
          Un color que ya significa algo no puede reutilizarse para no
          significar nada.
        */}
        <div className="relative shrink-0 border-b border-slate-200 bg-white">
          <div className="flex items-start gap-4 p-5 sm:p-6">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ring-1 ring-slate-900/5 ${rolFondo} ${rolColor}`}
            >
              {iniciales}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="break-words text-xl font-bold leading-tight text-slate-900">
                {usuario.nombres} {usuario.apellidos}
              </h2>
              <p
                className={`mt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${rolColor}`}
              >
                {rolIcono}
                {rolNombre}
              </p>
              {rolDescripcion && (
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {rolDescripcion}
                </p>
              )}

              {/*
                ── El estado, que ahora es un interruptor de verdad ──

                Pulsa → pregunta → cambia, sin salir de aquí. Dos pasos a
                propósito: desactivar a alguien lo deja sin entrar al sistema,
                y eso no puede pasar con un clic de más.
              */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {estadoEsEditable && !confirmando && (
                  <Tooltip
                    texto={esActivo ? 'Pulsa para desactivar' : 'Pulsa para activar'}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setErrorEstado(null)
                        setConfirmando(true)
                      }}
                      aria-label={`Estado: ${estado.texto}. ${
                        esActivo ? 'Desactivar' : 'Activar'
                      } a ${usuario.nombres} ${usuario.apellidos}`}
                      className={`inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 text-[11px] font-bold uppercase tracking-wide transition-colors duration-150 ease-out motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${estado.chip} ${estado.chipHover}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${estado.punto}`} />
                      {estado.texto}
                      <Power className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </Tooltip>
                )}

                {(!estadoEsEditable || confirmando) && (
                  <span
                    className={`inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 text-[11px] font-bold uppercase tracking-wide ${estado.chip}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${estado.punto}`} />
                    {estado.texto}
                  </span>
                )}

                {confirmando && (
                  <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                    <span className="text-xs font-bold text-slate-700">
                      ¿{esActivo ? 'Desactivar' : 'Activar'} a{' '}
                      {usuario.nombres}?
                    </span>
                    <button
                      type="button"
                      onClick={cambiarEstado}
                      disabled={guardando}
                      className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white transition-colors duration-150 ease-out motion-reduce:transition-none disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                        esActivo
                          ? 'bg-slate-700 hover:bg-slate-800 focus-visible:ring-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600'
                      }`}
                    >
                      {guardando ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : esActivo ? (
                        <Power className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {guardando
                        ? 'Guardando…'
                        : esActivo
                          ? 'Sí, desactivar'
                          : 'Sí, activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(false)}
                      disabled={guardando}
                      className="min-h-[32px] rounded-lg px-2 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </span>
                )}

                {/*
                  Cuando NO se puede, se dice por qué. Un control apagado sin
                  motivo al lado deja pensando si está roto.
                */}
                {!estadoEsEditable && (
                  <span className="text-xs font-medium text-slate-500">
                    {esArchivado
                      ? 'Restaura al usuario para poder cambiar su estado.'
                      : 'No tienes permiso para cambiar el estado.'}
                  </span>
                )}
              </div>

              {errorEstado && (
                <p
                  role="alert"
                  className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                >
                  {errorEstado}
                </p>
              )}
            </div>

            <Tooltip texto="Cerrar">
              <button
                type="button"
                onClick={onCerrar}
                aria-label="Cerrar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-5 sm:p-6">
          {/*
            ── Datos de contacto ──

            Una tira, no cuatro recuadros iguales. Son cuatro datos cortos que
            se leen de corrido; enmarcar cada uno los hacía pesar lo mismo que
            las cifras de abajo, que son lo que de verdad se viene a ver.
          */}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <Dato icono={<AtSign className="h-3.5 w-3.5" />} etiqueta="Usuario">
              {usuario.nombreUsuario || 'No configurado'}
            </Dato>
            {/*
              El correo se recorta, no se parte.

              Sin esto se cortaba a mitad de palabra —«erickmanuel238@gmail.co»
              y una «m» sola en la línea de abajo—, que es peor que no verlo
              entero: parece otra dirección. Recortado y con el tooltip del
              sistema se lee completo al pasar por encima.
            */}
            <Dato icono={<Mail className="h-3.5 w-3.5" />} etiqueta="Correo">
              <Tooltip texto={usuario.correo || ''}>
                <span className="block truncate">{usuario.correo}</span>
              </Tooltip>
            </Dato>
            <Dato icono={<Phone className="h-3.5 w-3.5" />} etiqueta="Teléfono">
              {usuario.telefono || 'No registrado'}
            </Dato>
            <Dato
              icono={<Clock className="h-3.5 w-3.5" />}
              etiqueta="Último acceso"
            >
              {usuario.ultimoAcceso || 'Nunca'}
            </Dato>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <p className="text-sm font-bold text-amber-900">
                No se pudieron cargar las cifras ni la actividad de este
                usuario.
              </p>
              <button
                type="button"
                className="mt-2 min-h-10 rounded-lg bg-amber-900 px-3 text-xs font-bold text-white hover:bg-amber-800"
                onClick={() => {
                  setError(false)
                  setIntento((n) => n + 1)
                }}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div aria-busy={cargando}>
              {cargando && (
                <span role="status" className="sr-only">
                  Cargando detalle del usuario
                </span>
              )}

              <div className="mt-6">
                <Titulo
                  icono={<Activity className="h-3.5 w-3.5" />}
                  texto={`Lo que hizo en los últimos ${diasDeLaVentana} días`}
                  nota={
                    respuesta && respuesta.aCargo.rutasTotal > 0
                      ? `Tiene ${respuesta.aCargo.rutasTotal} ${
                          respuesta.aCargo.rutasTotal === 1 ? 'ruta' : 'rutas'
                        } a su cargo, ${respuesta.aCargo.rutasActivas} ${
                          respuesta.aCargo.rutasActivas === 1
                            ? 'activa'
                            : 'activas'
                        }.`
                      : undefined
                  }
                />

                {cargando ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-24 animate-pulse rounded-xl bg-white ring-1 ring-slate-200"
                      />
                    ))}
                  </div>
                ) : cifras.length === 0 ? (
                  <p className="mt-2 rounded-xl bg-white p-4 text-sm font-medium text-slate-500 ring-1 ring-slate-200">
                    No registró ningún movimiento en este periodo.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cifras.map((clave) => {
                      const cifra = CIFRAS[clave]
                      const dato = respuesta!.hizo[clave]
                      return (
                        <div
                          key={clave}
                          className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase leading-snug tracking-wider text-slate-500">
                              {cifra.etiqueta}
                            </p>
                            <span
                              aria-hidden
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                COLOR_POR_TONO[cifra.tono]
                              }`}
                            >
                              {cifra.icono}
                            </span>
                          </div>
                          {/*
                            La cifra grande es el RECUENTO y el importe va
                            debajo: «4 cobros · $ 400.000». Al revés se leía
                            el dinero como si fuera lo que la persona tiene,
                            no lo que movió.
                          */}
                          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                            {cifra.unidad(dato.cantidad)}
                          </p>
                          {dato.monto !== null && dato.cantidad > 0 && (
                            <p
                              className={`mt-0.5 text-sm font-bold tabular-nums ${
                                cifra.tono === 'entra'
                                  ? 'text-emerald-600'
                                  : cifra.tono === 'sale'
                                    ? 'text-rose-600'
                                    : 'text-slate-500'
                              }`}
                            >
                              {pesos(dato.monto)}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Actividad ── */}
              <div className="mt-6">
                <Titulo
                  icono={<Activity className="h-3.5 w-3.5" />}
                  texto="Actividad reciente"
                />

                {cargando ? (
                  <div className="mt-3 space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-14 animate-pulse rounded-xl bg-white ring-1 ring-slate-200"
                      />
                    ))}
                  </div>
                ) : actividad.length === 0 ? (
                  <p className="mt-2 rounded-xl bg-white p-4 text-sm font-medium text-slate-500 ring-1 ring-slate-200">
                    Sin actividad registrada.
                  </p>
                ) : (
                  <>
                    {/*
                      Una línea de tiempo, no una lista de filas sueltas: el
                      riel y el punto dicen que lo de arriba pasó después, que
                      es la única pregunta que se le hace a esta sección.
                    */}
                    <ul className="mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                      {visibles.map((item, i) => (
                        <li
                          key={`${item.time}-${i}`}
                          className="relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 border-b border-slate-100 p-3.5 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                        >
                          {/* El riel, salvo en el último. */}
                          <span
                            aria-hidden
                            className="absolute bottom-0 left-[1.37rem] top-[1.95rem] w-px bg-slate-200 last:hidden"
                          />
                          <span
                            aria-hidden
                            className={`relative z-10 mt-1 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-white ${
                              item.type === 'in'
                                ? 'bg-emerald-500'
                                : item.type === 'out'
                                  ? 'bg-rose-500'
                                  : 'bg-slate-300'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">
                              {item.action}
                            </p>
                            {/*
                              Solo si se pudo resolver a un nombre. Antes aquí
                              iba «Prestamo b86ee359-c87c-4b7f-…», que no dice
                              nada.
                            */}
                            {item.detail && (
                              <p className="break-words text-xs font-medium text-slate-500">
                                {item.detail}
                              </p>
                            )}
                            <Tooltip texto={formatFechaHumanaBogota(item.time)}>
                              <time
                                className="mt-0.5 inline-block text-xs font-medium text-slate-400"
                                dateTime={item.time}
                              >
                                {hace(item.time)}
                              </time>
                            </Tooltip>
                          </div>
                          {item.amount && (
                            <span
                              className={`col-start-2 shrink-0 text-sm font-bold tabular-nums sm:col-start-3 sm:self-center ${
                                item.type === 'in'
                                  ? 'text-emerald-600'
                                  : item.type === 'out'
                                    ? 'text-rose-600'
                                    : 'text-slate-600'
                              }`}
                            >
                              {item.amount}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    {paginas > 1 && (
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500">
                          {(pagina - 1) * POR_PAGINA + 1}–
                          {Math.min(pagina * POR_PAGINA, actividad.length)} de{' '}
                          {actividad.length}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            className="min-h-[40px] rounded-lg bg-white px-3 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Anterior
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPagina((p) => Math.min(paginas, p + 1))
                            }
                            disabled={pagina >= paginas}
                            className="min-h-[40px] rounded-lg bg-white px-3 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Titulo({
  icono,
  texto,
  nota,
}: {
  icono: React.ReactNode
  texto: string
  nota?: string
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span className="text-slate-400">{icono}</span>
        {texto}
      </h3>
      {nota && <p className="mt-1 text-xs font-medium text-slate-400">{nota}</p>}
    </div>
  )
}

function Dato({
  icono,
  etiqueta,
  children,
}: {
  icono: React.ReactNode
  etiqueta: string
  children: React.ReactNode
}) {
  return (
    // `min-w-0` para que el hijo recortado tenga de dónde recortar: sin eso,
    // una celda de rejilla se ensancha con su contenido y `truncate` no actúa.
    <div className="min-w-0 bg-white p-3.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {icono}
        {etiqueta}
      </p>
      <div className="mt-1 min-w-0 break-words text-sm font-bold text-slate-900">
        {children}
      </div>
    </div>
  )
}

export default DetalleUsuarioModal
