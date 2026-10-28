# Esqueletos de carga: estado

## Cobertura medida

| | vistas |
|---|---|
| server components, con `loading.tsx` | 37 |
| redirects (no aplica: solo reenvian) | 34 |
| cliente CON esqueleto | 80 |
| cliente SIN esqueleto | 6 |

## Por que `loading.tsx` no vale para todo

120 de las 157 paginas son `'use client'`. Un componente de cliente no suspende
en el servidor, asi que Next NUNCA pinta su `loading.tsx`. Comprobado quitando
`app/admin/loading.tsx`: salian los mismos 26 esqueletos sin el, porque los pone
el componente por dentro. Por eso solo hay `loading.tsx` en las 37 de servidor.

En las de cliente el esqueleto va DENTRO, atado al estado de carga.

## Las que faltan

Cada una lleva la carga de una forma distinta y no hay un punto unico donde
insertar el esqueleto sin cambiar como arranca la pantalla. Se arreglan a mano:

```tsx
import { SkeletonTabla } from '@/components/ui/Skeleton'

// el estado tiene que arrancar en true: si arranca en false, la primera pintada
// no muestra nada aunque el esqueleto este puesto
const [cargando, setCargando] = useState(true)

if (cargando) {
  return <div className="p-4 sm:p-6"><SkeletonTabla filas={8} /></div>
}
```

Y apagarlo en un `finally`, no solo en el camino feliz: si la peticion falla, la
pantalla se queda cargando para siempre.

Formas en `components/ui/Skeleton.tsx`: `SkeletonTablero`, `SkeletonTabla`,
`SkeletonFormulario`, `SkeletonDetalle`, `SkeletonTarjetas`, `SkeletonTexto`.

- `/(auth)/reportes/financieros/detalle/[id]` — el detalle del reporte
- `/admin/articulos/nuevo` — formulario en blanco; solo lo necesita si precarga categorias
- `/admin/clientes/nuevo` — igual que el anterior
- `/admin/rutas/[id]` — el trabajo va en `ruta-client.tsx`, no en la pagina
- `/admin/users` — ya tiene `loading` en `true`; le falta el guard antes del return
- `/coordinador` — el tablero del coordinador, con varios efectos encadenados

---

# Listado de clientes: lo que falta

## El cero que mentia (ARREGLADO)

Al recargar, la columna de deuda pintaba `$ 0` con `cliente.montoTotal ?? 0`
mientras el dato no habia llegado. Un cero se lee como un dato —"este cliente no
debe nada"—, y aqui significaba "todavia no se". Ahora sale un bloque gris hasta
que llega la cifra, que es el mismo criterio que la columna de estado ya usaba
para no decir "Al dia" sin saberlo.

## El N+1 (PENDIENTE, es la causa de la lentitud)

Medido en local con 8 clientes:

    33 peticiones en 3,9 s
       8x  /api-credisur/clients/:id   <- UNA POR CLIENTE
       5x  /api-credisur/clients       <- el listado, cinco veces
       4x  /api-credisur/routes

El listado pide el detalle de cada cliente para calcular su mora. Con 8 son 8
peticiones; con 300 clientes en produccion son 300, y por eso "tarda una
eternidad".

El arreglo es el mismo que se hizo con las cuotas del sync offline: un endpoint
por lote. Algo como `GET /clients/resumen?ids=a,b,c` que devuelva el monto y los
dias de mora de todos de una vez, y que el listado lo llame UNA vez por pagina en
vez de una por fila.

Y aparte, averiguar por que `/clients` se pide cinco veces: eso suele ser un
`useEffect` con una dependencia que cambia de identidad en cada render.
