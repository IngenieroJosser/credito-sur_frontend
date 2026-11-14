import * as fs from 'fs'
import * as path from 'path'

import {
  esIdTemporal,
  estadoDeEnvioDeCliente,
  etiquetaDeEstadoDeEnvio,
  explicacionDeEstadoDeEnvio,
} from '@/lib/clientes/estado-de-envio'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * «Sin enviar» y «pendiente» son dos cosas distintas.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Un cliente creado sin señal vive solo en ESE teléfono (su id es `temp-…`).
 * Un cliente pendiente ya está en el servidor y le falta la aprobación de un
 * coordinador. La tabla de escritorio las distinguía; la TARJETA de móvil —la
 * del cobrador— imprimía «OFFLINE» para las dos.
 *
 * Se vio en una captura de `/clientes` en móvil: los 26 clientes de la base
 * salían marcados «OFFLINE» y ninguno se había creado sin señal. La pantalla
 * donde más importa decía que nada se había enviado.
 */
describe('estadoDeEnvioDeCliente', () => {
  it('un id temporal es «sin enviar»', () => {
    expect(estadoDeEnvioDeCliente({ id: 'temp-1762900000000' })).toBe('SIN_ENVIAR')
    // La forma vieja también, para que un id antiguo no quede sin marcar.
    expect(estadoDeEnvioDeCliente({ id: 'offline-123' })).toBe('SIN_ENVIAR')
  })

  it('un id de verdad con aprobación pendiente es «pendiente»', () => {
    expect(
      estadoDeEnvioDeCliente({
        id: 'f30a415c-65dd-43a5-80da-e65ec644bc0d',
        estadoAprobacion: 'PENDIENTE',
      }),
    ).toBe('PENDIENTE_APROBACION')
  })

  it('manda el id sobre el estado de aprobación', () => {
    /*
     * Un cliente creado sin señal llega además con `estadoAprobacion`
     * 'PENDIENTE'. Lo urgente de los dos es que todavía no salió del
     * dispositivo: eso se pierde si se pierde el teléfono.
     */
    expect(
      estadoDeEnvioDeCliente({ id: 'temp-9', estadoAprobacion: 'PENDIENTE' }),
    ).toBe('SIN_ENVIAR')
  })

  it('un cliente aprobado no lleva etiqueta', () => {
    expect(
      estadoDeEnvioDeCliente({ id: 'uuid-real', estadoAprobacion: 'APROBADO' }),
    ).toBeNull()
    expect(estadoDeEnvioDeCliente({ id: 'uuid-real' })).toBeNull()
  })

  it('no decide nada sin cliente', () => {
    expect(estadoDeEnvioDeCliente(null)).toBeNull()
    expect(estadoDeEnvioDeCliente(undefined)).toBeNull()
  })

  it('tolera el estado en otra caja', () => {
    // Llega del backend y en el camino pasa por varias formas.
    expect(
      estadoDeEnvioDeCliente({ id: 'uuid', estadoAprobacion: 'pendiente' }),
    ).toBe('PENDIENTE_APROBACION')
  })

  it('un id vacío no es temporal', () => {
    // Si lo fuera, un cliente sin id se marcaría «sin enviar» y diría una
    // mentira peor que la que se arregló.
    expect(esIdTemporal('')).toBe(false)
    expect(esIdTemporal(null)).toBe(false)
    expect(esIdTemporal(undefined)).toBe(false)
  })
})

describe('las etiquetas dicen qué pasa, no cómo está la red', () => {
  it('«SIN ENVIAR» y «PENDIENTE», nunca «OFFLINE»', () => {
    expect(etiquetaDeEstadoDeEnvio('SIN_ENVIAR')).toBe('SIN ENVIAR')
    expect(etiquetaDeEstadoDeEnvio('PENDIENTE_APROBACION')).toBe('PENDIENTE')
    expect(etiquetaDeEstadoDeEnvio(null)).toBeNull()
  })

  it('y cada una explica qué significa', () => {
    // Un rótulo de ocho letras no basta para una diferencia que decide si hay
    // que volver a crear al cliente.
    expect(explicacionDeEstadoDeEnvio('SIN_ENVIAR')).toContain('este dispositivo')
    expect(explicacionDeEstadoDeEnvio('PENDIENTE_APROBACION')).toContain(
      'aprobación',
    )
    expect(explicacionDeEstadoDeEnvio(null)).toBeNull()
  })
})

describe('la pantalla de clientes no vuelve a decidirlo por su cuenta', () => {
  const fuente = sinComentarios(
    fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'clientes', 'ClientesFeature.tsx'),
      'utf8',
    ),
  )

  it('ya no queda el «OFFLINE» escrito a mano', () => {
    expect(fuente).not.toMatch(/>\s*OFFLINE\s*</)
  })

  it('ni la condición repetida en cada vista', () => {
    /*
     * Era la misma pregunta contestada dos veces —tabla y tarjeta— y una de
     * las dos se quedó atrás. Si vuelve a aparecer, vuelve el fallo.
     */
    expect(fuente).not.toMatch(/cliente\.id\?\.includes\('offline'\)/)
  })

  it('las dos vistas leen la decisión compartida', () => {
    const veces = (fuente.match(/estadoDeEnvioDeCliente\(cliente\)/g) || []).length
    expect(veces).toBe(2)
  })

  it('y ese lector ve el defecto cuando se le pone delante', () => {
    // Comprobada al revés: lo que vive en un comentario no cuenta.
    expect(sinComentarios('<span>OFFLINE</span>')).toMatch(/>\s*OFFLINE\s*</)
    expect(sinComentarios('// decia >OFFLINE<')).not.toMatch(/>\s*OFFLINE\s*</)
  })
})
