import type { UserProfile } from '@/lib/types/autenticacion-type'

/**
 * Mezcla lo que se sabe del usuario en el objeto `user` que vive en localStorage.
 *
 * Hay tres fuentes y no traen lo mismo:
 *
 *  - `deLaBase`: el usuario completo (`usuariosService.obtenerPorId`). Trae todo,
 *    pero es una petición aparte que puede fallar sola.
 *  - `delToken`: lo que devuelve `GET /auth/perfil`, que son los claims del JWT:
 *    **id, nombres, rol y permisos, y nada más**. No trae apellidos, ni correo, ni
 *    teléfono, ni estado.
 *  - `enCache`: lo que ya estaba guardado, puesto al iniciar sesión.
 *
 * El orden es: la base, luego el token, luego lo que ya estaba. **Ese último
 * eslabón es el que importa** y es el que faltaba: `apellidos` se escribía como
 * `deLaBase?.apellidos || delToken.apellidos`, y cuando la llamada a la base
 * fallaba —cosa que el código ya contempla y registra— las dos partes eran
 * `undefined` y el `undefined` sobreescribía el apellido que sí estaba guardado.
 * Después, sin conexión, el perfil lo leía del caché y salía en blanco.
 *
 * `correo`, `telefono` y `rol` sí tenían el respaldo al caché; `nombres` no lo
 * necesita porque el token lo trae. El que se perdía era `apellidos`.
 */

/** Los campos que se mezclan. Sin firma de indice, para que el usuario de la base encaje. */
export interface CamposDePerfil {
  nombres?: string
  apellidos?: string
  correo?: string
  telefono?: string | null
  rol?: string
}

/**
 * Lo guardado en localStorage. Lleva firma de indice porque sale de un
 * `JSON.parse` y puede traer campos que aqui no interesan: se conservan tal cual.
 */
export type DatosDeUsuarioEnCache = CamposDePerfil & { [otros: string]: unknown }

export function mezclarPerfilEnCache(
  enCache: DatosDeUsuarioEnCache,
  delToken: Partial<UserProfile>,
  deLaBase?: CamposDePerfil | null,
): DatosDeUsuarioEnCache {
  return {
    ...enCache,
    nombres: deLaBase?.nombres || delToken.nombres || enCache.nombres,
    apellidos: deLaBase?.apellidos || delToken.apellidos || enCache.apellidos,
    correo: deLaBase?.correo || delToken.correo || enCache.correo,
    telefono: deLaBase?.telefono || delToken.telefono || enCache.telefono,
    rol: deLaBase?.rol || delToken.rol || enCache.rol,
  }
}
