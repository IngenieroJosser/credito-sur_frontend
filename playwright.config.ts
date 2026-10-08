import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas de extremo a extremo contra la app real, en un navegador.
 *
 * Existen porque las 8.257 pruebas de Jest no ejecutan las pantallas: verifican
 * funciones y helpers, no lo que el cobrador ve. Eso dejó sin red el refactor de
 * la ruta del día, que es justo donde vivía la duplicación más grande.
 *
 * Cómo correrlas:
 *
 *     npm run e2e            todas, sin navegador visible
 *     npm run e2e:ui         con el panel de Playwright, para depurar
 *     npm run e2e -- --headed  viendo el navegador
 *
 * Playwright levanta `next dev` por su cuenta. El BACKEND hay que tenerlo
 * arriba aparte (puerto 3001, el que dice .env.local): estas pruebas hablan con
 * la API de verdad, no con dobles.
 *
 * Las que necesitan sesión leen las credenciales del entorno y se saltan solas si
 * no están, para que la suite siga sirviendo sin secretos en el repo:
 *
 *     E2E_USUARIO=... E2E_CLAVE=... npm run e2e
 */
const PUERTO = Number(process.env.E2E_PUERTO || 3000)
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PUERTO}`

export default defineConfig({
  testDir: './e2e',
  // Extension propia en vez de `.spec.ts`: asi se ve de un golpe que el archivo
  // es de Playwright y no de Jest, que corre en jsdom y no sabria que hacer con el.
  testMatch: '**/*.e2e.ts',
  // Pide /login una vez antes de empezar, para que la primera prueba no se coma
  // la compilacion bajo demanda de Next. Sin esto la suite es intermitente: con
  // el servidor frio fallaban las tres y con el caliente pasaban las tres.
  globalSetup: './e2e/calentar.ts',
  // Una a la vez: comparten la misma base de datos, y dos pruebas registrando
  // pagos sobre la misma ruta se pisarían.
  workers: 1,
  fullyParallel: false,
  // En CI un fallo suele ser un fallo; en local se reintenta una vez para no
  // perseguir intermitencias del arranque de Next.
  retries: process.env.CI ? 0 : 1,
  // Generoso a proposito: `next dev` compila cada ruta la PRIMERA vez que se
  // pide, y en esta app eso puede pasar del minuto. Con 60s la primera prueba
  // fallaba por la compilacion, no por la pantalla.
  timeout: 150_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: BASE_URL,
    // Solo se guardan rastros del primer reintento: son pesados.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // La navegacion tambien espera la compilacion bajo demanda.
    navigationTimeout: 90_000,
    actionTimeout: 30_000,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // `reuseExistingServer` para no volver a compilar si ya hay un `next dev`
  // corriendo: la primera compilación de esta app no es rápida.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- -p ${PUERTO}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
})
