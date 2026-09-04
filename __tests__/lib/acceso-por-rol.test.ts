import { obtenerModulos, tieneAcceso, type Rol } from '@/lib/permissions'

/**
 * El menú y el control de acceso deben coincidir: todo lo que un rol ve en su
 * menú, tieneAcceso debe permitirlo. Si no, el usuario hace clic en una entrada
 * de su propio menú y el layout lo redirige fuera (pantalla que "no carga").
 *
 * El layout llama tieneAcceso SIN permisos granulares, así que la prueba
 * tambien, para reproducir exactamente esa condición. Regresión del bug en que
 * remapear el menú a rutas compartidas (/articulos, /cuentas-mora) dejó a
 * ADMIN, COORDINADOR y CONTADOR sin poder entrar a sus propios módulos.
 */
const ROLES: Rol[] = [
  'SUPER_ADMINISTRADOR','ADMIN','COORDINADOR','SUPERVISOR','CONTADOR','COBRADOR','PUNTO_DE_VENTA',
] as Rol[]

const recolectar = (mods: any[]): string[] =>
  mods.flatMap((m) => [
    ...(m?.path && m.path !== '#' ? [m.path] : []),
    ...(Array.isArray(m?.submodulos) ? recolectar(m.submodulos) : []),
  ])

describe('Coherencia menú ↔ control de acceso, por rol', () => {
  it.each(ROLES)('%s puede entrar a todo lo de su menú', (rol) => {
    const paths = Array.from(new Set(recolectar(obtenerModulos(rol))))
    const bloqueadas = paths.filter((p) => !tieneAcceso(rol, p))
    expect({ rol, bloqueadas }).toEqual({ rol, bloqueadas: [] })
  })
})
