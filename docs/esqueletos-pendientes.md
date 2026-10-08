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
