import { SkeletonTablero } from '@/components/ui/Skeleton'

/**
 * Lo que Next pinta mientras esta vista carga.
 *
 * Antes no habia ninguno: al recargar, la pantalla se quedaba en blanco o
 * congelada en la vista anterior hasta que llegaba todo de golpe. Los esqueletos
 * que ya existian viven DENTRO del componente y solo aparecen mientras corre el
 * fetch del cliente, que es otro momento distinto.
 *
 * Forma: tablero, la de esta pantalla.
 */
export default function Cargando() {
  return (
    <div className="p-4 sm:p-6">
      <SkeletonTablero />
    </div>
  )
}
