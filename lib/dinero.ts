/**
 * Qué es una cantidad de dinero válida, y cómo se lee en voz alta.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * No había NINGÚN tope de importe en el frontend. Buscando `MONTO_MAXIMO` y
 * equivalentes: cero resultados. En «Monto a Solicitar» un cero de más
 * convierte 1.000.000 en 10.000.000 y el formulario no dice nada: pasa al paso
 * 3, al 4, y el crédito se crea.
 *
 * Los cuatro avisos de importe que sí existen —`PagoModal`, `GastoModal`,
 * `AbonoModal` y recolectar— son todos para RESTAR dinero («no puede exceder
 * el saldo»). Ninguno para crearlo.
 *
 * ── Por qué en palabras y no un umbral ──────────────────────────────────────
 *
 * Lo primero que se intentó fue avisar por encima de cierta cifra. Para elegir
 * esa cifra hay que saber qué es un monto normal, y la base de pruebas está
 * sembrada con valores uniformes —el percentil 50, el 95 y el 99 de los 8.024
 * créditos son los mismos 500.000—, así que cualquier umbral habría sido
 * inventado.
 *
 * Escribir el importe en palabras no necesita umbral y ataca el error de
 * frente: quien quiso poner un millón lee «diez millones de pesos» debajo del
 * campo y lo ve. Es lo que hacen los cheques, y por el mismo motivo.
 */

/**
 * El techo de la columna del servidor (`dinero.util.ts`).
 *
 * Es un límite TÉCNICO, no «esto parece un error»: 10.000.000 lo pasa sin
 * problema. Está aquí para dar el aviso en el momento en vez de esperar un 400,
 * no para juzgar si el importe tiene sentido.
 */
export const MAXIMO_EN_PESOS = 9_999_999_999_999

/**
 * Por qué un importe no sirve como dinero, o `null` si sirve.
 *
 * Refleja `porQueNoEsDinero` del backend. Es una copia a propósito —el aviso
 * tiene que salir mientras se escribe, sin ir al servidor— y por eso hay una
 * prueba que compara las dos listas de reglas.
 */
export function porQueNoEsDinero(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') {
    return 'Falta indicar el monto.'
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return 'El monto tiene que ser un número.'
  }
  if (numero <= 0) {
    return 'El monto tiene que ser mayor que cero.'
  }
  if (numero > MAXIMO_EN_PESOS) {
    return 'El monto es demasiado grande.'
  }
  if (!Number.isInteger(numero)) {
    return 'El peso colombiano no tiene centavos.'
  }

  return null
}

const UNIDADES = [
  '',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
]

const DECENAS = [
  '',
  '',
  'veinte',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
]

const CENTENAS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
]

/** De 0 a 999, en palabras. */
function hastaMil(n: number): string {
  if (n === 0) return ''
  if (n <= 20) return UNIDADES[n]
  if (n === 100) return 'cien'

  if (n < 100) {
    const d = Math.floor(n / 10)
    const u = n % 10
    if (d === 2) return u ? `veinti${UNIDADES[u]}` : 'veinte'
    return u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d]
  }

  const c = Math.floor(n / 100)
  const resto = n % 100
  return resto ? `${CENTENAS[c]} ${hastaMil(resto)}` : CENTENAS[c]
}

/**
 * El importe escrito en palabras, para leerlo de un vistazo.
 *
 * «un millón de pesos» frente a «diez millones de pesos»: la diferencia que un
 * cero de más esconde entre los puntos de miles salta a la vista escrita.
 *
 * Devuelve cadena vacía si el importe no sirve como dinero, para que quien lo
 * use no tenga que decidir qué pintar en ese caso.
 */
export function montoEnPalabras(monto: number): string {
  if (porQueNoEsDinero(monto) !== null) return ''

  const n = Math.trunc(monto)

  const millones = Math.floor(n / 1_000_000)
  const miles = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000

  const partes: string[] = []

  if (millones === 1) partes.push('un millón')
  else if (millones > 1) partes.push(`${hastaMil(millones)} millones`)

  if (miles === 1) partes.push('mil')
  else if (miles > 1) partes.push(`${hastaMil(miles)} mil`)

  if (resto > 0) partes.push(hastaMil(resto))

  // «uno» se apocopa delante del sustantivo: un peso, veintiún pesos, ciento
  // un pesos. Sin esto salía «veintiuno pesos».
  const texto = partes
    .join(' ')
    .replace(/\bveintiuno\b/g, 'veintiún')
    .replace(/\buno\b(?=\s|$)/g, 'un')

  // Los millones redondos llevan «de»: «un millón DE pesos». Con algo detrás,
  // no: «un millón quinientos mil pesos».
  const conDe = millones >= 1 && miles === 0 && resto === 0

  return `${texto}${conDe ? ' de' : ''} ${n === 1 ? 'peso' : 'pesos'}`
}
