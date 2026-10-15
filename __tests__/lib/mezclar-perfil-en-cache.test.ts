import { mezclarPerfilEnCache } from '@/lib/auth/mezclar-perfil-en-cache'

/**
 * El usuario guardado en localStorage se arma de tres fuentes que no traen lo mismo.
 *
 * `GET /auth/perfil` devuelve los claims del token, y el token lleva solo id,
 * nombres, rol y permisos. La pantalla de perfil escribía el resultado en el caché
 * sin respaldo para `apellidos`: `deLaBase?.apellidos || delToken.apellidos`. Cuando
 * fallaba la llamada del usuario completo —caso que el código ya contempla y
 * registra— las dos partes eran `undefined` y ese `undefined` borraba el apellido
 * que sí estaba guardado.
 *
 * `correo`, `telefono` y `rol` sí tenían el respaldo al caché. El que se perdía era
 * `apellidos`.
 */
describe('mezclarPerfilEnCache', () => {
  const enCache = {
    id: 'u1',
    nombres: 'Juan',
    apellidos: 'Pérez',
    correo: 'juan@ejemplo.com',
    telefono: '3110000000',
    rol: 'COBRADOR',
    // Un campo que a esta función no le incumbe y debe sobrevivir.
    debeCambiarContrasena: false,
  }

  /** Lo que `/auth/perfil` puede devolver: los claims del token, y nada más. */
  const delToken = { id: 'u1', nombres: 'Juan', rol: 'COBRADOR' }

  describe('el caso que estaba mal', () => {
    it('conserva el apellido cuando la llamada a la base falló', () => {
      const resultado = mezclarPerfilEnCache(enCache, delToken, null)

      expect(resultado.apellidos).toBe('Pérez')
    })

    it('así se veía el error: ninguna de las dos primeras fuentes trae apellido', () => {
      // El código de antes miraba solo la base y el token, sin caer al caché.
      expect('apellidos' in delToken).toBe(false)
      expect(mezclarPerfilEnCache(enCache, delToken, null).apellidos).toBe('Pérez')
    })

    it('tampoco pierde correo ni teléfono, que el token no lleva', () => {
      const resultado = mezclarPerfilEnCache(enCache, delToken, null)

      expect(resultado.correo).toBe('juan@ejemplo.com')
      expect(resultado.telefono).toBe('3110000000')
    })
  })

  describe('el orden de las fuentes', () => {
    it('la base manda sobre el token y sobre el caché', () => {
      const resultado = mezclarPerfilEnCache(enCache, delToken, {
        nombres: 'Juana',
        apellidos: 'Gómez',
        correo: 'nuevo@ejemplo.com',
      })

      expect(resultado.nombres).toBe('Juana')
      expect(resultado.apellidos).toBe('Gómez')
      expect(resultado.correo).toBe('nuevo@ejemplo.com')
    })

    it('el token manda sobre el caché cuando la base no trae el campo', () => {
      // Sirve para el rol: si cambió, el token ya lo trae actualizado.
      const resultado = mezclarPerfilEnCache(enCache, { ...delToken, rol: 'SUPERVISOR' }, {})

      expect(resultado.rol).toBe('SUPERVISOR')
    })
  })

  it('no toca los campos que no le incumben', () => {
    const resultado = mezclarPerfilEnCache(enCache, delToken, null)

    expect(resultado.id).toBe('u1')
    expect(resultado.debeCambiarContrasena).toBe(false)
  })

  describe('caché vacío', () => {
    it('con el caché en blanco se queda con lo del token, sin inventar', () => {
      const resultado = mezclarPerfilEnCache({}, delToken, null)

      expect(resultado.nombres).toBe('Juan')
      expect(resultado.rol).toBe('COBRADOR')
      expect(resultado.apellidos).toBeUndefined()
      expect(resultado.correo).toBeUndefined()
    })

    it('un teléfono nulo guardado no se vuelve undefined', () => {
      const resultado = mezclarPerfilEnCache({ telefono: null }, delToken, null)

      expect(resultado.telefono).toBeNull()
    })
  })
})
