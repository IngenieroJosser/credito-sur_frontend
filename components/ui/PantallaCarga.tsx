'use client'

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
