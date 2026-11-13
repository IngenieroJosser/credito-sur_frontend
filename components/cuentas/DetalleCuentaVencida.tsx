'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Archive, ChevronLeft, User } from 'lucide-react'
import { SkeletonDetalle } from '@/components/ui/Skeleton'
import AyudaContextual from '@/components/ui/AyudaContextual'
import Cifra from '@/components/ui/Cifra'
import ArchivarCuentaModal from '@/components/prestamos/ArchivarCuentaModal'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { mensajeDeError } from '@/lib/mensaje-de-error'
import { vencidasService, type CuentaVencida } from '@/services/vencidas-service'

/**
 * El expediente de una cuenta vencida, una sola vez.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Esta pantalla estaba escrita dos veces: `app/admin/cuentas-vencidas/[id]` y
 * `app/coordinador/cuentas-vencidas/[id]`, 205 y 157 líneas.
 *
 * Medido con un diff línea a línea de las ocho parejas de pantallas que este
 * sistema tiene bifurcadas por rol, esta es la ÚNICA que sigue siendo la misma
 * pantalla: **82,3 % idéntica**. Las demás han divergido de verdad —la de
 * `rutas/[id]` se parece un 15,9 %— y unificarlas no sería un refactor, sería
 * decidir qué comportamiento gana, que es otra conversación.
 *
 * Sus cuatro diferencias, que son las dos props de abajo más dos detalles:
 *
 *   el botón de archivar      solo lo tenía el admin
 *   el prefijo de los enlaces `/cuentas-vencidas` vs `/coordinador/…`
 *   `fetchCuenta` / `fetchData`   el mismo código con dos nombres
 *   el refresco en tiempo real    solo lo tenía el admin, y mal (ver abajo)
 *
 * ── El `window.location.reload()` que se va con esto ────────────────────────
 *
 * La copia del admin refrescaba así:
 *
 *     useRealtimeData(['pagos_actualizados'], () => window.location.reload())
 *
 * Eso recarga la PÁGINA ENTERA cada vez que cualquier cobrador de la empresa
 * registra un pago, en una pantalla de dinero: se pierde el scroll, se vuelve
 * a pedir todo y el telón de entrada reaparece. Es exactamente la «recarga de
 * pantalla» que se quitó del armazón, aquí dentro.
 *
 * Ahora se vuelven a pedir los datos y nada más, que es lo que hacía falta.
 * Y lo hacen las dos pantallas, no solo la del admin.
 */

type Props = {
  /** El id de la cuenta, que viene de la ruta. */
  id: string
  /**
   * Delante de los enlaces internos. El admin usa las URL limpias que sirve
   * el `rewrites` (`/cuentas-vencidas`) y el coordinador las de su árbol.
   */
  prefijo?: string
  /**
   * Si este rol puede archivar la cuenta. Es la diferencia real entre las dos
   * copias: el coordinador mira el expediente, el admin lo cierra.
   */
  puedeArchivar?: boolean
}

