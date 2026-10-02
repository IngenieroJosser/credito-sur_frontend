'use client'

import Portal, { ACCION_Z_INDEX } from '@/components/ui/Portal'

/**
 * La única pantalla de carga del sistema.
 *
 * Había al menos doce spinners distintos repartidos en 87 archivos: unos
 * azules, otros grises, otros del color de la marca, de tamaños que iban de 8 a
 * 12, con y sin texto. Dentro de una misma pantalla —el panel de admin— se
 * usaban dos diferentes según si estaba cargando o redirigiendo. Cambiar de rol
 * o de sección se sentía como cambiar de aplicación.
 *
 * Aquí hay una sola, y se ve igual en todos los roles.
 */

interface SpinnerProps {
  /** 'sm' para dentro de un botón o una fila, 'md' por defecto, 'lg' a pantalla completa. */
  tamano?: 'sm' | 'md' | 'lg'
  className?: string
}

const MEDIDAS = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
} as const

/** El aro que gira. Se usa solo cuando no cabe ni una línea de texto. */
export function Spinner({ tamano = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block rounded-full border-[#08557f] border-t-transparent animate-spin ${MEDIDAS[tamano]} ${className}`}
    />
  )
}

interface CargandoProps {
  texto?: string
  tamano?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Carga de una sección: ocupa el alto que le den, sin tapar la pantalla.
 * Para una tabla, una tarjeta o el contenido de una pestaña.
 */
export function Cargando({
  texto = 'Cargando...',
  tamano = 'md',
  className = '',
}: CargandoProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}
    >
      <Spinner tamano={tamano} />
      {texto ? (
        <p className="text-sm font-medium text-slate-500">{texto}</p>
      ) : null}
    </div>
  )
}

/**
 * Carga de una pantalla entera, mientras no hay nada que mostrar todavía.
 *
 * El texto por defecto sirve para todo; vale la pena cambiarlo solo cuando
 * decirle al usuario qué se está trayendo le ahorra la duda ("Preparando tu
 * dashboard", "Buscando el crédito").
 */
export default function PantallaCarga({
  texto = 'Cargando...',
}: {
  texto?: string
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Spinner tamano="lg" />
        <p className="text-sm font-medium text-slate-500">{texto}</p>
      </div>
    </div>
  )
}

/**
 * Una acción en curso que no se puede interrumpir.
 *
 * Distinta de las de arriba: aquí ya hay contenido en pantalla y sigue estando
 * detrás. Lo que hace falta es decir qué se está haciendo **y** que no se pueda
 * volver a pulsar mientras dura.
 *
 * Por qué bloquea de verdad y no es solo un aviso: al registrar un pago, el
 * modal se cierra antes de que salga la petición, y la visita sigue apareciendo
 * como no pagada hasta que responden dos llamadas seguidas. En esa ventana se
 * podía tocar el mismo cliente otra vez. Cada toque genera su propia
 * `idempotencyKey`, así que el backend los toma como dos pagos distintos y el
 * único arreglo es un reverso administrativo. Por eso tapa: es dinero.
 *
 * Va encima del modal que la lanzó y por debajo de los avisos, para que el
 * mensaje de cómo salió la cosa se lea cuando esto desaparece.
 *
 * `texto` es lo que se está haciendo, en gerundio y en concreto ("Registrando
 * el pago…"), no un "Cargando" que no dice nada. Con `null` no se dibuja nada,
 * así que sirve directamente el estado de la acción.
 */
export function CapaAccion({ texto }: { texto?: string | null }) {
  if (!texto) return null

  return (
    <Portal>
      <div
        role="alert"
        aria-live="assertive"
        aria-busy="true"
        style={{ zIndex: ACCION_Z_INDEX }}
        className="fixed inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-xl border border-slate-200">
          <Spinner tamano="lg" />
          <p className="text-sm font-bold text-slate-700 text-center max-w-[15rem]">
            {texto}
          </p>
        </div>
      </div>
    </Portal>
  )
}
