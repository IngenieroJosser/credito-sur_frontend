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
  // Los estados de un crédito. Estaban escritos a mano en las pantallas que
  // los muestran, y `PENDIENTE_APROBACION` decía «Pendiente de revisión» en el
  // modal de alertas de cliente y «Pendiente de aprobación» aquí. Es el mismo
  // estado del mismo crédito: se queda el que dice el enum y el que usa el
  // backend en sus mensajes.
  ACTIVO: 'Activo',
  EN_MORA: 'En mora',
  INCUMPLIDO: 'Incumplido',
  PAGADO: 'Pagado',
  CANCELADO: 'Cancelado',
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
/**
 * UNA paleta para todos los distintivos de riesgo y mora.
 *
 * ── Por que ───────────────────────────────────────────────────────────────
 *
 * El dueño lo pidio asi: «revisar el tema de los riesgos de mora o vencidas
 * para que todos tengan el mismo estilo, porque hay vistas con estilos
 * diferentes».
 *
 * Y las habia. Medido sobre el repo, el riesgo del CLIENTE se pintaba en seis
 * sitios con al menos TRES paletas:
 *
 *   creditos-articulos   emerald-600 / amber-600 / rose-600, lista negra gris
 *   DetalleCliente       emerald-700 / amber-700 / rose-700, lista negra NEGRA
 *   CobradorElements     emerald-700 / yellow-700 / **red**-700, y lista negra
 *                        del MISMO rojo que «rojo», asi que un cliente en lista
 *                        negra se veia igual que uno de riesgo alto
 *
 * ── Tres escalas, no una ─────────────────────────────────────────────────
 *
 * Lo que NO se hace es mezclarlas. Son tres cosas distintas y ya costo un
 * susto confundirlas:
 *
 *   - el riesgo del CLIENTE: VERDE / AMARILLO / ROJO / LISTA_NEGRA;
 *   - el riesgo OPERATIVO de una RUTA: PELIGRO_MINIMO ... ALTO_RIESGO;
 *   - el nivel de MORA por dias: minimo / leve / precaucion / moderado /
 *     critico.
 *
 * Cada una conserva sus valores y su significado. Lo que se comparte es el
 * COLOR: un verde es el mismo verde en toda la aplicacion.
 *
 * Los tonos son los que ya usaba `riesgoBadgeClasses`, que era la unica
 * centralizada: asi las pantallas de ruta no cambian de aspecto y son las
 * sueltas las que se alinean.
 */
const PALETA = {
  bien: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  leve: 'bg-blue-100 text-blue-800 border-blue-200',
  atencion: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  moderado: 'bg-amber-100 text-amber-800 border-amber-200',
  critico: 'bg-rose-100 text-rose-800 border-rose-200',
  /*
   * La lista negra NO es «critico mas fuerte»: es una decision del negocio de
   * no prestarle a esa persona. Por eso es la unica solida, para que no se
   * confunda con un atraso grave -que es lo que pasaba en CobradorElements,
   * donde las dos salian del mismo rojo-.
   */
  bloqueado: 'bg-slate-800 text-white border-slate-800',
  desconocido: 'bg-slate-100 text-slate-800 border-slate-200',
} as const;

/**
 * El distintivo del riesgo de un CLIENTE.
 *
 * Acepta tambien la forma en minusculas que usan algunas pantallas, porque la
 * habia y quitarla de golpe dejaria sin color a quien la pase.
 */
export function riesgoClienteBadgeClasses(riesgo?: string | null) {
  switch (String(riesgo ?? '').toUpperCase()) {
    case 'VERDE':
      return PALETA.bien;
    case 'AMARILLO':
      return PALETA.atencion;
    case 'ROJO':
      return PALETA.critico;
    case 'LISTA_NEGRA':
      return PALETA.bloqueado;
    default:
      return PALETA.desconocido;
  }
}

/** El nombre del riesgo de un cliente, en palabras. */
export function riesgoClienteLabel(riesgo?: string | null) {
  switch (String(riesgo ?? '').toUpperCase()) {
    case 'VERDE':
      return 'Al día';
    case 'AMARILLO':
      return 'En observación';
    case 'ROJO':
      return 'Riesgo alto';
    case 'LISTA_NEGRA':
      return 'Lista negra';
    default:
      return 'Sin evaluar';
  }
}

/**
 * El distintivo del nivel de MORA por dias (la escala en minusculas).
 *
 * La producen `calcularNivelMora` y compañia: minimo / leve / precaucion /
 * moderado / critico.
 */
export function nivelMoraBadgeClasses(nivel?: string | null) {
  switch (String(nivel ?? '').toLowerCase()) {
    case 'minimo':
      return PALETA.bien;
    case 'leve':
      return PALETA.leve;
    case 'precaucion':
      return PALETA.atencion;
    case 'moderado':
      return PALETA.moderado;
    case 'critico':
      return PALETA.critico;
    default:
      return PALETA.desconocido;
  }
}

