/**
 * Dos cosas distintas que se parecen, y una etiqueta para cada una.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Un cliente puede estar en dos situaciones que no tienen nada que ver:
 *
 *   **Sin enviar.** Se creó sin señal y vive solo en ESTE teléfono. Su id es
 *   `temp-<marca de tiempo>` —lo acuñan `NuevoClienteModal` y
 *   `clientes-service`—. Nadie más lo ve. Si el teléfono se pierde, se pierde.
 *
 *   **Pendiente.** Está en el servidor y le falta la aprobación de un
 *   coordinador. Todo el mundo lo ve.
 *
 * La tabla de escritorio las distinguía bien. La TARJETA de móvil, que es la
 * que usa el cobrador, imprimía «OFFLINE» para las dos:
 *
 *     {isPending && <span>OFFLINE</span>}
 *
 * Se vio en una captura de `/clientes` en móvil: los 26 clientes de la base,
 * todos pendientes de aprobación y ninguno creado sin señal, salían marcados
 * «OFFLINE». Dicho de otro modo, la pantalla donde más importa —la del
 * teléfono, en la calle— decía que nada se había enviado.
 *
 * Por eso la decisión vive aquí y no en cada vista: era la misma pregunta
 * contestada dos veces, y una de las dos se quedó atrás.
 */

export type EstadoDeEnvio = 'SIN_ENVIAR' | 'PENDIENTE_APROBACION' | null

/** Lo poco que hay que leer de un cliente para decidir esto. */
export type ClienteParaEstadoDeEnvio = {
  id?: string | null
  estadoAprobacion?: string | null
}

/**
 * Un id temporal es el que acuña el dispositivo cuando no hay señal.
 *
 * Se aceptan las dos formas por historia: hoy se acuñan `temp-…`, y hubo
 * código que buscaba `offline-…`. Preguntar por las dos no cuesta nada y
 * evita que un id viejo quede sin marcar.
 */
export function esIdTemporal(id?: string | null): boolean {
  const texto = String(id || '')
  return texto.includes('temp') || texto.includes('offline')
}

export function estadoDeEnvioDeCliente(
  cliente: ClienteParaEstadoDeEnvio | null | undefined,
): EstadoDeEnvio {
  if (!cliente) return null
  if (esIdTemporal(cliente.id)) return 'SIN_ENVIAR'
  if (String(cliente.estadoAprobacion || '').toUpperCase() === 'PENDIENTE') {
    return 'PENDIENTE_APROBACION'
  }
  return null
}

/**
 * La etiqueta tal como se lee en pantalla.
 *
 * «SIN ENVIAR» y no «OFFLINE»: lo que la persona necesita saber es que ese
 * cliente todavía no salió del teléfono, no en qué estado está la red.
 */
export function etiquetaDeEstadoDeEnvio(estado: EstadoDeEnvio): string | null {
  if (estado === 'SIN_ENVIAR') return 'SIN ENVIAR'
  if (estado === 'PENDIENTE_APROBACION') return 'PENDIENTE'
  return null
}

/**
 * Qué significa, para el `title`/tooltip y para quien no haya visto nunca la
 * diferencia.
 */
export function explicacionDeEstadoDeEnvio(estado: EstadoDeEnvio): string | null {
  if (estado === 'SIN_ENVIAR') {
    return 'Se creó sin señal y todavía está solo en este dispositivo. Se envía solo cuando vuelva la conexión.'
  }
  if (estado === 'PENDIENTE_APROBACION') {
    return 'Ya está en el sistema; le falta la aprobación de un coordinador.'
  }
  return null
}