export default function DetalleCuentaVencida({
  id,
  prefijo = '',
  puedeArchivar = false,
}: Props) {
  const [cuenta, setCuenta] = useState<CuentaVencida | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarArchivar, setMostrarArchivar] = useState(false)

  const listado = `${prefijo}/cuentas-vencidas`

  const cargar = useCallback(
    async ({ conEsqueleto }: { conEsqueleto: boolean }) => {
      if (conEsqueleto) setCargando(true)
      try {
        const res = await vencidasService.obtenerCuentasVencidas()
        const encontrada = res.cuentas.find((c: CuentaVencida) => c.id === id)
        setCuenta(encontrada ?? null)
        setError(null)
      } catch (err) {
        // El motivo del backend, no un texto fijo: si la cuenta no se puede
        // leer porque este rol no tiene permiso, eso es lo que hay que decir.
        setError(mensajeDeError(err, 'No se pudo cargar la cuenta vencida'))
        setCuenta(null)
      } finally {
        if (conEsqueleto) setCargando(false)
      }
    },
    [id],
  )

  useEffect(() => {
    void cargar({ conEsqueleto: true })
  }, [cargar])

  /*
   * El refresco en tiempo real va ANTES de los returns tempranos.
   *
   * Puesto después, mientras cargaba se ejecutaba un hook menos que ya
   * cargado, y en cuanto el número de hooks cambia entre dos renders React
   * tumba la pantalla con el error 310. El comentario venía de la copia del
   * admin y se conserva porque la trampa sigue ahí.
   *
   * `conEsqueleto: false`: un refresco de fondo no debe borrar lo que se está
   * leyendo para poner un esqueleto encima.
   */
  useRealtimeData(['pagos_actualizados'], () => {
    void cargar({ conEsqueleto: false })
  })

  if (cargando) return <SkeletonDetalle />

  if (!cuenta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <p className="font-bold text-slate-900">
            No se encontró la cuenta vencida
          </p>
          {error ? (
            <p className="mt-1 text-sm font-medium text-slate-500">{error}</p>
          ) : null}
          <Link
            href={listado}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-primary px-4 font-bold text-white sm:min-h-0 sm:py-2"
          >
            Volver al listado
          </Link>
        </div>
      </div>
    )
  }

  const nombreDelCliente =
    typeof cuenta.cliente === 'string' ? cuenta.cliente : cuenta.cliente.nombre

  return (
    <div className="relative min-h-screen bg-slate-50 pb-12">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-900 opacity-10 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="px-6 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={listado}
                aria-label="Volver al listado de cuentas vencidas"
                className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:min-h-0 sm:min-w-0 sm:p-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-slate-900 p-2 text-white">
                  <Archive className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Expediente de Castigo
                  </h1>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {cuenta.numeroPrestamo} • {cuenta.diasVencidos} Días
                    Vencidos
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {puedeArchivar ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMostrarArchivar(true)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 sm:min-h-0 sm:py-2"
                  >
                    <Archive className="h-4 w-4" />
                    Archivar Cuenta
                  </button>
                  <div className="hidden h-8 w-[1px] bg-slate-200 md:block" />
                </>
              ) : null}
              <Link
                href={`${prefijo}/creditos/${id}`}
                className="inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-bold text-primary transition-all hover:bg-blue-50 sm:min-h-0 sm:py-2"
              >
                Ver Crédito
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/*
        El modal de archivar.

        `saldoPendiente` salía de `cuenta.montoVencido || cuenta.saldoTotal || 0`,
        y ninguno de esos dos campos existe en `CuentaVencida`: los reales son
        `saldoPendiente` y `montoOriginal`. Los dos valían `undefined`, así que
        el modal recibía SIEMPRE 0 como saldo pendiente.
      */}
      {mostrarArchivar && puedeArchivar ? (
        <ArchivarCuentaModal
          prestamoId={id}
          numeroPrestamo={cuenta.numeroPrestamo}
          clienteNombre={nombreDelCliente}
          saldoPendiente={cuenta.saldoPendiente || 0}
          onClose={() => setMostrarArchivar(false)}
          onSuccess={() => {
            // Con `location.href` se recargaba la aplicación entera; el router
            // cambia de pantalla y se queda todo montado.
            setMostrarArchivar(false)
            window.location.assign(listado)
          }}
        />
      ) : null}

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:flex-row">
          <div className="flex-1 border-b border-slate-100 p-8 md:border-b-0 md:border-r">
            <span className="mb-4 inline-block rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
              Cuenta Incobrable / Castigada
            </span>
            <h2 className="mb-2 text-3xl font-bold text-slate-900">
              {nombreDelCliente}
            </h2>
            <p className="mb-6 font-medium text-slate-500">
              {typeof cuenta.cliente === 'string' ? '' : cuenta.cliente.documento}
            </p>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-slate-400">
                  Monto a Castigar
                  <AyudaContextual
                    ayuda="castigoDeCartera"
                    de="el monto a castigar"
                    tamano="pequeno"
                  />
                </p>
                <Cifra
                  valor={cuenta.saldoPendiente}
                  tamano="grande"
                  className="font-mono font-bold tracking-tighter text-rose-600"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-slate-400">
                  Fecha Vencimiento
                  <AyudaContextual
                    ayuda="fechaVencimiento"
                    de="la fecha de vencimiento"
                    tamano="pequeno"
                  />
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {cuenta.fechaVencimiento}
                </p>
              </div>
            </div>
          </div>
          <div className="w-full space-y-4 bg-slate-50/50 p-8 md:w-80">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Información de Localización
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-slate-400" aria-hidden />
                <span className="font-medium text-slate-700">{cuenta.ruta}</span>
              </div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            Dictamen de Coordinación
          </h3>
          <p className="text-sm font-medium leading-relaxed text-slate-500">
            Esta cuenta ha superado los 60 días de vencimiento. Se recomienda
            iniciar formalmente el proceso de cobro pre-jurídico o castigo de
            cartera según el manual de políticas de la empresa.
          </p>

          {/*
            * Aquí había dos botones, «Acuerdo de Pago Final» y «Castigar
            * Cartera», con su color y su hover y SIN `onClick`. Encima de un
            * expediente con datos reales, invitaban a pulsar y no hacían
            * absolutamente nada.
            *
            * La decisión formal se registra en el listado, que manda la
            * solicitud a aprobación. En vez de abrir aquí una tercera copia de
            * ese flujo, se lleva a quien mira el expediente al sitio donde la
            * decisión sí se guarda.
            */}
          <div className="mt-8">
            <Link
              href={listado}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white transition-all hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-0 sm:py-3"
            >
              Registrar la decisión de esta cuenta
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              La prórroga, el seguimiento, el cobro jurídico y la baja por
              pérdida se registran desde el listado de cuentas vencidas. Lo que
              se elija queda como solicitud y se aplica cuando se aprueba.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
