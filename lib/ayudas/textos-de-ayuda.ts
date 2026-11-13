/**
 * Las explicaciones del sistema, cada una escrita una sola vez.
 *
 * ── Por qué un diccionario y no el texto donde se usa ───────────────────────
 *
 * Porque el mismo concepto sale en varias pantallas, y bifurcado por rol sale
 * dos y tres veces: «cuota acumulada» aparece en la ruta del cobrador, en la
 * del supervisor, en la del coordinador y en la del admin, que son cuatro
 * archivos distintos. Escrita en cada sitio, la explicación se desincroniza
 * igual que se desincronizó la fórmula del crédito —cinco copias, todas
 * distintas— o la lista de plazos.
 *
 * Y hay un motivo más concreto: estos textos dicen qué significa una cifra de
 * dinero. Si en una pantalla se explica «el total que debe» y en otra «el
 * capital que falta», una de las dos miente sobre el mismo número.
 *
 * ── Cómo están escritos ─────────────────────────────────────────────────────
 *
 * Para quien está delante de la pantalla, no para quien escribió el código.
 * Dicen qué es la cifra y, cuando importa, de dónde sale y qué NO incluye: lo
 * que se malinterpreta casi siempre es lo que queda fuera.
 *
 * Nada de nombres de campo, de endpoints ni de enums. «Días en mora», no
 * `diasMora`.
 */
/*
 * ── Lo que NO esta aqui, y por que ─────────────────────────────────────────
 *
 * Cuatro explicaciones se escribieron y se quitaron, porque no hay en la
 * pantalla ningun rotulo al que puedan ir pegadas:
 *
 *   «cuota del dia»     la pantalla del cobrador no la rotula: la cifra sale
 *                       calculada dentro de la tarjeta de cada visita
 *   «lista negra»       es una opcion de un filtro y una insignia de estado,
 *                       no el rotulo de un dato
 *   «acuerdo de pago»   y «prorroga»: sus botones estaban MUERTOS —cuatro
 *                       botones de «Castigar Cartera» y «Acuerdo de Pago»
 *                       sin `onClick`, sobre datos reales— y se retiraron.
 *                       Cuando vuelvan con su accion de verdad, vuelve su
 *                       explicacion
 *
 * Se quitaron en vez de dejarlas sin usar a proposito: una explicacion que
 * nadie lee es una que nadie va a mantener, y cuando por fin se use dira algo
 * que ya no es verdad. Lo vigila `__tests__/ayudas-que-explican.test.ts`.
 */
