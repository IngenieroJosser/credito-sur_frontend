export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  ADMINISTRADOR: 'Administrador',
  SUPER_ADMINISTRADOR: 'Super Administrador',
  COORDINADOR: 'Coordinador',
  SUPERVISOR: 'Supervisor',
  COBRADOR: 'Cobrador',
  CONTADOR: 'Contable',
  PUNTO_DE_VENTA: 'Punto de Venta',
}

const ENUM_LABELS: Record<string, string> = {
  CIERRE_PENDIENTE: 'Cierre pendiente',
  PAGO_REGULARIZADO: 'Pago regularizado',
  JORNADA_PENDIENTE_CERRADA: 'Jornada pendiente cerrada',
  REGULARIZACION_LIMPIA: 'Regularización limpia',
  ADMINISTRATIVO_CON_OBSERVACION: 'Cierre administrativo con observación',
  SOLICITUD_DINERO: 'Solicitud de dinero',
  SOLICITUD_BASE_EFECTIVO: 'Solicitud de base de efectivo',
  NUEVO_CLIENTE: 'Nuevo cliente',
  NUEVO_PRESTAMO: 'Nuevo préstamo',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
}

export function formatRoleLabel(role?: string | null) {
  const key = String(role || '').trim().toUpperCase()
  if (!key) return 'Usuario'
  return ROLE_LABELS[key] || humanizeEnumLabel(key)
}

