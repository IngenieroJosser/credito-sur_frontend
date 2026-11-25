'use client'

import { useEffect, useState } from 'react'
import { useModalDialog } from '@/hooks/use-modal-dialog'
import { usuariosService, type UsuarioDetalleOperativo } from '@/services/usuarios-service'
import {
  Activity,
  AtSign,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react'
import { formatFechaHumanaBogota } from '@/lib/format-date'


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

type MetricasDelDetalle = UsuarioDetalleOperativo['metricas']

const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
})
const pesos = (valor: number) => Number.isFinite(valor) ? moneda.format(valor) : 'No disponible'

/**
 * El estado, con su color. Sale del dato, nunca escrito a mano.
 *
 * El punto verde de antes era literal: un `div` con `bg-emerald-500` y un
 * tooltip que decía «Usuario Activo» pasara lo que pasara.
 */
const ESTADOS: Record<string, { texto: string; punto: string; chip: string }> = {
  ACTIVO: {
    texto: 'Activo',
    punto: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  INACTIVO: {
    texto: 'Inactivo',
    punto: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  SUSPENDIDO: {
    texto: 'Suspendido',
    punto: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ARCHIVADO: {
    texto: 'Archivado',
    punto: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}

/**
 * Qué cifras tienen sentido para cada rol.
 *
 * Lo que no está aquí **no se pinta**, en vez de salir en cero. Un «$ 0» se
 * lee «no cobró nada»; la verdad era «esta cifra no es de este rol».
 */
type Tarjeta = { etiqueta: string; valor: string; pie?: string }

function tarjetasPorRol(
  rol: string,
  m: MetricasDelDetalle,
): { tarjetas: Tarjeta[]; nota?: string } {
  const r = String(rol || '').toUpperCase()

  if (r === 'COBRADOR' && m.rutasTotal === 0) {
    return { tarjetas: [], nota: 'No tiene una ruta activa asignada.' }
  }

  if (r === 'COBRADOR') {
    return {
      tarjetas: [
        { etiqueta: 'Dinero en caja', valor: pesos(m.dineroCaja) },
        {
          etiqueta: 'Recaudo de hoy',
          valor: pesos(m.recaudoDia),
          pie: m.rutaNombre || undefined,
        },
        {
          etiqueta: 'Créditos en mora',
          valor: m.enMora.toLocaleString('es-CO'),
          pie: 'de clientes asignados',
        },
        { etiqueta: 'Gastos de hoy', valor: pesos(m.gastosHoy) },
      ],
    }
  }

  if (r === 'SUPERVISOR' || r === 'COORDINADOR') {
    return {
      tarjetas: [
        { etiqueta: 'Rutas a su cargo', valor: m.rutasTotal.toLocaleString('es-CO') },
        { etiqueta: 'Activas', valor: m.rutasActivas.toLocaleString('es-CO') },
        { etiqueta: 'Inactivas', valor: m.rutasInactivas.toLocaleString('es-CO') },
        { etiqueta: 'Recaudo de hoy', valor: pesos(m.recaudoDia) },
        { etiqueta: 'Créditos en mora', valor: m.enMora.toLocaleString('es-CO') },
      ],
    }
  }

  if (r === 'CONTADOR') {
    return {
      nota: 'Cifras de todo el sistema, no de esta persona.',
      tarjetas: [
        { etiqueta: 'Dinero en caja', valor: pesos(m.dineroCaja) },
        { etiqueta: 'Ingresos de hoy', valor: pesos(m.ingresosDia) },
        { etiqueta: 'Egresos de hoy', valor: pesos(m.egresosDia) },
        { etiqueta: 'Balance del día', valor: pesos(m.balanceDia) },
      ],
    }
  }

  if (r === 'PUNTO_DE_VENTA') {
    return {
      tarjetas: [
        { etiqueta: 'Capital de créditos de artículo creados hoy', valor: pesos(m.ingresosDia) },
        { etiqueta: 'Iniciales de esos créditos', valor: pesos(m.recaudoDia) },
        ...(m.puntoVenta ? [
          { etiqueta: 'Créditos de artículo creados hoy', valor: String(m.puntoVenta.creditosCreados) },
          { etiqueta: 'Clientes creados hoy', valor: String(m.puntoVenta.clientesCreados) },
        ] : []),
      ],
    }
  }

  if (r === 'ADMIN' || r === 'SUPER_ADMINISTRADOR') {
    return {
      tarjetas: [
        {
          etiqueta: 'Usuarios activos',
          valor: m.usuariosActivos.toLocaleString('es-CO'),
          pie: 'en todo el sistema',
        },
        { etiqueta: 'Rutas activas', valor: `${m.rutasActivas} de ${m.rutasTotal}` },
        { etiqueta: 'Dinero en caja', valor: pesos(m.dineroCaja) },
        { etiqueta: 'Balance del día', valor: pesos(m.balanceDia) },
      ],
      /*
       * La aclaración importa: estas cifras son del SISTEMA, no de lo que
       * hizo esta persona. Antes se mezclaban sin decirlo y un
       * «RECAUDO HOY $ 0» en la ficha de un administrador parecía su
       * desempeño.
       */
      nota: 'Cifras de todo el sistema, no de esta persona.',
    }
  }

  return { tarjetas: [] }
}

/** «hace 5 min», «hace 3 h», «ayer»… con la fecha exacta en el título. */
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
  rolIcono,
  onCerrar,
  onEditar,
  onPermisos,
  onCambiarEstado,
}: {
  usuario: UsuarioDelDetalle
  rolNombre: string
  rolIcono?: React.ReactNode
  onCerrar: () => void
  onEditar?: () => void
  onPermisos?: () => void
  onCambiarEstado?: () => void
}) {
  const [pagina, setPagina] = useState(1)
  const [respuesta, setRespuesta] = useState<UsuarioDetalleOperativo | null>(null)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const { contenedorRef, capa, propsDialogo } = useModalDialog({ onClose: onCerrar })
  useEffect(() => {
    let vigente = true
    usuariosService.obtenerDetalleOperativo(usuario.id).then((datos) => {
      if (datos.usuarioId !== usuario.id || !datos.metricas) throw new Error('Detalle no válido')
      if (vigente) setRespuesta(datos)
    }).catch(() => { if (vigente) setError(true) })
    return () => { vigente = false }
  }, [usuario.id, intento])
  const metricas = respuesta?.metricas
  const cargando = !metricas && !error

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


  const estado = ESTADOS[String(usuario.estado || '').toUpperCase()] ?? {
    texto: usuario.estado || 'Sin estado',
    punto: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const { tarjetas, nota } = respuesta
    ? tarjetasPorRol(respuesta.rol, respuesta.metricas)
    : { tarjetas: [], nota: undefined }

  const actividad = metricas?.actividadReciente ?? []
  const paginas = Math.max(1, Math.ceil(actividad.length / POR_PAGINA))
  const visibles = actividad.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  )

  const iniciales =
    `${usuario.nombres.charAt(0)}${usuario.apellidos.charAt(0)}`.toUpperCase()

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
          const botones = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
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
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cabecera: quién es, en qué estado, y qué se puede hacer ── */}
        <div className="flex items-start gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-500">
            {iniciales}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-lg font-bold text-slate-900">
                {usuario.nombres} {usuario.apellidos}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${estado.chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${estado.punto}`} />
                {estado.texto}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              {rolIcono}
              {rolNombre}
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/*
          Acciones DENTRO del detalle.

          Antes no se podía hacer nada desde aquí: para editar o activar había
          que cerrar, buscar la fila otra vez y pulsar en su menú.
        */}
        {(onEditar || onPermisos || onCambiarEstado) && (
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">
            {onEditar && (
              <button
                type="button"
                onClick={onEditar}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800"
              >
                Editar datos
              </button>
            )}
            {onPermisos && (
              <button
                type="button"
                onClick={onPermisos}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Permisos
              </button>
            )}
            {onCambiarEstado && (
              <button
                type="button"
                onClick={onCambiarEstado}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {String(usuario.estado).toUpperCase() === 'ACTIVO'
                  ? 'Desactivar'
                  : 'Activar'}
              </button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {/* ── Datos de contacto ── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Dato icono={<AtSign className="h-3.5 w-3.5" />} etiqueta="Usuario">
              {usuario.nombreUsuario || 'No configurado'}
            </Dato>
            <Dato icono={<Mail className="h-3.5 w-3.5" />} etiqueta="Correo">
              {usuario.correo}
            </Dato>
            <Dato icono={<Phone className="h-3.5 w-3.5" />} etiqueta="Teléfono">
              {usuario.telefono || 'No registrado'}
            </Dato>
            <Dato icono={<Clock className="h-3.5 w-3.5" />} etiqueta="Último acceso">
              {usuario.ultimoAcceso || 'Nunca'}
            </Dato>
          </div>

          {error ? (
            <div role="alert" className="mt-6 rounded-lg border border-amber-200 p-4">
              <p>No se pudieron cargar las cifras ni la actividad de este usuario.</p>
              <button type="button" className="mt-2 min-h-10 font-bold text-blue-700" onClick={() => {
                setError(false)
                setIntento((n) => n + 1)
              }}>Reintentar</button>
            </div>
          ) : <div aria-busy={cargando}>
          {cargando && <span role="status" className="sr-only">Cargando detalle del usuario</span>}
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {['ADMIN', 'SUPER_ADMINISTRADOR', 'CONTADOR'].includes(respuesta?.rol ?? usuario.rol) ? 'Resumen del sistema' : 'Resumen operativo'}
            </h3>
            {nota && (
              <p className="mt-1 text-xs font-medium text-slate-400">{nota}</p>
            )}

            {cargando ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : tarjetas.length === 0 && nota ? null : tarjetas.length === 0 ? (
              <p className="mt-2 text-sm font-medium text-slate-500">
                Este rol no tiene cifras de operación diaria.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tarjetas.map((t) => (
                  <div
                    key={t.etiqueta}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {t.etiqueta}
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {t.valor}
                    </p>
                    {t.pie && (
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        {t.pie}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Actividad ── */}
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Activity className="h-3.5 w-3.5" />
              Actividad reciente
            </h3>

            {cargando ? (
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : actividad.length === 0 ? (
              <p className="mt-2 text-sm font-medium text-slate-500">
                Sin actividad registrada.
              </p>
            ) : (
              <>
                <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {visibles.map((item, i) => (
                    <li
                      key={`${item.time}-${i}`}
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-1 p-3 sm:flex sm:gap-3"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          item.type === 'in'
                            ? 'bg-emerald-500'
                            : item.type === 'out'
                              ? 'bg-rose-500'
                              : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          {item.action}
                        </p>
                        {/*
                          Solo si se pudo resolver a un nombre. Antes aquí iba
                          «Prestamo b86ee359-c87c-4b7f-…», que no dice nada.
                        */}
                        {item.detail && (
                          <p className="break-words text-xs font-medium text-slate-500">
                            {item.detail}
                          </p>
                        )}
                      </div>
                      {item.amount && (
                        <span
                          className={`col-start-2 shrink-0 text-sm font-bold ${
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
                      <time
                        className="col-start-2 shrink-0 text-xs font-medium text-slate-500"
                        dateTime={item.time}
                        title={formatFechaHumanaBogota(item.time)}
                      >
                        {hace(item.time)}
                      </time>
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
                        className="min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPagina((p) => Math.min(paginas, p + 1))
                        }
                        disabled={pagina >= paginas}
                        className="min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 disabled:opacity-40"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          </div>}
        </div>
      </div>
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
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {icono}
        {etiqueta}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">
        {children}
      </p>
    </div>
  )
}

export default DetalleUsuarioModal