export const TEXTOS_DE_AYUDA = {
  // ── Un préstamo ───────────────────────────────────────────────────────────
  montoPrestado:
    'El dinero que se le entregó al cliente, sin intereses. Es lo que salió ' +
    'de la caja.',
  saldoPendiente:
    'Lo que falta por cobrar: capital más intereses, menos todo lo que ya ' +
    'pagó. Es la cifra que cierra la cuenta, no solo el capital.',
  interesTotal:
    'Lo que el crédito cobra de más sobre el monto prestado, repartido entre ' +
    'todas las cuotas. Ya está sumado en el saldo pendiente.',
  tipoDeInteres:
    'Interés simple: se calcula una sola vez sobre el monto prestado y se ' +
    'reparte entre las cuotas, así que la cuota no cambia de una a otra.',
  abonadoALaFecha:
    'Todo lo que el cliente ha pagado de este crédito, en dinero y en ' +
    'porcentaje del total. Cuenta los abonos parciales.',
  capitalPagado:
    'La parte de lo pagado que bajó la deuda. El resto fue a intereses.',
  interesPagado:
    'La parte de lo pagado que fue a intereses, no a bajar la deuda.',
  frecuenciaDePago:
    'Cada cuánto toca cobrar: diario, semanal, quincenal o mensual. De aquí ' +
    'salen las fechas del plan de pagos.',
  fechaInicio:
    'El día en que arrancó el crédito. De aquí se cuentan los plazos; no es ' +
    'necesariamente el día del primer cobro.',
  primerCobro:
    'El día en que toca cobrar la primera cuota. Puede ser después de la ' +
    'fecha de inicio: el dinero se entrega un día y se empieza a cobrar otro.',
  fechaVencimiento:
    'El día en que debería estar pagado por completo si se cumple el plan.',

  // ── Mora ──────────────────────────────────────────────────────────────────
  diasEnMora:
    'Días transcurridos desde que venció la cuota más antigua sin pagar. Se ' +
    'cuentan en días de calendario, con la fecha de Bogotá.',
  cuotaVencidaDesde:
    'La fecha de la cuota más antigua que sigue sin pagarse. Desde ese día se ' +
    'cuentan los días en mora.',
  interesPorMora:
    'El recargo por pagar tarde, si la empresa lo aplica a este crédito. Una ' +
    'raya significa que no hay recargo, no que sea cero.',
  cuotaAcumulada:
    'La suma de las cuotas vencidas que el cliente arrastra. Es lo que hay ' +
    'que cobrarle para ponerlo al día, y no es lo mismo que la cuota del día.',

  // ── Riesgo ────────────────────────────────────────────────────────────────
  riesgoDelCliente:
    'Cómo ha pagado este cliente en su historia con la empresa. Es del ' +
    'CLIENTE, no de la ruta ni de este crédito en concreto.',
  riesgoOperativoDeLaRuta:
    'Cómo va la ruta hoy: cuánto se ha recaudado frente a lo que tocaba. Es ' +
    'de la RUTA, y no tiene que ver con el riesgo de cada cliente.',

  // ── Gestión de una cuenta vencida ────────────────────────────────────────
  castigoDeCartera:
    'Dar por perdida una deuda en la contabilidad. La cuenta deja de contar ' +
    'como recuperable; el cliente sigue debiéndola y el registro queda con ' +
    'quién lo autorizó y por qué.',
  castigoParcial:
    'Dar por perdida solo una parte de la deuda. El resto sigue en cartera y ' +
    'se puede seguir cobrando.',
  reprogramar:
    'Mover las fechas de las cuotas que quedan, manteniendo lo que se debe. ' +
    'Se usa cuando el cliente puede pagar pero no en las fechas pactadas.',

  // ── Caja y ruta ───────────────────────────────────────────────────────────
  recolectarDinero:
    'Registrar que el cobrador entregó en caja el dinero que recaudó en la ' +
    'calle. Hasta que se recolecta, ese dinero está con él y no en la caja.',
  baseDeLaRuta:
    'El dinero que se le entrega al cobrador al salir, para dar cambio y ' +
    'para desembolsar créditos del día. Se le descuenta al cuadrar.',
  arqueoDeCaja:
    'Contar el dinero que hay de verdad en la caja y compararlo con lo que ' +
    'el sistema dice que debería haber. La diferencia queda registrada.',
  cierreDeRuta:
    'Cerrar la jornada del cobrador: fija lo recaudado, lo entregado y lo ' +
    'que quedó pendiente. Después del cierre, lo del día ya no se cambia sin ' +
    'autorización.',
  fechaOperativa:
    'El día de trabajo al que pertenece el movimiento, en hora de Bogotá. No ' +
    'es la hora del reloj del servidor: un pago registrado de madrugada ' +
    'cuenta en la jornada que corresponde.',
  efectivoEntregado:
    'Lo que el cobrador ya entregó en caja de esta ruta. Si es menos que lo ' +
    'recaudado, la diferencia la lleva encima.',

  // ── Trabajar sin conexión ─────────────────────────────────────────────────
  trabajoSinConexion:
    'Sin señal, lo que registres se guarda en este teléfono y se envía solo ' +
    'cuando vuelva la conexión. No hace falta repetirlo ni esperar.',
  pendienteDeEnviar:
    'Registrado en este teléfono y todavía sin enviar al servidor. Se envía ' +
    'solo; mientras tanto, ya cuenta en tus cuentas del día.',
  limpiarDatosLocales:
    'Borra la copia que este teléfono tiene de clientes, rutas y créditos. ' +
    'Para volver a tenerla hace falta conexión: sin señal te quedas sin ' +
    'datos en la calle.',

  // ── Crear un crédito ──────────────────────────────────────────────────────
  cuotaInicialDeArticulo:
    'Lo que el cliente entrega al llevarse el artículo. Se descuenta del ' +
    'precio y el resto es lo que se financia.',
  ventaDeContado:
    'El cliente paga el artículo entero en el momento. No se crea crédito ' +
    'ni plan de cuotas.',
  plazoEnMeses:
    'En cuántos meses se financia. La empresa financia a 3, 5 y 8 meses, y ' +
    'cada plazo tiene su propio precio.',
} as const

export type ClaveDeAyuda = keyof typeof TEXTOS_DE_AYUDA
