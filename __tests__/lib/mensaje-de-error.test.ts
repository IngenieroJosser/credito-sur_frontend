import { mensajeDeError } from '@/lib/mensaje-de-error'

/**
 * Que el motivo del backend llegue a la pantalla.
 *
 * Diez manejadores de exportación hacían `catch { toast.error('Error al
 * exportar') }`. El backend explicaba el problema, `exportService` sacaba ese
 * texto de la respuesta, y la pantalla lo tiraba. El usuario volvía a pulsar un
 * botón que no iba a funcionar nunca.
 */
describe('mensajeDeError', () => {
  it('usa el mensaje del Error', () => {
    const real = 'El artículo CEL-A15 tiene 4 plazos y la plantilla admite 3.'
    expect(mensajeDeError(new Error(real), 'Error al exportar')).toBe(real)
  })

  it('saca el mensaje del cuerpo de una respuesta de axios', () => {
    const fallo = { response: { data: { message: 'El dump no está disponible.' } } }
    expect(mensajeDeError(fallo, 'Error al exportar')).toBe('El dump no está disponible.')
  })

  it('junta los mensajes cuando el backend manda varios', () => {
    // Es lo que devuelve la validación de Nest: un array de motivos.
    const fallo = { response: { data: { message: ['Falta el monto', 'Falta la fecha'] } } }
    expect(mensajeDeError(fallo, 'Error')).toBe('Falta el monto · Falta la fecha')
  })

  it('acepta un texto suelto', () => {
    expect(mensajeDeError('Sin conexión', 'Error')).toBe('Sin conexión')
  })

  it('usa el respaldo cuando no hay nada legible', () => {
    for (const nada of [null, undefined, {}, 0, new Error('')]) {
      expect(mensajeDeError(nada, 'Error al exportar')).toBe('Error al exportar')
    }
  })

  it('no se cae con un error raro', () => {
    expect(() => mensajeDeError(Symbol('x'), 'Error')).not.toThrow()
    expect(mensajeDeError(Symbol('x'), 'Error')).toBe('Error')
  })
})
