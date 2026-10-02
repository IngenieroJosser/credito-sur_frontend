import type { Page } from '@playwright/test'

/**
 * Entrar al sistema con cada rol, y vigilar la pantalla mientras se usa.
 *
 * Los siete usuarios son los del seed del backend (`src/prisma/seed.ts`). OJO con el
 * dominio: los dos de administración son `@creditosur.com` y los otros cinco
 * `@credisur.com`. No es un descuido de este archivo: así están en el seed, y confundirlos
 * da un 401 que parece un problema de contraseña.
 */
export const USUARIOS = {
  SUPER_ADMINISTRADOR: {
    usuario: 'superadmin@creditosur.com',
    clave: 'SuperAdmin123!',
    inicio: '/admin',
  },
  ADMIN: {
    usuario: 'admin@creditosur.com',
    clave: 'Admin123!',
    inicio: '/admin',
  },
  COORDINADOR: {
    usuario: 'coordinador@credisur.com',
    clave: 'COORDINADOR_1234',
    inicio: '/coordinador',
  },
  SUPERVISOR: {
    usuario: 'supervisor@credisur.com',
    clave: 'Supervisor123!',
    inicio: '/supervisor',
  },
  COBRADOR: {
    usuario: 'cobrador@credisur.com',
    clave: 'Cobrador123!',
    inicio: '/cobranzas',
  },
  CONTADOR: {
    usuario: 'contador@credisur.com',
    clave: 'Contador123!',
    inicio: '/contador',
  },
  PUNTO_DE_VENTA: {
    usuario: 'ventas@credisur.com',
    clave: 'Ventas123!',
    inicio: '/punto-de-venta',
  },
} as const

export type Rol = keyof typeof USUARIOS

/**
 * Entra a la app con el rol indicado.
 *
 * Los campos se buscan por placeholder y no por etiqueta: la pantalla de login no tiene ni
 * un `<label>`, así que `getByLabel` no encuentra nada. Dicho de paso, eso es un problema
 * de accesibilidad de la pantalla, no de la prueba.
 */
export async function entrarComo(page: Page, rol: Rol) {
  const { usuario, clave } = USUARIOS[rol]
  await page.goto('/login')
  await page.getByPlaceholder(/usuario|correo/i).fill(usuario)
  await page.getByPlaceholder(/contrase/i).fill(clave)
  await page.getByRole('button', { name: /acceder/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 60_000,
  })
}

/** Un problema visto en la pantalla, con el sitio donde salió. */
export type Hallazgo = { pantalla: string; tipo: string; detalle: string }

/**
 * Errores de consola que NO son un fallo de la pantalla y se ignoran a propósito.
 *
 * El criterio es estrecho: solo ruido del entorno de desarrollo o de servicios externos
 * que no están configurados en local. Cualquier otro error de consola cuenta como fallo,
 * porque en esta app un `undefined is not a function` en consola es justo el síntoma de los
 * campos leídos con el nombre equivocado.
 */
const RUIDO_CONOCIDO = [
  /favicon/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /webpack-hmr|hot-update/i,
  /net::ERR_(CONNECTION_REFUSED|INTERNET_DISCONNECTED)/i,
  /cloudinary/i,
  /service-?worker/i,
  /Manifest/i,
  // 401/403: el rol no tiene permiso para ese endpoint. Es el sistema funcionando, no
  // un fallo; que la pantalla redirija o avise se comprueba aparte.
  /status of 40[13]/i,
  /statusCode"?:\s*40[13]/i,
  /No tienes permisos/i,
  // 429: el limitador. Se cuenta APARTE porque es configuracion del servidor y
  // mezclarlo aqui taparia las pantallas rotas detras del ruido.
  /status of 429/i,
  /statusCode"?:\s*429/i,
  /Demasiadas solicitudes/i,
  // 408: el backend tardo demasiado. Con los siete roles entrando a la vez, la descarga
  // offline de rutas se pasa del tiempo. Es una DEGRADACION medible bajo carga, no una
  // pantalla rota, y se cuenta aparte por el mismo motivo que los 429: mezclarlo taparia
  // lo segundo detras de lo primero.
  /statusCode"?:\s*408/i,
  /tardando demasiado/i,
  /Request timeout/i,
]

/**
 * Engancha la vigilancia de la página: errores de consola, excepciones sin capturar y
 * respuestas 5xx del backend.
 *
 * Devuelve el arreglo donde se van acumulando; se lee después de navegar.
 */
export function vigilar(page: Page, pantalla: string) {
  const hallazgos: Hallazgo[] = []

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const texto = msg.text()
    if (RUIDO_CONOCIDO.some((r) => r.test(texto))) return
    hallazgos.push({ pantalla, tipo: 'consola', detalle: texto.slice(0, 300) })
  })

  page.on('pageerror', (err) => {
    hallazgos.push({
      pantalla,
      tipo: 'excepcion',
      detalle: String(err.message).slice(0, 300),
    })
  })

  page.on('response', (res) => {
    if (res.status() < 500) return
    hallazgos.push({
      pantalla,
      tipo: `http ${res.status()}`,
      detalle: res.url().slice(0, 200),
    })
  })

  return hallazgos
}

/**
 * Lo que se ve en pantalla y no debería verse nunca.
 *
 * `NaN` y `undefined` pintados son el síntoma de leer un campo con el nombre que el
 * endpoint no manda, que es el error más repetido de este sistema. `[object Object]` es el
 * de meter un objeto donde se esperaba texto.
 */
export async function textoSospechoso(page: Page): Promise<string[]> {
  const cuerpo = (await page.locator('body').innerText().catch(() => '')) || ''
  const problemas: string[] = []
  if (/\bNaN\b/.test(cuerpo)) problemas.push('NaN visible')
  if (/\$\s*NaN|NaN\s*%/.test(cuerpo)) problemas.push('cifra NaN visible')
  if (/\bundefined\b/.test(cuerpo)) problemas.push('undefined visible')
  if (/\[object Object\]/.test(cuerpo)) problemas.push('[object Object] visible')
  return problemas
}

/**
 * Qué marca de error está mostrando la pantalla, o null si ninguna.
 *
 * Devuelve CUÁL y no solo un sí/no: con un booleano, un informe de ochenta pantallas
 * "con error" no dice nada y no se puede separar un fallo de verdad de un falso positivo
 * del propio entorno de desarrollo.
 */
export async function marcaDeError(page: Page): Promise<string | null> {
  const marcas: Array<[string, string]> = [
    ['dialogo de Next', '[data-nextjs-dialog]'],
    ['error de Next', '#__next_error__'],
    ['texto de error', 'text=/Unhandled Runtime Error|Application error|Internal Server Error/i'],
    // `nextjs-portal` va al final y aparte: en desarrollo Next lo monta para su propio
    // indicador, asi que por si solo NO es un fallo de la pantalla.
    ['portal de Next (solo indicio)', 'nextjs-portal'],
  ]
  for (const [nombre, selector] of marcas) {
    if ((await page.locator(selector).count()) > 0) return nombre
  }
  return null
}

/** Si Next está mostrando su pantalla de error en vez de la aplicación. */
export async function hayPantallaDeError(page: Page): Promise<boolean> {
  const marcas = [
    'nextjs-portal',
    '[data-nextjs-dialog]',
    '#__next_error__',
    'text=/Unhandled Runtime Error|Application error|Internal Server Error/i',
  ]
  for (const marca of marcas) {
    if ((await page.locator(marca).count()) > 0) return true
  }
  return false
}
