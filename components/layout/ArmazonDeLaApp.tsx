'use client'

import { usePathname } from 'next/navigation'
import ArmazonAdmin from '@/components/layout/ArmazonAdmin'

/**
 * El armazón de la aplicación —cabecera, menú lateral, telón de entrada—,
 * montado UNA vez por sesión y no una por carpeta.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «Algunas veces al pasar o seleccionar otro módulo en el aside la pantalla
 * entera se recarga.» No se recargaba: se desmontaba y se volvía a montar.
 *
 * El proyecto tenía SIETE archivos de layout —`(auth)`, `admin`, `cobranzas`,
 * `contador`, `coordinador`, `punto-de-venta`, `supervisor`— y los siete
 * devolvían el mismo `AdminLayout`. Pero Next.js guarda el estado de un layout
 * por ARCHIVO, no por el componente que devuelve: cruzar de uno a otro tira el
 * árbol entero y monta otro `AdminLayout` desde cero. Con él se reiniciaban el
 * telón blanco de entrada —300 ms tapando la pantalla y 1 s desvaneciéndose—,
 * el menú lateral, el scroll, los submenús abiertos, y se volvían a pedir las
 * aprobaciones pendientes.
 *
 * Medido sobre los menús laterales de los siete roles:
 *
 *   ADMIN                3 de 16 entradas cruzaban de layout
 *                        (/contable, /contable/cierre-caja, /pagos/historial)
 *   SUPER_ADMINISTRADOR  3 de 20  (las mismas tres)
 *   COBRADOR             1 de 3   (/notificaciones)
 *   los otros cuatro     ninguna
 *
 * Tres de siete roles, y no solo desde el menú: cualquier enlace o
 * `router.push` de una pantalla a otro árbol hacía lo mismo.
 *
 * ── Por qué aquí ────────────────────────────────────────────────────────────
 *
 * Mover los enlaces de sitio habría tapado los cuatro casos del menú y dejado
 * los demás. El único punto que ningún `Link` puede desmontar es el layout
 * raíz, que es el padre común de los siete árboles. Desde aquí el armazón no
 * se desmonta nunca y la navegación es lo que tiene que ser: cambia el
 * contenido y nada más.
 *
 * Los layouts por rol se quedan solo con lo que es suyo de verdad —el FAB de
 * punto de venta, el envoltorio del supervisor—; el armazón ya no lo pone cada
 * uno.
 *
 * ── La lista ────────────────────────────────────────────────────────────────
 *
 * Es una lista de lo que SÍ lleva armazón, no de lo que no. Al contrario, una
 * pantalla pública nueva —o un 404— heredaría la cabecera y el menú, y además
 * `AdminLayout` manda al login a quien no tenga sesión: un 404 visto sin
 * sesión rebotaría al login en vez de decir que la página no existe. Con la
 * lista en positivo, lo que no está escrito aquí sale desnudo, que es el lado
 * seguro.
 *
 * `__tests__/armazon-de-la-app.test.ts` comprueba que no se quede corta: cada
 * carpeta de `app/(auth)` y cada árbol de rol tiene que estar en ella.
 */
export const RAICES_CON_ARMAZON = [
  // Los árboles por rol.
  '/admin',
  '/cobranzas',
  '/contador',
  '/coordinador',
  '/punto-de-venta',
  '/supervisor',
  /*
   * Las URL limpias que sirve el `rewrites` de `next.config.ts`.
   *
   * Esto se me paso al escribir la lista, y es un agujero de los que no
   * fallan: `next.config.ts` sirve `/clientes` desde `app/admin/clientes`,
   * `/users` desde `app/admin/users`, y asi con once rutas mas. Son URL de
   * verdad —las usan redirecciones de pantallas retiradas y estan en enlaces
   * de notificaciones viejas— pero no hay ningun `page.tsx` en `app/clientes`,
   * asi que buscandolas por archivo no aparecen.
   *
   * `usePathname()` devuelve lo que ve el navegador —`/clientes`—, no el
   * destino reescrito, asi que sin estas entradas esas diez pantallas se
   * pintaban SIN cabecera y SIN menu lateral. Lo vigila
   * `__tests__/armazon-de-la-app.test.ts`, que cruza esta lista con las
   * fuentes del `rewrites`.
   */
  '/aprobaciones',
  '/archivados',
  '/clientes',
  '/creditos',
  '/prestamos',
  '/revisiones',
  '/rutas',
  '/sistema',
  '/solicitudes',
  '/users',
  // Las pantallas de `app/(auth)`, que son las compartidas por permisos.
  '/articulos',
  '/auditoria',
  '/contable',
  '/creditos-articulos',
  '/cuentas-mora',
  '/cuentas-vencidas',
  '/notificaciones',
  '/pagos',
  '/perfil',
  '/reportes',
] as const

export function llevaArmazon(ruta: string): boolean {
  return RAICES_CON_ARMAZON.some(
    (raiz) => ruta === raiz || ruta.startsWith(`${raiz}/`),
  )
}

export default function ArmazonDeLaApp({ children }: { children: React.ReactNode }) {
  const ruta = usePathname() ?? '/'
  if (!llevaArmazon(ruta)) return <>{children}</>
  return <ArmazonAdmin>{children}</ArmazonAdmin>
}
