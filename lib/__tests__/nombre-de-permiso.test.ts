import { nombreDePermiso } from '../nombre-de-permiso'

/**
 * Lo que se fija es que la pantalla de acceso restringido no grite un código.
 *
 * Decía «Permiso requerido: CONTABLE_VIEW». Un cobrador que abre por error la
 * pantalla del contador se quedaba mirando eso, sin saber qué módulo es ni qué
 * pedirle a su administrador. El bloqueo en sí funciona perfecto —se comprobó
 * que no se filtra ni una cifra—; lo que no servía era el mensaje.
 */
describe('nombreDePermiso', () => {
  it('usa el nombre que el sistema ya tiene guardado', () => {
    // Estos son los de la tabla `permisos`, columna `nombre`, no inventados.
    expect(nombreDePermiso('CONTABLE_VIEW')).toBe('Ver Módulo Contable')
    expect(nombreDePermiso('CUENTAS_VENCIDAS_VIEW')).toBe('Ver Cuentas Vencidas')
    expect(nombreDePermiso('AUDIT_VIEW')).toBe('Ver Auditoría')
  })

  it('ningún nombre conocido deja escapar el código en mayúsculas', () => {
    // La prueba de verdad: que lo que se muestra no se parezca a lo de antes.
    for (const permiso of [
      'ARTICULOS_VIEW',
      'AUDIT_VIEW',
      'CONTABLE_VIEW',
      'CREDITOS_ARTICULOS_VIEW',
      'CUENTAS_VENCIDAS_VIEW',
      'REPORTES_FINANCIEROS_VIEW',
    ]) {
      const mostrado = nombreDePermiso(permiso)
      expect(mostrado).not.toContain('_')
      expect(mostrado).not.toBe(permiso)
    }
  })

  describe('un permiso que nadie agregó aquí', () => {
    it('sale legible en vez de en mayúsculas con guiones bajos', () => {
      // Si mañana se añade un permiso al sistema y nadie lo agrega al mapa, el
      // mensaje empeora un poco pero no vuelve a gritar un código.
      expect(nombreDePermiso('NOMINA_VIEW')).toBe('Nomina')
      expect(nombreDePermiso('REPORTES_DE_CARTERA_VIEW')).toBe(
        'Reportes de cartera',
      )
    })

    it('quita los sufijos técnicos, no solo VIEW', () => {
      expect(nombreDePermiso('CLIENTES_CREATE')).toBe('Clientes')
      expect(nombreDePermiso('CAJAS_MANAGE')).toBe('Cajas')
    })

    it('un código sin sufijo se deja estar', () => {
      expect(nombreDePermiso('dashboard')).toBe('Dashboard')
    })
  })

  it('sin permiso dice algo, no una cadena vacía', () => {
    // Un hueco aquí dejaría el mensaje como «Necesitas el permiso «»», que se
    // lee como un fallo del sistema.
    expect(nombreDePermiso(undefined)).toBe('un permiso que no tienes')
    expect(nombreDePermiso(null)).toBe('un permiso que no tienes')
    expect(nombreDePermiso('')).toBe('un permiso que no tienes')
  })
})