/** El nombre del nivel de mora por días, en palabras. */
export function nivelMoraLabel(nivel?: string | null) {
  switch (String(nivel ?? '').toLowerCase()) {
    case 'minimo':
      return 'Mínimo';
    case 'leve':
      return 'Leve';
    case 'precaucion':
      return 'Precaución';
    case 'moderado':
      return 'Moderado';
    case 'critico':
      return 'Crítico';
    default:
      return '—';
  }
}

/**
 * El distintivo cuando no se sabe de antemano QUE escala llega.
 *
 * Existe porque algunas pantallas -las del cobrador sobre todo- reciben el
 * nivel ya calculado y puede venir de cualquiera de las tres: la del cliente,
 * la operativa de la ruta o la de dias de mora. Habia una funcion que las
 * mezclaba en un solo `switch` de quince casos, con el problema de que
 * `LISTA_NEGRA` caia en el MISMO rojo que `ROJO`: un cliente al que se decidio
 * no prestarle se veia igual que uno con atraso grave.
 *
 * Aqui se despacha a la escala que corresponde, y cada una conserva su
 * significado.
 */
export function badgeDeRiesgoSegunValor(valor?: string | null) {
  const v = String(valor ?? '').trim();
  if (!v) return PALETA.desconocido;

  // `bajo` es un alias historico de `minimo` que algunas vistas aun pasan.
  const minusculas = v.toLowerCase();
  if (minusculas === 'bajo') return PALETA.bien;
  if (
    ['minimo', 'leve', 'precaucion', 'moderado', 'critico'].includes(minusculas)
  ) {
    return nivelMoraBadgeClasses(minusculas);
  }

  const mayusculas = v.toUpperCase();
  if (['VERDE', 'AMARILLO', 'ROJO', 'LISTA_NEGRA'].includes(mayusculas)) {
    return riesgoClienteBadgeClasses(mayusculas);
  }

  return riesgoBadgeClasses(mayusculas);
}

/** El PUNTO de color del mismo nivel, para las listas compactas. */
export function puntoDeRiesgoSegunValor(valor?: string | null) {
  const clases = badgeDeRiesgoSegunValor(valor);
  if (clases === PALETA.bien) return 'bg-emerald-500';
  if (clases === PALETA.leve) return 'bg-blue-500';
  if (clases === PALETA.atencion) return 'bg-yellow-500';
  if (clases === PALETA.moderado) return 'bg-amber-500';
  if (clases === PALETA.critico) return 'bg-rose-500';
  if (clases === PALETA.bloqueado) return 'bg-slate-800';
  return 'bg-slate-300';
}

/**
 * El BORDE de una tarjeta del mismo nivel, para las fichas de la ruta.
 *
 * Es un borde solido de un tono, no el distintivo, asi que no puede salir de
 * `PALETA`; lo que si sale de un solo sitio es QUE tono le toca a cada nivel,
 * y aqui se mantiene en la misma familia que el distintivo. La sombra sigue la
 * regla que ya tenia la pantalla del cobrador: mas marcada en los dos niveles
 * que piden atencion.
 */
export function bordeDeRiesgoSegunValor(valor?: string | null) {
  switch (badgeDeRiesgoSegunValor(valor)) {
    case PALETA.bien:
      return 'border-emerald-400 shadow-sm';
    case PALETA.leve:
      return 'border-blue-400 shadow-sm';
    case PALETA.atencion:
      return 'border-yellow-400 shadow-sm';
    case PALETA.moderado:
      return 'border-amber-500 shadow-sm';
    case PALETA.critico:
      return 'border-rose-600 shadow-md';
    case PALETA.bloqueado:
      return 'border-slate-800 shadow-md';
    default:
      return 'border-slate-200';
  }
}

/** El NOMBRE del mismo nivel, despachado igual que el color. */
export function etiquetaDeRiesgoSegunValor(valor?: string | null) {
  const v = String(valor ?? '').trim();
  if (!v) return '—';

  const minusculas = v.toLowerCase();
  if (minusculas === 'bajo') return nivelMoraLabel('minimo');
  if (
    ['minimo', 'leve', 'precaucion', 'moderado', 'critico'].includes(minusculas)
  ) {
    return nivelMoraLabel(minusculas);
  }

  const mayusculas = v.toUpperCase();
  if (['VERDE', 'AMARILLO', 'ROJO', 'LISTA_NEGRA'].includes(mayusculas)) {
    return riesgoClienteLabel(mayusculas);
  }

  return riesgoOperativoLabel(mayusculas);
}

export function riesgoBadgeClasses(riesgo: string) {
  // Se compara el valor tal cual, sin normalizar: los cinco que el backend produce
  // (`routes.service`) ya vienen en mayusculas y coinciden exactamente con estos casos. Se
  // comprobo antes de extraer, para que esto sea un movimiento y no un cambio.
  // Mismos tonos de antes, ahora nombrados: esta funcion era la referencia y
  // su aspecto no cambia.
  switch (riesgo) {
    case 'PELIGRO_MINIMO': return PALETA.bien;
    case 'LEVE_RETRASO': return PALETA.leve;
    case 'PRECAUCION': return PALETA.atencion;
    case 'RIESGO_MODERADO': return PALETA.moderado;
    case 'ALTO_RIESGO': return PALETA.critico;
    default: return PALETA.desconocido;
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