export function humanizeEnumLabel(value?: string | null) {
  const key = String(value || '').trim().toUpperCase()
  if (!key) return ''
  if (ENUM_LABELS[key]) return ENUM_LABELS[key]

  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Las clases del distintivo de nivel de riesgo OPERATIVO de una ruta
 * (`PELIGRO_MINIMO` … `ALTO_RIESGO`).
 *
 * Estaba duplicada, identica, en el detalle de ruta de admin y en el de coordinador. Es
 * presentacion, no un dato, y por eso vive aqui con las otras etiquetas.
 */
export function riesgoBadgeClasses(riesgo: string) {
  // Se compara el valor tal cual, sin normalizar: los cinco que el backend produce
  // (`routes.service`) ya vienen en mayusculas y coinciden exactamente con estos casos. Se
  // comprobo antes de extraer, para que esto sea un movimiento y no un cambio.
  switch (riesgo) {
    case 'PELIGRO_MINIMO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'LEVE_RETRASO': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PRECAUCION': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'RIESGO_MODERADO': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'ALTO_RIESGO': return 'bg-rose-100 text-rose-800 border-rose-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

/**
 * El color del punto de PRIORIDAD de una visita.
 *
 * Habia cuatro copias y DOS juegos de colores distintos. Tres pantallas coincidian
 * —coordinador, supervisor y cobrador: naranja / azul / gris— y el detalle de ruta de admin
 * usaba otro —rojo / ambar / verde—, asi que la misma prioridad se veia de un color en una
 * pantalla y de otro en la siguiente. Se unifica con el juego de las tres.
 *
 * `prioridad` es opcional a proposito: en `VisitaRuta` lo es, porque ese campo no existe en
 * el esquema y se deriva (`o.prioridad || 'media'`). El caso sin valor cae en el gris, que es
 * lo que hacian las tres implementaciones mayoritarias.
 */
export function prioridadColor(prioridad?: 'alta' | 'media' | 'baja' | null) {
  if (prioridad === 'alta') return '#f97316'
  if (prioridad === 'media') return '#08557f'
  return '#94a3b8'
}

/**
 * Las clases del distintivo de ESTADO de una visita.
 *
 * Habia cuatro copias con tres diferencias reales:
 *
 *  - supervisor pintaba `pagado` de AZUL, y las otras tres de verde. Peor: su valor por
 *    defecto tambien era azul, asi que un cliente pagado y uno de estado desconocido se
 *    veian igual.
 *  - supervisor usaba `border-orange-100` en `pendiente` donde las otras usan
 *    `border-orange-500/30`.
 *  - `reprogramado` solo estaba declarado en admin; en coordinador caia al gris por defecto
 *    (y en supervisor/cobrador al azul por defecto, que coincidia con el de admin por
 *    casualidad).
 *
 * Se unifica con lo que hacian tres de cuatro, y `reprogramado` queda explicito.
 */
export function estadoVisitaClasses(estado?: string | null) {
  switch (estado) {
    case 'pagado':
      return 'bg-emerald-50 text-emerald-700 border-emerald-500/30'
    case 'pendiente':
      return 'bg-orange-50 text-orange-700 border-orange-500/30'
    case 'en_mora':
      return 'bg-rose-50 text-rose-700 border-rose-500/30'
    case 'ausente':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'reprogramado':
      return 'bg-blue-50 text-blue-700 border-blue-500/30'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-300'
  }
}

/**
 * La etiqueta del nivel de riesgo OPERATIVO de una ruta.
 *
 * Ojo con el nombre: habia CUATRO `getRiesgoLabel` y no eran lo mismo. Tres reciben el
 * `nivelRiesgo` de una ruta (`PELIGRO_MINIMO`, `LEVE_RETRASO`, `PRECAUCION`,
 * `RIESGO_MODERADO`, `ALTO_RIESGO`) y solo cambian el guion bajo por un espacio. La cuarta,
 * en `creditos-articulos`, recibe el riesgo del CLIENTE (`VERDE`, `AMARILLO`, `ROJO`,
 * `LISTA_NEGRA`) y lo traduce. Unificar las cuatro habria sido un error: esta solo sirve
 * para el riesgo de ruta.
 *
 * El caso vacio NO tenia mayoria —una pantalla devolvia '', otra 'Desconocido' y la tercera
 * no lo manejaba— y es alcanzable, porque en `RutaDeListado` el campo es opcional. Se elige
 * un texto unico para las tres.
 */
export function riesgoOperativoLabel(riesgo?: string | null) {
  if (!riesgo) return 'Sin riesgo'
  return riesgo.replace('_', ' ')
}

/**
 * Cómo se llama cada decisión sobre una cuenta vencida, y qué pasa al tomarla.
 *
 * ── Por qué vive aquí y no en cada pantalla ─────────────────────────────────
 *
 * Estaba escrito cuatro veces, y las cuatro decían cosas distintas. La misma
 * decisión, vista por la misma persona en dos pantallas seguidas:
 *
 *   enum            modal de gestión     modal de revisión     listado
 *   ───────────────────────────────────────────────────────────────────────────
 *   PRORROGAR       Prorrogar Plan       Prórroga de Plazo     Prorroga
 *   CASTIGAR        Reportar Pérdida     Baja por Pérdida      Baja por perdida
 *   DEJAR_QUIETO    Dejar Quieto         Sin Mora por Ahora    Sin mora por ahora
 *   JURIDICO        —                    —                     Cobro juridico
 *
 * Tres nombres por decisión, y en el listado además sin tildes. Quien pide la
 * gestión lee un nombre, quien la aprueba lee otro y la notificación trae un
 * tercero: no hay forma de saber que se está hablando de lo mismo.
 *
 * ── Sobre los nombres elegidos ──────────────────────────────────────────────
 *
 * «Dejar quieto» se cambió por «Dejar en seguimiento». Lo primero es del habla
 * de la oficina: quien lo dice sabe qué significa, pero quien entra nuevo tiene
 * que preguntarlo, y en una lista de tres opciones que deciden qué se hace con
 * la deuda de alguien eso no puede pasar. El nombre nuevo dice lo que ocurre.
 *
 * Cada decisión lleva también su `efecto`: una línea en presente que explica
 * qué le pasa al crédito. El nombre dice cuál es la opción; el efecto dice qué
 * se está firmando.
 *
 * Los COLORES y los ICONOS no están aquí a propósito. Eso es presentación y
 * puede cambiar con la pantalla —un badge en un listado y una tarjeta grande en
 * un modal no se pintan igual—. Lo que no puede cambiar es el nombre.
 */
export const DECISIONES_CUENTA_VENCIDA = {
  PRORROGAR: {
    label: 'Prorrogar el plan',
    efecto: 'Se amplía el plazo. Se puede cobrar mora o no.',
  },
  DEJAR_QUIETO: {
    label: 'Dejar en seguimiento',
    efecto: 'No se cobra mora. El crédito sigue vigilado.',
  },
  CASTIGAR: {
    label: 'Dar de baja por pérdida',
    efecto: 'La deuda se declara incobrable y sale de la cartera.',
  },
  JURIDICO: {
    label: 'Pasar a cobro jurídico',
    efecto: 'El caso se entrega para cobro por vía legal.',
  },
} as const

export type DecisionCuentaVencida = keyof typeof DECISIONES_CUENTA_VENCIDA

/**
 * El nombre de una decisión, o el enum humanizado si llega una que no está.
 *
 * El respaldo existe porque el backend podría enviar una decisión nueva antes
 * de que esta lista la conozca, y en ese caso es mejor «Algo Nuevo» que un
 * hueco en la pantalla.
 */
export function decisionCuentaVencidaLabel(decision?: string | null): string {
  const clave = String(decision || '').trim().toUpperCase()
  if (!clave) return 'Sin decisión'
  const conocida = DECISIONES_CUENTA_VENCIDA[clave as DecisionCuentaVencida]
  return conocida ? conocida.label : humanizeEnumLabel(clave)
}

/** Qué le pasa al crédito con esa decisión, o cadena vacía si no se sabe. */
export function decisionCuentaVencidaEfecto(decision?: string | null): string {
  const clave = String(decision || '').trim().toUpperCase()
  const conocida = DECISIONES_CUENTA_VENCIDA[clave as DecisionCuentaVencida]
  return conocida ? conocida.efecto : ''
}
